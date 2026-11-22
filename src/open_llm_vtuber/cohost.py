"""Session state for moderated live comments and allowlisted avatar motions."""

import json
import re
from collections import Counter, OrderedDict, deque
from dataclasses import dataclass, field
from pathlib import Path
from time import monotonic
from unicodedata import normalize
from uuid import uuid4

from pydantic import BaseModel, Field

from .mcpp.types import ToolCallObject

KITTY_AVATARS = frozenset({"little_cat", "pawsrig"})
VOICE_DEMO_PATH = Path("voice-demo.wav")
VOICE_DEMO_LINES = (
    "Hey, you made it! I'm Little Cat.",
    "If a lesson gets tangled, we'll untangle it one paw at a time.",
)
VOICE_DEMO_TEXT = " ".join(VOICE_DEMO_LINES)
VOICE_SAMPLE_DIRECTORY = Path("frontend/voice-samples")
VOICE_SAMPLE_TEXT = "Oh, you found it. Come sit with me."
VOICE_SAMPLES = {
    "calm": "Calm",
    "happy": "Happy",
    "curious": "Curious",
    "amused": "Amused",
    "laugh": "Soft laugh",
    "surprised": "Surprised",
    "sad": "Sad",
    "reassuring": "Reassuring",
    "concerned": "Concerned",
    "whisper": "Whisper",
}

LITTLE_CAT_SPEECH_GUIDANCE = (
    "Speak naturally, as you would in a live conversation. Start with the useful answer in a "
    "short, complete spoken sentence. Work any acknowledgment into the answer. "
    "Add one concrete explanation or next step if useful. Keep routine replies to "
    "one or two sentences, and expand when the person asks for detail. "
    "Vary your openings. Use short, natural phrases and contractions. "
    "A small laugh is welcome at a genuinely funny moment. Use 'Ha ha,' at the "
    "start of that line and keep it occasional. "
    "When you are unsure, say so and ask a focused question."
)

ACKNOWLEDGMENTS = {
    "greeting": (
        {"hi", "hey", "hello", "hi little cat", "hey little cat", "hello little cat"},
        ("Hey{viewer}, glad you're here!", "Hi{viewer}! Come get comfortable."),
    ),
    "thanks": (
        {"thanks", "thank you", "thank you little cat", "thanks little cat"},
        ("You're welcome{viewer}! I'm glad that helped.", "Anytime{viewer}. That's what I'm here for."),
    ),
    "understood": (
        {"got it", "that helps", "makes sense", "that makes sense"},
        ("Nice{viewer}, you got it!", "That clicked{viewer}! Ready for the next bit?"),
    ),
}

AVATAR_MOTIONS = ("wave", "dance", "meow", "nod", "jump", "spin", "clap", "heart", "pet")
MOTION_MEMORY_LIMIT = 64
MOTION_QUEUE_LIMIT = 12
MOTION_TIMEOUT_SECONDS = 4
LIVE_MEMORY_LIMIT = 6
LIVE_MEMORY_SECONDS = 20 * 60
QUESTION_START = re.compile(
    r"^(what|why|how|when|where|who|which|can|could|should|does|do|is|are|explain|tell me)\b",
    re.IGNORECASE,
)


def available_motions(model_info: dict) -> tuple[str, ...]:
    return tuple(motion for motion in AVATAR_MOTIONS if motion in model_info.get("motionMap", {}))


def motion_tool(motions: tuple[str, ...]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": "play_avatar_motion",
            "description": (
                "Play one avatar animation only when the newest message asks Kitty to perform it now. "
                "Understand the request in any language, including transliterated or mixed-language text. "
                "The message should identify the action on its own, without needing prior chat. "
                "Casual commands count. Questions about a move, quotes, negated requests, and mentions do not."
            ),
            "parameters": {
                "type": "object",
                "properties": {"motion": {"type": "string", "enum": list(motions)}},
                "required": ["motion"],
                "additionalProperties": False,
            },
        },
    }


def parse_cohost_tool_call(
    event: object, name: str, field_name: str
) -> tuple[ToolCallObject, str] | None:
    if not isinstance(event, list) or len(event) != 1 or not isinstance(event[0], ToolCallObject):
        return None
    call = event[0]
    function = call.function
    if function.name != name or len(function.arguments) > 2000:
        return None
    try:
        arguments = json.loads(function.arguments)
    except (ValueError, TypeError):
        return None
    if not isinstance(arguments, dict) or set(arguments) != {field_name}:
        return None
    value = arguments[field_name]
    return (call, value) if isinstance(value, str) else None


def motion_from_tool_calls(event: object, motions: tuple[str, ...]) -> str | None:
    parsed = parse_cohost_tool_call(event, "play_avatar_motion", "motion")
    return parsed[1] if parsed and parsed[1] in motions else None


def find_acknowledgment(text: str) -> tuple[str, tuple[str, ...]] | None:
    phrase = " ".join(text.casefold().split()).strip(" !?.")
    for category, (phrases, replies) in ACKNOWLEDGMENTS.items():
        if phrase in phrases:
            return category, replies
    return None


class ViewerComment(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    source: str = Field(default="relay", min_length=1, max_length=40)
    event_id: str | None = Field(default=None, max_length=128)
    client_uid: str | None = Field(default=None, max_length=64)
    viewer_name: str | None = Field(default=None, max_length=60)


@dataclass
class ReviewItem:
    id: str
    kind: str
    text: str
    lesson: str
    answer: str = ""
    viewer_name: str | None = None
    added_at: float = field(default_factory=monotonic)
    sources: tuple[str, ...] = ()

    def public(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "text": self.text,
            "answer": self.answer,
            "viewer_name": self.viewer_name,
            "sources": self.sources,
        }


class CohostSession:
    def __init__(self):
        self.lesson = ""
        self.hold = False
        self.instructor_speaking = False
        self.last_motion = float("-inf")
        self.items: dict[str, ReviewItem] = {}
        self.recent: OrderedDict[str, float] = OrderedDict()
        self.learned_motions: OrderedDict[str, str] = OrderedDict()
        self.pending_motion_comments: deque[tuple[ViewerComment, float]] = deque()
        self.live_replies: deque[tuple[float, str, str]] = deque(maxlen=LIVE_MEMORY_LIMIT)
        self.metrics: Counter[str] = Counter()
        self.last_response_ms: int | None = None

    def add(
        self, kind: str, text: str, viewer_name: str | None = None
    ) -> ReviewItem | None:
        if len(self.items) >= 20:
            self.metrics["queue_full"] += 1
            return None
        item = ReviewItem(uuid4().hex, kind, text, self.lesson, viewer_name=viewer_name)
        self.items[item.id] = item
        return item

    def recent_approved_replies(self) -> list[dict[str, str]]:
        cutoff = monotonic() - LIVE_MEMORY_SECONDS
        while self.live_replies and self.live_replies[0][0] < cutoff:
            self.live_replies.popleft()
        return [{"question": question, "answer": answer} for _, question, answer in self.live_replies]

    def match_motion(self, text: str) -> str | None:
        shortcut = text.strip().casefold()
        if shortcut.startswith("!") and shortcut[1:] in AVATAR_MOTIONS:
            return shortcut[1:]
        return self.learned_motions.get(self._motion_memory_key(text))

    @staticmethod
    def _motion_memory_key(text: str) -> str:
        return " ".join(normalize("NFKC", text).casefold().split()).rstrip(" !?.,।؟،")

    def remember_motion(self, text: str, motion: str) -> str | None:
        phrase = self._motion_memory_key(text)
        if (
            not 2 <= len(phrase) <= 100
            or not any(char.isalpha() for char in phrase)
            or motion not in AVATAR_MOTIONS
            or phrase.startswith("!")
            or find_acknowledgment(phrase)
        ):
            return None
        self.learned_motions[phrase] = motion
        self.learned_motions.move_to_end(phrase)
        if len(self.learned_motions) > MOTION_MEMORY_LIMIT:
            self.learned_motions.popitem(last=False)
        return phrase

    def restore_motion_memory(self, entries: object) -> None:
        if not isinstance(entries, list):
            return
        self.learned_motions.clear()
        for entry in entries[-MOTION_MEMORY_LIMIT:]:
            if (
                isinstance(entry, list) and len(entry) == 2
                and isinstance(entry[0], str) and len(entry[0]) <= 100
                and isinstance(entry[1], str)
            ):
                self.remember_motion(*entry)

    def ingest(self, comment: ViewerComment, blocked_terms: tuple[str, ...]) -> str:
        self.metrics["received"] += 1
        text = " ".join(comment.text.split())
        normalized = text.casefold()
        if not text or any(term in normalized for term in blocked_terms):
            self.metrics["filtered"] += 1
            return "filtered"

        now = monotonic()
        while self.recent and now - next(iter(self.recent.values())) > 120:
            self.recent.popitem(last=False)
        motion = self.match_motion(text)
        keys = [] if motion else [f"text:{normalized}"]
        if comment.event_id:
            keys.append(f"id:{comment.source}:{comment.event_id}")
        if any(key in self.recent for key in keys):
            self.metrics["duplicates"] += 1
            return "duplicate"
        for key in keys:
            self.recent[key] = now
        while len(self.recent) > 512:
            self.recent.popitem(last=False)

        if motion:
            return motion
        if normalized == "!lesson":
            return "queued" if self.add("lesson", "Share the current lesson notes") else "full"
        if acknowledgment := find_acknowledgment(text):
            name = " ".join((comment.viewer_name or "").split())
            name = "".join(char for char in name if char.isprintable()).strip() or None
            category, replies = acknowledgment
            item = self.add("acknowledgment", text, name)
            if item is None:
                return "full"
            key = f"acknowledged_{category}"
            spoken_name = ""
            if name and len(name) <= 28 and all(c.isalnum() or c in " '-" for c in name):
                spoken_name = f", {name}"
            item.answer = replies[self.metrics[key] % len(replies)].format(viewer=spoken_name)
            self.metrics[key] += 1
            return "queued"

        return "unclassified"

    def review_unclassified(self, comment: ViewerComment) -> str:
        text = " ".join(comment.text.split())
        if not (text.endswith(("?", "？", "؟")) or QUESTION_START.match(text)):
            self.metrics["filtered"] += 1
            return "ignored"
        name = " ".join((comment.viewer_name or "").split())
        name = "".join(char for char in name if char.isprintable()).strip() or None
        return "queued" if self.add("question", text, name) else "full"

    def status(self, message: str = "") -> dict:
        return {
            "type": "cohost-status",
            "lesson": self.lesson,
            "hold": self.hold,
            "voice_demo": VOICE_DEMO_PATH.is_file(),
            "voice_samples": VOICE_SAMPLES,
            "review": [item.public() for item in self.items.values()],
            "has_live_memory": bool(self.recent_approved_replies()),
            "metrics": dict(self.metrics),
            "last_response_ms": self.last_response_ms,
            "message": message,
        }

"""Session state for moderated live comments and allowlisted avatar motions."""

import re
from collections import Counter, OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from time import monotonic
from uuid import uuid4

from pydantic import BaseModel, Field

KITTY_AVATARS = frozenset({"little_cat", "pawsrig"})
VOICE_DEMO_PATH = Path("voice-demo.wav")
VOICE_DEMO_TEXT = (
    "Hey, you made it! I'm Little Cat. "
    "If a lesson gets tangled, we'll untangle it one paw at a time."
)

LITTLE_CAT_SPEECH_GUIDANCE = (
    "Sound like a bright, attentive cat co-host. Start with the useful answer in a "
    "short, complete spoken sentence. Work any acknowledgment into the answer. "
    "Add one concrete explanation or next step if useful. Keep routine replies to "
    "one or two sentences, and expand when the person asks for detail. "
    "Vary your openings. Use short, natural phrases and contractions. "
    "A little cat humor is welcome when it fits. Use an occasional meow. "
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

MOTION_COMMANDS = {
    "wave": ("wave", "wave paw", "wave your paw", "say hi"),
    "dance": ("dance", "do a dance"),
    "meow": ("meow",),
    "nod": ("nod", "nod your head"),
    "jump": ("jump", "hop"),
    "spin": ("spin", "do a spin"),
    "clap": ("clap", "clap your paws"),
    "heart": ("heart", "send a heart"),
    "pet": ("pet", "head pat"),
}
COMMAND_MOTIONS = {
    phrase: motion for motion, phrases in MOTION_COMMANDS.items() for phrase in phrases
}
QUESTION_START = re.compile(
    r"^(what|why|how|when|where|who|which|can|could|should|does|do|is|are|explain|tell me)\b",
    re.IGNORECASE,
)


def motion_command(text: str) -> str | None:
    phrase = " ".join(text.casefold().strip(" !?.").split())
    for prefix in ("please ", "can you ", "could you ", "cat "):
        phrase = phrase.removeprefix(prefix)
    return COMMAND_MOTIONS.get(phrase.removesuffix(" please"))


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

    def public(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "text": self.text,
            "answer": self.answer,
            "viewer_name": self.viewer_name,
        }


class CohostSession:
    def __init__(self):
        self.lesson = ""
        self.hold = False
        self.instructor_speaking = False
        self.last_motion = float("-inf")
        self.items: dict[str, ReviewItem] = {}
        self.recent: OrderedDict[str, float] = OrderedDict()
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
        motion = motion_command(text)
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
        name = " ".join((comment.viewer_name or "").split())
        name = "".join(char for char in name if char.isprintable()).strip() or None
        if acknowledgment := find_acknowledgment(text):
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

        if not (text.endswith("?") or QUESTION_START.match(text)):
            self.metrics["filtered"] += 1
            return "ignored"
        return "queued" if self.add("question", text, name) else "full"

    def status(self, message: str = "") -> dict:
        return {
            "type": "cohost-status",
            "lesson": self.lesson,
            "hold": self.hold,
            "voice_demo": VOICE_DEMO_PATH.is_file(),
            "review": [item.public() for item in self.items.values()],
            "metrics": dict(self.metrics),
            "last_response_ms": self.last_response_ms,
            "message": message,
        }

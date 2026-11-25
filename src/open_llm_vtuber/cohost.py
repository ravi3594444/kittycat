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

AVATAR_MOTIONS = (
    "wave", "dance", "meow", "nod", "jump", "spin", "clap", "heart", "pet",
    "cry", "sad", "laugh", "angry", "shy", "shock",
    "backflip", "sing", "sleep", "sit", "stretch", "eat", "zoomies", "gaming",
    "groom", "explain", "walk_left", "walk_right",
)
MOTION_MEMORY_LIMIT = 64
MOTION_QUEUE_LIMIT = 12
MOTION_TIMEOUT_SECONDS = 4
LIVE_MEMORY_LIMIT = 6
LIVE_MEMORY_SECONDS = 20 * 60
VIEWER_COMMENT_COOLDOWN_SECONDS = 6.0
WELCOME_COOLDOWN_SECONDS = 45.0
AUTO_REPLY_COOLDOWN_SECONDS = 12.0
DEFAULT_WAKE_PHRASES = ("hey whiskers", "professor whiskers", "whiskers", "hey kitty", "little cat")
QUESTION_START = re.compile(
    r"^(what|why|how|when|where|who|which|can|could|should|does|do|is|are|explain|tell me)\b",
    re.IGNORECASE,
)
_HOST_WAKE_RE = re.compile(
    r"^(?:hey\s+|ok(?:ay)?\s+|yo\s+)?(?:professor\s+)?(?:whiskers|kitty|little\s+cat)\b[\s,:\-!?]*",
    re.IGNORECASE,
)


def extract_wake_phrase(
    text: str, wake_phrases: tuple[str, ...] = DEFAULT_WAKE_PHRASES
) -> tuple[bool, str]:
    """Detect a wake phrase like 'Hey Whiskers' and return (matched, cleaned_remainder)."""
    raw = " ".join(text.split()).strip()
    if not raw:
        return False, ""
    lowered = raw.casefold()
    match = _HOST_WAKE_RE.match(raw)
    if match:
        return True, raw[match.end() :].strip()
    for phrase in wake_phrases:
        p = phrase.casefold().strip()
        if not p:
            continue
        idx = lowered.find(p)
        if idx != -1:
            remainder = (raw[:idx] + " " + raw[idx + len(p) :]).strip(" ,:-!?")
            return True, " ".join(remainder.split())
    return False, raw


def parse_host_command(text: str) -> dict[str, str] | None:
    """Parse explicit or wake-addressed authorized host commands."""
    raw = " ".join(text.split()).strip()
    if not raw:
        return None
    lower = raw.casefold()

    bang_patterns: tuple[tuple[str, str], ...] = (
        ("!topic ", "topic"),
        ("!queue ", "queue"),
        ("!mode ", "personality"),
        ("!personality ", "personality"),
        ("!note ", "note"),
        ("!answer ", "answer"),
        ("!say ", "say"),
        ("!auto ", "auto"),
        ("!wake ", "wake"),
    )
    for prefix, cmd in bang_patterns:
        if lower.startswith(prefix):
            return {"command": cmd, "arg": raw[len(prefix) :].strip()}

    exact_bang = {
        "!next": ("next_topic", ""),
        "!intro": ("intro", ""),
        "!pause": ("hold", "on"),
        "!hold": ("hold", "on"),
        "!resume": ("hold", "off"),
        "!wrap": ("wrap", ""),
        "!wrap up": ("wrap", ""),
        "!summary": ("wrap", ""),
    }
    if lower in exact_bang:
        cmd, arg = exact_bang[lower]
        return {"command": cmd, "arg": arg}

    matched, remainder = extract_wake_phrase(raw)
    if matched:
        rem_lower = remainder.casefold()
        if rem_lower.startswith(("wrap up", "end live", "end the live", "summarize")):
            return {"command": "wrap", "arg": remainder}
        if rem_lower.startswith(("next topic", "switch topic to ", "talk about ")):
            for lead in ("switch topic to ", "talk about ", "next topic"):
                if rem_lower.startswith(lead):
                    arg = remainder[len(lead) :].strip(" ,.:-")
                    return {"command": "topic" if arg else "next_topic", "arg": arg}
        if rem_lower.startswith(("save note ", "note that ", "remember this ")):
            for lead in ("save note ", "note that ", "remember this "):
                if rem_lower.startswith(lead):
                    return {"command": "note", "arg": remainder[len(lead) :].strip()}
        if rem_lower.startswith(("pause", "hold on", "stop talking", "mute")):
            return {"command": "hold", "arg": "on"}
        if rem_lower.startswith(("resume", "unmute", "keep going")):
            return {"command": "hold", "arg": "off"}
        if rem_lower.startswith(("introduce", "welcome everyone", "do the intro")):
            return {"command": "intro", "arg": remainder}
        return {"command": "direct", "arg": remainder or raw}

    return None


def is_authorized_host(
    comment: "ViewerComment",
    host_handles: frozenset[str],
    host_ids: frozenset[str],
) -> bool:
    if comment.force_host:
        return True
    if comment.viewer_id and str(comment.viewer_id).strip() in host_ids:
        return True
    if comment.viewer_handle:
        handle = comment.viewer_handle.strip().lstrip("@").casefold()
        if handle and handle in host_handles:
            return True
    return False


def available_motions(model_info: dict) -> tuple[str, ...]:
    return tuple(motion for motion in AVATAR_MOTIONS if motion in model_info.get("motionMap", {}))


def motion_tool(motions: tuple[str, ...], *, spoken: bool = False) -> dict:
    properties = {"motion": {"type": "string", "enum": list(motions)}}
    if spoken:
        properties["acknowledgment"] = {
            "type": "string",
            "maxLength": 110,
            "description": "One short line for Kitty to say as she starts, in the user's language.",
        }
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
                "properties": properties,
                "required": list(properties),
                "additionalProperties": False,
            },
        },
    }


def parse_cohost_tool_call(
    event: object, name: str, *fields: str
) -> tuple[ToolCallObject, dict[str, str]] | None:
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
    if not isinstance(arguments, dict) or set(arguments) != set(fields):
        return None
    return (call, arguments) if all(isinstance(value, str) for value in arguments.values()) else None


def motion_from_tool_calls(
    event: object, motions: tuple[str, ...], *, spoken: bool = False
) -> dict[str, str] | str | None:
    if spoken:
        parsed = parse_cohost_tool_call(event, "play_avatar_motion", "motion", "acknowledgment")
        if parsed and parsed[1]["motion"] in motions:
            return parsed[1]
        # Tolerate models that only send {"motion": ...}
        parsed_min = parse_cohost_tool_call(event, "play_avatar_motion", "motion")
        if parsed_min and parsed_min[1]["motion"] in motions:
            return {"motion": parsed_min[1]["motion"], "acknowledgment": "Okay!"}
        return None
    parsed = parse_cohost_tool_call(event, "play_avatar_motion", "motion")
    return parsed[1]["motion"] if parsed and parsed[1]["motion"] in motions else None


_NEGATED_MOTION_RE = re.compile(
    r"\b(don'?t|do not|stop|never|no|didn'?t|did you|why did|were you)\b", re.IGNORECASE
)
_INFO_QUESTION_RE = re.compile(
    r"^(?:what|why|how|when|where|who|which|tell me about|explain)\b", re.IGNORECASE
)
_GREETING_ONLY_RE = re.compile(
    r"^(?:hi|hey|hello|helo|yo|hola|namaste|good morning|good evening|good afternoon|welcome)(?:\s+(?:kitty|little\s+cat|whiskers|professor\s+whiskers|there|everyone|guys))?[!.,?]*$",
    re.IGNORECASE,
)
_EXPLICIT_MOTION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("backflip", re.compile(r"\b(back\s*flip|somersault|do a flip)\b", re.IGNORECASE)),
    ("walk_left", re.compile(r"\b(walk\s+left|go\s+left|move\s+left)\b", re.IGNORECASE)),
    ("walk_right", re.compile(r"\b(walk\s+right|go\s+right|move\s+right)\b", re.IGNORECASE)),
    ("wave", re.compile(r"\b(wave|waving|wave your hand|wave your paw|say hi|say hello)\b", re.IGNORECASE)),
    ("dance", re.compile(r"\b(dance|dancing|boogie|groove|do a little dance)\b", re.IGNORECASE)),
    ("cry", re.compile(r"\b(cry|crying|shed a tear|tears|be sad|look sad|sad face)\b", re.IGNORECASE)),
    ("laugh", re.compile(r"\b(laugh|laughing|giggle|chuckle)\b", re.IGNORECASE)),
    ("jump", re.compile(r"\b(jump|hop|leap|bounce|kood)\b", re.IGNORECASE)),
    ("spin", re.compile(r"\b(spin|twirl|turn around|rotate)\b", re.IGNORECASE)),
    ("clap", re.compile(r"\b(clap|applaud|applause)\b", re.IGNORECASE)),
    ("heart", re.compile(r"\b(heart|send a heart|heart hands|give me a heart)\b", re.IGNORECASE)),
    ("meow", re.compile(r"\b(meow|purr|nya|miau)\b", re.IGNORECASE)),
    ("nod", re.compile(r"\b(nod|nod your head)\b", re.IGNORECASE)),
    ("sing", re.compile(r"\b(sing|sing a song|karaoke)\b", re.IGNORECASE)),
    ("sleep", re.compile(r"\b(sleep|take a nap|nap|go to sleep|sleepy)\b", re.IGNORECASE)),
    ("sit", re.compile(r"\b(sit down|sit|loaf)\b", re.IGNORECASE)),
    ("stretch", re.compile(r"\b(stretch|big stretch|yawn)\b", re.IGNORECASE)),
    ("eat", re.compile(r"\b(eat|eat fish|have a snack|fish treat)\b", re.IGNORECASE)),
    ("zoomies", re.compile(r"\b(zoomies|run around)\b", re.IGNORECASE)),
    ("gaming", re.compile(r"\b(play games|gaming mode|type on keyboard)\b", re.IGNORECASE)),
    ("groom", re.compile(r"\b(groom|lick your paw|clean yourself)\b", re.IGNORECASE)),
    ("pet", re.compile(r"\b(head\s*pat|scritch|pet you|cuddle)\b", re.IGNORECASE)),
    ("angry", re.compile(r"\b(be angry|look angry|get mad|hiss|grumpy)\b", re.IGNORECASE)),
    ("shy", re.compile(r"\b(be shy|blush|look shy)\b", re.IGNORECASE)),
    ("shock", re.compile(r"\b(be shocked|look shocked|act surprised|boo)\b", re.IGNORECASE)),
)


def detect_explicit_motion(text: str, motions: tuple[str, ...]) -> str | None:
    """Deterministically detect direct PawsRig action/greeting requests (0ms, zero LLM misses)."""
    if not motions:
        return None
    cleaned = " ".join(text.split()).strip()
    if not cleaned or len(cleaned) > 120:
        return None
    if _NEGATED_MOTION_RE.search(cleaned):
        return None
    if _GREETING_ONLY_RE.match(cleaned) and "wave" in motions:
        return "wave"
    if len(cleaned.split()) > 12:
        return None
    if _INFO_QUESTION_RE.match(cleaned):
        return None
    for action, pattern in _EXPLICIT_MOTION_PATTERNS:
        if action in motions and pattern.search(cleaned):
            return action
    return None


def looks_like_direct_motion_request(text: str) -> bool:
    """Fast local guard so unambiguous direct move requests execute in 1 LLM call."""
    cleaned = " ".join(text.split()).strip()
    if not cleaned or len(cleaned) > 120:
        return False
    if cleaned.endswith(("?", "？", "؟")) or _NEGATED_MOTION_RE.search(cleaned):
        return False
    return True


def motion_shortcut(text: str) -> str | None:
    shortcut = text.strip().casefold()
    return shortcut[1:] if shortcut.startswith("!") and shortcut[1:] in AVATAR_MOTIONS else None


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
    viewer_id: str | None = Field(default=None, max_length=64)
    viewer_handle: str | None = Field(default=None, max_length=64)
    event_type: str = Field(default="comment", max_length=24)
    gift_name: str | None = Field(default=None, max_length=80)
    gift_count: int = Field(default=1, ge=1, le=10000)
    gift_value: int = Field(default=0, ge=0, le=1000000)
    force_host: bool = Field(default=False)


@dataclass
class ReviewItem:
    id: str
    kind: str
    text: str
    lesson: str
    answer: str = ""
    viewer_name: str | None = None
    viewer_handle: str | None = None
    viewer_id: str | None = None
    is_host: bool = False
    is_returning: bool = False
    priority: int = 0
    interaction_id: str = ""
    added_at: float = field(default_factory=monotonic)
    sources: tuple[str, ...] = ()

    def public(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "text": self.text,
            "answer": self.answer,
            "viewer_name": self.viewer_name,
            "viewer_handle": self.viewer_handle,
            "is_host": self.is_host,
            "is_returning": self.is_returning,
            "priority": self.priority,
            "sources": self.sources,
        }


class CohostSession:
    def __init__(self):
        self.lesson = ""
        self.hold = False
        self.instructor_speaking = False
        self.auto_speak = False
        self.wake_phrase_only = False
        self.active_topic = ""
        self.active_personality = "professor_whiskers"
        self.studio_session_id = ""
        self.last_motion = float("-inf")
        self.last_auto_reply = float("-inf")
        self.last_welcome = float("-inf")
        self.items: dict[str, ReviewItem] = {}
        self.recent: OrderedDict[str, float] = OrderedDict()
        self.viewer_last_seen: dict[str, float] = {}
        self.welcomed_viewers: set[str] = set()
        self.learned_motions: OrderedDict[str, str] = OrderedDict()
        self.pending_motion_comments: deque[tuple[ViewerComment, float]] = deque()
        self.live_replies: deque[tuple[float, str, str]] = deque(maxlen=LIVE_MEMORY_LIMIT)
        self.metrics: Counter[str] = Counter()
        self.last_response_ms: int | None = None

    def add(
        self,
        kind: str,
        text: str,
        viewer_name: str | None = None,
        *,
        viewer_handle: str | None = None,
        viewer_id: str | None = None,
        is_host: bool = False,
        is_returning: bool = False,
        priority: int = 0,
        interaction_id: str = "",
    ) -> ReviewItem | None:
        if len(self.items) >= 20 and not is_host:
            self.metrics["queue_full"] += 1
            return None
        item = ReviewItem(
            uuid4().hex,
            kind,
            text,
            self.lesson,
            viewer_name=viewer_name,
            viewer_handle=viewer_handle,
            viewer_id=viewer_id,
            is_host=is_host,
            is_returning=is_returning,
            priority=priority,
            interaction_id=interaction_id,
        )
        self.items[item.id] = item
        return item

    def next_auto_candidate(self) -> ReviewItem | None:
        """Select the highest-priority review item for autonomous LIVE speaking."""
        if not self.items:
            return None
        ranked = sorted(
            self.items.values(),
            key=lambda it: (
                1 if it.is_host else 0,
                it.priority,
                2 if it.kind == "question" else (1 if it.kind == "gift" else 0),
                -it.added_at,
            ),
            reverse=True,
        )
        return ranked[0]

    def recent_approved_replies(self) -> list[dict[str, str]]:
        cutoff = monotonic() - LIVE_MEMORY_SECONDS
        while self.live_replies and self.live_replies[0][0] < cutoff:
            self.live_replies.popleft()
        return [{"question": question, "answer": answer} for _, question, answer in self.live_replies]

    def match_motion(self, text: str) -> str | None:
        return motion_shortcut(text) or self.learned_motions.get(self._motion_memory_key(text))

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

    def _clean_name(self, raw_name: str | None) -> str | None:
        name = " ".join((raw_name or "").split())
        return "".join(char for char in name if char.isprintable()).strip() or None

    def ingest(
        self,
        comment: ViewerComment,
        blocked_terms: tuple[str, ...],
        *,
        is_host: bool = False,
        is_returning: bool = False,
        interaction_id: str = "",
    ) -> str:
        self.metrics["received"] += 1
        text = " ".join(comment.text.split())
        normalized = text.casefold()
        if not text or (not is_host and any(term in normalized for term in blocked_terms)):
            self.metrics["filtered"] += 1
            return "filtered"

        now = monotonic()
        while self.recent and now - next(iter(self.recent.values())) > 120:
            self.recent.popitem(last=False)

        viewer_tag = (
            comment.viewer_id
            or (comment.viewer_handle or "").strip().lstrip("@").casefold()
            or (comment.viewer_name or "").strip().casefold()
        )
        name = self._clean_name(comment.viewer_name or comment.viewer_handle)
        spoken_name = ""
        if name and len(name) <= 28 and all(c.isalnum() or c in " '-_" for c in name):
            spoken_name = f", {name}"

        # Handle TikTok gift events
        if comment.event_type == "gift":
            self.metrics["gifts"] += 1
            gift_label = (comment.gift_name or "gift").strip()
            count_text = f" x{comment.gift_count}" if comment.gift_count > 1 else ""
            item = self.add(
                "gift",
                f"Sent {gift_label}{count_text}",
                name,
                viewer_handle=comment.viewer_handle,
                viewer_id=comment.viewer_id,
                is_returning=is_returning,
                priority=40 + min(comment.gift_value, 50),
                interaction_id=interaction_id,
            )
            if item is None:
                return "full"
            item.answer = f"Thank you so much{spoken_name} for the {gift_label}{count_text}! You just made my ears perk right up!"
            return "gift_queued"

        # Handle selective viewer join welcomes without excessive repetition
        if comment.event_type == "join":
            if (
                not viewer_tag
                or viewer_tag in self.welcomed_viewers
                or (now - self.last_welcome) < WELCOME_COOLDOWN_SECONDS
            ):
                self.metrics["joins_throttled"] += 1
                return "throttled"
            self.welcomed_viewers.add(viewer_tag)
            self.last_welcome = now
            self.metrics["welcomes"] += 1
            item = self.add(
                "acknowledgment",
                f"{name or 'A viewer'} joined the LIVE",
                name,
                viewer_handle=comment.viewer_handle,
                viewer_id=comment.viewer_id,
                is_returning=is_returning,
                priority=15 if is_returning else 5,
                interaction_id=interaction_id,
            )
            if item is None:
                return "full"
            if is_returning and spoken_name:
                item.answer = f"Welcome back{spoken_name}! Great to see you in the LIVE again."
            else:
                item.answer = f"Welcome in{spoken_name}! Drop a question anytime."
            return "queued"

        # Per-viewer anti-spam rate limiting (bypassed for authorized host)
        if viewer_tag and not is_host:
            prev = self.viewer_last_seen.get(viewer_tag)
            if prev is not None and (now - prev) < VIEWER_COMMENT_COOLDOWN_SECONDS and not self.match_motion(text):
                self.metrics["rate_limited"] += 1
                return "rate_limited"
            self.viewer_last_seen[viewer_tag] = now

        motion = self.match_motion(text)
        keys = [] if (motion or is_host) else [f"text:{normalized}"]
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
            return "queued" if self.add("lesson", "Share the current lesson notes", name, is_host=is_host) else "full"
        if not is_host and (acknowledgment := find_acknowledgment(text)):
            category, replies = acknowledgment
            item = self.add(
                "acknowledgment",
                text,
                name,
                viewer_handle=comment.viewer_handle,
                viewer_id=comment.viewer_id,
                is_returning=is_returning,
                priority=10 if is_returning else 5,
                interaction_id=interaction_id,
            )
            if item is None:
                return "full"
            key = f"acknowledged_{category}"
            if category == "greeting" and is_returning and spoken_name:
                item.answer = f"Welcome back{spoken_name}! Awesome to have you back with us."
            else:
                item.answer = replies[self.metrics[key] % len(replies)].format(viewer=spoken_name)
            self.metrics[key] += 1
            return "queued"

        return "unclassified"

    def review_unclassified(
        self,
        comment: ViewerComment,
        *,
        is_host: bool = False,
        is_returning: bool = False,
        interaction_id: str = "",
    ) -> str:
        text = " ".join(comment.text.split())
        if not is_host and not (text.endswith(("?", "？", "؟")) or QUESTION_START.match(text)):
            self.metrics["filtered"] += 1
            return "ignored"
        name = self._clean_name(comment.viewer_name or comment.viewer_handle)
        priority = 100 if is_host else (30 if is_returning else 20) + min(len(text) // 15, 15)
        item = self.add(
            "question",
            text,
            name,
            viewer_handle=comment.viewer_handle,
            viewer_id=comment.viewer_id,
            is_host=is_host,
            is_returning=is_returning,
            priority=priority,
            interaction_id=interaction_id,
        )
        return "queued" if item else "full"

    def status(self, message: str = "") -> dict:
        return {
            "type": "cohost-status",
            "lesson": self.lesson,
            "hold": self.hold,
            "auto_speak": self.auto_speak,
            "wake_phrase_only": self.wake_phrase_only,
            "active_topic": self.active_topic,
            "active_personality": self.active_personality,
            "studio_session_id": self.studio_session_id,
            "voice_demo": VOICE_DEMO_PATH.is_file(),
            "voice_samples": VOICE_SAMPLES,
            "review": [item.public() for item in self.items.values()],
            "has_live_memory": bool(self.recent_approved_replies()),
            "metrics": dict(self.metrics),
            "last_response_ms": self.last_response_ms,
            "message": message,
        }

"""Session state for moderated live comments and allowlisted avatar motions."""

import re
from collections import Counter, OrderedDict
from dataclasses import dataclass, field
from time import monotonic
from uuid import uuid4

from pydantic import BaseModel, Field


MOTION_COMMANDS = {
    "wave": ("wave", "wave paw", "wave your paw", "say hi"),
    "dance": ("dance", "do a dance"),
    "meow": ("meow",),
    "nod": ("nod", "nod your head"),
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


class ViewerComment(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    source: str = Field(default="relay", min_length=1, max_length=40)
    event_id: str | None = Field(default=None, max_length=128)
    client_uid: str | None = Field(default=None, max_length=64)


@dataclass
class ReviewItem:
    id: str
    kind: str
    text: str
    lesson: str
    answer: str = ""
    added_at: float = field(default_factory=monotonic)

    def public(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "text": self.text,
            "answer": self.answer,
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

    def add(self, kind: str, text: str) -> ReviewItem | None:
        if len(self.items) >= 20:
            self.metrics["queue_full"] += 1
            return None
        item = ReviewItem(uuid4().hex, kind, text, self.lesson)
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
        if not (text.endswith("?") or QUESTION_START.match(text)):
            self.metrics["filtered"] += 1
            return "ignored"
        return "queued" if self.add("question", text) else "full"

    def status(self, message: str = "") -> dict:
        return {
            "type": "cohost-status",
            "lesson": self.lesson,
            "hold": self.hold,
            "review": [item.public() for item in self.items.values()],
            "metrics": dict(self.metrics),
            "last_response_ms": self.last_response_ms,
            "message": message,
        }

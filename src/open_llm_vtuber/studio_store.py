"""Persistent SQLite storage for Freedom Fusion AI LIVE Studio sessions, viewers, analytics, and memory."""

from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
import time
from collections import Counter
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from .cohost_knowledge import KnowledgeEntry, PublicKnowledge

DEFAULT_DB_PATH = Path("data/studio.db")

_STOPWORDS = frozenset(
    "a about above after again against all am an and any are as at be because been before being "
    "below between both but by can could did do does doing down during each few for from further "
    "had has have having he her here hers herself him himself his how i if in into is it its itself "
    "just me more most my myself no nor not now of off on once only or other our ours ourselves "
    "out over own same she should so some such than that the their theirs them themselves then "
    "there these they this those through to too under until up very was we were what when where "
    "which while who whom why will with would you your yours yourself yourselves hey hi hello "
    "whiskers kitty cat please thanks thank yeah yes okay ok lol haha note sent joined live rose gift".split()
)

_TECH_TOPIC_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Wi-Fi Security", re.compile(r"\b(wi-?fi|wpa[23]?|wireless|ssid|evil twin|public wifi)\b", re.I)),
    ("VPN & Tunneling", re.compile(r"\b(vpn|wireguard|ipsec|openvpn|tunnel|tailscale)\b", re.I)),
    ("Cybersecurity", re.compile(r"\b(cyber\w*|security|hack\w*|phish\w*|malware|ransomware|zero trust|encrypt\w*)\b", re.I)),
    ("Network+ / CompTIA", re.compile(r"\b(network\+|n10-009|comptia|cert\w*|exam|osi model|subnet\w*)\b", re.I)),
    ("Cellular & Mobile", re.compile(r"\b(cellular|5g|lte|handoff|tower|sim|esim|manhattan)\b", re.I)),
    ("Routing & Switching", re.compile(r"\b(router|routing|switch\w*|vlan|bgp|ospf|stp|arp|mac address)\b", re.I)),
    ("DNS / DHCP / IP", re.compile(r"\b(dns|dhcp|ipv[46]|tcp|udp|nat|port\s*\d+|cidr|subnet)\b", re.I)),
    ("Firewalls & ACLs", re.compile(r"\b(firewall|acl|ids|ips|waf|siem|soc|ddos)\b", re.I)),
    ("AI & Freedom Fusion", re.compile(r"\b(ai|chatgpt|llm|freedom fusion|threadsgpt|agent|mcp|automation)\b", re.I)),
    ("Cloud & DevOps", re.compile(r"\b(cloud|aws|azure|docker|kubernetes|linux|server|ssh)\b", re.I)),
)


def extract_topic_tags(text: str) -> list[str]:
    """Extract clean human-readable topic tags from a viewer message or Q&A."""
    tags: list[str] = []
    for label, pattern in _TECH_TOPIC_PATTERNS:
        if pattern.search(text):
            tags.append(label)
    if tags:
        return tags[:3]
    words = [
        word for word in re.findall(r"[a-zA-Z][a-zA-Z0-9+#-]{2,24}", text.casefold())
        if word not in _STOPWORDS
    ]
    if not words:
        return []
    return [word.title() for word in dict.fromkeys(words[:2])]


def compute_clip_score(
    kind: str,
    text: str,
    answer: str = "",
    *,
    is_host: bool = False,
    gift_value: int = 0,
) -> tuple[int, str]:
    """Heuristic score (0-100) for short-form video clip potential."""
    score = 15
    reasons: list[str] = []
    if is_host:
        score += 35
        reasons.append("Host spotlight directive")
    if kind == "gift":
        score += min(45, 20 + gift_value)
        reasons.append("High-energy gift reaction")
    if kind == "question":
        score += 18
        if len(text) >= 28:
            score += 12
            reasons.append("Substantive audience question")
    if answer and len(answer) >= 70:
        score += 18
        reasons.append("Strong spoken explanation")
    if answer and ("ha ha" in answer.casefold() or "!" in answer):
        score += 8
        reasons.append("Expressive delivery")
    tags = extract_topic_tags(f"{text} {answer}")
    if tags:
        score += 10
        reasons.append(f"Topic: {tags[0]}")
    score = max(0, min(100, score))
    return score, " · ".join(dict.fromkeys(reasons)) or "Live moment"


def make_viewer_key(
    viewer_id: str | None = None,
    viewer_handle: str | None = None,
    viewer_name: str | None = None,
) -> str | None:
    if viewer_id and str(viewer_id).strip():
        return f"id:{str(viewer_id).strip()}"
    if viewer_handle and viewer_handle.strip():
        return f"handle:{viewer_handle.strip().lstrip('@').casefold()}"
    if viewer_name and viewer_name.strip():
        return f"name:{viewer_name.strip().casefold()}"
    return None


class StudioStore:
    """Thread-safe SQLite store powering returning viewers, analytics, topic queues, voice notes, and summaries."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        configured = db_path or os.getenv("STUDIO_DB_PATH") or DEFAULT_DB_PATH
        self.db_path = Path(configured)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
            self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                started_at REAL NOT NULL,
                ended_at REAL,
                tiktok_handle TEXT DEFAULT '',
                personality TEXT DEFAULT 'professor_whiskers',
                initial_topic TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                stats_json TEXT DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS viewers (
                viewer_key TEXT PRIMARY KEY,
                viewer_id TEXT DEFAULT '',
                viewer_handle TEXT DEFAULT '',
                viewer_name TEXT DEFAULT '',
                first_seen REAL NOT NULL,
                last_seen REAL NOT NULL,
                last_session_id TEXT DEFAULT '',
                visit_count INTEGER DEFAULT 1,
                message_count INTEGER DEFAULT 0,
                question_count INTEGER DEFAULT 0,
                answered_count INTEGER DEFAULT 0,
                gift_count INTEGER DEFAULT 0,
                gift_value INTEGER DEFAULT 0,
                meaningful_score REAL DEFAULT 0,
                interests_json TEXT DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS interactions (
                id TEXT PRIMARY KEY,
                session_id TEXT DEFAULT '',
                created_at REAL NOT NULL,
                kind TEXT NOT NULL,
                viewer_key TEXT DEFAULT '',
                viewer_name TEXT DEFAULT '',
                viewer_handle TEXT DEFAULT '',
                text TEXT NOT NULL,
                answer TEXT DEFAULT '',
                topic TEXT DEFAULT '',
                answered INTEGER DEFAULT 0,
                is_host INTEGER DEFAULT 0,
                latency_ms INTEGER,
                clip_score INTEGER DEFAULT 0,
                clip_reason TEXT DEFAULT '',
                sources_json TEXT DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS topic_queue (
                id TEXT PRIMARY KEY,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                notes TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'queued',
                created_at REAL NOT NULL,
                completed_at REAL
            );

            CREATE TABLE IF NOT EXISTS voice_notes (
                id TEXT PRIMARY KEY,
                session_id TEXT DEFAULT '',
                created_at REAL NOT NULL,
                text TEXT NOT NULL,
                category TEXT DEFAULT 'idea',
                promoted_to_memory INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_interactions_clip ON interactions(clip_score DESC, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_viewers_score ON viewers(meaningful_score DESC, last_seen DESC);
            """
        )
        self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # --- Sessions ---

    def start_session(
        self,
        *,
        tiktok_handle: str = "",
        personality: str = "professor_whiskers",
        initial_topic: str = "",
        status: str = "preparing",
    ) -> dict[str, Any]:
        session_id = uuid4().hex[:12]
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO sessions (id, status, started_at, tiktok_handle, personality, initial_topic)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (session_id, status, now, tiktok_handle.lstrip("@"), personality, initial_topic),
            )
            self._conn.commit()
        return self.get_session(session_id) or {}

    def update_session_status(self, session_id: str, status: str) -> None:
        with self._lock:
            self._conn.execute("UPDATE sessions SET status = ? WHERE id = ?", (status, session_id))
            self._conn.commit()

    def end_session(
        self, session_id: str, *, summary: str = "", stats: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                UPDATE sessions
                SET status = 'ended', ended_at = ?, summary = ?, stats_json = ?
                WHERE id = ?
                """,
                (now, summary, json.dumps(stats or {}, ensure_ascii=False), session_id),
            )
            self._conn.commit()
        return self.get_session(session_id) or {}

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        data["stats"] = json.loads(data.pop("stats_json", "{}") or "{}")
        return data

    def get_active_session(self) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM sessions WHERE status IN ('preparing', 'live', 'stopping') ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
        if not row:
            return None
        data = dict(row)
        data["stats"] = json.loads(data.pop("stats_json", "{}") or "{}")
        return data

    def list_sessions(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
            ).fetchall()
        results = []
        for row in rows:
            item = dict(row)
            item["stats"] = json.loads(item.pop("stats_json", "{}") or "{}")
            results.append(item)
        return results

    # --- Viewers (Audience Recognition & Audience Memory) ---

    def record_viewer_activity(
        self,
        *,
        session_id: str = "",
        viewer_id: str | None = None,
        viewer_handle: str | None = None,
        viewer_name: str | None = None,
        kind: str = "comment",
        text: str = "",
        gift_value: int = 0,
    ) -> dict[str, Any]:
        key = make_viewer_key(viewer_id, viewer_handle, viewer_name)
        if not key:
            return {"viewer_key": "", "is_returning": False, "visit_count": 0, "interests": []}

        now = time.time()
        tags = extract_topic_tags(text)
        clean_id = (str(viewer_id).strip() if viewer_id else "")[:64]
        clean_handle = (viewer_handle or "").strip().lstrip("@")[:64]
        clean_name = (viewer_name or clean_handle or "Viewer").strip()[:60]
        is_question = int(kind == "question")
        is_gift = int(kind == "gift")
        is_substantive = int(kind in {"question", "comment"} and len(text.strip()) >= 18)

        with self._lock:
            row = self._conn.execute("SELECT * FROM viewers WHERE viewer_key = ?", (key,)).fetchone()
            if row is None:
                meaningful = is_question * 4.0 + is_substantive * 1.5 + is_gift * 3.0 + min(gift_value, 100) * 0.2
                self._conn.execute(
                    """
                    INSERT INTO viewers (
                        viewer_key, viewer_id, viewer_handle, viewer_name, first_seen, last_seen,
                        last_session_id, visit_count, message_count, question_count, answered_count,
                        gift_count, gift_value, meaningful_score, interests_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?, ?, ?)
                    """,
                    (
                        key, clean_id, clean_handle, clean_name, now, now, session_id,
                        int(kind != "join"), is_question, is_gift, gift_value,
                        round(meaningful, 2), json.dumps(tags, ensure_ascii=False),
                    ),
                )
                self._conn.commit()
                return {
                    "viewer_key": key,
                    "viewer_name": clean_name,
                    "viewer_handle": clean_handle,
                    "is_returning": False,
                    "visit_count": 1,
                    "interests": tags,
                    "meaningful_score": round(meaningful, 2),
                }

            prev_interests = json.loads(row["interests_json"] or "[]")
            merged_interests = list(dict.fromkeys([*tags, *prev_interests]))[:12]
            new_visit = bool(session_id and row["last_session_id"] and row["last_session_id"] != session_id)
            visit_count = row["visit_count"] + (1 if new_visit else 0)
            message_count = row["message_count"] + int(kind != "join")
            question_count = row["question_count"] + is_question
            gift_count = row["gift_count"] + is_gift
            total_gift_value = row["gift_value"] + gift_value
            # Anti-spam weighting: reward questions, answered engagement, gifts, and returning visits
            meaningful = (
                question_count * 4.0
                + row["answered_count"] * 3.0
                + min(message_count, 25) * 0.4
                + is_substantive * 1.2
                + gift_count * 3.0
                + min(total_gift_value, 250) * 0.15
                + (visit_count - 1) * 2.5
            )
            self._conn.execute(
                """
                UPDATE viewers
                SET viewer_id = COALESCE(NULLIF(?, ''), viewer_id),
                    viewer_handle = COALESCE(NULLIF(?, ''), viewer_handle),
                    viewer_name = COALESCE(NULLIF(?, ''), viewer_name),
                    last_seen = ?,
                    last_session_id = CASE WHEN ? != '' THEN ? ELSE last_session_id END,
                    visit_count = ?,
                    message_count = ?,
                    question_count = ?,
                    gift_count = ?,
                    gift_value = ?,
                    meaningful_score = ?,
                    interests_json = ?
                WHERE viewer_key = ?
                """,
                (
                    clean_id, clean_handle, clean_name, now, session_id, session_id,
                    visit_count, message_count, question_count, gift_count, total_gift_value,
                    round(meaningful, 2), json.dumps(merged_interests, ensure_ascii=False), key,
                ),
            )
            self._conn.commit()
            return {
                "viewer_key": key,
                "viewer_name": clean_name or row["viewer_name"],
                "viewer_handle": clean_handle or row["viewer_handle"],
                "is_returning": visit_count > 1 or row["message_count"] >= 2,
                "visit_count": visit_count,
                "interests": merged_interests,
                "meaningful_score": round(meaningful, 2),
            }

    def get_viewer_profile(
        self,
        *,
        viewer_id: str | None = None,
        viewer_handle: str | None = None,
        viewer_name: str | None = None,
    ) -> dict[str, Any] | None:
        key = make_viewer_key(viewer_id, viewer_handle, viewer_name)
        if not key:
            return None
        with self._lock:
            row = self._conn.execute("SELECT * FROM viewers WHERE viewer_key = ?", (key,)).fetchone()
        if not row:
            return None
        data = dict(row)
        data["interests"] = json.loads(data.pop("interests_json", "[]") or "[]")
        return data

    # --- Interactions, Unanswered Questions, Clip Suggestions ---

    def record_interaction(
        self,
        *,
        session_id: str = "",
        kind: str,
        text: str,
        viewer_id: str | None = None,
        viewer_handle: str | None = None,
        viewer_name: str | None = None,
        answer: str = "",
        answered: bool = False,
        is_host: bool = False,
        latency_ms: int | None = None,
        gift_value: int = 0,
        sources: tuple[str, ...] | list[str] = (),
        interaction_id: str | None = None,
    ) -> str:
        iid = interaction_id or uuid4().hex[:14]
        key = make_viewer_key(viewer_id, viewer_handle, viewer_name) or ""
        tags = extract_topic_tags(f"{text} {answer}")
        topic = tags[0] if tags else ""
        clip_score, clip_reason = compute_clip_score(
            kind, text, answer, is_host=is_host, gift_value=gift_value
        )
        with self._lock:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO interactions (
                    id, session_id, created_at, kind, viewer_key, viewer_name, viewer_handle,
                    text, answer, topic, answered, is_host, latency_ms, clip_score, clip_reason, sources_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    iid, session_id, time.time(), kind, key, (viewer_name or "")[:60],
                    (viewer_handle or "").lstrip("@")[:64], text[:600], answer[:600], topic,
                    int(answered), int(is_host), latency_ms, clip_score, clip_reason,
                    json.dumps(list(sources), ensure_ascii=False),
                ),
            )
            if answered and key:
                self._conn.execute(
                    "UPDATE viewers SET answered_count = answered_count + 1, meaningful_score = meaningful_score + 3.0 WHERE viewer_key = ?",
                    (key,),
                )
            self._conn.commit()
        return iid

    def mark_answered(
        self,
        interaction_id: str,
        *,
        answer: str,
        latency_ms: int | None = None,
        sources: tuple[str, ...] | list[str] = (),
    ) -> None:
        with self._lock:
            row = self._conn.execute(
                "SELECT kind, text, viewer_key, is_host FROM interactions WHERE id = ?",
                (interaction_id,),
            ).fetchone()
            if not row:
                return
            tags = extract_topic_tags(f"{row['text']} {answer}")
            topic = tags[0] if tags else ""
            clip_score, clip_reason = compute_clip_score(
                row["kind"], row["text"], answer, is_host=bool(row["is_host"])
            )
            self._conn.execute(
                """
                UPDATE interactions
                SET answer = ?, answered = 1, latency_ms = ?, topic = COALESCE(NULLIF(?, ''), topic),
                    clip_score = ?, clip_reason = ?, sources_json = ?
                WHERE id = ?
                """,
                (
                    answer[:600], latency_ms, topic, clip_score, clip_reason,
                    json.dumps(list(sources), ensure_ascii=False), interaction_id,
                ),
            )
            if row["viewer_key"]:
                self._conn.execute(
                    "UPDATE viewers SET answered_count = answered_count + 1, meaningful_score = meaningful_score + 3.0 WHERE viewer_key = ?",
                    (row["viewer_key"],),
                )
            self._conn.commit()

    # --- Topic Queue ---

    def list_topics(self, include_completed: bool = False) -> list[dict[str, Any]]:
        query = (
            "SELECT * FROM topic_queue ORDER BY position ASC, created_at ASC"
            if include_completed
            else "SELECT * FROM topic_queue WHERE status IN ('queued', 'active') ORDER BY position ASC, created_at ASC"
        )
        with self._lock:
            rows = self._conn.execute(query).fetchall()
        return [dict(row) for row in rows]

    def add_topics(self, items: list[dict[str, str] | str]) -> list[dict[str, Any]]:
        now = time.time()
        added: list[dict[str, Any]] = []
        with self._lock:
            row = self._conn.execute("SELECT COALESCE(MAX(position), 0) AS pos FROM topic_queue").fetchone()
            pos = int(row["pos"]) if row else 0
            for raw in items:
                if isinstance(raw, str):
                    title, notes = raw.strip()[:160], ""
                else:
                    title = str(raw.get("title", "")).strip()[:160]
                    notes = str(raw.get("notes", "")).strip()[:1000]
                if not title:
                    continue
                pos += 1
                tid = uuid4().hex[:10]
                self._conn.execute(
                    "INSERT INTO topic_queue (id, position, title, notes, status, created_at) VALUES (?, ?, ?, ?, 'queued', ?)",
                    (tid, pos, title, notes, now),
                )
                added.append({"id": tid, "position": pos, "title": title, "notes": notes, "status": "queued"})
            self._conn.commit()
        return added

    def pop_next_topic(self) -> dict[str, Any] | None:
        now = time.time()
        with self._lock:
            self._conn.execute(
                "UPDATE topic_queue SET status = 'completed', completed_at = ? WHERE status = 'active'",
                (now,),
            )
            row = self._conn.execute(
                "SELECT * FROM topic_queue WHERE status = 'queued' ORDER BY position ASC, created_at ASC LIMIT 1"
            ).fetchone()
            if not row:
                self._conn.commit()
                return None
            self._conn.execute("UPDATE topic_queue SET status = 'active' WHERE id = ?", (row["id"],))
            self._conn.commit()
            result = dict(row)
            result["status"] = "active"
            return result

    def clear_topics(self) -> int:
        with self._lock:
            cur = self._conn.execute("DELETE FROM topic_queue WHERE status IN ('queued', 'active')")
            self._conn.commit()
            return cur.rowcount

    # --- Voice Notes ---

    def save_voice_note(self, text: str, *, session_id: str = "", category: str = "idea") -> dict[str, Any]:
        nid = uuid4().hex[:10]
        now = time.time()
        clean = " ".join(text.split())[:1200]
        with self._lock:
            self._conn.execute(
                "INSERT INTO voice_notes (id, session_id, created_at, text, category) VALUES (?, ?, ?, ?, ?)",
                (nid, session_id, now, clean, category[:32]),
            )
            self._conn.commit()
        return {"id": nid, "session_id": session_id, "created_at": now, "text": clean, "category": category, "promoted_to_memory": False}

    def list_voice_notes(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM voice_notes ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(row) for row in rows]

    # --- Analytics & Engagement Dashboard ---

    def get_analytics(self, session_id: str | None = None) -> dict[str, Any]:
        where = "WHERE session_id = ?" if session_id else ""
        params: tuple[Any, ...] = (session_id,) if session_id else ()
        with self._lock:
            interactions = [
                dict(row)
                for row in self._conn.execute(
                    f"SELECT * FROM interactions {where} ORDER BY created_at DESC LIMIT 500", params
                ).fetchall()
            ]
            top_viewers = [
                dict(row)
                for row in self._conn.execute(
                    "SELECT * FROM viewers ORDER BY meaningful_score DESC, question_count DESC LIMIT 12"
                ).fetchall()
            ]
            sessions = self.list_sessions(limit=8)
            notes = self.list_voice_notes(limit=12)

        for v in top_viewers:
            v["interests"] = json.loads(v.pop("interests_json", "[]") or "[]")

        questions = [i for i in interactions if i["kind"] == "question"]
        answered = [i for i in interactions if i["answered"]]
        unanswered = [
            {
                "id": i["id"],
                "viewer_name": i["viewer_name"] or i["viewer_handle"] or "Viewer",
                "text": i["text"],
                "topic": i["topic"],
                "created_at": i["created_at"],
            }
            for i in questions
            if not i["answered"]
        ][:25]
        gifts = [i for i in interactions if i["kind"] == "gift"]
        host_commands = [i for i in interactions if i["is_host"]]
        latencies = [i["latency_ms"] for i in answered if i["latency_ms"] is not None]

        topic_counts: Counter[str] = Counter()
        for item in interactions:
            if item["topic"]:
                topic_counts[item["topic"]] += 2 if item["answered"] else 1
        popular_topics = [{"topic": topic, "score": count} for topic, count in topic_counts.most_common(10)]

        clips = sorted(
            [i for i in interactions if i["clip_score"] >= 45],
            key=lambda i: (i["clip_score"], i["created_at"]),
            reverse=True,
        )[:10]
        clip_suggestions = [
            {
                "id": c["id"],
                "score": c["clip_score"],
                "reason": c["clip_reason"],
                "viewer": c["viewer_name"] or c["viewer_handle"] or "Host",
                "prompt": c["text"],
                "reply": c["answer"],
                "topic": c["topic"],
                "created_at": c["created_at"],
            }
            for c in clips
        ]

        return {
            "session_id": session_id,
            "overview": {
                "total_interactions": len(interactions),
                "questions": len(questions),
                "answered": len(answered),
                "unanswered": len(unanswered),
                "gifts": len(gifts),
                "host_commands": len(host_commands),
                "unique_viewers": len(top_viewers),
                "avg_latency_ms": round(sum(latencies) / len(latencies)) if latencies else None,
            },
            "top_participants": top_viewers,
            "popular_topics": popular_topics,
            "unanswered_questions": unanswered,
            "clip_suggestions": clip_suggestions,
            "recent_sessions": sessions,
            "voice_notes": notes,
            "topic_queue": self.list_topics(),
        }

    def build_deterministic_summary(self, session_id: str) -> str:
        analytics = self.get_analytics(session_id)
        ov = analytics["overview"]
        topics = ", ".join(t["topic"] for t in analytics["popular_topics"][:4]) or "General Q&A"
        top_names = ", ".join(
            (v["viewer_name"] or v["viewer_handle"]) for v in analytics["top_participants"][:3]
        )
        parts = [
            f"LIVE wrapped with {ov['total_interactions']} interactions "
            f"({ov['answered']} answered, {ov['unanswered']} unanswered, {ov['gifts']} gifts).",
            f"Top topics: {topics}.",
        ]
        if top_names:
            parts.append(f"Top participants: {top_names}.")
        if analytics["clip_suggestions"]:
            parts.append(f"Clip candidates flagged: {len(analytics['clip_suggestions'])}.")
        return " ".join(parts)

    # --- Long-Term Knowledge Updates (Local JSON + Optional Notion Write-Back) ---

    def promote_to_knowledge(
        self,
        *,
        title: str,
        text: str,
        kind: str = "memory",
        keywords: list[str] | None = None,
        source: str = "LIVE Studio Approved Insight",
        note_id: str | None = None,
    ) -> dict[str, Any]:
        target_kind = "company" if kind.strip().casefold() == "company" else "memory"
        entry = KnowledgeEntry(
            title=title.strip()[:140],
            text=text.strip()[:1200],
            source=source.strip()[:240],
            keywords=[k.strip()[:40] for k in (keywords or extract_topic_tags(f"{title} {text}")) if k.strip()][:20],
        )
        path = Path(os.getenv("COHOST_KNOWLEDGE_FILE") or "knowledge_base/kittycat-public.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.is_file():
            knowledge = PublicKnowledge.model_validate_json(path.read_bytes())
        else:
            knowledge = PublicKnowledge()

        collection = knowledge.company if target_kind == "company" else knowledge.memory
        collection[:] = [existing for existing in collection if existing.title.casefold() != entry.title.casefold()]
        collection.insert(0, entry)
        del collection[200:]
        path.write_text(knowledge.model_dump_json(indent=2), encoding="utf-8")

        if note_id:
            with self._lock:
                self._conn.execute("UPDATE voice_notes SET promoted_to_memory = 1 WHERE id = ?", (note_id,))
                self._conn.commit()
        return {"saved_path": str(path), "kind": target_kind, "entry": entry.model_dump()}


async def sync_knowledge_to_notion(
    *,
    title: str,
    text: str,
    kind: str = "Memory",
    keywords: list[str] | None = None,
    source: str = "",
) -> dict[str, Any]:
    """Optional write-back to a Notion database when COHOST_NOTION_TOKEN and COHOST_NOTION_DATABASE_ID are set."""
    token = os.getenv("COHOST_NOTION_TOKEN")
    database_id = os.getenv("COHOST_NOTION_DATABASE_ID")
    if not token or not database_id:
        return {"synced": False, "reason": "COHOST_NOTION_TOKEN or COHOST_NOTION_DATABASE_ID not set"}

    properties: dict[str, Any] = {
        "Name": {"title": [{"text": {"content": title[:140]}}]},
        "Answer": {"rich_text": [{"text": {"content": text[:1200]}}]},
        "Public": {"checkbox": True},
        "Kind": {"select": {"name": "Company" if kind.casefold() == "company" else "Memory"}},
    }
    if keywords:
        properties["Keywords"] = {"multi_select": [{"name": k[:40]} for k in keywords[:10]]}
    if source and source.startswith(("http://", "https://")):
        properties["Source"] = {"url": source[:240]}

    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.post(
            "https://api.notion.com/v1/pages",
            headers=headers,
            json={"parent": {"database_id": database_id}, "properties": properties},
        )
        return {
            "synced": resp.is_success,
            "status_code": resp.status_code,
            "page_id": resp.json().get("id") if resp.is_success else None,
        }

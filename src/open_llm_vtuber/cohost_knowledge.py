"""Read-only access to operator-published company facts and long-term memory."""

import asyncio
import json
import os
from pathlib import Path
from time import monotonic
from unicodedata import category, normalize
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from pydantic import BaseModel, ConfigDict, Field

KNOWLEDGE_TOOL_NAME = "lookup_public_knowledge"
KNOWLEDGE_TOOL = {
    "type": "function",
    "function": {
        "name": KNOWLEDGE_TOOL_NAME,
        "description": (
            "Find public, operator-approved company facts and long-term memory. "
            "Use for company or product questions and details from earlier Lives. "
            "Search with a few distinctive topic words, including names. Translate the topic "
            "to English when appropriate and retain the spelling of brand and product names."
        ),
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "minLength": 1, "maxLength": 150}},
            "required": ["query"],
            "additionalProperties": False,
        },
    },
}
MAX_FILE_BYTES = 1024 * 1024
REMOTE_CACHE_SECONDS = 60


class KnowledgeEntry(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=140)
    text: str = Field(min_length=1, max_length=1200)
    source: str = Field(default="", max_length=240)
    keywords: list[str] = Field(default_factory=list, max_length=20)


class PublicKnowledge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: list[KnowledgeEntry] = Field(default_factory=list, max_length=200)
    memory: list[KnowledgeEntry] = Field(default_factory=list, max_length=200)

    def search(self, query: str) -> list[dict[str, str]]:
        terms = _words(query[:150]) - _COMMON_WORDS
        if not terms:
            return []
        ranked = []
        for collection, entries in (("company", self.company), ("memory", self.memory)):
            for entry in entries:
                topic_match = terms & _words(" ".join((entry.title, *entry.keywords)))
                body_match = terms & _words(entry.text)
                matched = topic_match | body_match
                if not matched:
                    continue
                relevance = len(matched) * 3 + len(topic_match) * 2
                ranked.append((relevance, {
                    "collection": collection,
                    "title": entry.title,
                    "text": entry.text,
                    "source": entry.source,
                }))
        ranked.sort(key=lambda row: row[0], reverse=True)
        return [entry for _, entry in ranked[:3]]


def load_public_knowledge() -> PublicKnowledge:
    configured = os.getenv("COHOST_KNOWLEDGE_FILE")
    path = Path(configured or "knowledge_base/kittycat-public.json")
    try:
        with path.open("rb") as file:
            contents = file.read(MAX_FILE_BYTES + 1)
    except FileNotFoundError:
        if configured:
            raise
        return PublicKnowledge()
    if len(contents) > MAX_FILE_BYTES:
        raise ValueError("The company knowledge file exceeds 1 MiB.")
    return PublicKnowledge.model_validate_json(contents)


class PublicKnowledgeStore:
    def __init__(self) -> None:
        self.provider = os.getenv("COHOST_KNOWLEDGE_PROVIDER", "file").strip().lower()
        self._cached: PublicKnowledge | None = None
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def load(self) -> PublicKnowledge:
        if self.provider == "file":
            return await asyncio.to_thread(load_public_knowledge)
        if self._cached is not None and monotonic() < self._expires_at:
            return self._cached
        async with self._lock:
            if self._cached is None or monotonic() >= self._expires_at:
                self._cached = await asyncio.wait_for(self._load_remote(), timeout=8)
                self._expires_at = monotonic() + REMOTE_CACHE_SECONDS
            return self._cached

    async def _load_remote(self) -> PublicKnowledge:
        async with httpx.AsyncClient(timeout=4, follow_redirects=False) as client:
            if self.provider == "notion":
                return await _load_notion(client)
            if self.provider == "crm":
                return await _load_crm(client)
        raise ValueError("Unknown co-host knowledge provider.")


async def _bounded_response(client: httpx.AsyncClient, method: str, url: str, **options) -> bytes:
    async with client.stream(method, url, **options) as response:
        response.raise_for_status()
        contents = bytearray()
        async for chunk in response.aiter_bytes():
            if len(contents) + len(chunk) > MAX_FILE_BYTES:
                raise ValueError("The approved knowledge response exceeds 1 MiB.")
            contents.extend(chunk)
        return bytes(contents)


async def _load_crm(client: httpx.AsyncClient) -> PublicKnowledge:
    url = os.getenv("COHOST_CRM_KNOWLEDGE_URL", "")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Set the CRM knowledge feed to an HTTPS URL.")
    token = os.getenv("COHOST_CRM_API_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return PublicKnowledge.model_validate_json(
        await _bounded_response(client, "GET", url, headers=headers)
    )


async def _load_notion(client: httpx.AsyncClient) -> PublicKnowledge:
    token = os.getenv("COHOST_NOTION_TOKEN")
    data_source = os.getenv("COHOST_NOTION_DATA_SOURCE_ID")
    if not token or not data_source:
        raise ValueError("Set the Notion token and data source ID.")
    url = f"https://api.notion.com/v1/data_sources/{UUID(data_source)}/query"
    headers = {"Authorization": f"Bearer {token}", "Notion-Version": "2025-09-03"}
    params = {"filter_properties": ["Name", "Answer", "Public", "Kind", "Keywords", "Source"]}
    query = {"page_size": 100, "filter": {"property": "Public", "checkbox": {"equals": True}}}
    knowledge = PublicKnowledge()
    for _ in range(4):
        response = json.loads(
            await _bounded_response(client, "POST", url, headers=headers, params=params, json=query)
        )
        for page in response["results"]:
            if page.get("object") != "page" or page.get("archived") or page.get("in_trash"):
                continue
            props = page["properties"]
            if props.get("Public", {}).get("checkbox") is not True:
                continue
            kind = (props.get("Kind", {}).get("select") or {}).get("name", "").casefold()
            title = _notion_text(props.get("Name", {}).get("title", []))[:140]
            answer = _notion_text(props.get("Answer", {}).get("rich_text", []))[:1200]
            if kind not in {"company", "memory"} or not title or not answer:
                continue
            collection = knowledge.company if kind == "company" else knowledge.memory
            if len(collection) < 200:
                collection.append(KnowledgeEntry(
                    title=title,
                    text=answer,
                    source=(props.get("Source", {}).get("url") or "")[:240],
                    keywords=[
                        option["name"] for option in props.get("Keywords", {}).get("multi_select", [])[:20]
                    ],
                ))
        if not response.get("has_more") or not response.get("next_cursor"):
            break
        query["start_cursor"] = response["next_cursor"]
    return knowledge


def _notion_text(pieces: list[dict]) -> str:
    return "".join(piece["plain_text"] for piece in pieces).strip()


_COMMON_WORDS = frozenset(
    "a about an and are can could for had has how in is it of on or please the their "
    "this to was were what when where which who why will with would you your".split()
)


def _words(text: str) -> set[str]:
    normalized = normalize("NFKC", text).casefold()
    return {
        word for word in "".join(
            char if category(char)[0] in "LMN" else " " for char in normalized
        ).split()
        if len(word) > 1 or word.isdigit()
    }

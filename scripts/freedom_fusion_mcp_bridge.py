"""Freedom Fusion Live Read-Only MCP Bridge for Kittycat (Rome's Notion + GoHighLevel CRM).

Connects Kittycat directly to:
  1. Rome's live Notion workspace & data sources via Notion's official MCP endpoint
     (https://mcp.notion.com/mcp) using the authenticated local Notion OAuth token.
  2. Rome's live GoHighLevel CRM (https://services.leadconnectorhq.com,
     location p6xtdncLaUV30Zsj6ITi) using the securely stored Private Integration token.

Safety guarantees for public TikTok LIVE streaming:
  - Strictly read-only (zero mutations, zero emails/SMS sent, zero CRM writes).
  - Strict PII & secret redaction (emails, phone numbers, bearer tokens stripped).
  - Bounded outputs so spoken voice answers stay fast and natural.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

DEFAULT_NOTION_MCP_URL = "https://mcp.notion.com/mcp"
DEFAULT_NOTION_OAUTH_FILE = Path.home() / ".gemini" / "notion_oauth.json"
DEFAULT_GHL_BASE_URL = "https://services.leadconnectorhq.com"
DEFAULT_GHL_LOCATION_ID = "p6xtdncLaUV30Zsj6ITi"
DEFAULT_GHL_TOKEN_FILE = Path(r"C:\FreedomFusion\SocialAutomation\data\local_control\highlevel_token.json")

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)")
_TOKEN_RE = re.compile(r"\b(?:pit-|ntn_|secret_|sk-|Bearer\s+)[A-Za-z0-9._-]{10,}\b")


def sanitize_public_text(text: str, *, max_len: int = 3200) -> str:
    """Redact emails, phone numbers, and tokens, and cap size for fast LLM context."""
    cleaned = _EMAIL_RE.sub("[redacted-email]", text or "")
    cleaned = _PHONE_RE.sub("[redacted-phone]", cleaned)
    cleaned = _TOKEN_RE.sub("[redacted-token]", cleaned)
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len] + "\n...[truncated]"
    return cleaned


def _parse_mcp_http_response(response: httpx.Response) -> dict[str, Any]:
    ct = response.headers.get("content-type", "")
    if "text/event-stream" in ct:
        last_payload: dict[str, Any] | None = None
        for line in response.text.splitlines():
            if line.startswith("data:"):
                raw = line[5:].strip()
                if not raw:
                    continue
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        last_payload = parsed
                except ValueError:
                    continue
        if last_payload is not None:
            return last_payload
        raise RuntimeError("Empty SSE response from Notion MCP.")
    return response.json()


class NotionMCPProxy:
    """Thin authenticated Streamable-HTTP client for Rome's official Notion MCP server."""

    def __init__(self) -> None:
        self.url = os.getenv("NOTION_MCP_URL", DEFAULT_NOTION_MCP_URL).strip()
        self.oauth_file = Path(os.getenv("NOTION_MCP_OAUTH_FILE", str(DEFAULT_NOTION_OAUTH_FILE)))
        self._session_id: str | None = None
        self._req_id = 0
        self._lock = asyncio.Lock()

    def _load_oauth(self) -> dict[str, Any]:
        env_token = os.getenv("NOTION_MCP_ACCESS_TOKEN", "").strip()
        if env_token:
            return {"access_token": env_token}
        if not self.oauth_file.is_file():
            raise RuntimeError(f"Notion OAuth file not found at {self.oauth_file}.")
        return json.loads(self.oauth_file.read_text(encoding="utf-8"))

    async def _refresh_oauth(self, client: httpx.AsyncClient, oauth: dict[str, Any]) -> str | None:
        refresh_token = oauth.get("refresh_token")
        client_id = oauth.get("client_id")
        if not refresh_token or not client_id:
            return None
        token_url = os.getenv("NOTION_MCP_TOKEN_URL", "https://mcp.notion.com/token")
        resp = await client.post(
            token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
            },
            timeout=12,
        )
        if resp.status_code != 200:
            return None
        updated = resp.json()
        access_token = updated.get("access_token")
        if not access_token:
            return None
        oauth["access_token"] = access_token
        if updated.get("refresh_token"):
            oauth["refresh_token"] = updated["refresh_token"]
        if updated.get("expires_in"):
            oauth["expires_in"] = updated["expires_in"]
        oauth["acquired_at"] = time.time()
        try:
            self.oauth_file.write_text(json.dumps(oauth, indent=2), encoding="utf-8")
        except OSError:
            pass
        return access_token

    def _next_id(self) -> int:
        self._req_id += 1
        return self._req_id

    async def _ensure_session(self, client: httpx.AsyncClient, token: str) -> str | None:
        if self._session_id:
            return self._session_id
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
        }
        init_payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "kittycat-freedom-fusion-bridge", "version": "1.0.0"},
            },
        }
        resp = await client.post(self.url, headers=headers, json=init_payload, timeout=15)
        if resp.status_code == 401:
            return None
        resp.raise_for_status()
        sid = resp.headers.get("mcp-session-id")
        if sid:
            self._session_id = sid
            await client.post(
                self.url,
                headers={**headers, "mcp-session-id": sid},
                json={"jsonrpc": "2.0", "method": "notifications/initialized"},
                timeout=10,
            )
        return self._session_id or "__stateless__"

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        async with self._lock:
            oauth = self._load_oauth()
            token = (oauth.get("access_token") or "").strip()
            if not token:
                raise RuntimeError("Notion MCP access token is missing.")
            async with httpx.AsyncClient(timeout=20) as client:
                sid = await self._ensure_session(client, token)
                if sid is None:
                    refreshed = await self._refresh_oauth(client, oauth)
                    if not refreshed:
                        raise RuntimeError("Notion MCP token expired and could not be refreshed.")
                    token = refreshed
                    self._session_id = None
                    sid = await self._ensure_session(client, token)
                    if sid is None:
                        raise RuntimeError("Notion MCP authentication failed after token refresh.")

                headers = {
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json, text/event-stream",
                    "Content-Type": "application/json",
                }
                if sid and sid != "__stateless__":
                    headers["mcp-session-id"] = sid

                payload = {
                    "jsonrpc": "2.0",
                    "id": self._next_id(),
                    "method": "tools/call",
                    "params": {"name": tool_name, "arguments": arguments},
                }
                resp = await client.post(self.url, headers=headers, json=payload, timeout=20)
                if resp.status_code in {401, 404}:
                    # Session expired or token expired -> re-init once
                    self._session_id = None
                    if resp.status_code == 401:
                        refreshed = await self._refresh_oauth(client, oauth)
                        if refreshed:
                            token = refreshed
                    sid = await self._ensure_session(client, token)
                    if not sid:
                        raise RuntimeError(f"Notion MCP re-auth failed (HTTP {resp.status_code}).")
                    headers["Authorization"] = f"Bearer {token}"
                    if sid != "__stateless__":
                        headers["mcp-session-id"] = sid
                    resp = await client.post(self.url, headers=headers, json=payload, timeout=20)
                resp.raise_for_status()
                rpc = _parse_mcp_http_response(resp)
                if "error" in rpc:
                    raise RuntimeError(f"Notion MCP error: {rpc['error']}")
                result = rpc.get("result", {})
                content = result.get("content", [])
                texts = [item.get("text", "") for item in content if isinstance(item, dict) and item.get("text")]
                combined = "\n".join(texts).strip()
                try:
                    return json.loads(combined)
                except ValueError:
                    return combined


class HighLevelReadClient:
    """Zero-extra-dependency read-only client for Rome's GoHighLevel CRM (PII-safe)."""

    def __init__(self) -> None:
        self.base_url = os.getenv("HIGHLEVEL_BASE_URL", DEFAULT_GHL_BASE_URL).rstrip("/")
        self.location_id = os.getenv("HIGHLEVEL_LOCATION_ID", DEFAULT_GHL_LOCATION_ID).strip()
        self.token_file = Path(os.getenv("HIGHLEVEL_TOKEN_FILE", str(DEFAULT_GHL_TOKEN_FILE)))

    def _get_token(self) -> str:
        env_tok = os.getenv("HIGHLEVEL_PRIVATE_TOKEN", "").strip()
        if env_tok:
            return env_tok
        if self.token_file.is_file():
            data = json.loads(self.token_file.read_text(encoding="utf-8"))
            tokens = data.get("tokens", {})
            tok = tokens.get(self.location_id) or tokens.get("default")
            if isinstance(tok, str) and tok.strip():
                return tok.strip()
        raise RuntimeError("GoHighLevel Private Integration token is not configured.")

    async def _get(self, path: str, *, version: str = "2021-07-28", params: dict[str, Any] | None = None) -> dict[str, Any]:
        token = self._get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Version": version,
            "Accept": "application/json",
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{self.base_url}{path}", headers=headers, params=params)
            if resp.status_code == 401:
                raise RuntimeError(f"HighLevel scope not granted for {path} (HTTP 401).")
            resp.raise_for_status()
            return resp.json()

    async def list_courses_and_offers(self) -> dict[str, Any]:
        courses_raw = await self._get("/courses/products", version="v3", params={"locationId": self.location_id})
        courses = courses_raw.get("products") or courses_raw.get("courses") or []
        offers: list[dict[str, Any]] = []
        try:
            offers_raw = await self._get("/courses/offers", version="v3", params={"locationId": self.location_id})
            offers = offers_raw.get("offers") or []
        except Exception:
            pass
        return {
            "location_id": self.location_id,
            "courses_count": len(courses),
            "courses": [
                {
                    "id": c.get("id"),
                    "title": (c.get("title") or "").strip(),
                    "description": sanitize_public_text((c.get("description") or "").strip(), max_len=450),
                }
                for c in courses
            ],
            "offers_count": len(offers),
            "offers": [
                {
                    "id": o.get("id"),
                    "title": (o.get("title") or o.get("name") or "").strip(),
                    "price": o.get("price"),
                    "currency": o.get("currency"),
                    "description": sanitize_public_text((o.get("description") or "").strip(), max_len=300),
                }
                for o in offers
            ],
        }

    async def list_pipelines(self) -> dict[str, Any]:
        data = await self._get("/opportunities/pipelines", params={"locationId": self.location_id})
        pipelines = data.get("pipelines") or []
        return {
            "location_id": self.location_id,
            "count": len(pipelines),
            "pipelines": [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "stages": [s.get("name") for s in p.get("stages", []) if s.get("name")],
                }
                for p in pipelines
            ],
        }

    async def list_workflows(self, query: str = "") -> dict[str, Any]:
        data = await self._get("/workflows/", params={"locationId": self.location_id})
        workflows = data.get("workflows") or []
        q = query.strip().casefold()
        if q:
            workflows = [w for w in workflows if q in (w.get("name") or "").casefold()]
        return {
            "location_id": self.location_id,
            "total_matching": len(workflows),
            "workflows": [
                {"name": w.get("name"), "status": w.get("status")}
                for w in workflows[:30]
            ],
        }

    async def list_email_templates(self) -> dict[str, Any]:
        data = await self._get("/emails/builder", params={"locationId": self.location_id})
        builders = data.get("builders") or []
        return {
            "location_id": self.location_id,
            "count": len(builders),
            "templates": [
                {"name": (b.get("name") or "").strip(), "lastUpdated": b.get("lastUpdated")}
                for b in builders[:25]
            ],
        }

    async def crm_summary(self) -> dict[str, Any]:
        courses_info, pipelines_info, workflows_info, templates_info = await asyncio.gather(
            self.list_courses_and_offers(),
            self.list_pipelines(),
            self.list_workflows(),
            self.list_email_templates(),
            return_exceptions=True,
        )
        contacts_total = None
        try:
            c_raw = await self._get("/contacts/", params={"locationId": self.location_id, "limit": 1})
            meta = c_raw.get("meta") if isinstance(c_raw.get("meta"), dict) else {}
            if meta.get("total") is not None:
                contacts_total = int(meta["total"])
            elif c_raw.get("total") is not None:
                contacts_total = int(c_raw["total"])
        except Exception:
            pass
        return {
            "location_id": self.location_id,
            "crm_name": "Freedom Fusion System (GoHighLevel)",
            "courses_count": courses_info["courses_count"] if isinstance(courses_info, dict) else 0,
            "offers_count": courses_info["offers_count"] if isinstance(courses_info, dict) else 0,
            "pipelines_count": pipelines_info["count"] if isinstance(pipelines_info, dict) else 0,
            "pipeline_names": [p["name"] for p in pipelines_info["pipelines"]] if isinstance(pipelines_info, dict) else [],
            "workflows_count": workflows_info["total_matching"] if isinstance(workflows_info, dict) else 0,
            "email_templates_count": templates_info["count"] if isinstance(templates_info, dict) else 0,
            "contacts_total": contacts_total,
            "pii_policy": "strictly_redacted_read_only",
        }


notion_proxy = NotionMCPProxy()
ghl_client = HighLevelReadClient()

mcp = FastMCP(
    "freedom_fusion",
    instructions=(
        "Read-only, PII-safe bridge to Rome Wells's Freedom Fusion Notion workspace "
        "(pages and data sources) and GoHighLevel CRM (courses, offers, pipelines, workflows)."
    ),
)


@mcp.tool()
async def notion_search_workspace(query: str, limit: int = 6) -> str:
    """Search Rome's live Freedom Fusion Notion workspace for pages, offers, courses, or databases."""
    try:
        res = await notion_proxy.call_tool("notion-search", {"query": query[:120], "page_size": max(1, min(limit, 12))})
        if isinstance(res, dict) and "results" in res:
            slim = [
                {
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "type": item.get("type"),
                    "path": item.get("path", ""),
                    "url": item.get("url", ""),
                    "data_source_url": item.get("parent_data_source_url", ""),
                    "highlight": sanitize_public_text(item.get("highlight", ""), max_len=280),
                }
                for item in res.get("results", [])[: max(1, min(limit, 12))]
            ]
            return json.dumps({"results": slim}, ensure_ascii=False)
        return sanitize_public_text(json.dumps(res, ensure_ascii=False) if isinstance(res, dict) else str(res))
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def notion_read_page(page_id_or_url: str) -> str:
    """Read a Notion page, database, or collection:// data source schema from Rome's workspace."""
    try:
        res = await notion_proxy.call_tool("notion-fetch", {"id": page_id_or_url.strip()})
        if isinstance(res, dict):
            summary = {
                "title": res.get("title", ""),
                "url": res.get("url", ""),
                "path": res.get("path", ""),
                "text": sanitize_public_text(str(res.get("text", "")), max_len=3000),
            }
            return json.dumps(summary, ensure_ascii=False)
        return sanitize_public_text(str(res), max_len=3000)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def notion_query_data_source(data_source_url: str, sql_query: str = "", limit: int = 12) -> str:
    """Query a Notion data source (collection://...) in Rome's workspace. Leave sql_query empty to list rows."""
    try:
        ds = data_source_url.strip()
        if not ds.startswith("collection://"):
            return json.dumps({"error": "data_source_url must start with 'collection://'. Call notion_read_page on the database first to get it."})
        if sql_query.strip():
            args = {"data": {"mode": "sql", "data_source_urls": [ds], "query": sql_query.strip()}}
        else:
            args = {"data": {"mode": "rows", "data_source_url": ds, "limit": max(1, min(limit, 25))}}
        res = await notion_proxy.call_tool("notion-query-data-sources", args)
        return sanitize_public_text(json.dumps(res, ensure_ascii=False) if isinstance(res, dict) else str(res), max_len=3200)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def ghl_list_courses() -> str:
    """List Rome's live GoHighLevel CRM membership courses and offers (public-safe)."""
    try:
        data = await ghl_client.list_courses_and_offers()
        return json.dumps(data, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def ghl_list_pipelines() -> str:
    """List Rome's live GoHighLevel CRM pipelines and stages (PII-free)."""
    try:
        data = await ghl_client.list_pipelines()
        return json.dumps(data, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def ghl_list_workflows(query: str = "") -> str:
    """List or search Rome's live GoHighLevel CRM automation workflows."""
    try:
        data = await ghl_client.list_workflows(query=query)
        return json.dumps(data, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def ghl_list_email_templates() -> str:
    """List Rome's live GoHighLevel CRM email template names."""
    try:
        data = await ghl_client.list_email_templates()
        return json.dumps(data, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
async def ghl_crm_summary() -> str:
    """Get a live high-level summary of Rome's Freedom Fusion GoHighLevel CRM (courses, pipelines, workflows, contact count; zero PII)."""
    try:
        data = await ghl_client.crm_summary()
        return json.dumps(data, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


async def sync_public_knowledge_cache(output_path: Path | None = None) -> dict[str, Any]:
    """Pull public-safe Freedom Fusion facts from live GHL CRM + live Notion into kittycat-public.json."""
    repo_root = Path(__file__).resolve().parents[1]
    target = output_path or Path(os.getenv("COHOST_KNOWLEDGE_FILE") or (repo_root / "knowledge_base" / "kittycat-public.json"))
    target.parent.mkdir(parents=True, exist_ok=True)

    # Start from existing public knowledge or example template
    base_data: dict[str, list[dict[str, Any]]] = {"company": [], "memory": []}
    seed = target if target.is_file() else (repo_root / "config_templates" / "kittycat-public.example.json")
    if seed.is_file():
        try:
            loaded = json.loads(seed.read_text(encoding="utf-8"))
            base_data["company"] = list(loaded.get("company") or [])
            base_data["memory"] = list(loaded.get("memory") or [])
        except Exception:
            pass

    existing_titles = {e.get("title", "").casefold(): idx for idx, e in enumerate(base_data["company"])}

    def upsert_company(title: str, text: str, source: str, keywords: list[str]) -> None:
        clean_title = title.strip()[:140]
        clean_text = sanitize_public_text(" ".join(text.split()), max_len=1100).strip()
        if not clean_title or not clean_text:
            return
        entry = {
            "title": clean_title,
            "text": clean_text,
            "source": source[:240],
            "keywords": [k.strip()[:40] for k in keywords if k.strip()][:15],
        }
        key = clean_title.casefold()
        if key in existing_titles:
            base_data["company"][existing_titles[key]] = entry
        else:
            existing_titles[key] = len(base_data["company"])
            base_data["company"].append(entry)

    ghl_synced = 0
    notion_synced = 0
    errors: list[str] = []

    # 1. Live GoHighLevel CRM public courses & offers
    try:
        crm = await ghl_client.list_courses_and_offers()
        course_titles = [c["title"] for c in crm.get("courses", []) if c.get("title")]
        if course_titles:
            upsert_company(
                "Freedom Fusion GoHighLevel Courses & Programs",
                "Freedom Fusion System hosts " + str(len(course_titles)) + " courses and programs in GoHighLevel CRM, including: " + "; ".join(course_titles[:11]) + ".",
                "Freedom Fusion GoHighLevel CRM (Live)",
                ["courses", "programs", "gohighlevel", "crm", "freedom fusion", "offers", "onboarding", "learn"],
            )
            ghl_synced += 1
        for course in crm.get("courses", []):
            if course.get("title") and course.get("description"):
                upsert_company(
                    f"Course: {course['title']}",
                    course["description"],
                    "Freedom Fusion GoHighLevel CRM (Live)",
                    ["course", "freedom fusion", "crm", *[w for w in re.findall(r"[A-Za-z0-9+]{3,}", course["title"])[:8]]],
                )
                ghl_synced += 1
        for offer in crm.get("offers", []):
            if offer.get("title"):
                desc = offer.get("description") or f"Available offer in Freedom Fusion CRM ({offer.get('price') or 'see link'})."
                upsert_company(
                    f"CRM Offer: {offer['title']}",
                    desc,
                    "Freedom Fusion GoHighLevel CRM (Live)",
                    ["offer", "crm", "freedom fusion", *[w for w in re.findall(r"[A-Za-z0-9+]{3,}", offer["title"])[:8]]],
                )
                ghl_synced += 1
    except Exception as exc:
        errors.append(f"ghl: {exc}")

    # 2. Live Notion public Freedom Fusion pages
    notion_public_pages = [
        ("ec778d84-cece-4200-8463-0feccaf7d660", "Freedom Fusion System Mission", ["mission", "freedom fusion", "side hustlers", "feudal lords", "about"]),
        ("f740ed70-4659-4828-840e-49ba9bf79a2c", "Freedom Fusion Offers & Path", ["offers", "freedom fusion path", "digital marketing", "ai", "ugc", "automations"]),
        ("43a2506e-0e40-41ec-ade2-5d23c65236bb", "Premium Freedom Fusion Path", ["premium", "path", "affiliate", "community", "tiktok shop", "mentoring"]),
        ("7c290df8-0a62-4043-a926-3fb11a380891", "Freedom Fusion Land & Workshops", ["freedom fusion land", "workshop", "booster", "small business", "feudal lord", "boost"]),
    ]
    for page_id, label, keywords in notion_public_pages:
        try:
            page = await notion_proxy.call_tool("notion-fetch", {"id": page_id})
            raw_text = page.get("text", "") if isinstance(page, dict) else str(page)
            # Extract content between <content>...</content> and strip XML/image/mention markup
            match = re.search(r"<content>(.*?)</content>", raw_text, re.DOTALL)
            body = match.group(1) if match else raw_text
            body = re.sub(r"<[^>]+>", " ", body)
            body = re.sub(r"https?://\S+", "", body)
            body = " ".join(body.split())
            if body:
                upsert_company(label, body[:900], "Rome's Freedom Fusion Notion (Live)", keywords)
                notion_synced += 1
        except Exception as exc:
            errors.append(f"notion({label}): {exc}")

    target.write_text(json.dumps(base_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {
        "ok": True,
        "saved_path": str(target),
        "company_entries": len(base_data["company"]),
        "memory_entries": len(base_data["memory"]),
        "ghl_synced": ghl_synced,
        "notion_synced": notion_synced,
        "errors": errors,
    }


if __name__ == "__main__":
    if "--sync" in sys.argv:
        print(json.dumps(asyncio.run(sync_public_knowledge_cache()), indent=2))
    else:
        mcp.run(transport="stdio")

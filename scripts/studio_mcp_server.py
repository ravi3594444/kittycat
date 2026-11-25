"""MCP Server for remote control of Freedom Fusion AI LIVE Studio (OBS, Whiskers, Pushcut, Analytics).

Usage:
  Stdio (Claude Desktop / Antigravity / OpenClaw):
    uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python scripts/studio_mcp_server.py

  Remote Streamable HTTP (ChatGPT / ThreadsGPT over Cloudflare Tunnel or Tailscale):
    uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python scripts/studio_mcp_server.py --transport streamable-http --port 12399
"""

from __future__ import annotations

import argparse
import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

STUDIO_URL = os.getenv("STUDIO_BASE_URL", "http://127.0.0.1:12393").rstrip("/")

mcp = FastMCP("freedom-fusion-live-studio")


def _headers() -> dict[str, str]:
    token = (os.getenv("STUDIO_CONTROL_TOKEN") or os.getenv("COHOST_COMMENT_TOKEN") or "").strip()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _call(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{os.getenv('STUDIO_BASE_URL', STUDIO_URL).rstrip('/')}{path}"
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.request(method, url, headers=_headers(), json=payload)
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text}
        if not resp.is_success:
            return {"ok": False, "status_code": resp.status_code, "error": data}
        return data


@mcp.tool()
async def studio_status(check_obs: bool = True) -> dict[str, Any]:
    """Get Freedom Fusion AI LIVE Studio status: active state, AI host, TikTok relay, OBS, and topic queue."""
    return await _call("GET", f"/api/studio/status?check_obs={'true' if check_obs else 'false'}")


@mcp.tool()
async def studio_go_live(
    topic: str = "",
    personality: str = "professor_whiskers",
    handle: str = "",
    auto_speak: bool = True,
    start_obs: bool = False,
    obs_scene: str = "",
    start_virtual_cam: bool = False,
    start_recording: bool = False,
    start_stream: bool = False,
    launch_tiktok_studio: bool = False,
    speak_intro: bool = True,
    notify_pushcut: bool = True,
) -> dict[str, Any]:
    """Prepare and start Freedom Fusion AI LIVE Studio, switch Whiskers' topic/personality, start OBS/relay, and notify iPhone via Pushcut."""
    return await _call(
        "POST",
        "/api/studio/go-live",
        {
            "topic": topic,
            "personality": personality,
            "handle": handle,
            "auto_speak": auto_speak,
            "start_obs": start_obs,
            "obs_scene": obs_scene,
            "start_virtual_cam": start_virtual_cam,
            "start_recording": start_recording,
            "start_stream": start_stream,
            "launch_tiktok_studio": launch_tiktok_studio,
            "speak_intro": speak_intro,
            "notify_pushcut": notify_pushcut,
        },
    )


@mcp.tool()
async def studio_stop_live(
    generate_summary: bool = True,
    stop_obs_stream: bool = True,
    stop_obs_record: bool = True,
    notify_pushcut: bool = True,
) -> dict[str, Any]:
    """Stop the LIVE session, stop relay/OBS recording, generate and persist the post-LIVE summary, and notify iPhone."""
    return await _call(
        "POST",
        "/api/studio/stop",
        {
            "generate_summary": generate_summary,
            "stop_obs_stream": stop_obs_stream,
            "stop_obs_record": stop_obs_record,
            "notify_pushcut": notify_pushcut,
        },
    )


@mcp.tool()
async def studio_restart_live(topic: str = "", personality: str = "professor_whiskers") -> dict[str, Any]:
    """Remotely restart the Freedom Fusion LIVE Studio session."""
    return await _call("POST", "/api/studio/restart", {"topic": topic, "personality": personality})


@mcp.tool()
async def studio_send_command(command: str) -> dict[str, Any]:
    """Send an authorized host command directly to Professor Whiskers (overrides viewer queue)."""
    return await _call("POST", "/api/studio/command", {"command": command})


@mcp.tool()
async def studio_update_settings(
    personality: str | None = None,
    topic: str | None = None,
    lesson: str | None = None,
    auto_speak: bool | None = None,
    wake_phrase_only: bool | None = None,
    hold: bool | None = None,
) -> dict[str, Any]:
    """Update live studio settings such as AI host personality, auto-speak mode, wake-phrase gating, or mute/hold."""
    payload = {
        k: v
        for k, v in {
            "personality": personality,
            "topic": topic,
            "lesson": lesson,
            "auto_speak": auto_speak,
            "wake_phrase_only": wake_phrase_only,
            "hold": hold,
        }.items()
        if v is not None
    }
    return await _call("POST", "/api/studio/settings", payload)


@mcp.tool()
async def studio_ingest_briefing(text: str, replace_queue: bool = False) -> dict[str, Any]:
    """Turn a long spoken/written host briefing into structured lesson notes and an ordered LIVE topic queue."""
    return await _call("POST", "/api/studio/briefing", {"text": text, "replace_queue": replace_queue})


@mcp.tool()
async def studio_save_voice_note(
    text: str, category: str = "idea", promote_title: str | None = None
) -> dict[str, Any]:
    """Save a spoken host note/instruction and optionally promote it to approved long-term memory."""
    payload: dict[str, Any] = {"text": text, "category": category}
    if promote_title:
        payload["promote_title"] = promote_title
    return await _call("POST", "/api/studio/notes", payload)


@mcp.tool()
async def studio_save_knowledge(
    title: str, text: str, kind: str = "memory", keywords: list[str] | None = None
) -> dict[str, Any]:
    """Save an approved insight into long-term memory (local knowledge library + optional Notion sync)."""
    return await _call(
        "POST",
        "/api/studio/knowledge",
        {"title": title, "text": text, "kind": kind, "keywords": keywords or [], "sync_notion": True},
    )


@mcp.tool()
async def studio_get_analytics(session_id: str | None = None) -> dict[str, Any]:
    """Retrieve engagement dashboard metrics, top participants, popular topics, unanswered questions, clip suggestions, and summaries."""
    suffix = f"?session_id={session_id}" if session_id else ""
    return await _call("GET", f"/api/studio/analytics{suffix}")


@mcp.tool()
async def studio_obs_control(
    action: str, scene_name: str = "", start_virtual_cam: bool = False
) -> dict[str, Any]:
    """Control OBS Studio or TikTok LIVE Studio: status, launch, launch_tiktok, scene, start_stream, stop_stream, start_record, stop_record, start_virtual_cam, stop_virtual_cam."""
    return await _call(
        "POST",
        "/api/studio/obs",
        {"action": action, "scene_name": scene_name, "start_virtual_cam": start_virtual_cam},
    )


@mcp.tool()
async def studio_notify_iphone(title: str, text: str, handle: str = "", url: str = "") -> dict[str, Any]:
    """Send a Pushcut notification to the host's iPhone with a TikTok LIVE quick-join link."""
    return await _call("POST", "/api/studio/notify", {"title": title, "text": text, "handle": handle, "url": url})


def main() -> None:
    parser = argparse.ArgumentParser(description="Freedom Fusion AI LIVE Studio MCP Server")
    parser.add_argument(
        "--transport",
        choices=("stdio", "streamable-http", "sse"),
        default="stdio",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=12399)
    args = parser.parse_args()
    if args.transport == "stdio":
        mcp.run(transport="stdio")
    else:
        mcp.settings.host = args.host
        mcp.settings.port = args.port
        mcp.run(transport=args.transport)


if __name__ == "__main__":
    main()

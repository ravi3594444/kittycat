"""REST API routes for Freedom Fusion AI LIVE Studio remote control, briefings, memory, and analytics."""

from __future__ import annotations

import hmac
import os
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from .studio_controller import StudioController


class GoLiveRequest(BaseModel):
    topic: str = Field(default="", max_length=240)
    personality: str = Field(default="professor_whiskers", max_length=60)
    handle: str = Field(default="", max_length=40)
    auto_speak: bool = True
    wake_phrase_only: bool = False
    start_obs: bool = False
    obs_scene: str = Field(default="", max_length=120)
    start_virtual_cam: bool = False
    start_recording: bool = False
    start_stream: bool = False
    launch_tiktok_studio: bool = False
    start_relay: bool = True
    notify_pushcut: bool = True
    speak_intro: bool = False


class StopLiveRequest(BaseModel):
    generate_summary: bool = True
    stop_obs_stream: bool = True
    stop_obs_record: bool = True
    notify_pushcut: bool = True


class LiveConfirmedRequest(BaseModel):
    handle: str = Field(default="", max_length=40)


class HostCommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=500)
    client_uid: str | None = Field(default=None, max_length=64)
    viewer_name: str = Field(default="Host", max_length=60)


class StudioSettingsRequest(BaseModel):
    personality: str | None = Field(default=None, max_length=60)
    topic: str | None = Field(default=None, max_length=240)
    lesson: str | None = Field(default=None, max_length=4000)
    auto_speak: bool | None = None
    wake_phrase_only: bool | None = None
    hold: bool | None = None
    client_uid: str | None = Field(default=None, max_length=64)


class TopicAddRequest(BaseModel):
    topics: list[dict[str, str] | str] = Field(min_length=1, max_length=20)


class BriefingRequest(BaseModel):
    text: str = Field(min_length=5, max_length=30000)
    replace_queue: bool = False


class VoiceNoteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1200)
    category: str = Field(default="idea", max_length=32)
    promote_title: str | None = Field(default=None, max_length=140)


class KnowledgeUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    text: str = Field(min_length=1, max_length=1200)
    kind: str = Field(default="memory", max_length=20)
    keywords: list[str] = Field(default_factory=list, max_length=20)
    source: str = Field(default="LIVE Studio Approved Insight", max_length=240)
    note_id: str | None = Field(default=None, max_length=32)
    sync_notion: bool = True


class OBSActionRequest(BaseModel):
    action: str = Field(min_length=1, max_length=40)
    scene_name: str = Field(default="", max_length=120)
    start_virtual_cam: bool = False


class NotifyRequest(BaseModel):
    title: str = Field(default="Freedom Fusion LIVE", max_length=120)
    text: str = Field(min_length=1, max_length=400)
    handle: str = Field(default="", max_length=40)
    url: str = Field(default="", max_length=300)


def _require_studio_auth(
    request: Request,
    authorization: str = Header(default=""),
    x_studio_token: str = Header(default=""),
) -> None:
    expected = (os.getenv("STUDIO_CONTROL_TOKEN") or os.getenv("COHOST_COMMENT_TOKEN") or "").strip()
    if not expected:
        client_host = request.client.host if request.client else ""
        proxied = bool(
            request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
        )
        if not proxied and client_host in {"127.0.0.1", "::1", "localhost", "testclient"}:
            return
        raise HTTPException(
            503,
            "Set STUDIO_CONTROL_TOKEN or COHOST_COMMENT_TOKEN before remote studio access.",
        )

    supplied = x_studio_token.strip()
    if not supplied and authorization.lower().startswith("bearer "):
        supplied = authorization[7:].strip()
    if not supplied or not hmac.compare_digest(supplied.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(401, "Invalid studio control token.")


def init_studio_routes(controller: StudioController) -> APIRouter:
    """Create and return API routes for the Freedom Fusion AI LIVE Studio control plane."""
    router = APIRouter(prefix="/api/studio", tags=["studio"], dependencies=[Depends(_require_studio_auth)])

    @router.get("/status")
    async def studio_status(check_obs: bool = False) -> dict[str, Any]:
        return await controller.get_status(check_obs=check_obs)

    @router.post("/go-live")
    async def studio_go_live(body: GoLiveRequest) -> dict[str, Any]:
        return await controller.go_live(**body.model_dump())

    @router.post("/stop")
    async def studio_stop(body: StopLiveRequest) -> dict[str, Any]:
        return await controller.stop_live(**body.model_dump())

    @router.post("/restart")
    async def studio_restart(body: GoLiveRequest) -> dict[str, Any]:
        return await controller.restart_live(**body.model_dump())

    @router.post("/live-confirmed")
    async def studio_live_confirmed(body: LiveConfirmedRequest) -> dict[str, Any]:
        return await controller.confirm_tiktok_live(handle=body.handle)

    @router.post("/command")
    async def studio_command(body: HostCommandRequest) -> dict[str, Any]:
        if not controller.ws_handler:
            raise HTTPException(503, "Avatar WebSocket handler is unavailable.")
        outcome = await controller.ws_handler.execute_host_command(
            body.client_uid, body.command, viewer_name=body.viewer_name
        )
        return {"ok": outcome != "no_session", "result": outcome}

    @router.post("/settings")
    async def studio_settings(body: StudioSettingsRequest) -> dict[str, Any]:
        if not controller.ws_handler:
            raise HTTPException(503, "Avatar WebSocket handler is unavailable.")
        if body.personality:
            controller.personality = body.personality.strip().lower()
        return await controller.ws_handler.apply_studio_settings(**body.model_dump())

    @router.get("/topics")
    async def studio_list_topics(include_completed: bool = False) -> dict[str, Any]:
        return {"topics": controller.store.list_topics(include_completed=include_completed)}

    @router.post("/topics")
    async def studio_add_topics(body: TopicAddRequest) -> dict[str, Any]:
        added = controller.store.add_topics(body.topics)
        return {"added": added, "topics": controller.store.list_topics()}

    @router.post("/topics/next")
    async def studio_next_topic() -> dict[str, Any]:
        if controller.ws_handler and controller.ws_handler.cohost_sessions:
            outcome = await controller.ws_handler.execute_host_command(None, "!next")
            return {"ok": outcome == "next_topic", "result": outcome, "topics": controller.store.list_topics()}
        nxt = controller.store.pop_next_topic()
        return {"ok": nxt is not None, "active_topic": nxt, "topics": controller.store.list_topics()}

    @router.delete("/topics")
    async def studio_clear_topics() -> dict[str, Any]:
        cleared = controller.store.clear_topics()
        return {"cleared": cleared}

    @router.post("/briefing")
    async def studio_briefing(body: BriefingRequest) -> dict[str, Any]:
        return await controller.ingest_briefing(body.text, replace_queue=body.replace_queue)

    @router.get("/notes")
    async def studio_list_notes(limit: int = 30) -> dict[str, Any]:
        return {"notes": controller.store.list_voice_notes(limit=min(max(limit, 1), 100))}

    @router.post("/notes")
    async def studio_save_note(body: VoiceNoteRequest) -> dict[str, Any]:
        note = controller.store.save_voice_note(
            body.text, session_id=controller.active_session_id or "", category=body.category
        )
        promoted = None
        if body.promote_title:
            promoted = await controller.save_approved_insight(
                title=body.promote_title,
                text=body.text,
                kind="memory",
                note_id=note["id"],
            )
        return {"note": note, "promoted": promoted}

    @router.post("/knowledge")
    async def studio_save_knowledge(body: KnowledgeUpdateRequest) -> dict[str, Any]:
        return await controller.save_approved_insight(**body.model_dump())

    @router.post("/sync-sources")
    async def studio_sync_sources() -> dict[str, Any]:
        from scripts.freedom_fusion_mcp_bridge import sync_public_knowledge_cache
        return await sync_public_knowledge_cache()

    @router.get("/analytics")
    async def studio_analytics(session_id: str | None = None) -> dict[str, Any]:
        return controller.store.get_analytics(session_id=session_id)

    @router.post("/obs")
    async def studio_obs(body: OBSActionRequest) -> dict[str, Any]:
        action = body.action.strip().lower()
        if action == "status":
            return await controller.obs.get_status()
        if action == "launch":
            return controller.obs.launch_obs(start_virtual_cam=body.start_virtual_cam)
        if action == "launch_tiktok":
            return controller.obs.launch_tiktok_studio()
        if action == "scene" and body.scene_name:
            return await controller.obs.request("SetCurrentProgramScene", {"sceneName": body.scene_name})
        action_map = {
            "start_stream": "StartStream",
            "stop_stream": "StopStream",
            "start_record": "StartRecord",
            "stop_record": "StopRecord",
            "start_virtual_cam": "StartVirtualCam",
            "stop_virtual_cam": "StopVirtualCam",
        }
        req_type = action_map.get(action)
        if not req_type:
            raise HTTPException(400, f"Unsupported OBS action: {action}")
        return await controller.obs.request(req_type)

    @router.post("/notify")
    async def studio_notify(body: NotifyRequest) -> dict[str, Any]:
        return await controller.pushcut.send(
            title=body.title,
            text=body.text,
            handle=body.handle or controller.tiktok_handle,
            control_url=controller.control_url,
            url_override=body.url,
        )

    return router

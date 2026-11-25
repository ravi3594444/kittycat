"""Remote LIVE studio controller: OBS WebSocket v5, Pushcut iPhone alerts, TikTok relay supervisor, and briefings."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
from contextlib import suppress
from pathlib import Path
from typing import Any
from urllib.parse import quote
from uuid import uuid4

import httpx
from loguru import logger

from .studio_store import StudioStore, sync_knowledge_to_notion

DEFAULT_OBS_EXE = Path(r"C:\Program Files\obs-studio\bin\64bit\obs64.exe")
DEFAULT_TIKTOK_STUDIO_EXE = Path(r"C:\Program Files\TikTok LIVE Studio\TikTok LIVE Studio.exe")

PERSONALITY_MAP = {
    "professor_whiskers": "professor_whiskers.yaml",
    "teacher": "professor_whiskers.yaml",
    "whiskers": "professor_whiskers.yaml",
    "comedian": "whiskers_comedian.yaml",
    "whiskers_comedian": "whiskers_comedian.yaml",
    "tech": "whiskers_tech_expert.yaml",
    "tech_expert": "whiskers_tech_expert.yaml",
    "whiskers_tech_expert": "whiskers_tech_expert.yaml",
    "cohost": "whiskers_cohost.yaml",
    "co-host": "whiskers_cohost.yaml",
    "whiskers_cohost": "whiskers_cohost.yaml",
    "little_cat": "pawsrig.yaml",
    "pawsrig": "pawsrig.yaml",
}


def tiktok_live_links(handle: str) -> dict[str, str]:
    clean = handle.strip().lstrip("@")
    if not clean:
        return {"universal_url": "", "deep_link": ""}
    encoded = quote(clean, safe="._")
    return {
        "universal_url": f"https://www.tiktok.com/@{encoded}/live",
        "deep_link": f"tiktok://live?user_id={encoded}",
    }


class PushcutNotifier:
    """Sends iOS push notifications via Pushcut Web API with TikTok quick-join actions."""

    def __init__(self) -> None:
        self.webhook_url = os.getenv("PUSHCUT_WEBHOOK_URL", "").strip()
        self.api_key = os.getenv("PUSHCUT_API_KEY", "").strip()
        self.notification_name = os.getenv("PUSHCUT_NOTIFICATION_NAME", "FreedomFusionLive").strip()

    @property
    def configured(self) -> bool:
        return bool(self.webhook_url or (self.api_key and self.notification_name))

    def build_payload(
        self,
        *,
        title: str,
        text: str,
        handle: str = "",
        control_url: str = "",
        url_override: str = "",
    ) -> dict[str, Any]:
        links = tiktok_live_links(handle)
        primary_url = url_override or links["universal_url"] or control_url
        payload: dict[str, Any] = {"title": title[:120], "text": text[:400]}
        if primary_url:
            payload["url"] = primary_url
            payload["defaultAction"] = {"url": primary_url}
        actions: list[dict[str, str]] = []
        if links["universal_url"]:
            actions.append({"name": "Join TikTok LIVE", "url": links["universal_url"]})
        if links["deep_link"]:
            actions.append({"name": "Open in TikTok App", "url": links["deep_link"]})
        if control_url:
            actions.append({"name": "Open Studio Control", "url": control_url})
        if actions:
            payload["actions"] = actions
        return payload

    async def send(
        self,
        *,
        title: str,
        text: str,
        handle: str = "",
        control_url: str = "",
        url_override: str = "",
    ) -> dict[str, Any]:
        links = tiktok_live_links(handle)
        payload = self.build_payload(
            title=title, text=text, handle=handle, control_url=control_url, url_override=url_override
        )
        # Re-read env dynamically so operators can set keys without reconstructing notifier
        webhook_url = os.getenv("PUSHCUT_WEBHOOK_URL", self.webhook_url).strip()
        api_key = os.getenv("PUSHCUT_API_KEY", self.api_key).strip()
        notification_name = os.getenv("PUSHCUT_NOTIFICATION_NAME", self.notification_name).strip()
        if not webhook_url and not (api_key and notification_name):
            return {
                "sent": False,
                "configured": False,
                "reason": "Set PUSHCUT_API_KEY (and optional PUSHCUT_NOTIFICATION_NAME) or PUSHCUT_WEBHOOK_URL.",
                "links": links,
                "payload": payload,
            }
        endpoint = webhook_url or f"https://api.pushcut.io/v1/notifications/{quote(notification_name)}"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["API-Key"] = api_key
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
            return {
                "sent": response.is_success,
                "configured": True,
                "status_code": response.status_code,
                "links": links,
            }
        except httpx.HTTPError as exc:
            logger.warning("Pushcut notification failed ({})", type(exc).__name__)
            return {
                "sent": False,
                "configured": True,
                "error": f"{type(exc).__name__}: {exc}",
                "links": links,
            }


class OBSController:
    """Lightweight async OBS WebSocket v5 client (zero extra pip deps beyond websockets)."""

    def __init__(self) -> None:
        self.host = os.getenv("OBS_WS_HOST", "127.0.0.1")
        self.port = int(os.getenv("OBS_WS_PORT", "4455"))
        self.password = os.getenv("OBS_WS_PASSWORD", "")

    @staticmethod
    def _compute_auth(password: str, salt: str, challenge: str) -> str:
        secret = base64.b64encode(hashlib.sha256((password + salt).encode("utf-8")).digest()).decode("ascii")
        return base64.b64encode(hashlib.sha256((secret + challenge).encode("utf-8")).digest()).decode("ascii")

    async def request(self, request_type: str, request_data: dict[str, Any] | None = None, *, timeout: float = 3.0) -> dict[str, Any]:
        import websockets

        host = os.getenv("OBS_WS_HOST", self.host)
        port = int(os.getenv("OBS_WS_PORT", str(self.port)))
        password = os.getenv("OBS_WS_PASSWORD", self.password)
        uri = f"ws://{host}:{port}"

        try:
            async with websockets.connect(uri, open_timeout=timeout, close_timeout=2) as ws:
                hello = json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))
                if hello.get("op") != 0:
                    return {"ok": False, "error": "Unexpected OBS WebSocket handshake."}
                identify_data: dict[str, Any] = {"rpcVersion": 1}
                auth = (hello.get("d") or {}).get("authentication")
                if auth:
                    identify_data["authentication"] = self._compute_auth(
                        password, auth["salt"], auth["challenge"]
                    )
                await ws.send(json.dumps({"op": 1, "d": identify_data}))
                identified = json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))
                if identified.get("op") != 2:
                    return {"ok": False, "error": "OBS authentication failed. Check OBS_WS_PASSWORD."}

                req_id = uuid4().hex[:10]
                req_body: dict[str, Any] = {"requestType": request_type, "requestId": req_id}
                if request_data:
                    req_body["requestData"] = request_data
                await ws.send(json.dumps({"op": 6, "d": req_body}))

                while True:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))
                    if msg.get("op") == 7 and (msg.get("d") or {}).get("requestId") == req_id:
                        status = msg["d"].get("requestStatus", {})
                        return {
                            "ok": bool(status.get("result")),
                            "code": status.get("code"),
                            "comment": status.get("comment", ""),
                            "data": msg["d"].get("responseData") or {},
                        }
        except Exception as exc:
            return {"ok": False, "error": f"OBS unavailable ({type(exc).__name__}: {exc})"}

    async def get_status(self) -> dict[str, Any]:
        version = await self.request("GetVersion")
        if not version.get("ok"):
            detail = (
                version.get("error")
                or version.get("comment")
                or (f"OBS request status code {version.get('code')}" if version.get("code") else "OBS WebSocket not reachable")
            )
            return {"connected": False, "error": detail}
        stream = await self.request("GetStreamStatus")
        record = await self.request("GetRecordStatus")
        scene = await self.request("GetCurrentProgramScene")
        vcam = await self.request("GetVirtualCamStatus")
        return {
            "connected": True,
            "obs_version": version.get("data", {}).get("obsVersion", ""),
            "scene": scene.get("data", {}).get("currentProgramSceneName", ""),
            "streaming": bool(stream.get("data", {}).get("outputActive")),
            "recording": bool(record.get("data", {}).get("outputActive")),
            "virtual_cam": bool(vcam.get("data", {}).get("outputActive")),
        }

    def launch_obs(self, *, start_virtual_cam: bool = False) -> dict[str, Any]:
        exe = Path(os.getenv("OBS_EXE_PATH", str(DEFAULT_OBS_EXE)))
        if not exe.is_file():
            return {"launched": False, "error": f"OBS executable not found at {exe}"}
        args = [str(exe), "--minimize-to-tray"]
        if start_virtual_cam:
            args.append("--startvirtualcam")
        proc = subprocess.Popen(args, cwd=str(exe.parent))
        return {"launched": True, "pid": proc.pid, "exe": str(exe)}

    def launch_tiktok_studio(self) -> dict[str, Any]:
        exe = Path(os.getenv("TIKTOK_STUDIO_EXE_PATH", str(DEFAULT_TIKTOK_STUDIO_EXE)))
        if not exe.is_file():
            return {"launched": False, "error": f"TikTok LIVE Studio not found at {exe}"}
        proc = subprocess.Popen([str(exe)], cwd=str(exe.parent))
        return {"launched": True, "pid": proc.pid, "exe": str(exe)}


class TikTokRelaySupervisor:
    """Starts, supervises, and automatically recovers scripts/tiktok_live_relay.py."""

    def __init__(self, script_path: Path | None = None) -> None:
        self.script_path = script_path or (Path(__file__).resolve().parents[2] / "scripts" / "tiktok_live_relay.py")
        self.handle: str = ""
        self.process: asyncio.subprocess.Process | None = None
        self._monitor_task: asyncio.Task | None = None
        self._stop_requested = False
        self.restarts = 0
        self.last_error = ""

    @property
    def running(self) -> bool:
        return bool(self.process and self.process.returncode is None)

    def status(self) -> dict[str, Any]:
        return {
            "running": self.running,
            "handle": self.handle,
            "pid": self.process.pid if self.running and self.process else None,
            "restarts": self.restarts,
            "last_error": self.last_error,
        }

    async def start(self, handle: str, *, server_url: str, token: str) -> dict[str, Any]:
        clean_handle = handle.strip().lstrip("@")
        if not re.fullmatch(r"[a-zA-Z0-9_.]{1,24}", clean_handle):
            return {"started": False, "error": "Invalid TikTok handle."}
        await self.stop()
        self.handle = clean_handle
        self._stop_requested = False
        self.restarts = 0
        self.last_error = ""
        self._monitor_task = asyncio.create_task(self._supervise(clean_handle, server_url, token))
        await asyncio.sleep(0.05)
        return {"started": True, **self.status()}

    async def _supervise(self, handle: str, server_url: str, token: str) -> None:
        import importlib.util
        import shutil

        comment_url = f"{server_url.rstrip('/')}/api/cohost/comments"
        studio_url = f"{server_url.rstrip('/')}/api/studio/live-confirmed"
        env = {**os.environ, "COHOST_COMMENT_TOKEN": token}
        backoff = 3.0
        has_tiktok_pkg = importlib.util.find_spec("TikTokLive") is not None
        uv_bin = shutil.which("uv")
        while not self._stop_requested:
            try:
                if has_tiktok_pkg or not uv_bin:
                    cmd = [
                        sys.executable,
                        str(self.script_path),
                        f"@{handle}",
                        "--url",
                        comment_url,
                        "--studio-url",
                        studio_url,
                    ]
                else:
                    cmd = [
                        uv_bin,
                        "run",
                        "--no-config",
                        "--script",
                        str(self.script_path),
                        f"@{handle}",
                        "--url",
                        comment_url,
                        "--studio-url",
                        studio_url,
                    ]
                self.process = await asyncio.create_subprocess_exec(
                    *cmd,
                    env=env,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )
                logger.info("Started TikTok relay PID={} for @{}", self.process.pid, handle)
                out_bytes, _ = await self.process.communicate()
                code = self.process.returncode
                if self._stop_requested:
                    break
                tail = (out_bytes or b"").decode("utf-8", errors="replace").strip().splitlines()
                tail_msg = f" ({tail[-1][:140]})" if tail else ""
                self.restarts += 1
                self.last_error = f"Relay exited with code {code}{tail_msg}; auto-recovering in {int(backoff)}s."
                logger.warning(self.last_error)
            except Exception as exc:
                self.restarts += 1
                self.last_error = f"Relay launch failed ({type(exc).__name__}: {exc})"
                logger.warning(self.last_error)
            await asyncio.sleep(backoff)
            backoff = min(30.0, backoff * 1.5)

    async def stop(self) -> dict[str, Any]:
        self._stop_requested = True
        if self.process and self.process.returncode is None:
            with suppress(ProcessLookupError):
                self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=3)
            except asyncio.TimeoutError:
                with suppress(ProcessLookupError):
                    self.process.kill()
        if self._monitor_task and not self._monitor_task.done():
            self._monitor_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._monitor_task
        self.process = None
        self._monitor_task = None
        return {"stopped": True}


def split_briefing_into_topics(briefing_text: str, max_topics: int = 8) -> dict[str, Any]:
    """Deterministic fallback that turns a 10-minute briefing transcript into structured lesson notes + topic queue."""
    cleaned = " ".join(briefing_text.split()).strip()
    if not cleaned:
        return {"lesson_summary": "", "topics": []}

    # Split on explicit bullet/numbered lines or sentence clusters
    raw_lines = [line.strip(" -*•\t") for line in briefing_text.splitlines() if line.strip()]
    topics: list[dict[str, str]] = []
    if len(raw_lines) >= 2:
        for line in raw_lines:
            if len(line) < 6:
                continue
            title = re.sub(r"^\d+[\).:\-\s]+", "", line).split(".")[0][:120].strip()
            if title:
                topics.append({"title": title, "notes": line[:600]})
            if len(topics) >= max_topics:
                break
    else:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if len(s.strip()) > 10]
        chunk_size = max(1, (len(sentences) + max_topics - 1) // max_topics)
        for idx in range(0, len(sentences), chunk_size):
            chunk = " ".join(sentences[idx : idx + chunk_size])
            title = sentences[idx][:100].rstrip(".,;:")
            topics.append({"title": title, "notes": chunk[:600]})
            if len(topics) >= max_topics:
                break

    return {"lesson_summary": cleaned[:1800], "topics": topics}


class StudioController:
    """Orchestrates Freedom Fusion AI LIVE Studio lifecycle, remote commands, OBS, Pushcut, and analytics."""

    def __init__(
        self,
        store: StudioStore,
        ws_handler: Any = None,
        *,
        obs: OBSController | None = None,
        pushcut: PushcutNotifier | None = None,
        relay: TikTokRelaySupervisor | None = None,
    ) -> None:
        self.store = store
        self.ws_handler = ws_handler
        self.obs = obs or OBSController()
        self.pushcut = pushcut or PushcutNotifier()
        self.relay = relay or TikTokRelaySupervisor()
        self.state = "standby"
        self.active_session_id: str | None = None
        self.tiktok_handle = os.getenv("TIKTOK_LIVE_HANDLE", "freedomfusionsystem").lstrip("@")
        self.host_handle = os.getenv("TIKTOK_HOST_HANDLE", "").lstrip("@")
        self.personality = "professor_whiskers"
        self.knowledge_source = os.getenv("COHOST_KNOWLEDGE_PROVIDER", "file").strip().lower()
        self.public_url = os.getenv("STUDIO_PUBLIC_URL", "").rstrip("/")
        self.local_server_url = os.getenv("STUDIO_LOCAL_URL", "http://127.0.0.1:12393").rstrip("/")
        self.live_confirmed_at: float | None = None

    @property
    def control_url(self) -> str:
        return f"{self.public_url}/control" if self.public_url else f"{self.local_server_url}/control"

    def _active_client_uid(self) -> str | None:
        if not self.ws_handler or not getattr(self.ws_handler, "cohost_sessions", None):
            return None
        return next(iter(self.ws_handler.cohost_sessions), None)

    async def get_status(self, *, check_obs: bool = False) -> dict[str, Any]:
        client_uid = self._active_client_uid()
        session = self.ws_handler.cohost_sessions.get(client_uid) if client_uid and self.ws_handler else None
        obs_status = await self.obs.get_status() if check_obs else {"connected": None}
        links = tiktok_live_links(self.tiktok_handle)
        return {
            "state": self.state,
            "active_session_id": self.active_session_id,
            "ai_host": self.personality,
            "tiktok_handle": self.tiktok_handle,
            "host_handle": self.host_handle,
            "knowledge_source": os.getenv("COHOST_KNOWLEDGE_PROVIDER", self.knowledge_source),
            "avatar_connected": client_uid is not None,
            "connected_clients": len(self.ws_handler.cohost_sessions) if self.ws_handler else 0,
            "auto_speak": session.auto_speak if session else False,
            "wake_phrase_only": session.wake_phrase_only if session else False,
            "hold": session.hold if session else False,
            "active_topic": session.active_topic if session else "",
            "lesson": session.lesson if session else "",
            "review_queue_size": len(session.items) if session else 0,
            "topic_queue": self.store.list_topics(),
            "relay": self.relay.status(),
            "obs": obs_status,
            "pushcut_configured": self.pushcut.configured,
            "tiktok_links": links,
            "control_url": self.control_url,
            "live_confirmed_at": self.live_confirmed_at,
        }

    async def go_live(
        self,
        *,
        topic: str = "",
        personality: str = "",
        handle: str = "",
        auto_speak: bool = True,
        wake_phrase_only: bool = False,
        start_obs: bool = False,
        obs_scene: str = "",
        start_virtual_cam: bool = False,
        start_recording: bool = False,
        start_stream: bool = False,
        launch_tiktok_studio: bool = False,
        start_relay: bool = True,
        notify_pushcut: bool = True,
        speak_intro: bool = False,
    ) -> dict[str, Any]:
        self.state = "preparing"
        self.live_confirmed_at = None
        if handle:
            self.tiktok_handle = handle.strip().lstrip("@")
        if personality:
            self.personality = personality.strip().lower()

        session_rec = self.store.start_session(
            tiktok_handle=self.tiktok_handle,
            personality=self.personality,
            initial_topic=topic,
            status="preparing",
        )
        self.active_session_id = session_rec["id"]
        if topic:
            self.store.add_topics([{"title": topic, "notes": f"Opening LIVE topic: {topic}"}])
            self.store.pop_next_topic()

        steps: dict[str, Any] = {}

        # Apply settings to active connected Kittycat browser session
        if self.ws_handler:
            steps["avatar_session"] = await self.ws_handler.apply_studio_settings(
                personality=self.personality,
                topic=topic,
                lesson=f"LIVE Topic: {topic}" if topic else None,
                auto_speak=auto_speak,
                wake_phrase_only=wake_phrase_only,
                hold=False,
                session_id=self.active_session_id,
            )

        # Optional OBS automation
        if start_obs or obs_scene or start_virtual_cam or start_recording or start_stream:
            obs_steps: dict[str, Any] = {}
            obs_status = await self.obs.get_status()
            if not obs_status.get("connected") and start_obs:
                obs_steps["launch"] = self.obs.launch_obs(start_virtual_cam=start_virtual_cam)
                await asyncio.sleep(1.0)
                obs_status = await self.obs.get_status()
            obs_steps["status"] = obs_status
            if obs_status.get("connected"):
                if obs_scene:
                    obs_steps["scene"] = await self.obs.request(
                        "SetCurrentProgramScene", {"sceneName": obs_scene}
                    )
                if start_virtual_cam:
                    obs_steps["virtual_cam"] = await self.obs.request("StartVirtualCam")
                if start_recording:
                    obs_steps["recording"] = await self.obs.request("StartRecord")
                if start_stream:
                    obs_steps["stream"] = await self.obs.request("StartStream")
            steps["obs"] = obs_steps

        if launch_tiktok_studio:
            steps["tiktok_studio"] = self.obs.launch_tiktok_studio()

        # Optional managed TikTok comment relay with auto-recovery
        token = os.getenv("COHOST_COMMENT_TOKEN", "")
        if start_relay and self.tiktok_handle and token:
            steps["relay"] = await self.relay.start(
                self.tiktok_handle, server_url=self.local_server_url, token=token
            )
        elif start_relay:
            steps["relay"] = {
                "started": False,
                "reason": "Set COHOST_COMMENT_TOKEN and tiktok_handle to start the relay.",
            }

        self.state = "live"
        self.store.update_session_status(self.active_session_id, "live")

        if speak_intro and self.ws_handler:
            steps["intro"] = await self.ws_handler.trigger_autonomous_intro(topic=topic)

        if notify_pushcut:
            topic_note = f" Topic: {topic}." if topic else ""
            steps["pushcut"] = await self.pushcut.send(
                title="Freedom Fusion LIVE Ready",
                text=f"Professor Whiskers is ready on @{self.tiktok_handle}.{topic_note} Tap to join.",
                handle=self.tiktok_handle,
                control_url=self.control_url,
            )

        return {
            "ok": True,
            "state": self.state,
            "session_id": self.active_session_id,
            "steps": steps,
            "status": await self.get_status(),
        }

    async def confirm_tiktok_live(self, *, handle: str = "") -> dict[str, Any]:
        """Called by tiktok_live_relay.py when TikTok confirms the LIVE room is active."""
        if handle:
            self.tiktok_handle = handle.strip().lstrip("@")
        self.state = "live"
        self.live_confirmed_at = asyncio.get_running_loop().time()
        if self.active_session_id:
            self.store.update_session_status(self.active_session_id, "live")
        pushcut_res = await self.pushcut.send(
            title="🔴 Freedom Fusion is LIVE!",
            text=f"@{self.tiktok_handle} is officially LIVE on TikTok. Tap to join as guest.",
            handle=self.tiktok_handle,
            control_url=self.control_url,
        )
        return {"confirmed": True, "handle": self.tiktok_handle, "pushcut": pushcut_res}

    async def stop_live(
        self,
        *,
        generate_summary: bool = True,
        stop_obs_stream: bool = True,
        stop_obs_record: bool = True,
        notify_pushcut: bool = True,
    ) -> dict[str, Any]:
        self.state = "stopping"
        steps: dict[str, Any] = {}
        steps["relay"] = await self.relay.stop()

        if stop_obs_stream or stop_obs_record:
            obs_status = await self.obs.get_status()
            if obs_status.get("connected"):
                if stop_obs_stream and obs_status.get("streaming"):
                    steps["obs_stream"] = await self.obs.request("StopStream")
                if stop_obs_record and obs_status.get("recording"):
                    steps["obs_record"] = await self.obs.request("StopRecord")

        if self.ws_handler:
            await self.ws_handler.apply_studio_settings(auto_speak=False, hold=True)

        summary = ""
        session_id = self.active_session_id
        analytics: dict[str, Any] = {}
        if session_id:
            analytics = self.store.get_analytics(session_id)
            if generate_summary:
                summary = await self._generate_session_summary(session_id, analytics)
            self.store.end_session(session_id, summary=summary, stats=analytics.get("overview", {}))

        self.state = "standby"
        self.active_session_id = None
        self.live_confirmed_at = None

        if notify_pushcut and summary:
            steps["pushcut"] = await self.pushcut.send(
                title="Freedom Fusion LIVE Wrapped",
                text=summary[:380],
                control_url=self.control_url,
                url_override=self.control_url,
            )

        return {
            "ok": True,
            "state": self.state,
            "ended_session_id": session_id,
            "summary": summary,
            "analytics": analytics.get("overview", {}),
            "steps": steps,
        }

    async def restart_live(self, **go_live_kwargs: Any) -> dict[str, Any]:
        stop_res = await self.stop_live(generate_summary=False, notify_pushcut=False)
        start_res = await self.go_live(**go_live_kwargs)
        return {"ok": True, "stopped": stop_res, "started": start_res}

    async def _generate_session_summary(self, session_id: str, analytics: dict[str, Any]) -> str:
        fallback = self.store.build_deterministic_summary(session_id)
        client_uid = self._active_client_uid()
        if not client_uid or not self.ws_handler:
            return fallback
        context = self.ws_handler.client_contexts.get(client_uid)
        agent = getattr(context, "agent_engine", None)
        if not agent or not getattr(agent, "_supports_cohost_tools", False):
            return fallback
        try:
            brief = {
                "overview": analytics["overview"],
                "popular_topics": analytics["popular_topics"][:6],
                "top_participants": [
                    {"name": v["viewer_name"] or v["viewer_handle"], "questions": v["question_count"]}
                    for v in analytics["top_participants"][:5]
                ],
                "unanswered_questions": [q["text"] for q in analytics["unanswered_questions"][:6]],
                "clip_suggestions": [c["prompt"] for c in analytics["clip_suggestions"][:4]],
            }
            text, _ = await asyncio.wait_for(
                agent._cohost_draft_turn(
                    [{"role": "user", "content": json.dumps(brief, ensure_ascii=False)}],
                    "Write a crisp 2-3 sentence post-LIVE creator summary covering topics, engagement, and top follow-ups.",
                ),
                timeout=12,
            )
            return " ".join((text or "").split())[:600] or fallback
        except Exception:
            return fallback

    async def ingest_briefing(self, text: str, *, replace_queue: bool = False) -> dict[str, Any]:
        """Turn a long spoken/written briefing into structured lesson notes and an ordered Topic Queue."""
        parsed = split_briefing_into_topics(text)
        client_uid = self._active_client_uid()
        if client_uid and self.ws_handler:
            context = self.ws_handler.client_contexts.get(client_uid)
            agent = getattr(context, "agent_engine", None)
            if agent and getattr(agent, "_supports_cohost_tools", False):
                try:
                    prompt = (
                        "Convert this host LIVE briefing into strict JSON: "
                        '{"lesson_summary": "...", "topics": [{"title": "...", "notes": "..."}]}. '
                        "Return 3 to 7 concise, engaging LIVE talking-point topics."
                    )
                    raw, _ = await asyncio.wait_for(
                        agent._cohost_draft_turn(
                            [{"role": "user", "content": text[:12000]}], prompt
                        ),
                        timeout=18,
                    )
                    match = re.search(r"\{.*\}", raw or "", re.S)
                    if match:
                        candidate = json.loads(match.group(0))
                        if isinstance(candidate.get("topics"), list) and candidate["topics"]:
                            parsed = {
                                "lesson_summary": str(candidate.get("lesson_summary", ""))[:1800],
                                "topics": candidate["topics"][:8],
                            }
                except Exception as exc:
                    logger.debug("Using deterministic briefing parser ({})", type(exc).__name__)

        if replace_queue:
            self.store.clear_topics()
        added = self.store.add_topics(parsed["topics"])
        if self.ws_handler and parsed["lesson_summary"]:
            await self.ws_handler.apply_studio_settings(lesson=parsed["lesson_summary"])
        return {
            "lesson_summary": parsed["lesson_summary"],
            "added_topics": added,
            "topic_queue": self.store.list_topics(),
        }

    async def save_approved_insight(
        self,
        *,
        title: str,
        text: str,
        kind: str = "memory",
        keywords: list[str] | None = None,
        source: str = "LIVE Studio Approved Insight",
        note_id: str | None = None,
        sync_notion: bool = True,
    ) -> dict[str, Any]:
        local_res = self.store.promote_to_knowledge(
            title=title, text=text, kind=kind, keywords=keywords, source=source, note_id=note_id
        )
        notion_res = (
            await sync_knowledge_to_notion(
                title=title, text=text, kind=kind, keywords=local_res["entry"]["keywords"], source=source
            )
            if sync_notion
            else {"synced": False, "reason": "Skipped"}
        )
        return {"local": local_res, "notion": notion_res}

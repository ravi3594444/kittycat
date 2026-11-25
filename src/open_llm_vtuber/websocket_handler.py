from typing import Dict, List, Optional, Callable, TypedDict
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json
import os
from functools import partial
from time import monotonic
from urllib.parse import urlsplit
from uuid import uuid4
from enum import Enum
import httpx
import numpy as np
from loguru import logger

from .service_context import ServiceContext
from .cohost import (
    AUTO_REPLY_COOLDOWN_SECONDS,
    AVATAR_MOTIONS,
    CohostSession,
    MOTION_QUEUE_LIMIT,
    MOTION_TIMEOUT_SECONDS,
    ReviewItem,
    ViewerComment,
    VOICE_DEMO_PATH,
    VOICE_DEMO_TEXT,
    VOICE_SAMPLE_DIRECTORY,
    VOICE_SAMPLE_TEXT,
    VOICE_SAMPLES,
    available_motions,
    is_authorized_host,
    motion_shortcut,
    parse_host_command,
)
from .studio_controller import PERSONALITY_MAP
from .studio_store import StudioStore
from .agent.output_types import DisplayText
from .agent.stateless_llm.openai_compatible_llm import ChatProviderError
from .cohost_knowledge import PublicKnowledge, PublicKnowledgeStore
from .conversations.conversation_utils import (
    finalize_conversation_turn,
    send_conversation_start_signals,
)
from .conversations.tts_manager import TTSTaskManager
from .chat_group import (
    ChatGroupManager,
    handle_group_operation,
    handle_client_disconnect,
    broadcast_to_group,
)
from .message_handler import message_handler
from .utils.stream_audio import prepare_audio_payload
from .chat_history_manager import (
    create_new_history,
    get_history,
    delete_history,
    get_history_list,
)
from .config_manager.utils import scan_config_alts_directory, scan_bg_directory
from .conversations.conversation_handler import (
    handle_conversation_trigger,
    handle_group_interrupt,
    handle_individual_interrupt,
)


class MessageType(Enum):
    """Enum for WebSocket message types"""

    GROUP = ["add-client-to-group", "remove-client-from-group"]
    HISTORY = [
        "fetch-history-list",
        "fetch-and-set-history",
        "create-new-history",
        "delete-history",
    ]
    CONVERSATION = ["mic-audio-end", "text-input", "ai-speak-signal"]
    CONFIG = ["fetch-configs", "switch-config"]
    CONTROL = ["interrupt-signal", "audio-play-start"]
    DATA = ["mic-audio-data"]


class WSMessage(TypedDict, total=False):
    """Type definition for WebSocket messages"""

    type: str
    action: Optional[str]
    text: Optional[str]
    audio: Optional[List[float]]
    images: Optional[List[str]]
    history_uid: Optional[str]
    file: Optional[str]
    display_text: Optional[dict]


class WebSocketHandler:
    """Handles WebSocket connections and message routing"""

    def __init__(
        self,
        default_context_cache: ServiceContext,
        studio_store: StudioStore | None = None,
    ):
        """Initialize the WebSocket handler with default context"""
        self.client_connections: Dict[str, WebSocket] = {}
        self.client_contexts: Dict[str, ServiceContext] = {}
        self.chat_group_manager = ChatGroupManager()
        self.current_conversation_tasks: Dict[str, Optional[asyncio.Task]] = {}
        self.default_context_cache = default_context_cache
        self.received_data_buffers: Dict[str, np.ndarray] = {}
        self.asr_streams: dict[str, object] = {}
        self.cohost_sessions: dict[str, CohostSession] = {}
        self.cohost_drafts: dict[str, asyncio.Task] = {}
        self.cohost_motion_tasks: dict[str, asyncio.Task] = {}
        self.cohost_auto_tasks: dict[str, asyncio.Task] = {}
        self.cohost_knowledge = PublicKnowledgeStore()
        self.studio_store = studio_store or StudioStore()
        self.studio_controller = None
        self.blocked_terms = tuple(
            term.strip().casefold()
            for term in os.getenv("COHOST_BLOCKED_TERMS", "").split(",")
            if term.strip()
        )
        raw_hosts = ",".join(
            val for val in (os.getenv("COHOST_HOST_HANDLES", ""), os.getenv("TIKTOK_HOST_HANDLE", "")) if val
        )
        self.host_handles = frozenset(
            h.strip().lstrip("@").casefold() for h in raw_hosts.split(",") if h.strip()
        )
        self.host_ids = frozenset(
            i.strip() for i in os.getenv("COHOST_HOST_USER_IDS", "").split(",") if i.strip()
        )

        # Message handlers mapping
        self._message_handlers = self._init_message_handlers()

    def _init_message_handlers(self) -> Dict[str, Callable]:
        """Initialize message type to handler mapping"""
        return {
            "add-client-to-group": self._handle_group_operation,
            "remove-client-from-group": self._handle_group_operation,
            "request-group-info": self._handle_group_info,
            "fetch-history-list": self._handle_history_list_request,
            "fetch-and-set-history": self._handle_fetch_history,
            "create-new-history": self._handle_create_history,
            "delete-history": self._handle_delete_history,
            "interrupt-signal": self._handle_interrupt,
            "mic-audio-data": self._handle_audio_data,
            "mic-audio-end": self._handle_conversation_trigger,
            "raw-audio-data": self._handle_raw_audio_data,
            "text-input": self._handle_conversation_trigger,
            "ai-speak-signal": self._handle_conversation_trigger,
            "fetch-configs": self._handle_fetch_configs,
            "switch-config": self._handle_config_switch,
            "fetch-backgrounds": self._handle_fetch_backgrounds,
            "audio-play-start": self._handle_audio_play_start,
            "request-init-config": self._handle_init_config_request,
            "heartbeat": self._handle_heartbeat,
            "viewer-comment": self._handle_viewer_comment,
            "cohost-control": self._handle_cohost_control,
        }

    async def handle_new_connection(
        self, websocket: WebSocket, client_uid: str
    ) -> None:
        """
        Handle new WebSocket connection setup

        Args:
            websocket: The WebSocket connection
            client_uid: Unique identifier for the client

        Raises:
            Exception: If initialization fails
        """
        try:
            session_service_context = await self._init_service_context(
                websocket.send_text, client_uid
            )

            await self._store_client_data(
                websocket, client_uid, session_service_context
            )

            await self._send_initial_messages(
                websocket, client_uid, session_service_context
            )

            logger.info(f"Connection established for client {client_uid}")

        except Exception as e:
            logger.error(
                f"Failed to initialize connection for client {client_uid}: {e}"
            )
            await self._cleanup_failed_connection(client_uid)
            raise

    async def _store_client_data(
        self,
        websocket: WebSocket,
        client_uid: str,
        session_service_context: ServiceContext,
    ):
        """Store client data and initialize group status"""
        self.client_connections[client_uid] = websocket
        self.client_contexts[client_uid] = session_service_context
        self.cohost_sessions[client_uid] = CohostSession()
        self.received_data_buffers[client_uid] = np.array([])

        self.chat_group_manager.client_group_map[client_uid] = ""
        await self.send_group_update(websocket, client_uid)

    async def _send_initial_messages(
        self,
        websocket: WebSocket,
        client_uid: str,
        session_service_context: ServiceContext,
    ):
        """Send initial connection messages to the client"""
        await websocket.send_text(
            json.dumps({"type": "full-text", "text": "Connection established"})
        )

        await websocket.send_text(
            json.dumps(
                {
                    "type": "set-model-and-conf",
                    "model_info": session_service_context.live2d_model.model_info,
                    "conf_name": session_service_context.character_config.conf_name,
                    "conf_uid": session_service_context.character_config.conf_uid,
                    "client_uid": client_uid,
                }
            )
        )

        # Send initial group status
        await self.send_group_update(websocket, client_uid)

        await websocket.send_json(self.cohost_sessions[client_uid].status())

        # Start microphone
        await websocket.send_text(json.dumps({"type": "control", "text": "start-mic"}))

    async def _init_service_context(
        self, send_text: Callable, client_uid: str
    ) -> ServiceContext:
        """Initialize service context for a new session by cloning the default context"""
        session_service_context = ServiceContext()
        session_service_context.set_fish_audio_http_client(
            self.default_context_cache.fish_audio_http_client
        )
        await session_service_context.load_cache(
            config=self.default_context_cache.config.model_copy(deep=True),
            system_config=self.default_context_cache.system_config.model_copy(
                deep=True
            ),
            character_config=self.default_context_cache.character_config.model_copy(
                deep=True
            ),
            live2d_model=self.default_context_cache.live2d_model,
            asr_engine=self.default_context_cache.asr_engine,
            tts_engine=self.default_context_cache.tts_engine,
            vad_engine=self.default_context_cache.vad_engine,
            translate_engine=self.default_context_cache.translate_engine,
            mcp_server_registery=self.default_context_cache.mcp_server_registery,
            tool_adapter=self.default_context_cache.tool_adapter,
            send_text=send_text,
            client_uid=client_uid,
        )
        return session_service_context

    async def handle_websocket_communication(
        self, websocket: WebSocket, client_uid: str
    ) -> None:
        """
        Handle ongoing WebSocket communication

        Args:
            websocket: The WebSocket connection
            client_uid: Unique identifier for the client
        """
        try:
            while True:
                try:
                    data = await websocket.receive_json()
                    if not isinstance(data, dict):
                        await websocket.send_json({"type": "error", "message": "Expected a JSON object."})
                        continue
                    message_handler.handle_message(client_uid, data)
                    await self._route_message(websocket, client_uid, data)
                except WebSocketDisconnect:
                    raise
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    continue
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": "Unable to process this message."})
                    )
                    continue

        except WebSocketDisconnect:
            logger.info(f"Client {client_uid} disconnected")
            raise
        except Exception as e:
            logger.error(f"Fatal error in WebSocket communication: {e}")
            raise

    async def _route_message(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """
        Route incoming message to appropriate handler

        Args:
            websocket: The WebSocket connection
            client_uid: Client identifier
            data: Message data
        """
        msg_type = data.get("type")
        if not msg_type:
            logger.warning("Message received without type")
            return

        handler = self._message_handlers.get(msg_type)
        if handler:
            await handler(websocket, client_uid, data)
        else:
            if msg_type != "frontend-playback-complete":
                logger.warning(f"Unknown message type: {msg_type}")

    async def _handle_group_operation(
        self, websocket: WebSocket, client_uid: str, data: dict
    ) -> None:
        """Handle group-related operations"""
        operation = data.get("type")
        target_uid = data.get(
            "invitee_uid" if operation == "add-client-to-group" else "target_uid"
        )

        await handle_group_operation(
            operation=operation,
            client_uid=client_uid,
            target_uid=target_uid,
            chat_group_manager=self.chat_group_manager,
            client_connections=self.client_connections,
            send_group_update=self.send_group_update,
        )

    async def handle_disconnect(self, client_uid: str) -> None:
        """Handle client disconnection"""
        group = self.chat_group_manager.get_client_group(client_uid)
        if group:
            await handle_group_interrupt(
                group_id=group.group_id,
                heard_response="",
                current_conversation_tasks=self.current_conversation_tasks,
                chat_group_manager=self.chat_group_manager,
                client_contexts=self.client_contexts,
                broadcast_to_group=self.broadcast_to_group,
            )

        await handle_client_disconnect(
            client_uid=client_uid,
            chat_group_manager=self.chat_group_manager,
            client_connections=self.client_connections,
            send_group_update=self.send_group_update,
        )

        # Clean up other client data
        self.client_connections.pop(client_uid, None)
        context = self.client_contexts.pop(client_uid, None)
        self.cohost_sessions.pop(client_uid, None)
        draft = self.cohost_drafts.pop(client_uid, None)
        if draft:
            draft.cancel()
        motion_task = self.cohost_motion_tasks.pop(client_uid, None)
        if motion_task:
            motion_task.cancel()
        auto_task = self.cohost_auto_tasks.pop(client_uid, None)
        if auto_task:
            auto_task.cancel()
        asr_stream = self.asr_streams.pop(client_uid, None)
        if asr_stream is not None:
            await asr_stream.close()
        self.received_data_buffers.pop(client_uid, None)
        if client_uid in self.current_conversation_tasks:
            task = self.current_conversation_tasks[client_uid]
            if task and not task.done():
                task.cancel()
            self.current_conversation_tasks.pop(client_uid, None)

        # Call context close to clean up resources (e.g., MCPClient)
        if context:
            await context.close()

        logger.info(f"Client {client_uid} disconnected")
        message_handler.cleanup_client(client_uid)

    async def _cleanup_failed_connection(self, client_uid: str) -> None:
        """Clean up failed connection data"""
        self.client_connections.pop(client_uid, None)
        self.client_contexts.pop(client_uid, None)
        asr_stream = self.asr_streams.pop(client_uid, None)
        if asr_stream is not None:
            await asr_stream.close()
        self.received_data_buffers.pop(client_uid, None)
        self.chat_group_manager.client_group_map.pop(client_uid, None)
        self.cohost_sessions.pop(client_uid, None)
        motion_task = self.cohost_motion_tasks.pop(client_uid, None)
        if motion_task:
            motion_task.cancel()

        if client_uid in self.current_conversation_tasks:
            task = self.current_conversation_tasks[client_uid]
            if task and not task.done():
                task.cancel()
            self.current_conversation_tasks.pop(client_uid, None)

        message_handler.cleanup_client(client_uid)

    async def broadcast_to_group(
        self, group_members: list[str], message: dict, exclude_uid: str = None
    ) -> None:
        """Broadcasts a message to group members"""
        await broadcast_to_group(
            group_members=group_members,
            message=message,
            client_connections=self.client_connections,
            exclude_uid=exclude_uid,
        )

    async def send_group_update(self, websocket: WebSocket, client_uid: str):
        """Sends group information to a client"""
        group = self.chat_group_manager.get_client_group(client_uid)
        if group:
            current_members = self.chat_group_manager.get_group_members(client_uid)
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "group-update",
                        "members": current_members,
                        "is_owner": group.owner_uid == client_uid,
                    }
                )
            )
        else:
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "group-update",
                        "members": [],
                        "is_owner": False,
                    }
                )
            )

    async def _handle_interrupt(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle conversation interruption"""
        heard_response = data.get("text", "")
        context = self.client_contexts[client_uid]
        group = self.chat_group_manager.get_client_group(client_uid)

        if group and len(group.members) > 1:
            await handle_group_interrupt(
                group_id=group.group_id,
                heard_response=heard_response,
                current_conversation_tasks=self.current_conversation_tasks,
                chat_group_manager=self.chat_group_manager,
                client_contexts=self.client_contexts,
                broadcast_to_group=self.broadcast_to_group,
            )
        else:
            await handle_individual_interrupt(
                client_uid=client_uid,
                current_conversation_tasks=self.current_conversation_tasks,
                context=context,
                heard_response=heard_response,
            )

    async def _handle_history_list_request(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle request for chat history list"""
        context = self.client_contexts[client_uid]
        histories = get_history_list(context.character_config.conf_uid)
        await websocket.send_text(
            json.dumps({"type": "history-list", "histories": histories})
        )

    async def _handle_fetch_history(
        self, websocket: WebSocket, client_uid: str, data: dict
    ):
        """Handle fetching and setting specific chat history"""
        history_uid = data.get("history_uid")
        if not history_uid:
            return

        context = self.client_contexts[client_uid]
        # Update history_uid in service context
        context.history_uid = history_uid
        context.agent_engine.set_memory_from_history(
            conf_uid=context.character_config.conf_uid,
            history_uid=history_uid,
        )

        messages = [
            msg
            for msg in get_history(
                context.character_config.conf_uid,
                history_uid,
            )
            if msg["role"] != "system"
        ]
        await websocket.send_text(
            json.dumps({"type": "history-data", "messages": messages})
        )

    async def _handle_create_history(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle creation of new chat history"""
        context = self.client_contexts[client_uid]
        history_uid = create_new_history(context.character_config.conf_uid)
        if history_uid:
            context.history_uid = history_uid
            context.agent_engine.set_memory_from_history(
                conf_uid=context.character_config.conf_uid,
                history_uid=history_uid,
            )
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "new-history-created",
                        "history_uid": history_uid,
                    }
                )
            )

    async def _handle_delete_history(
        self, websocket: WebSocket, client_uid: str, data: dict
    ):
        """Handle deletion of chat history"""
        history_uid = data.get("history_uid")
        if not history_uid:
            return

        context = self.client_contexts[client_uid]
        success = delete_history(
            context.character_config.conf_uid,
            history_uid,
        )
        await websocket.send_text(
            json.dumps(
                {
                    "type": "history-deleted",
                    "success": success,
                    "history_uid": history_uid,
                }
            )
        )
        if history_uid == context.history_uid:
            context.history_uid = None

    async def _handle_audio_data(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle incoming audio data and stream live into AssemblyAI when enabled."""
        audio_data = data.get("audio", [])
        if audio_data:
            if self.received_data_buffers[client_uid].size + len(audio_data) > 60 * 16000:
                self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
                stream = self.asr_streams.get(client_uid)
                if stream is not None:
                    stream.reset_turn()
                raise ValueError("Microphone turn exceeded 60 seconds.")
            chunk_np = np.array(audio_data, dtype=np.float32)
            self.received_data_buffers[client_uid] = np.append(
                self.received_data_buffers[client_uid],
                chunk_np,
            )
            context = self.client_contexts.get(client_uid)
            asr = getattr(context, "asr_engine", None)
            if asr is not None and getattr(asr, "supports_streaming", False):
                stream = self.asr_streams.get(client_uid)
                if stream is None:
                    stream = asr.create_stream_session()
                    self.asr_streams[client_uid] = stream
                await stream.feed_audio(chunk_np)

    async def _handle_raw_audio_data(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle incoming raw audio data for VAD processing"""
        context = self.client_contexts[client_uid]
        chunk = data.get("audio", [])
        if chunk and context.vad_engine:
            for audio_bytes in context.vad_engine.detect_speech(chunk):
                if audio_bytes == b"<|PAUSE|>":
                    await websocket.send_text(
                        json.dumps({"type": "control", "text": "interrupt"})
                    )
                elif audio_bytes == b"<|RESUME|>":
                    pass
                elif len(audio_bytes) > 1024:
                    # Detected audio activity (voice)
                    self.received_data_buffers[client_uid] = np.append(
                        self.received_data_buffers[client_uid],
                        np.frombuffer(audio_bytes, dtype="<i2").astype(np.float32) / 32768,
                    )
                    await websocket.send_text(
                        json.dumps({"type": "control", "text": "mic-audio-end"})
                    )

    async def _handle_conversation_trigger(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle triggers that start a conversation"""
        msg_type = data.get("type")
        if msg_type == "mic-audio-end":
            self.cohost_sessions[client_uid].instructor_speaking = False
        if msg_type == "text-input" and isinstance(data.get("text"), str):
            if shortcut := motion_shortcut(data["text"]):
                await self._play_cohost_motion(client_uid, shortcut)
                return
        if self.cohost_sessions[client_uid].hold:
            if msg_type == "mic-audio-end":
                self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
                stream = self.asr_streams.get(client_uid)
                if stream is not None:
                    stream.reset_turn()
            await websocket.send_json({"type": "control", "text": "conversation-chain-end"})
            return
        if self._cohost_busy(client_uid):
            if msg_type != "mic-audio-end" or not self.received_data_buffers[client_uid].size:
                return
            # Keep a completed microphone turn even if playback never sent its interrupt.
            await self._handle_interrupt(websocket, client_uid, {})
            await websocket.send_json({"type": "interrupt-signal"})
        if msg_type == "mic-audio-end" and self.cohost_sessions[client_uid].wake_phrase_only:
            data = {**data, "metadata": {**(data.get("metadata") or {}), "wake_phrase_only": True}}
        effective_msg_type = data.get("type", "")
        if msg_type == "mic-audio-end":
            stream = self.asr_streams.get(client_uid)
            if stream is not None and stream.connected:
                try:
                    transcript = await stream.finish_turn(wait_timeout=2.0)
                except Exception as exc:
                    logger.warning("Live AssemblyAI turn finalize failed ({}); falling back to buffer", type(exc).__name__)
                    transcript = ""
                if transcript:
                    self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
                    await websocket.send_text(
                        json.dumps({"type": "user-input-transcription", "text": transcript})
                    )
                    effective_msg_type = "text-input"
                    data = {**data, "text": transcript}
        await handle_conversation_trigger(
            msg_type=effective_msg_type,
            data=data,
            client_uid=client_uid,
            context=self.client_contexts[client_uid],
            websocket=websocket,
            client_contexts=self.client_contexts,
            client_connections=self.client_connections,
            chat_group_manager=self.chat_group_manager,
            received_data_buffers=self.received_data_buffers,
            current_conversation_tasks=self.current_conversation_tasks,
            broadcast_to_group=self.broadcast_to_group,
            avatar_motion_handler=partial(self._play_cohost_motion, client_uid),
        )

    def _cohost_busy(self, client_uid: str) -> bool:
        group = self.chat_group_manager.get_client_group(client_uid)
        key = group.group_id if group and len(group.members) > 1 else client_uid
        task = self.current_conversation_tasks.get(key)
        return bool(task and not task.done())

    async def _play_cohost_motion(
        self, client_uid: str, action: str, learned_phrase: str | None = None
    ) -> str:
        session = self.cohost_sessions[client_uid]
        live2d = self.client_contexts[client_uid].live2d_model
        if live2d is None:
            return "unsupported"
        model = live2d.model_info
        group = model.get("motionMap", {}).get(action)
        if not group:
            return "unsupported"
        now = monotonic()
        if now - session.last_motion < 1.2:
            return "cooldown"
        session.last_motion = now
        session.metrics["motions"] += 1
        event = {
            "type": "avatar-motion",
            "model": model["name"],
            "modelPath": urlsplit(model["url"]).path.rsplit("/", 1)[0] + "/",
            "group": group,
            "action": action,
        }
        if learned_phrase is not None and (phrase := session.remember_motion(learned_phrase, action)):
            event["learned_command"] = [phrase, action]
        await self.client_connections[client_uid].send_json(event)
        return "animated"

    async def receive_viewer_comment(self, client_uid: str, comment: ViewerComment) -> str:
        session = self.cohost_sessions[client_uid]
        host = is_authorized_host(comment, self.host_handles, self.host_ids)
        session_id = session.studio_session_id or (
            self.studio_controller.active_session_id if self.studio_controller else ""
        ) or ""
        viewer_info = self.studio_store.record_viewer_activity(
            session_id=session_id,
            viewer_id=comment.viewer_id,
            viewer_handle=comment.viewer_handle,
            viewer_name=comment.viewer_name,
            kind=comment.event_type,
            text=comment.text,
            gift_value=comment.gift_value,
        )
        is_returning = bool(viewer_info.get("is_returning"))

        # Authorized host priority override (e.g., iPhone dictation into TikTok comments or API command)
        if host and comment.event_type == "comment":
            session.metrics["host_commands"] += 1
            interaction_id = self.studio_store.record_interaction(
                session_id=session_id,
                kind="host_command",
                text=comment.text,
                viewer_id=comment.viewer_id,
                viewer_handle=comment.viewer_handle,
                viewer_name=comment.viewer_name or "Host",
                is_host=True,
            )
            return await self.execute_host_command(
                client_uid,
                comment.text,
                viewer_name=comment.viewer_name or "Host",
                viewer_handle=comment.viewer_handle,
                interaction_id=interaction_id,
            )

        interaction_id = ""
        if comment.event_type in {"comment", "gift"}:
            interaction_id = self.studio_store.record_interaction(
                session_id=session_id,
                kind="gift" if comment.event_type == "gift" else "comment",
                text=comment.text,
                viewer_id=comment.viewer_id,
                viewer_handle=comment.viewer_handle,
                viewer_name=comment.viewer_name,
                gift_value=comment.gift_value,
            )

        result = session.ingest(
            comment,
            self.blocked_terms,
            is_host=host,
            is_returning=is_returning,
            interaction_id=interaction_id,
        )
        if result == "unclassified":
            context = self.client_contexts[client_uid]
            if (
                getattr(context.agent_engine, "can_route_avatar_motion", False)
                and context.live2d_model is not None
                and available_motions(context.live2d_model.model_info)
                and len(session.pending_motion_comments) < MOTION_QUEUE_LIMIT
            ):
                session.pending_motion_comments.append((comment, monotonic() + MOTION_TIMEOUT_SECONDS))
                worker = self.cohost_motion_tasks.get(client_uid)
                if not worker or worker.done():
                    self.cohost_motion_tasks[client_uid] = asyncio.create_task(
                        self._resolve_viewer_motions(client_uid, session)
                    )
                result = "checking"
            else:
                result = session.review_unclassified(
                    comment,
                    is_host=host,
                    is_returning=is_returning,
                    interaction_id=interaction_id,
                )
                if result == "queued" and interaction_id:
                    self.studio_store.record_interaction(
                        interaction_id=interaction_id,
                        session_id=session_id,
                        kind="question",
                        text=comment.text,
                        viewer_id=comment.viewer_id,
                        viewer_handle=comment.viewer_handle,
                        viewer_name=comment.viewer_name,
                    )
        return await self._present_viewer_result(client_uid, session, result)

    async def _resolve_viewer_motions(self, client_uid: str, session: CohostSession) -> None:
        while session.pending_motion_comments and self.cohost_sessions.get(client_uid) is session:
            comment, deadline = session.pending_motion_comments.popleft()
            context = self.client_contexts[client_uid]
            motions = available_motions(context.live2d_model.model_info) if context.live2d_model else ()
            time_left = deadline - monotonic()
            action = None
            if time_left > 0 and motions and getattr(context.agent_engine, "can_route_avatar_motion", False):
                try:
                    action = await asyncio.wait_for(
                        context.agent_engine.classify_viewer_motion(comment.text, motions), timeout=time_left
                    )
                except Exception as exc:
                    logger.warning("Motion classification failed ({})", type(exc).__name__)
            if self.cohost_sessions.get(client_uid) is not session:
                return
            if action in motions:
                result = action
            else:
                session_id = session.studio_session_id or (
                    self.studio_controller.active_session_id if self.studio_controller else ""
                ) or ""
                profile = self.studio_store.get_viewer_profile(
                    viewer_id=comment.viewer_id,
                    viewer_handle=comment.viewer_handle,
                    viewer_name=comment.viewer_name,
                )
                is_returning = bool(profile and (profile.get("visit_count", 0) > 1 or profile.get("message_count", 0) >= 2))
                iid = self.studio_store.record_interaction(
                    session_id=session_id,
                    kind="question",
                    text=comment.text,
                    viewer_id=comment.viewer_id,
                    viewer_handle=comment.viewer_handle,
                    viewer_name=comment.viewer_name,
                )
                result = session.review_unclassified(
                    comment, is_returning=is_returning, interaction_id=iid
                )
            await self._present_viewer_result(client_uid, session, result, learned_phrase=comment.text)

    async def _present_viewer_result(
        self, client_uid: str, session: CohostSession, result: str, learned_phrase: str | None = None
    ) -> str:
        if result in AVATAR_MOTIONS:
            result = await self._play_cohost_motion(client_uid, result, learned_phrase)
        elif result == "gift_queued":
            await self._play_cohost_motion(client_uid, "heart")
            result = "queued"
        elif result == "queued" and not session.hold and not self._cohost_busy(client_uid):
            await self._play_cohost_motion(client_uid, "listen")
        await self.client_connections[client_uid].send_json(session.status())
        if result == "queued" and session.auto_speak:
            self._schedule_auto_speak(client_uid)
        return result

    def _schedule_auto_speak(self, client_uid: str) -> None:
        task = self.cohost_auto_tasks.get(client_uid)
        if task and not task.done():
            return
        self.cohost_auto_tasks[client_uid] = asyncio.create_task(self._run_auto_speak(client_uid))

    async def _run_auto_speak(self, client_uid: str) -> None:
        session = self.cohost_sessions.get(client_uid)
        websocket = self.client_connections.get(client_uid)
        if not session or not websocket or not session.auto_speak:
            return
        if session.hold or session.instructor_speaking or self._cohost_busy(client_uid):
            return
        item = session.next_auto_candidate()
        if not item:
            return
        elapsed = monotonic() - session.last_auto_reply
        if not item.is_host and elapsed < AUTO_REPLY_COOLDOWN_SECONDS:
            await asyncio.sleep(max(0.2, AUTO_REPLY_COOLDOWN_SECONDS - elapsed))
            if (
                client_uid not in self.cohost_sessions
                or not session.auto_speak
                or session.hold
                or session.instructor_speaking
                or self._cohost_busy(client_uid)
                or item.id not in session.items
            ):
                return
        if not item.answer:
            await self._draft_cohost(websocket, client_uid, session, item)
        answer = item.answer.strip()
        if not answer or item.id not in session.items:
            return
        session.items.pop(item.id, None)
        session.metrics["approved"] += 1
        session.metrics["auto_spoken"] += 1
        session.last_auto_reply = monotonic()
        if item.kind in {"question", "host"}:
            session.live_replies.append((monotonic(), item.text, answer))
        self.current_conversation_tasks[client_uid] = asyncio.create_task(
            self._speak_cohost(websocket, client_uid, session, item, answer)
        )
        await websocket.send_json(session.status("Auto-answering viewer…"))

    async def apply_studio_settings(
        self,
        *,
        client_uid: str | None = None,
        personality: str | None = None,
        topic: str | None = None,
        lesson: str | None = None,
        auto_speak: bool | None = None,
        wake_phrase_only: bool | None = None,
        hold: bool | None = None,
        session_id: str | None = None,
    ) -> dict:
        target_uid = client_uid or next(iter(self.cohost_sessions), None)
        if not target_uid or target_uid not in self.cohost_sessions:
            return {"applied": False, "reason": "No active avatar browser session connected."}
        session = self.cohost_sessions[target_uid]
        websocket = self.client_connections[target_uid]
        context = self.client_contexts[target_uid]

        if session_id is not None:
            session.studio_session_id = session_id
        if topic is not None:
            session.active_topic = topic.strip()[:180]
        if lesson is not None:
            session.lesson = lesson.strip()[:4000]
        if auto_speak is not None:
            session.auto_speak = auto_speak
        if wake_phrase_only is not None:
            session.wake_phrase_only = wake_phrase_only
        if hold is not None:
            session.hold = hold
            if hold and self._cohost_busy(target_uid):
                await self._handle_interrupt(websocket, target_uid, {})
                await websocket.send_json({"type": "interrupt-signal"})

        switched_personality = None
        if personality:
            yaml_file = PERSONALITY_MAP.get(personality.strip().lower())
            if yaml_file:
                try:
                    await context.handle_config_switch(websocket, yaml_file)
                    session.active_personality = personality.strip().lower()
                    switched_personality = yaml_file
                except Exception as exc:
                    logger.warning("Personality switch to {} failed ({})", yaml_file, type(exc).__name__)

        await websocket.send_json(session.status("Studio settings updated."))
        if session.auto_speak and session.items:
            self._schedule_auto_speak(target_uid)
        return {
            "applied": True,
            "client_uid": target_uid,
            "switched_personality": switched_personality,
            "auto_speak": session.auto_speak,
            "wake_phrase_only": session.wake_phrase_only,
            "hold": session.hold,
            "active_topic": session.active_topic,
        }

    async def trigger_autonomous_intro(self, client_uid: str | None = None, *, topic: str = "") -> dict:
        target_uid = client_uid or next(iter(self.cohost_sessions), None)
        if not target_uid or target_uid not in self.cohost_sessions:
            return {"spoken": False, "reason": "No active avatar session."}
        session = self.cohost_sessions[target_uid]
        websocket = self.client_connections[target_uid]
        active_topic = topic or session.active_topic or "cybersecurity and Network+"
        answer = (
            f"Hey everyone, welcome to Freedom Fusion LIVE! I'm Professor Whiskers, "
            f"and today we're diving into {active_topic}—drop your questions in the chat!"
        )
        item = ReviewItem(uuid4().hex, "intro", f"Introduce {active_topic}", session.lesson, answer=answer, is_host=True)
        await self._play_cohost_motion(target_uid, "wave")
        self.current_conversation_tasks[target_uid] = asyncio.create_task(
            self._speak_cohost(websocket, target_uid, session, item, answer)
        )
        return {"spoken": True, "text": answer}

    async def execute_host_command(
        self,
        client_uid: str | None,
        text: str,
        *,
        viewer_name: str = "Host",
        viewer_handle: str | None = None,
        interaction_id: str = "",
    ) -> str:
        target_uid = client_uid or next(iter(self.cohost_sessions), None)
        if not target_uid or target_uid not in self.cohost_sessions:
            return "no_session"
        session = self.cohost_sessions[target_uid]
        websocket = self.client_connections[target_uid]
        parsed = parse_host_command(text) or {"command": "direct", "arg": text.strip()}
        cmd, arg = parsed["command"], parsed["arg"]

        if cmd == "hold":
            should_hold = arg.lower() in {"on", "true", "1", "yes"}
            await self.apply_studio_settings(client_uid=target_uid, hold=should_hold)
            return "paused" if should_hold else "resumed"
        if cmd == "auto":
            enabled = arg.lower() in {"on", "true", "1", "yes"}
            await self.apply_studio_settings(client_uid=target_uid, auto_speak=enabled)
            return f"auto_{'on' if enabled else 'off'}"
        if cmd == "wake":
            enabled = arg.lower() in {"on", "true", "1", "yes"}
            await self.apply_studio_settings(client_uid=target_uid, wake_phrase_only=enabled)
            return f"wake_{'on' if enabled else 'off'}"
        if cmd == "personality" and arg:
            await self.apply_studio_settings(client_uid=target_uid, personality=arg)
            return f"personality:{arg}"
        if cmd == "topic" and arg:
            self.studio_store.add_topics([{"title": arg, "notes": f"Host topic: {arg}"}])
            self.studio_store.pop_next_topic()
            await self.apply_studio_settings(
                client_uid=target_uid, topic=arg, lesson=f"Current LIVE Topic: {arg}"
            )
            return "topic_updated"
        if cmd == "queue" and arg:
            self.studio_store.add_topics([{"title": arg, "notes": "Queued by host"}])
            await websocket.send_json(session.status(f"Queued topic: {arg}"))
            return "topic_queued"
        if cmd == "next_topic":
            nxt = self.studio_store.pop_next_topic()
            if not nxt:
                await websocket.send_json(session.status("Topic queue is empty."))
                return "queue_empty"
            await self.apply_studio_settings(
                client_uid=target_uid,
                topic=nxt["title"],
                lesson=f"{nxt['title']}: {nxt.get('notes', '')}".strip(": "),
            )
            await self.trigger_autonomous_intro(target_uid, topic=nxt["title"])
            return "next_topic"
        if cmd == "note" and arg:
            self.studio_store.save_voice_note(arg, session_id=session.studio_session_id, category="host")
            await websocket.send_json(session.status("Saved host note."))
            return "note_saved"
        if cmd == "intro":
            await self.trigger_autonomous_intro(target_uid, topic=arg or session.active_topic)
            return "intro_spoken"
        if cmd == "wrap":
            if self.studio_controller:
                await self.studio_controller.stop_live(generate_summary=True, notify_pushcut=True)
            else:
                await self.apply_studio_settings(client_uid=target_uid, hold=True, auto_speak=False)
            return "wrapped"
        if cmd == "say" and arg:
            if self._cohost_busy(target_uid):
                await self._handle_interrupt(websocket, target_uid, {})
                await websocket.send_json({"type": "interrupt-signal"})
            item = ReviewItem(
                uuid4().hex, "host", text, session.lesson, answer=arg[:450],
                viewer_name=viewer_name, viewer_handle=viewer_handle, is_host=True,
                interaction_id=interaction_id,
            )
            self.current_conversation_tasks[target_uid] = asyncio.create_task(
                self._speak_cohost(websocket, target_uid, session, item, arg[:450])
            )
            return "host_spoken"

        # Default: direct host directive -> interrupt non-host speech, draft & speak with priority
        directive = arg or text
        if self._cohost_busy(target_uid):
            await self._handle_interrupt(websocket, target_uid, {})
            await websocket.send_json({"type": "interrupt-signal"})
        item = session.add(
            "question",
            directive,
            viewer_name,
            viewer_handle=viewer_handle,
            is_host=True,
            priority=200,
            interaction_id=interaction_id,
        )
        if not item:
            return "full"
        await self._draft_cohost(websocket, target_uid, session, item)
        answer = item.answer.strip()
        if answer and item.id in session.items:
            session.items.pop(item.id, None)
            session.metrics["approved"] += 1
            session.live_replies.append((monotonic(), directive, answer))
            self.current_conversation_tasks[target_uid] = asyncio.create_task(
                self._speak_cohost(websocket, target_uid, session, item, answer)
            )
            await websocket.send_json(session.status("Answering host command…"))
            return "host_spoken"
        await websocket.send_json(session.status("Host command queued."))
        return "host_queued"

    async def _handle_viewer_comment(self, websocket, client_uid, data):
        await self.receive_viewer_comment(client_uid, ViewerComment.model_validate(data))

    def _prewarm_asr_stream(self, client_uid: str) -> None:
        context = self.client_contexts.get(client_uid)
        asr = getattr(context, "asr_engine", None)
        if asr is None or not getattr(asr, "supports_streaming", False):
            return
        stream = self.asr_streams.get(client_uid)
        if stream is None:
            stream = asr.create_stream_session()
            self.asr_streams[client_uid] = stream
        if not stream.connected and hasattr(stream, "prewarm"):
            asyncio.create_task(stream.prewarm())

    async def _handle_cohost_control(self, websocket, client_uid, data):
        session = self.cohost_sessions[client_uid]
        action = data.get("action")
        item_id = data.get("id")
        item = session.items.get(item_id) if isinstance(item_id, str) else None
        status = ""
        if action == "streaming-audio":
            self.client_contexts[client_uid].pcm_audio_ready = data.get("enabled") is True
        elif action == "restore-motion-memory":
            session.restore_motion_memory(data.get("commands"))
        elif action == "reset-live-memory":
            session.live_replies.clear()
            status = "Memory for this Live cleared."
        elif action == "lesson" and isinstance(data.get("lesson"), str):
            session.lesson = data["lesson"].strip()[:4000]
            status = "Lesson context saved for this session."
        elif action == "floor":
            speaking = data.get("speaking") is True
            session.instructor_speaking = speaking
            if speaking:
                self._prewarm_asr_stream(client_uid)
        elif action == "hold":
            session.hold = data.get("hold") is True
            session.metrics["overrides"] += int(session.hold)
            if session.hold and self._cohost_busy(client_uid):
                await self._handle_interrupt(websocket, client_uid, {})
                await websocket.send_json({"type": "interrupt-signal"})
            status = "Co-host paused." if session.hold else "Co-host ready."
        elif action == "auto-speak":
            session.auto_speak = data.get("enabled") is True
            status = "Autonomous LIVE mode ON." if session.auto_speak else "Manual review mode ON."
            if session.auto_speak and session.items:
                self._schedule_auto_speak(client_uid)
        elif action == "wake-phrase":
            session.wake_phrase_only = data.get("enabled") is True
            status = "Wake phrase ('Hey Whiskers') required for mic." if session.wake_phrase_only else "Open mic mode."
        elif action == "personality" and isinstance(data.get("personality"), str):
            res = await self.apply_studio_settings(client_uid=client_uid, personality=data["personality"])
            status = f"Switched host mode to {data['personality']}." if res.get("switched_personality") else "Unknown personality."
            return
        elif action == "intro":
            await self.trigger_autonomous_intro(client_uid)
            status = "Speaking LIVE introduction…"
        elif action == "next-topic":
            outcome = await self.execute_host_command(client_uid, "!next")
            status = "Advanced to next topic." if outcome == "next_topic" else "Topic queue is empty."
        elif action in {"voice-demo", "voice-sample"}:
            is_demo = action == "voice-demo"
            sample_id = data.get("sample")
            audio_path = VOICE_DEMO_PATH if is_demo else None
            if not is_demo and isinstance(sample_id, str) and sample_id in VOICE_SAMPLES:
                audio_path = VOICE_SAMPLE_DIRECTORY / f"{sample_id}.wav"
            if audio_path is None or not audio_path.is_file():
                status = "That voice recording is unavailable."
            elif session.hold or session.instructor_speaking or self._cohost_busy(client_uid):
                status = "Wait for the floor to be clear before playing the recording."
            else:
                text = VOICE_DEMO_TEXT if is_demo else VOICE_SAMPLE_TEXT
                if not is_demo and sample_id == "laugh":
                    text = f"Ha ha. {text}"
                self.current_conversation_tasks[client_uid] = asyncio.create_task(
                    self._play_voice_recording(websocket, client_uid, session, audio_path, text)
                )
        elif action == "suggest":
            session.add("transition", "Suggest the next lesson transition.")
        elif action == "dismiss" and item:
            session.items.pop(item.id)
            session.metrics["dismissed"] += 1
        elif action == "draft" and item:
            draft = self.cohost_drafts.get(client_uid)
            if draft and not draft.done():
                status = "A draft is already in progress."
            else:
                item.lesson = session.lesson
                self.cohost_drafts[client_uid] = asyncio.create_task(
                    self._draft_cohost(websocket, client_uid, session, item)
                )
                status = "Drafting…"
        elif action == "speak" and item:
            if session.hold or session.instructor_speaking or self._cohost_busy(client_uid):
                status = "Wait for the floor to be clear before speaking."
            else:
                answer = data.get("answer", item.answer)
                if not isinstance(answer, str) or not answer.strip() or len(answer) > 450:
                    status = "Enter a reply of up to 450 characters before approving."
                else:
                    session.items.pop(item.id)
                    session.metrics["approved"] += 1
                    answer = answer.strip()
                    if item.kind == "question":
                        session.live_replies.append((monotonic(), item.text, answer))
                    self.current_conversation_tasks[client_uid] = asyncio.create_task(
                        self._speak_cohost(websocket, client_uid, session, item, answer)
                    )
        await websocket.send_json(session.status(status))

    async def _draft_cohost(self, websocket, client_uid, session, item):
        knowledge_unavailable = False
        try:
            if item.kind == "lesson":
                item.answer = item.lesson[:450] or "The instructor hasn't added lesson notes yet."
            elif item.kind != "acknowledgment":
                agent = self.client_contexts[client_uid].agent_engine
                live_replies = session.recent_approved_replies()
                try:
                    knowledge = await self.cohost_knowledge.load()
                except (OSError, ValueError, httpx.HTTPError, asyncio.TimeoutError) as exc:
                    logger.warning("Could not load approved co-host knowledge ({})", type(exc).__name__)
                    knowledge = PublicKnowledge()
                    knowledge_unavailable = True
                draft, sources = await asyncio.wait_for(
                    agent.draft_cohost(item.text, item.lesson, item.viewer_name, live_replies, knowledge), 25
                )
                if not draft or draft.startswith("Error calling the chat endpoint"):
                    raise ValueError("Empty reply")
                item.answer = draft
                item.sources = sources
            session.metrics["drafts"] += 1
            status = (
                "Company records unavailable. Review the draft before speaking."
                if knowledge_unavailable else "Review the draft before speaking."
            )
        except ChatProviderError as exc:
            session.metrics["draft_errors"] += 1
            status = f"{exc} You can type a reply."
        except Exception as exc:
            logger.warning("Co-host draft failed ({})", type(exc).__name__)
            session.metrics["draft_errors"] += 1
            status = "Draft unavailable. You can type a reply or dismiss the item."
        if client_uid in self.client_connections:
            await websocket.send_json(session.status(status))

    async def _play_voice_recording(self, websocket, client_uid, session, audio_path, text):
        character = self.client_contexts[client_uid].character_config
        display = DisplayText(text, character.character_name, character.avatar)
        tts = TTSTaskManager()
        try:
            payload = await asyncio.to_thread(
                prepare_audio_payload,
                audio_path=str(audio_path),
                display_text=display,
                forwarded=True,
            )
            await send_conversation_start_signals(websocket.send_text)
            await tts.queue_audio_payload(payload, websocket.send_text)
            await finalize_conversation_turn(tts, websocket.send_text, client_uid)
        except (OSError, ValueError):
            await websocket.send_json(session.status("The voice recording could not play."))
        finally:
            tts.clear()

    async def _speak_cohost(self, websocket, client_uid, session, item, answer):
        context = self.client_contexts[client_uid]
        tts = TTSTaskManager(stream_pcm=context.can_stream_pcm)

        async def send(payload: str):
            data = json.loads(payload)
            message_type = data.get("type")
            if message_type in {"audio", "audio-stream-start"}:
                session.last_response_ms = round((monotonic() - item.added_at) * 1000)
                spoken = message_type == "audio-stream-start" or bool(data.get("audio"))
                session.metrics["spoken" if spoken else "caption_fallback"] += 1
            await websocket.send_text(payload)

        try:
            if item.kind in {"welcome", "acknowledgment"}:
                await self._play_cohost_motion(client_uid, "wave")
            elif item.kind == "gift":
                await self._play_cohost_motion(client_uid, "heart")
            elif item.kind == "question":
                await self._play_cohost_motion(client_uid, "explain")
            await send_conversation_start_signals(send)
            character = context.character_config
            await tts.speak(
                answer,
                DisplayText(answer, character.character_name, character.avatar),
                None,
                context.live2d_model,
                context.tts_engine,
                send,
            )
            if getattr(item, "interaction_id", ""):
                self.studio_store.mark_answered(
                    item.interaction_id,
                    answer=answer,
                    latency_ms=session.last_response_ms,
                    sources=item.sources,
                )
            await finalize_conversation_turn(tts, send, client_uid)
        finally:
            tts.clear()
            if self.current_conversation_tasks.get(client_uid) is asyncio.current_task():
                self.current_conversation_tasks[client_uid] = None
        await websocket.send_json(session.status())
        if session.auto_speak and session.items:
            self._schedule_auto_speak(client_uid)

    async def _handle_fetch_configs(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle fetching available configurations"""
        context = self.client_contexts[client_uid]
        config_files = scan_config_alts_directory(context.system_config.config_alts_dir)
        await websocket.send_text(
            json.dumps({"type": "config-files", "configs": config_files})
        )

    async def _handle_config_switch(
        self, websocket: WebSocket, client_uid: str, data: dict
    ):
        """Handle switching to a different configuration"""
        config_file_name = data.get("file")
        if config_file_name:
            context = self.client_contexts[client_uid]
            await context.handle_config_switch(websocket, config_file_name)

    async def _handle_fetch_backgrounds(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle fetching available background images"""
        bg_files = scan_bg_directory()
        await websocket.send_text(
            json.dumps({"type": "background-files", "files": bg_files})
        )

    async def _handle_audio_play_start(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """
        Handle audio playback start notification
        """
        group_members = self.chat_group_manager.get_group_members(client_uid)
        if len(group_members) > 1:
            display_text = data.get("display_text")
            if display_text:
                silent_payload = prepare_audio_payload(
                    audio_path=None,
                    display_text=display_text,
                    actions=None,
                    forwarded=True,
                )
                await self.broadcast_to_group(
                    group_members, silent_payload, exclude_uid=client_uid
                )

    async def _handle_group_info(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle group info request"""
        await self.send_group_update(websocket, client_uid)

    async def _handle_init_config_request(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle request for initialization configuration"""
        context = self.client_contexts.get(client_uid)
        if not context:
            context = self.default_context_cache

        await websocket.send_text(
            json.dumps(
                {
                    "type": "set-model-and-conf",
                    "model_info": context.live2d_model.model_info,
                    "conf_name": context.character_config.conf_name,
                    "conf_uid": context.character_config.conf_uid,
                    "client_uid": client_uid,
                }
            )
        )

    async def _handle_heartbeat(
        self, websocket: WebSocket, client_uid: str, data: WSMessage
    ) -> None:
        """Handle heartbeat messages from clients"""
        try:
            await websocket.send_json({"type": "heartbeat-ack"})
        except Exception as e:
            logger.error(f"Error sending heartbeat acknowledgment: {e}")

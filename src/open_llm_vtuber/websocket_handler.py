from typing import Dict, List, Optional, Callable, TypedDict
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json
import os
from time import monotonic
from urllib.parse import urlsplit
from enum import Enum
import numpy as np
from loguru import logger

from .service_context import ServiceContext
from .cohost import (
    CohostSession,
    MOTION_COMMANDS,
    ViewerComment,
    VOICE_DEMO_PATH,
    VOICE_DEMO_TEXT,
    motion_command,
)
from .agent.output_types import DisplayText
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

    def __init__(self, default_context_cache: ServiceContext):
        """Initialize the WebSocket handler with default context"""
        self.client_connections: Dict[str, WebSocket] = {}
        self.client_contexts: Dict[str, ServiceContext] = {}
        self.chat_group_manager = ChatGroupManager()
        self.current_conversation_tasks: Dict[str, Optional[asyncio.Task]] = {}
        self.default_context_cache = default_context_cache
        self.received_data_buffers: Dict[str, np.ndarray] = {}
        self.cohost_sessions: dict[str, CohostSession] = {}
        self.cohost_drafts: dict[str, asyncio.Task] = {}
        self.blocked_terms = tuple(
            term.strip().casefold()
            for term in os.getenv("COHOST_BLOCKED_TERMS", "").split(",")
            if term.strip()
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
        self.received_data_buffers.pop(client_uid, None)
        self.chat_group_manager.client_group_map.pop(client_uid, None)
        self.cohost_sessions.pop(client_uid, None)

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
        """Handle incoming audio data"""
        audio_data = data.get("audio", [])
        if audio_data:
            if self.received_data_buffers[client_uid].size + len(audio_data) > 60 * 16000:
                self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
                raise ValueError("Microphone turn exceeded 60 seconds.")
            self.received_data_buffers[client_uid] = np.append(
                self.received_data_buffers[client_uid],
                np.array(audio_data, dtype=np.float32),
            )

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
            if command := motion_command(data["text"]):
                await self._play_cohost_motion(client_uid, command)
                return
        if self.cohost_sessions[client_uid].hold:
            if msg_type == "mic-audio-end":
                self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
            await websocket.send_json({"type": "control", "text": "conversation-chain-end"})
            return
        if self._cohost_busy(client_uid):
            if msg_type == "mic-audio-end":
                self.received_data_buffers[client_uid] = np.array([], dtype=np.float32)
            return
        await handle_conversation_trigger(
            msg_type=data.get("type", ""),
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
        )

    def _cohost_busy(self, client_uid: str) -> bool:
        group = self.chat_group_manager.get_client_group(client_uid)
        key = group.group_id if group and len(group.members) > 1 else client_uid
        task = self.current_conversation_tasks.get(key)
        return bool(task and not task.done())

    async def _play_cohost_motion(self, client_uid: str, action: str) -> str:
        session = self.cohost_sessions[client_uid]
        model = self.client_contexts[client_uid].live2d_model.model_info
        group = model.get("motionMap", {}).get(action)
        if not group:
            return "unsupported"
        now = monotonic()
        if now - session.last_motion < 2.5:
            return "cooldown"
        session.last_motion = now
        session.metrics["motions"] += 1
        await self.client_connections[client_uid].send_json(
            {
                "type": "avatar-motion",
                "model": model["name"],
                "modelPath": urlsplit(model["url"]).path.rsplit("/", 1)[0] + "/",
                "group": group,
                "action": action,
            }
        )
        return "animated"

    async def receive_viewer_comment(self, client_uid: str, comment: ViewerComment) -> str:
        session = self.cohost_sessions[client_uid]
        result = session.ingest(comment, self.blocked_terms)
        if result in MOTION_COMMANDS:
            result = await self._play_cohost_motion(client_uid, result)
        elif result == "queued" and not session.hold and not self._cohost_busy(client_uid):
            await self._play_cohost_motion(client_uid, "listen")
        await self.client_connections[client_uid].send_json(session.status())
        return result

    async def _handle_viewer_comment(self, websocket, client_uid, data):
        await self.receive_viewer_comment(client_uid, ViewerComment.model_validate(data))

    async def _handle_cohost_control(self, websocket, client_uid, data):
        session = self.cohost_sessions[client_uid]
        action = data.get("action")
        item_id = data.get("id")
        item = session.items.get(item_id) if isinstance(item_id, str) else None
        status = ""
        if action == "lesson" and isinstance(data.get("lesson"), str):
            session.lesson = data["lesson"].strip()[:4000]
            status = "Lesson context saved for this session."
        elif action == "floor":
            session.instructor_speaking = data.get("speaking") is True
        elif action == "hold":
            session.hold = data.get("hold") is True
            session.metrics["overrides"] += int(session.hold)
            if session.hold and self._cohost_busy(client_uid):
                await self._handle_interrupt(websocket, client_uid, {})
                await websocket.send_json({"type": "interrupt-signal"})
            status = "Co-host paused." if session.hold else "Co-host ready."
        elif action == "voice-demo":
            if session.hold or session.instructor_speaking or self._cohost_busy(client_uid):
                status = "Wait for the floor to be clear before playing the voice demo."
            elif not VOICE_DEMO_PATH.is_file():
                status = "The voice demo needs to be generated on the server."
            else:
                self.current_conversation_tasks[client_uid] = asyncio.create_task(
                    self._play_voice_demo(websocket, client_uid, session)
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
                    self.current_conversation_tasks[client_uid] = asyncio.create_task(
                        self._speak_cohost(websocket, client_uid, session, item, answer.strip())
                    )
        await websocket.send_json(session.status(status))

    async def _draft_cohost(self, websocket, client_uid, session, item):
        try:
            if item.kind == "lesson":
                item.answer = item.lesson[:450] or "The instructor hasn't added lesson notes yet."
            elif item.kind != "acknowledgment":
                agent = self.client_contexts[client_uid].agent_engine
                draft = await asyncio.wait_for(
                    agent.draft_cohost(item.text, item.lesson, item.viewer_name), 25
                )
                if not draft or draft.startswith("Error calling the chat endpoint"):
                    raise ValueError("Empty reply")
                item.answer = draft
            session.metrics["drafts"] += 1
            status = "Review the draft before speaking."
        except Exception as exc:
            logger.warning("Co-host draft failed ({})", type(exc).__name__)
            session.metrics["draft_errors"] += 1
            status = "Draft unavailable. You can type a reply or dismiss the item."
        if client_uid in self.client_connections:
            await websocket.send_json(session.status(status))

    async def _play_voice_demo(self, websocket, client_uid, session):
        character = self.client_contexts[client_uid].character_config
        display = DisplayText(VOICE_DEMO_TEXT, character.character_name, character.avatar)
        tts = TTSTaskManager()
        try:
            payload = await asyncio.to_thread(
                prepare_audio_payload,
                audio_path=str(VOICE_DEMO_PATH),
                display_text=display,
                forwarded=True,
            )
            await send_conversation_start_signals(websocket.send_text)
            await tts.queue_audio_payload(payload, websocket.send_text)
            await finalize_conversation_turn(tts, websocket.send_text, client_uid)
        except (OSError, ValueError):
            await websocket.send_json(session.status("The voice demo could not play."))
        finally:
            tts.clear()

    async def _speak_cohost(self, websocket, client_uid, session, item, answer):
        context = self.client_contexts[client_uid]
        tts = TTSTaskManager()

        async def send(payload: str):
            data = json.loads(payload)
            if data.get("type") == "audio":
                session.last_response_ms = round((monotonic() - item.added_at) * 1000)
                session.metrics["spoken" if data.get("audio") else "caption_fallback"] += 1
            await websocket.send_text(payload)

        try:
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
            await finalize_conversation_turn(tts, send, client_uid)
        finally:
            tts.clear()
        await websocket.send_json(session.status())

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

"""End-to-end verification tests for Freedom Fusion AI LIVE Studio layers."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
import websockets
from fastapi import FastAPI
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from open_llm_vtuber.cohost import (
    CohostSession,
    ViewerComment,
    extract_wake_phrase,
    is_authorized_host,
    looks_like_direct_motion_request,
    motion_from_tool_calls,
    parse_host_command,
)
from open_llm_vtuber.mcpp.types import ToolCallObject
from open_llm_vtuber.cohost_knowledge import load_public_knowledge
from open_llm_vtuber.studio_controller import (
    OBSController,
    PushcutNotifier,
    StudioController,
    split_briefing_into_topics,
    tiktok_live_links,
)
from open_llm_vtuber.studio_routes import init_studio_routes
from open_llm_vtuber.studio_store import StudioStore
from scripts import studio_mcp_server, tiktok_live_relay


def test_wake_phrase_and_host_command_parsing():
    matched, clean = extract_wake_phrase("Hey Whiskers, explain cellular handoffs in Manhattan")
    assert matched is True
    assert clean == "explain cellular handoffs in Manhattan"

    matched2, _ = extract_wake_phrase("Just walking down 5th avenue today")
    assert matched2 is False

    assert parse_host_command("!topic Public Wi-Fi Security") == {
        "command": "topic",
        "arg": "Public Wi-Fi Security",
    }
    assert parse_host_command("!mode comedian") == {"command": "personality", "arg": "comedian"}
    assert parse_host_command("!wrap") == {"command": "wrap", "arg": ""}
    assert parse_host_command("Hey Whiskers, save note explain WireGuard next week") == {
        "command": "note",
        "arg": "explain WireGuard next week",
    }
    assert parse_host_command("Whiskers, answer Jessica first") == {
        "command": "direct",
        "arg": "answer Jessica first",
    }

    assert looks_like_direct_motion_request("woh little kitty dance") is True
    assert looks_like_direct_motion_request("don't dance right now") is False
    assert looks_like_direct_motion_request("did you just dance?") is False

    from open_llm_vtuber.cohost import AVATAR_MOTIONS, detect_explicit_motion
    assert detect_explicit_motion("Hello.", AVATAR_MOTIONS) == "wave"
    assert detect_explicit_motion("Wave your hand.", AVATAR_MOTIONS) == "wave"
    assert detect_explicit_motion("Hey kitty, do wave your hand.", AVATAR_MOTIONS) == "wave"
    assert detect_explicit_motion("Hey kitty, can you cry?", AVATAR_MOTIONS) == "cry"
    assert detect_explicit_motion("Hey kitty laugh.", AVATAR_MOTIONS) == "laugh"
    assert detect_explicit_motion("Hey kitty dance.", AVATAR_MOTIONS) == "dance"
    assert detect_explicit_motion("Do a backflip!", AVATAR_MOTIONS) == "backflip"
    assert detect_explicit_motion("don't dance right now", AVATAR_MOTIONS) is None
    assert detect_explicit_motion("what is a VLAN in networking?", AVATAR_MOTIONS) is None
    tc = [
        ToolCallObject.from_dict({
            "id": "call_1",
            "index": 0,
            "type": "function",
            "function": {
                "name": "play_avatar_motion",
                "arguments": json.dumps({"motion": "dance", "acknowledgment": "Let's boogie!"}),
            },
        })
    ]
    assert motion_from_tool_calls(tc, ("dance", "wave"), spoken=True) == {
        "motion": "dance",
        "acknowledgment": "Let's boogie!",
    }


def test_host_auth_and_anti_spam_gifts_joins():
    host_comment = ViewerComment(
        text="Whiskers, talk about VPNs",
        viewer_handle="@RomanPersonal",
        viewer_id="999111",
    )
    assert is_authorized_host(host_comment, frozenset({"romanpersonal"}), frozenset()) is True
    assert is_authorized_host(host_comment, frozenset({"someoneelse"}), frozenset({"999111"})) is True
    assert is_authorized_host(host_comment, frozenset({"someoneelse"}), frozenset({"000"})) is False

    session = CohostSession()
    # First comment succeeds, rapid spam burst from same viewer is rate-limited
    c1 = ViewerComment(text="Is public Wi-Fi safe?", viewer_id="v1", viewer_name="Jessica")
    assert session.ingest(c1, ("badword",)) == "unclassified"
    assert session.review_unclassified(c1) == "queued"

    c2 = ViewerComment(text="What about VPNs too?", viewer_id="v1", viewer_name="Jessica")
    assert session.ingest(c2, ("badword",)) == "rate_limited"

    # Gift event queues high-priority thank-you
    gift = ViewerComment(
        text="Sent Rose x3",
        event_type="gift",
        gift_name="Rose",
        gift_count=3,
        gift_value=3,
        viewer_id="v2",
        viewer_name="Mike",
    )
    assert session.ingest(gift, ()) == "gift_queued"

    # Join event welcomes once and throttles repeats
    join1 = ViewerComment(text="Alex joined", event_type="join", viewer_id="v3", viewer_name="Alex")
    assert session.ingest(join1, (), is_returning=True) == "queued"
    assert session.ingest(join1, (), is_returning=True) == "throttled"

    # Priority selection picks gift/question over normal acknowledgment
    top = session.next_auto_candidate()
    assert top is not None and top.kind == "gift"


def test_studio_store_persistence_analytics_and_knowledge_writeback(tmp_path, monkeypatch):
    db_file = tmp_path / "studio.db"
    know_file = tmp_path / "kittycat-public.json"
    monkeypatch.setenv("COHOST_KNOWLEDGE_FILE", str(know_file))

    store = StudioStore(db_path=db_file)
    s1 = store.start_session(tiktok_handle="@freedomfusionsystem", initial_topic="Public Wi-Fi")
    v1 = store.record_viewer_activity(
        session_id=s1["id"],
        viewer_id="u100",
        viewer_handle="jessica_nyc",
        viewer_name="Jessica",
        kind="question",
        text="Is public Wi-Fi safe in coffee shops?",
    )
    assert v1["is_returning"] is False

    iid1 = store.record_interaction(
        session_id=s1["id"],
        kind="question",
        text="Is public Wi-Fi safe in coffee shops?",
        viewer_id="u100",
        viewer_handle="jessica_nyc",
        viewer_name="Jessica",
    )
    store.mark_answered(
        iid1,
        answer="Public Wi-Fi can be convenient, but use HTTPS and a trusted VPN to avoid evil-twin hotspots!",
        latency_ms=1450,
        sources=("Public Wi-Fi Security",),
    )

    # Unanswered question
    store.record_interaction(
        session_id=s1["id"],
        kind="question",
        text="Can you explain BGP routing next?",
        viewer_id="u200",
        viewer_handle="mike_net",
        viewer_name="Mike",
    )

    # Second session -> Jessica is recognized as returning viewer
    s2 = store.start_session(tiktok_handle="@freedomfusionsystem", initial_topic="VPNs")
    v1_again = store.record_viewer_activity(
        session_id=s2["id"],
        viewer_id="u100",
        viewer_handle="jessica_nyc",
        viewer_name="Jessica",
        kind="question",
        text="How does WireGuard VPN work?",
    )
    assert v1_again["is_returning"] is True
    assert v1_again["visit_count"] == 2
    assert "Wi-Fi Security" in v1_again["interests"]

    # Topic queue & voice notes
    store.add_topics(["Public Wi-Fi", "VPN Tunneling"])
    first_topic = store.pop_next_topic()
    assert first_topic["title"] == "Public Wi-Fi"

    note = store.save_voice_note("Remember to cover N10-009 port numbers tomorrow", session_id=s1["id"])
    promoted = store.promote_to_knowledge(
        title="N10-009 Common Ports",
        text="SSH is 22, DNS is 53, HTTPS is 443, RDP is 3389.",
        kind="memory",
        note_id=note["id"],
    )
    assert Path(promoted["saved_path"]).is_file()
    loaded = load_public_knowledge()
    assert any(entry.title == "N10-009 Common Ports" for entry in loaded.memory)

    analytics = store.get_analytics(s1["id"])
    assert analytics["overview"]["answered"] == 1
    assert analytics["overview"]["unanswered"] == 1
    assert analytics["top_participants"][0]["viewer_handle"] == "jessica_nyc"
    assert len(analytics["clip_suggestions"]) >= 1
    assert len(analytics["popular_topics"]) >= 1
    summary = store.build_deterministic_summary(s1["id"])
    assert "1 answered" in summary
    store.close()


def test_obs_websocket_v5_handshake_and_request(monkeypatch):
    monkeypatch.delenv("OBS_WS_HOST", raising=False)
    monkeypatch.delenv("OBS_WS_PORT", raising=False)
    monkeypatch.delenv("OBS_WS_PASSWORD", raising=False)

    async def run_test():
        salt = "testsalt"
        challenge = "testchallenge"
        password = "secret-obs-password"
        expected_auth = base64.b64encode(
            hashlib.sha256(
                (
                    base64.b64encode(hashlib.sha256((password + salt).encode()).digest()).decode()
                    + challenge
                ).encode()
            ).digest()
        ).decode()

        async def mock_obs(ws):
            await ws.send(json.dumps({
                "op": 0,
                "d": {"rpcVersion": 1, "authentication": {"challenge": challenge, "salt": salt}},
            }))
            ident = json.loads(await ws.recv())
            assert ident["op"] == 1
            assert ident["d"]["authentication"] == expected_auth
            await ws.send(json.dumps({"op": 2, "d": {"negotiatedRpcVersion": 1}}))
            req = json.loads(await ws.recv())
            assert req["op"] == 6
            await ws.send(json.dumps({
                "op": 7,
                "d": {
                    "requestType": req["d"]["requestType"],
                    "requestId": req["d"]["requestId"],
                    "requestStatus": {"result": True, "code": 100},
                    "responseData": {"obsVersion": "31.0.0"},
                },
            }))

        async with websockets.serve(mock_obs, "127.0.0.1", 0) as server:
            port = server.sockets[0].getsockname()[1]
            obs = OBSController()
            obs.host = "127.0.0.1"
            obs.port = port
            obs.password = password
            res = await obs.request("GetVersion")
            assert res["ok"] is True
            assert res["data"]["obsVersion"] == "31.0.0"

    asyncio.run(run_test())


def test_pushcut_payload_and_briefing_splitter():
    links = tiktok_live_links("@freedomfusionsystem")
    assert links["universal_url"] == "https://www.tiktok.com/@freedomfusionsystem/live"
    assert links["deep_link"] == "tiktok://live?user_id=freedomfusionsystem"

    notifier = PushcutNotifier()
    payload = notifier.build_payload(
        title="LIVE Ready",
        text="Whiskers is ready!",
        handle="freedomfusionsystem",
        control_url="https://studio.example.com/control",
    )
    assert payload["url"] == "https://www.tiktok.com/@freedomfusionsystem/live"
    assert len(payload["actions"]) == 3

    parsed = split_briefing_into_topics(
        "1. Public Wi-Fi risks in Manhattan cafes.\n"
        "2. How WireGuard VPN protects mobile users.\n"
        "3. Cellular 5G handoffs while walking downtown."
    )
    assert len(parsed["topics"]) == 3
    assert "Public Wi-Fi" in parsed["topics"][0]["title"]


def test_studio_api_routes_and_auth(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_CONTROL_TOKEN", "top-secret-token")
    monkeypatch.setenv("COHOST_KNOWLEDGE_FILE", str(tmp_path / "kb.json"))
    store = StudioStore(db_path=tmp_path / "api_studio.db")
    controller = StudioController(store=store, ws_handler=None)

    app = FastAPI()
    app.include_router(init_studio_routes(controller))
    client = TestClient(app)

    # Unauthorized request blocked
    assert client.get("/api/studio/status").status_code == 401

    headers = {"Authorization": "Bearer top-secret-token"}
    st = client.get("/api/studio/status", headers=headers)
    assert st.status_code == 200
    assert st.json()["state"] == "standby"

    # Go Live
    go = client.post(
        "/api/studio/go-live",
        headers=headers,
        json={"topic": "Cybersecurity 101", "start_relay": False, "notify_pushcut": False},
    )
    assert go.status_code == 200
    assert go.json()["state"] == "live"
    assert go.json()["session_id"]

    # Briefing -> Topic Queue
    br = client.post(
        "/api/studio/briefing",
        headers=headers,
        json={"text": "1. OSI Layers explained fast.\n2. Why Zero Trust beats VPNs alone."},
    )
    assert br.status_code == 200
    assert len(br.json()["added_topics"]) == 2

    # Save voice note + promote to knowledge
    note = client.post(
        "/api/studio/notes",
        headers=headers,
        json={"text": "Always explain VLAN tagging with simple examples.", "promote_title": "VLAN Tip"},
    )
    assert note.status_code == 200
    assert note.json()["promoted"]["local"]["entry"]["title"] == "VLAN Tip"

    # Analytics & Stop
    ana = client.get("/api/studio/analytics", headers=headers)
    assert ana.status_code == 200
    assert "overview" in ana.json()

    stop = client.post(
        "/api/studio/stop",
        headers=headers,
        json={"generate_summary": True, "notify_pushcut": False, "stop_obs_stream": False, "stop_obs_record": False},
    )
    assert stop.status_code == 200
    assert stop.json()["state"] == "standby"
    assert "LIVE wrapped" in stop.json()["summary"]
    store.close()


def test_tiktok_relay_payload_extractors_and_mcp_tools():
    user = SimpleNamespace(nickname="Jessica NYC", unique_id="jessica_nyc", user_id=777123)
    comment_evt = SimpleNamespace(comment="Explain VPNs!", user=user, common=SimpleNamespace(msg_id=555))
    cp = tiktok_live_relay.comment_payload(comment_evt, "cid-1")
    assert cp["viewer_handle"] == "jessica_nyc"
    assert cp["viewer_id"] == "777123"
    assert cp["event_type"] == "comment"

    gift_evt = SimpleNamespace(
        streaking=False,
        repeat_count=5,
        gift=SimpleNamespace(name="Rose", diamond_count=1),
        user=user,
        common=SimpleNamespace(msg_id=556),
    )
    gp = tiktok_live_relay.gift_payload(gift_evt, None)
    assert gp is not None
    assert gp["event_type"] == "gift"
    assert gp["gift_value"] == 5

    streak_evt = SimpleNamespace(streaking=True, repeat_count=2, gift=SimpleNamespace(name="Rose", diamond_count=1), user=user, common=None)
    assert tiktok_live_relay.gift_payload(streak_evt, None) is None

    jp = tiktok_live_relay.join_payload(SimpleNamespace(user=user), None)
    assert jp["event_type"] == "join"
    assert jp["viewer_id"] == "777123"

    # Verify MCP tools registered cleanly
    tool_names = set(studio_mcp_server.mcp._tool_manager._tools.keys())
    assert {
        "studio_status",
        "studio_go_live",
        "studio_stop_live",
        "studio_send_command",
        "studio_ingest_briefing",
        "studio_get_analytics",
        "studio_obs_control",
        "studio_notify_iphone",
    }.issubset(tool_names)


def test_assemblyai_v3_streaming_asr_and_fallback(monkeypatch):
    import numpy as np
    from urllib.parse import parse_qs, urlsplit
    from open_llm_vtuber.asr.asr_factory import ASRFactory
    from open_llm_vtuber.config_manager.asr import ASRConfig, AssemblyAIASRConfig

    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "test-aai-key")
    cfg = ASRConfig(
        asr_model="assemblyai_asr",
        assemblyai_asr=AssemblyAIASRConfig(
            speech_model="u3-rt-pro",
            fallback_model="universal-streaming-english",
        ),
    )
    assert cfg.asr_model == "assemblyai_asr"

    async def run_mock_v3():
        seen_models: list[str] = []
        seen_auth: list[str] = []

        async def mock_aai(ws):
            path = ws.request.path if hasattr(ws, "request") else ws.path
            headers = ws.request.headers if hasattr(ws, "request") else ws.request_headers
            qs = parse_qs(urlsplit(path).query)
            model = qs.get("speech_model", [""])[0]
            seen_models.append(model)
            seen_auth.append(headers.get("Authorization", ""))
            # Reject primary once to verify fallback to universal-streaming-english
            if model == "u3-rt-pro" and len(seen_models) == 1:
                await ws.close(code=1008, reason="simulated unavailable")
                return

            await ws.send(json.dumps({"type": "Begin", "id": "sess-mock-1"}))
            turn_idx = 0
            audio_chunks = 0
            async for msg in ws:
                if isinstance(msg, bytes):
                    audio_chunks += 1
                    if audio_chunks == 2:
                        await ws.send(json.dumps({
                            "type": "Turn",
                            "turn_order": turn_idx,
                            "transcript": f"partial turn {turn_idx}",
                            "end_of_turn": False,
                            "turn_is_formatted": False,
                        }))
                else:
                    ctrl = json.loads(msg)
                    if ctrl.get("type") == "ForceEndpoint":
                        await ws.send(json.dumps({
                            "type": "Turn",
                            "turn_order": turn_idx,
                            "transcript": f"Hello Little Cat turn {turn_idx + 1}.",
                            "end_of_turn": True,
                            "turn_is_formatted": True,
                        }))
                        turn_idx += 1
                        audio_chunks = 0
                    elif ctrl.get("type") == "Terminate":
                        await ws.send(json.dumps({"type": "Termination"}))
                        break

        async with websockets.serve(mock_aai, "127.0.0.1", 0) as server:
            port = server.sockets[0].getsockname()[1]
            engine = ASRFactory.get_asr_system(
                "assemblyai_asr",
                api_key="test-aai-key",
                speech_model="u3-rt-pro",
                fallback_model="universal-streaming-english",
                ws_url=f"ws://127.0.0.1:{port}/v3/ws",
            )
            assert getattr(engine, "supports_streaming", False) is True
            session = engine.create_stream_session()
            try:
                samples = np.zeros(4800, dtype=np.float32)  # 300ms @ 16kHz
                await session.feed_audio(samples)
                t1 = await session.finish_turn(wait_timeout=1.5)
                assert t1 == "Hello Little Cat turn 1."
                assert session._active_model == "universal-streaming-english"

                # Turn 2 reuses the same warm WebSocket and isolates turn_order cleanly
                await session.feed_audio(samples)
                t2 = await session.finish_turn(wait_timeout=1.5)
                assert t2 == "Hello Little Cat turn 2."
            finally:
                await session.close()

            # Also verify batch async_transcribe_np uses primary u3-rt-pro cleanly now
            t3 = await engine.async_transcribe_np(np.zeros(3200, dtype=np.float32))
            assert t3 == "Hello Little Cat turn 1."

        assert seen_models == ["u3-rt-pro", "universal-streaming-english", "u3-rt-pro"]
        assert all(a == "test-aai-key" for a in seen_auth)

    asyncio.run(run_mock_v3())


def test_freedom_fusion_notion_and_ghl_mcp_bridge():
    from scripts import freedom_fusion_mcp_bridge as ff_mcp
    from open_llm_vtuber.mcpp.server_registry import ServerRegistry

    # Verify PII & token redaction
    raw = "Contact rome@example.com or 555-123-4567 with pit-abcdef1234567890"
    cleaned = ff_mcp.sanitize_public_text(raw)
    assert "rome@example.com" not in cleaned
    assert "555-123-4567" not in cleaned
    assert "pit-abcdef1234567890" not in cleaned
    assert "[redacted-email]" in cleaned
    assert "[redacted-phone]" in cleaned
    assert "[redacted-token]" in cleaned

    # Verify all 8 Notion + GoHighLevel CRM tools are registered
    tool_names = set(ff_mcp.mcp._tool_manager._tools.keys())
    assert {
        "notion_search_workspace",
        "notion_read_page",
        "notion_query_data_source",
        "ghl_list_courses",
        "ghl_list_pipelines",
        "ghl_list_workflows",
        "ghl_list_email_templates",
        "ghl_crm_summary",
    }.issubset(tool_names)

    # Verify mcp_servers.json loads and resolves python -> sys.executable
    reg = ServerRegistry(REPO_ROOT / "mcp_servers.json")
    srv = reg.get_server("freedom_fusion")
    assert srv is not None
    assert srv.command == sys.executable
    assert srv.args == ["scripts/freedom_fusion_mcp_bridge.py"]

    # Verify ghl_crm_summary reads contacts total from meta.total (never limit=1 page length)
    async def verify_meta_total():
        client = ff_mcp.HighLevelReadClient()
        async def fake_get(path, *, version="2021-07-28", params=None):
            if path == "/contacts/":
                return {"contacts": [{"id": "c1"}], "meta": {"total": 637}}
            if path == "/courses/products":
                return {"products": [{"id": "p1", "title": "Course A"}]}
            if path == "/courses/offers":
                return {"offers": [{"id": "o1", "title": "Offer A"}]}
            if path == "/opportunities/pipelines":
                return {"pipelines": [{"id": "pl1", "name": "Main", "stages": []}]}
            if path == "/workflows/":
                return {"workflows": [{"name": "WF 1", "status": "published"}]}
            if path == "/emails/builder":
                return {"builders": [{"name": "Tpl 1"}], "total": 10}
            return {}
        client._get = fake_get
        summary = await client.crm_summary()
        assert summary["contacts_total"] == 637
        assert summary["courses_count"] == 1
        assert summary["pipelines_count"] == 1

    asyncio.run(verify_meta_total())

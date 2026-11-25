# /// script
# requires-python = ">=3.10"
# dependencies = ["TikTokLive==7.0.1", "httpx>=0.28,<1"]
# ///
"""Forward public TikTok LIVE comments, gifts, joins, and live-connect alerts to Freedom Fusion Kittycat."""

import argparse
import asyncio
import logging
import os
import re
from contextlib import suppress
from time import monotonic
from typing import Any
from urllib.parse import urlsplit

import httpx

log = logging.getLogger("kittycat.tiktok")


def _extract_user_fields(user: Any) -> dict[str, str]:
    fields: dict[str, str] = {}
    nickname = (getattr(user, "nickname", "") or "").strip()
    if nickname:
        fields["viewer_name"] = nickname[:60]
    unique_id = (getattr(user, "unique_id", "") or "").strip().lstrip("@")
    if unique_id:
        fields["viewer_handle"] = unique_id[:64]
    user_id = getattr(user, "user_id", None) or getattr(user, "id", None)
    if user_id:
        fields["viewer_id"] = str(user_id)[:64]
    return fields


def comment_payload(event: Any, client_uid: str | None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "text": (getattr(event, "comment", "") or "").strip()[:500],
        "source": "tiktok-live",
        "event_type": "comment",
    }
    payload.update(_extract_user_fields(getattr(event, "user", None)))
    message_id = getattr(getattr(event, "common", None), "msg_id", 0)
    if message_id:
        payload["event_id"] = str(message_id)[:128]
    if client_uid:
        payload["client_uid"] = client_uid
    return payload


def gift_payload(event: Any, client_uid: str | None) -> dict[str, Any] | None:
    if getattr(event, "streaking", False):
        return None
    gift = getattr(event, "gift", None)
    gift_name = (getattr(gift, "name", "") or "Gift").strip()[:80]
    repeat_count = max(1, int(getattr(event, "repeat_count", 1) or 1))
    diamond_count = max(0, int(getattr(gift, "diamond_count", 0) or 0))
    payload: dict[str, Any] = {
        "text": f"Sent {gift_name} x{repeat_count}",
        "source": "tiktok-live",
        "event_type": "gift",
        "gift_name": gift_name,
        "gift_count": repeat_count,
        "gift_value": diamond_count * repeat_count,
    }
    payload.update(_extract_user_fields(getattr(event, "user", None)))
    message_id = getattr(getattr(event, "common", None), "msg_id", 0)
    if message_id:
        payload["event_id"] = f"gift-{message_id}"[:128]
    if client_uid:
        payload["client_uid"] = client_uid
    return payload


def join_payload(event: Any, client_uid: str | None) -> dict[str, Any]:
    user_fields = _extract_user_fields(getattr(event, "user", None))
    display = user_fields.get("viewer_name") or user_fields.get("viewer_handle") or "Viewer"
    payload: dict[str, Any] = {
        "text": f"{display} joined the LIVE",
        "source": "tiktok-live",
        "event_type": "join",
    }
    payload.update(user_fields)
    if client_uid:
        payload["client_uid"] = client_uid
    return payload


def derive_studio_confirm_url(comment_url: str) -> str:
    parsed = urlsplit(comment_url)
    return f"{parsed.scheme}://{parsed.netloc}/api/studio/live-confirmed"


async def notify_live_confirmed(studio_url: str, token: str, handle: str) -> None:
    try:
        async with httpx.AsyncClient(
            timeout=5, headers={"Authorization": f"Bearer {token}"}, follow_redirects=False
        ) as client:
            resp = await client.post(studio_url, json={"handle": handle})
            if resp.is_success:
                log.info("Notified Freedom Fusion Studio that @%s is LIVE.", handle)
    except httpx.HTTPError as exc:
        log.warning("Could not notify studio live-confirmed (%s).", type(exc).__name__)


async def read_tiktok(
    handle: str,
    queue: asyncio.Queue,
    client_uid: str | None,
    *,
    studio_url: str | None = None,
    token: str = "",
    forward_joins: bool = True,
) -> None:
    from TikTokLive import TikTokLiveClient
    from TikTokLive.client.errors import UserOfflineError
    from TikTokLive.events import CommentEvent, ConnectEvent, GiftEvent, JoinEvent

    client = TikTokLiveClient(unique_id=handle)
    last_join_enqueued = float("-inf")

    def enqueue(payload: dict[str, Any]) -> None:
        if queue.full():
            with suppress(asyncio.QueueEmpty):
                queue.get_nowait()
        queue.put_nowait(payload)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        log.info("Reading comments, gifts, and joins from @%s.", handle)
        if studio_url and token:
            asyncio.create_task(notify_live_confirmed(studio_url, token, handle))

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        payload = comment_payload(event, client_uid)
        if payload["text"]:
            enqueue(payload)

    @client.on(GiftEvent)
    async def on_gift(event: GiftEvent):
        payload = gift_payload(event, client_uid)
        if payload:
            enqueue(payload)

    @client.on(JoinEvent)
    async def on_join(event: JoinEvent):
        nonlocal last_join_enqueued
        if not forward_joins or monotonic() - last_join_enqueued < 20:
            return
        last_join_enqueued = monotonic()
        enqueue(join_payload(event, client_uid))

    try:
        while True:
            try:
                task = await asyncio.wait_for(client.start(process_connect_events=False), timeout=20)
                await task
            except UserOfflineError:
                log.info("@%s is offline. Waiting for the next LIVE.", handle)
            except Exception as exc:
                log.warning("TikTok connection ended (%s). Retrying shortly.", type(exc).__name__)
            await asyncio.sleep(15)
    finally:
        with suppress(Exception):
            await client.disconnect(close_client=True)


async def forward_comments(queue: asyncio.Queue, url: str, token: str) -> None:
    last_warning = float("-inf")
    async with httpx.AsyncClient(
        timeout=5, headers={"Authorization": f"Bearer {token}"}, follow_redirects=False
    ) as client:
        while True:
            payload = await queue.get()
            try:
                response = await client.post(url, json=payload)
                if response.status_code in {401, 403, 503}:
                    raise RuntimeError("Kittycat declined the relay. Check the relay token and service settings.")
                if response.status_code == 409:
                    if monotonic() - last_warning >= 30:
                        log.warning("Open one Kittycat window or supply its session ID with --client-id.")
                        last_warning = monotonic()
                    continue
                response.raise_for_status()
            except httpx.HTTPError as exc:
                if monotonic() - last_warning >= 30:
                    log.warning("Kittycat comment delivery failed (%s).", type(exc).__name__)
                    last_warning = monotonic()


async def run(
    handle: str,
    url: str,
    token: str,
    client_uid: str | None,
    *,
    studio_url: str | None = None,
    forward_joins: bool = True,
) -> None:
    queue = asyncio.Queue(maxsize=60)
    await asyncio.gather(
        read_tiktok(
            handle,
            queue,
            client_uid,
            studio_url=studio_url or derive_studio_confirm_url(url),
            token=token,
            forward_joins=forward_joins,
        ),
        forward_comments(queue, url, token),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("handle", help="The TikTok creator handle, such as @youraccount.")
    parser.add_argument("--url", default="http://127.0.0.1:12393/api/cohost/comments")
    parser.add_argument("--studio-url", help="Optional Studio live-confirmed endpoint for Pushcut alerts.")
    parser.add_argument("--client-id", help="Kittycat session ID when more than one window is connected.")
    parser.add_argument("--no-joins", action="store_true", help="Do not forward viewer join events.")
    args = parser.parse_args()
    handle = args.handle.removeprefix("@")
    if not re.fullmatch(r"[a-zA-Z0-9_.]{1,24}", handle):
        parser.error("Enter a valid TikTok creator handle.")
    url = urlsplit(args.url)
    if not url.hostname or (url.scheme != "https" and not (
        url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"}
    )):
        parser.error("Use an HTTPS relay URL or an HTTP URL on localhost.")
    token = os.getenv("COHOST_COMMENT_TOKEN")
    if not token:
        parser.error("Set COHOST_COMMENT_TOKEN to the same value used by Kittycat.")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        asyncio.run(
            run(
                handle,
                args.url,
                token,
                args.client_id,
                studio_url=args.studio_url,
                forward_joins=not args.no_joins,
            )
        )
    except RuntimeError as exc:
        parser.exit(1, f"{exc}\n")
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

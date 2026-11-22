# /// script
# requires-python = ">=3.10"
# dependencies = ["TikTokLive==7.0.1", "httpx>=0.28,<1"]
# ///
"""Forward public comments from a creator's TikTok LIVE to Kittycat."""

import argparse
import asyncio
import logging
import os
import re
from contextlib import suppress
from time import monotonic
from urllib.parse import urlsplit

import httpx
from TikTokLive import TikTokLiveClient
from TikTokLive.client.errors import UserOfflineError
from TikTokLive.events import CommentEvent, ConnectEvent

log = logging.getLogger("kittycat.tiktok")


def comment_payload(event: CommentEvent, client_uid: str | None) -> dict[str, str]:
    payload = {"text": event.comment.strip()[:500], "source": "tiktok-live"}
    nickname = (getattr(event.user, "nickname", "") or "").strip()
    if nickname:
        payload["viewer_name"] = nickname[:60]
    message_id = getattr(event.common, "msg_id", 0)
    if message_id:
        payload["event_id"] = str(message_id)[:128]
    if client_uid:
        payload["client_uid"] = client_uid
    return payload


async def read_tiktok(handle: str, queue: asyncio.Queue, client_uid: str | None) -> None:
    client = TikTokLiveClient(unique_id=handle)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        log.info("Reading comments from @%s.", handle)

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        payload = comment_payload(event, client_uid)
        if payload["text"]:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(payload)

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


async def run(handle: str, url: str, token: str, client_uid: str | None) -> None:
    queue = asyncio.Queue(maxsize=40)
    await asyncio.gather(read_tiktok(handle, queue, client_uid), forward_comments(queue, url, token))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("handle", help="The TikTok creator handle, such as @youraccount.")
    parser.add_argument("--url", default="http://127.0.0.1:12493/api/cohost/comments")
    parser.add_argument("--client-id", help="Kittycat session ID when more than one window is connected.")
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
        asyncio.run(run(handle, args.url, token, args.client_id))
    except RuntimeError as exc:
        parser.exit(1, f"{exc}\n")
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

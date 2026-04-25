"""
Trailer Downloader Routes
Server-side YouTube extraction for Pro/Admin users using yt-dlp.

The browser hits /api/trailer/download/{youtube_id} with an auth token,
we stream the MP4 bytes back with Content-Disposition: attachment so it
saves directly to the user's Downloads folder.
"""
import re
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import httpx

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trailer", tags=["trailer"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


_YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


async def _ensure_pro_or_admin(token_data: dict):
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "is_pro": 1},
    )
    admin = await db.admins.find_one(
        {"user_id": token_data["user_id"]},
        {"_id": 0, "is_admin": 1},
    )
    if (admin and admin.get("is_admin")) or (user and user.get("is_pro")):
        return True
    raise HTTPException(
        status_code=403,
        detail="Trailer downloads are a GamerGrid PRO feature. Upgrade in Settings to unlock.",
    )


def _extract_direct_url(youtube_id: str):
    """Use yt-dlp synchronously to find the best progressive MP4 URL.

    We prefer 'progressive' formats (single file with audio+video) so the
    browser can download a proper playable mp4. Returns (direct_url, title, ext).
    """
    import yt_dlp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        # Prefer single-file MP4 with audio (best quality up to 720p typically).
        "format": "best[ext=mp4][acodec!=none][vcodec!=none]/best[ext=mp4]/best",
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
    }
    url = f"https://www.youtube.com/watch?v={youtube_id}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        direct = info.get("url")
        title = info.get("title") or "trailer"
        ext = info.get("ext") or "mp4"
        if not direct:
            # Fallback: pick from formats list
            for f in (info.get("formats") or []):
                if f.get("ext") == "mp4" and f.get("url") and f.get("acodec") != "none":
                    direct = f["url"]
                    break
        if not direct:
            raise HTTPException(
                status_code=502,
                detail="Could not extract a direct video URL. YouTube may be throttling — try again in a minute.",
            )
        return direct, title, ext


def _safe_filename(title: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 _-]", "", title or "trailer").strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return (cleaned or "trailer")[:80]


class DownloadInfo(BaseModel):
    youtube_id: str


@router.get("/info/{youtube_id}")
async def trailer_info(youtube_id: str, token_data: dict = Depends(verify_token)):
    """Return a direct download URL + metadata. Used for client-side downloads
    if/when CORS allows; otherwise the streaming endpoint below is the fallback.
    """
    await _ensure_pro_or_admin(token_data)
    if not _YT_ID_RE.match(youtube_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube ID")
    try:
        direct, title, ext = await _run_in_thread(_extract_direct_url, youtube_id)
        return {
            "direct_url": direct,
            "title": title,
            "filename": f"{_safe_filename(title)}.{ext}",
            "ext": ext,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"yt-dlp extract failed for {youtube_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Extractor failed: {e}")


async def _run_in_thread(fn, *args):
    import asyncio
    return await asyncio.to_thread(fn, *args)


@router.get("/download/{youtube_id}")
async def trailer_download(youtube_id: str, token_data: dict = Depends(verify_token)):
    """Stream an MP4 file as an attachment. Reliable, CORS-safe, mobile-friendly."""
    await _ensure_pro_or_admin(token_data)
    if not _YT_ID_RE.match(youtube_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube ID")

    try:
        direct, title, ext = await _run_in_thread(_extract_direct_url, youtube_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"yt-dlp extract failed for {youtube_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Extractor failed: {e}")

    safe_name = f"{_safe_filename(title)}.{ext}"

    async def stream_video():
        timeout = httpx.Timeout(60.0, read=120.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as hc:
            async with hc.stream(
                "GET",
                direct,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                },
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk

    return StreamingResponse(
        stream_video(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Cache-Control": "no-cache",
        },
    )

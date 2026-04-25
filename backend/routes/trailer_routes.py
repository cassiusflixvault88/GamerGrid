"""
Trailer Downloader Routes
Server-side YouTube extraction for Pro/Admin users using yt-dlp.

Strategy: yt-dlp downloads the video to a temporary file, then we stream that
file back to the user. This avoids YouTube's IP-binding on signed URLs.
"""
import re
import os
import uuid
import logging
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trailer", tags=["trailer"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Where yt-dlp writes temp downloads
DOWNLOAD_DIR = Path("/tmp/gamergrid_dl")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

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


def _safe_filename(title: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 _-]", "", title or "trailer").strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return (cleaned or "trailer")[:80]


def _yt_download(youtube_id: str) -> tuple[Path, str]:
    """Download trailer to a temp file. Returns (file_path, title).

    Tries multiple player clients in order. Each client returns differently-formatted
    URLs; some bypass YouTube's anti-bot harder than others.
    """
    import yt_dlp

    job_id = uuid.uuid4().hex[:12]
    out_template = str(DOWNLOAD_DIR / f"{job_id}.%(ext)s")
    url = f"https://www.youtube.com/watch?v={youtube_id}"

    # Try clients in order of reliability for downloads
    clients_to_try = ["ios", "android", "tv_embedded", "web"]
    last_error = None

    for clientname in clients_to_try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "outtmpl": out_template,
            # Prefer single-file MP4. Falls back to merging if needed.
            "format": "best[ext=mp4][height<=720][acodec!=none][vcodec!=none]/best[ext=mp4]/best",
            "merge_output_format": "mp4",
            "extractor_args": {"youtube": {"player_client": [clientname]}},
            "retries": 2,
            "fragment_retries": 2,
            # Geo-bypass for region-locked trailers
            "geo_bypass": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title") or "trailer"
                # Find the actual produced file
                produced = info.get("requested_downloads") or []
                if produced and produced[0].get("filepath"):
                    fp = Path(produced[0]["filepath"])
                    if fp.exists():
                        return fp, title
                # Fallback: scan dir for our job id
                for f in DOWNLOAD_DIR.glob(f"{job_id}.*"):
                    if f.is_file() and f.stat().st_size > 0:
                        return f, title
                last_error = f"yt-dlp finished but no file found for client={clientname}"
        except Exception as e:
            last_error = f"client={clientname}: {e}"
            logger.warning(f"yt-dlp download failed (will try next client): {last_error}")
            # Clean any partial file
            for f in DOWNLOAD_DIR.glob(f"{job_id}.*"):
                try:
                    f.unlink()
                except Exception:
                    pass
            continue

    raise HTTPException(
        status_code=502,
        detail=(
            "Could not download this trailer — it may be age-restricted, "
            "region-locked, or YouTube is blocking automated access for this video. "
            "Try the 'Open in YouTube' button instead."
        ),
    )


@router.get("/download/{youtube_id}")
async def trailer_download(youtube_id: str, token_data: dict = Depends(verify_token)):
    """Download trailer to backend, stream the file back as MP4 attachment."""
    await _ensure_pro_or_admin(token_data)
    if not _YT_ID_RE.match(youtube_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube ID")

    try:
        file_path, title = await asyncio.to_thread(_yt_download, youtube_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trailer download failed for {youtube_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Download failed: {e}")

    safe_name = f"{_safe_filename(title)}.mp4"
    file_size = file_path.stat().st_size

    async def stream_and_cleanup():
        try:
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(64 * 1024)
                    if not chunk:
                        break
                    yield chunk
        finally:
            # Clean up the temp file once streamed (or even on error)
            try:
                file_path.unlink()
            except Exception:
                pass

    return StreamingResponse(
        stream_and_cleanup(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(file_size),
            "Cache-Control": "no-cache",
        },
    )

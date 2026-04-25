"""
Saved Trailers Routes
Pro/Admin users can save trailers to their personal library for later viewing.
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
import uuid

from auth import verify_token

router = APIRouter(prefix="/saved-trailers", tags=["saved-trailers"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


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
        detail="Saving trailers is a GamerGrid PRO feature. Upgrade in Settings to unlock.",
    )


class SaveTrailerPayload(BaseModel):
    youtube_id: str
    title: str
    game_id: Optional[int] = None
    game_title: Optional[str] = None
    thumbnail: Optional[str] = None


@router.post("/save")
async def save_trailer(payload: SaveTrailerPayload, token_data: dict = Depends(verify_token)):
    """Save a trailer to the current user's library."""
    await _ensure_pro_or_admin(token_data)

    # Prevent duplicate saves
    existing = await db.saved_trailers.find_one(
        {"user_id": token_data["user_id"], "youtube_id": payload.youtube_id},
        {"_id": 0, "id": 1},
    )
    if existing:
        return {"ok": True, "id": existing["id"], "already_saved": True}

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": token_data["user_id"],
        "youtube_id": payload.youtube_id,
        "title": payload.title,
        "game_id": payload.game_id,
        "game_title": payload.game_title,
        "thumbnail": payload.thumbnail or f"https://img.youtube.com/vi/{payload.youtube_id}/hqdefault.jpg",
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saved_trailers.insert_one(doc)
    return {"ok": True, "id": doc["id"], "already_saved": False}


@router.get("")
async def list_saved_trailers(token_data: dict = Depends(verify_token)):
    """List all saved trailers for the current user (no Pro check — anyone with saves can view)."""
    items = await db.saved_trailers.find(
        {"user_id": token_data["user_id"]},
        {"_id": 0},
    ).sort("saved_at", -1).to_list(500)
    return {"trailers": items, "total": len(items)}


@router.delete("/{trailer_id}")
async def remove_saved_trailer(trailer_id: str, token_data: dict = Depends(verify_token)):
    """Remove a saved trailer from the user's library."""
    result = await db.saved_trailers.delete_one(
        {"id": trailer_id, "user_id": token_data["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trailer not found")
    return {"ok": True}

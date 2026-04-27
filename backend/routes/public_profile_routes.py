"""Public user profile routes — shareable /u/:username pages."""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/users", tags=["public-profile"])

_mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo_client[os.environ["DB_NAME"]]


def _public_user(user: dict) -> Dict[str, Any]:
    """Strip private fields from a user document for public viewing."""
    return {
        "id": user.get("id"),
        "username": user.get("username"),
        "display_name": user.get("display_name") or user.get("username"),
        "profile_picture_url": user.get("profile_picture_url"),
        "created_at": user.get("created_at"),
    }


@router.get("/{username}")
async def get_public_profile(username: str):
    """Return a public user's profile, library and recent ratings.

    Email, phone, address and admin status are NEVER exposed.
    """
    # Case-insensitive username lookup
    user = await _db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
        {"_id": 0},
    )
    if not user:
        raise HTTPException(404, f"User @{username} not found")

    public = _public_user(user)

    # Library = watchlist (newest 50)
    watchlist = user.get("watchlist") or []
    library = []
    for item in watchlist[-50:][::-1]:  # newest first
        library.append({
            "content_id": item.get("content_id"),
            "title": item.get("title"),
            "poster_path": item.get("poster_path"),
            "media_type": item.get("media_type", "game"),
            "added_at": item.get("added_at"),
        })

    # Ratings authored by this user
    cursor = _db.ratings.find(
        {"user_id": user.get("id")},
        {"_id": 0, "id": 1, "content_id": 1, "content_title": 1, "rating": 1, "review": 1, "created_at": 1},
    ).sort("created_at", -1).limit(30)
    ratings = []
    async for r in cursor:
        # ensure datetime is JSON-serializable
        ca = r.get("created_at")
        if hasattr(ca, "isoformat"):
            r["created_at"] = ca.isoformat()
        ratings.append(r)

    avg_rating = None
    if ratings:
        avg_rating = round(sum(r["rating"] for r in ratings if r.get("rating") is not None) / len(ratings), 2)

    public.update({
        "library": library,
        "library_count": len(watchlist),
        "ratings": ratings,
        "ratings_count": len(ratings),
        "avg_rating": avg_rating,
    })
    return public

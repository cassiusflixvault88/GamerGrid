"""
Game reactions — like / dislike on game pages, persisted per user.
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

from auth import verify_token

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games", tags=["game-reactions"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class ReactionRequest(BaseModel):
    reaction: str  # "like" | "dislike" | "none"


@router.get("/{game_id}/reaction")
async def get_my_reaction(game_id: int, current_user: dict = Depends(verify_token)):
    """Return the calling user's reaction for this game + global counts."""
    user_id = current_user["user_id"]
    doc = await db.game_reactions.find_one(
        {"user_id": user_id, "game_id": game_id},
        {"_id": 0, "reaction": 1},
    )
    likes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "like"}
    )
    dislikes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "dislike"}
    )
    return {
        "my_reaction": (doc or {}).get("reaction") or "none",
        "likes": likes,
        "dislikes": dislikes,
    }


@router.post("/{game_id}/reaction")
async def set_my_reaction(
    game_id: int,
    body: ReactionRequest,
    current_user: dict = Depends(verify_token),
):
    """Set / update / clear the calling user's reaction for this game."""
    if body.reaction not in {"like", "dislike", "none"}:
        raise HTTPException(400, "reaction must be like, dislike, or none")
    user_id = current_user["user_id"]
    if body.reaction == "none":
        await db.game_reactions.delete_one({"user_id": user_id, "game_id": game_id})
    else:
        await db.game_reactions.update_one(
            {"user_id": user_id, "game_id": game_id},
            {"$set": {
                "user_id": user_id,
                "game_id": game_id,
                "reaction": body.reaction,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    likes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "like"}
    )
    dislikes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "dislike"}
    )
    return {
        "my_reaction": body.reaction,
        "likes": likes,
        "dislikes": dislikes,
    }


# Public, no auth required — for showing aggregate counts even to guests
@router.get("/{game_id}/reaction-counts")
async def public_reaction_counts(game_id: int):
    likes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "like"}
    )
    dislikes = await db.game_reactions.count_documents(
        {"game_id": game_id, "reaction": "dislike"}
    )
    return {"likes": likes, "dislikes": dislikes}

"""
App Review Social — likes, replies, edits, deletes for "Rate GamerGrid" reviews.
Mirrors the news/social model but for app reviews.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/app-reviews", tags=["app-reviews-social"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def _is_admin(user_id: str) -> bool:
    a = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
    return bool(a and a.get("is_admin"))


# ============= EDIT / DELETE app review =============

class AppReviewEdit(BaseModel):
    rating: Optional[int] = None
    review: Optional[str] = None


@router.put("/{review_id}")
async def edit_app_review(
    review_id: str,
    payload: AppReviewEdit,
    token_data: dict = Depends(verify_token),
):
    existing = await db.app_reviews.find_one({"id": review_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    if existing["user_id"] != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="Can only edit your own review")
    update = {"edited_at": datetime.now(timezone.utc).isoformat()}
    if payload.rating is not None:
        if not 1 <= payload.rating <= 5:
            raise HTTPException(status_code=400, detail="Rating must be 1-5")
        update["rating"] = payload.rating
    if payload.review is not None:
        update["review"] = payload.review.strip()
    await db.app_reviews.update_one({"id": review_id}, {"$set": update})
    return {"ok": True}


@router.delete("/{review_id}")
async def delete_app_review(review_id: str, token_data: dict = Depends(verify_token)):
    existing = await db.app_reviews.find_one({"id": review_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    is_admin = await _is_admin(token_data["user_id"])
    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own review")
    await db.app_reviews.delete_one({"id": review_id})
    # Cascade delete replies + reactions
    await db.app_review_replies.delete_many({"review_id": review_id})
    await db.app_review_reactions.delete_many({"review_id": review_id})
    return {"ok": True}


# ============= USER REPLIES (any user can reply to any review) =============

class ReplyPayload(BaseModel):
    text: str


@router.post("/{review_id}/reply")
async def post_user_reply(
    review_id: str,
    payload: ReplyPayload,
    token_data: dict = Depends(verify_token),
):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Reply too long (max 2000)")

    review = await db.app_reviews.find_one({"id": review_id}, {"_id": 0, "id": 1})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1, "profile_picture_url": 1},
    ) or {}
    is_admin = await _is_admin(token_data["user_id"])

    doc = {
        "id": str(uuid.uuid4()),
        "review_id": review_id,
        "user_id": token_data["user_id"],
        "username": user.get("username", "User"),
        "avatar": user.get("profile_picture_url"),
        "text": text,
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.app_review_user_replies.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "reply": doc}


@router.get("/{review_id}/replies")
async def list_replies(review_id: str):
    items = await db.app_review_user_replies.find(
        {"review_id": review_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"replies": items}


@router.put("/replies/{reply_id}")
async def edit_reply(
    reply_id: str,
    payload: ReplyPayload,
    token_data: dict = Depends(verify_token),
):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Reply too long (max 2000)")

    existing = await db.app_review_user_replies.find_one({"id": reply_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Reply not found")
    is_admin = await _is_admin(token_data["user_id"])
    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only edit your own reply")
    await db.app_review_user_replies.update_one(
        {"id": reply_id},
        {"$set": {"text": text, "edited_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@router.delete("/replies/{reply_id}")
async def delete_reply(reply_id: str, token_data: dict = Depends(verify_token)):
    existing = await db.app_review_user_replies.find_one({"id": reply_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Reply not found")
    is_admin = await _is_admin(token_data["user_id"])
    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own reply")
    await db.app_review_user_replies.delete_one({"id": reply_id})
    return {"ok": True}


# ============= REACTIONS =============

class ReactPayload(BaseModel):
    reaction: str  # "like" | "dislike"


@router.post("/{review_id}/react")
async def react_to_review(
    review_id: str,
    payload: ReactPayload,
    token_data: dict = Depends(verify_token),
):
    if payload.reaction not in ("like", "dislike"):
        raise HTTPException(status_code=400, detail="Invalid reaction")

    existing = await db.app_review_reactions.find_one(
        {"review_id": review_id, "user_id": token_data["user_id"]},
        {"_id": 0, "reaction": 1},
    )
    if existing and existing["reaction"] == payload.reaction:
        await db.app_review_reactions.delete_one(
            {"review_id": review_id, "user_id": token_data["user_id"]}
        )
        return {"ok": True, "your_reaction": None}

    await db.app_review_reactions.update_one(
        {"review_id": review_id, "user_id": token_data["user_id"]},
        {"$set": {
            "review_id": review_id,
            "user_id": token_data["user_id"],
            "reaction": payload.reaction,
            "ts": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "your_reaction": payload.reaction}


@router.get("/{review_id}/reactions")
async def get_reactions(review_id: str):
    likes = await db.app_review_reactions.count_documents({"review_id": review_id, "reaction": "like"})
    dislikes = await db.app_review_reactions.count_documents({"review_id": review_id, "reaction": "dislike"})
    return {"likes": likes, "dislikes": dislikes}


@router.post("/my-reactions")
async def my_reactions(payload: dict, token_data: dict = Depends(verify_token)):
    """Pass {review_ids: [...]} → get back {review_id: 'like'|'dislike'|null}."""
    ids = payload.get("review_ids") or []
    if not ids:
        return {}
    rows = await db.app_review_reactions.find(
        {"review_id": {"$in": ids}, "user_id": token_data["user_id"]},
        {"_id": 0, "review_id": 1, "reaction": 1},
    ).to_list(len(ids))
    by_id = {r["review_id"]: r["reaction"] for r in rows}
    return {rid: by_id.get(rid) for rid in ids}

"""Ratings, reviews and reply endpoints (extracted from server.py).

All routes inherit the `/api` prefix from the app's main router.
"""
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from auth import verify_token
from ratings import (
    Rating,
    RatingCreate,
    RatingResponse,
    UserReply,
    UserReplyCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/ratings", response_model=RatingResponse)
async def add_rating(rating_data: RatingCreate, token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"username": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.ratings.find_one({
        "user_id": token_data["user_id"],
        "content_id": rating_data.content_id,
    })

    if existing:
        await db.ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "rating": rating_data.rating,
                "review": rating_data.review,
                "content_title": rating_data.content_title,
                "created_at": datetime.now(timezone.utc),
            }},
        )
        rating_id = existing["id"]
    else:
        rating = Rating(
            user_id=token_data["user_id"],
            content_id=rating_data.content_id,
            content_title=rating_data.content_title,
            rating=rating_data.rating,
            review=rating_data.review,
        )
        await db.ratings.insert_one(rating.model_dump())
        rating_id = rating.id

    return RatingResponse(
        id=rating_id,
        user_id=token_data["user_id"],
        username=user["username"],
        content_id=rating_data.content_id,
        rating=rating_data.rating,
        review=rating_data.review,
        created_at=datetime.now(timezone.utc),
    )


@router.get("/ratings/{content_id}")
async def get_ratings(content_id: int):
    ratings = await db.ratings.find({"content_id": content_id}, {"_id": 0}).to_list(1000)

    user_ids = [r["user_id"] for r in ratings]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "username": 1},
    ).to_list(1000)
    user_map = {u["id"]: u["username"] for u in users}

    avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0

    rating_ids = [r["id"] for r in ratings]
    replies_by_rating = {}
    if rating_ids:
        all_replies = await db.review_replies.find(
            {"review_id": {"$in": rating_ids}},
            {"_id": 0},
        ).sort("created_at", 1).to_list(None)
        for rep in all_replies:
            replies_by_rating.setdefault(rep["review_id"], []).append(rep)

    enriched_ratings = []
    for r in ratings:
        rating_obj = RatingResponse(
            id=r["id"],
            user_id=r["user_id"],
            username=user_map.get(r["user_id"], "Unknown"),
            content_id=r["content_id"],
            rating=r["rating"],
            review=r.get("review"),
            created_at=r["created_at"],
        )
        rating_dict = rating_obj.model_dump()
        rating_dict["admin_replies"] = replies_by_rating.get(r["id"], [])
        enriched_ratings.append(rating_dict)

    return {
        "average": round(avg_rating, 1),
        "count": len(ratings),
        "ratings": enriched_ratings,
    }


@router.get("/ratings/user/content/{content_id}")
async def get_user_rating(content_id: int, token_data: dict = Depends(verify_token)):
    rating = await db.ratings.find_one({
        "user_id": token_data["user_id"],
        "content_id": content_id,
    })
    if not rating:
        return None

    user = await db.users.find_one({"id": token_data["user_id"]}, {"username": 1})
    return RatingResponse(
        id=rating["id"],
        user_id=rating["user_id"],
        username=user["username"] if user else "Unknown",
        content_id=rating["content_id"],
        rating=rating["rating"],
        review=rating.get("review"),
        created_at=rating["created_at"],
    )


@router.get("/reviews/all")
async def get_all_reviews(limit: int = 100, skip: int = 0):
    """Get all reviews across all content - for the public Reviews page."""
    try:
        all_ratings = await db.ratings.find(
            {"review": {"$exists": True, "$nin": [None, ""]}},
            {"_id": 0},
        ).sort("created_at", -1).limit(limit).skip(skip).to_list(length=limit)

        # ⚡ Batch-fetch ALL users in ONE query
        user_ids = list({r["user_id"] for r in all_ratings if r.get("user_id")})
        user_map = {}
        if user_ids:
            users = await db.users.find(
                {"id": {"$in": user_ids}},
                {"_id": 0, "id": 1, "username": 1},
            ).to_list(None)
            user_map = {u["id"]: u.get("username", "Anonymous") for u in users}

        return [
            {
                "id": r["id"],
                "content_id": r["content_id"],
                "content_title": r.get("content_title", "Unknown"),
                "username": user_map.get(r.get("user_id"), "Anonymous"),
                "rating": r["rating"],
                "review": r["review"],
                "created_at": r["created_at"],
                "media_type": r.get("media_type", "movie"),
            }
            for r in all_ratings
        ]
    except Exception as e:
        logger.error(f"Error fetching all reviews: {e}")
        return []


@router.put("/ratings/{rating_id}")
async def update_rating(rating_id: str, rating_data: RatingCreate, token_data: dict = Depends(verify_token)):
    existing = await db.ratings.find_one({"id": rating_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rating not found")
    if existing["user_id"] != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="Can only edit your own reviews")

    await db.ratings.update_one(
        {"id": rating_id},
        {"$set": {
            "rating": rating_data.rating,
            "review": rating_data.review,
            "content_title": rating_data.content_title,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"message": "Rating updated successfully"}


@router.delete("/ratings/{rating_id}")
async def delete_rating(rating_id: str, token_data: dict = Depends(verify_token)):
    """Users can delete their own; admins can delete any (moderation)."""
    existing = await db.ratings.find_one({"id": rating_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rating not found")

    admin_doc = await db.admins.find_one({"user_id": token_data["user_id"]}, {"_id": 0, "is_admin": 1})
    is_admin = bool(admin_doc and admin_doc.get("is_admin"))

    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own reviews")

    await db.ratings.delete_one({"id": rating_id})
    return {"message": "Rating deleted successfully"}


@router.post("/user-reply-to-admin")
async def user_reply_to_admin(reply_data: UserReplyCreate, token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "username": 1})
    reply = UserReply(
        admin_reply_id=reply_data.admin_reply_id,
        user_id=token_data["user_id"],
        username=user.get("username", "User"),
        reply_text=reply_data.reply_text,
    )
    await db.user_replies.insert_one(reply.model_dump())
    return {"message": "Reply posted successfully"}


# ============= EDIT / DELETE REPLIES (cross-collection) =============

class ReplyEdit(BaseModel):
    reply_text: str


@router.put("/user-reply/{reply_id}")
async def edit_user_reply(reply_id: str, body: ReplyEdit, token_data: dict = Depends(verify_token)):
    me = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "is_admin": 1}) or {}
    is_admin = bool(me.get("is_admin"))
    for col_name in ("user_replies", "review_replies", "app_review_replies"):
        col = db[col_name]
        existing = await col.find_one({"id": reply_id}, {"_id": 0})
        if not existing:
            continue
        owner_id = existing.get("user_id") or existing.get("admin_id")
        if owner_id != token_data["user_id"] and not is_admin:
            raise HTTPException(status_code=403, detail="Can only edit your own replies")
        await col.update_one(
            {"id": reply_id},
            {"$set": {"reply_text": body.reply_text, "edited_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"message": "Reply updated", "reply_id": reply_id}
    raise HTTPException(status_code=404, detail="Reply not found")


@router.delete("/user-reply/{reply_id}")
async def delete_user_reply(reply_id: str, token_data: dict = Depends(verify_token)):
    me = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "is_admin": 1}) or {}
    is_admin = bool(me.get("is_admin"))
    for col_name in ("user_replies", "review_replies", "app_review_replies"):
        col = db[col_name]
        existing = await col.find_one({"id": reply_id}, {"_id": 0})
        if not existing:
            continue
        owner_id = existing.get("user_id") or existing.get("admin_id")
        if owner_id != token_data["user_id"] and not is_admin:
            raise HTTPException(status_code=403, detail="Can only delete your own replies")
        await col.delete_one({"id": reply_id})
        return {"message": "Reply deleted", "reply_id": reply_id}
    raise HTTPException(status_code=404, detail="Reply not found")

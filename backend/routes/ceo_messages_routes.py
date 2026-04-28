"""CEO messaging + Founder profile reviews.

Two distinct features bundled together because they share the founder concept:

1. **CEO Messages** (`/api/ceo/messages`) — anyone (signed-in or guest) can
   send a private message to the CEO. The CEO sees them in the admin notifications
   widget and can reply privately.

2. **Profile Reviews** (`/api/profile-reviews/:username`) — visitors can leave
   a star-rating + review on a public profile (typically the founder's). The
   profile owner can reply to each review.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
from typing import Optional, List
import os
import uuid
import logging

from auth import verify_token
from ceo_config import is_ceo_email
from jose import jwt as _jose_jwt

logger = logging.getLogger(__name__)
router = APIRouter()

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def _user_id_from_authorization(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        secret = os.environ.get("JWT_SECRET_KEY")
        if not secret:
            return None
        payload = _jose_jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub") if payload else None
    except Exception:
        return None


async def _ensure_admin(token_data: dict):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


# ============= CEO MESSAGES =============

class CeoMessageCreate(BaseModel):
    message: str = Field(..., min_length=2, max_length=2000)
    sender_name: Optional[str] = None
    sender_email: Optional[EmailStr] = None


class CeoReply(BaseModel):
    reply: str = Field(..., min_length=1, max_length=4000)


@router.post("/ceo/messages")
async def send_ceo_message(
    payload: CeoMessageCreate,
    authorization: Optional[str] = Header(default=None),
):
    """Anyone (guest or signed-in) can send a message to the CEO."""
    user_id = _user_id_from_authorization(authorization)
    sender_username = None
    sender_email = payload.sender_email
    sender_name = (payload.sender_name or "").strip()

    if user_id:
        u = await db.users.find_one(
            {"id": user_id},
            {"_id": 0, "username": 1, "email": 1, "display_name": 1},
        )
        if u:
            sender_username = u.get("username")
            sender_email = sender_email or u.get("email")
            if not sender_name:
                sender_name = u.get("display_name") or u.get("username") or ""

    if not sender_name and not sender_email:
        raise HTTPException(
            status_code=400,
            detail="Please tell the CEO how to reach you — add your name or email.",
        )

    doc = {
        "id": str(uuid.uuid4()),
        "message": payload.message.strip(),
        "sender_user_id": user_id,
        "sender_username": sender_username,
        "sender_name": sender_name or None,
        "sender_email": sender_email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
        "reply": None,
        "replied_at": None,
    }
    await db.ceo_messages.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@router.get("/admin/ceo-messages")
async def list_ceo_messages(
    token_data: dict = Depends(verify_token),
    limit: int = 100,
):
    """Admin-only — list all CEO messages, newest first."""
    await _ensure_admin(token_data)
    cursor = db.ceo_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(max(1, min(limit, 500)))
    return {"messages": await cursor.to_list(limit)}


@router.post("/admin/ceo-messages/{message_id}/reply")
async def reply_ceo_message(
    message_id: str,
    payload: CeoReply,
    token_data: dict = Depends(verify_token),
):
    """Admin-only — reply to a CEO message. The reply is saved on the doc;
    if the sender provided an email, you can manually email them outside the app."""
    await _ensure_admin(token_data)
    res = await db.ceo_messages.update_one(
        {"id": message_id},
        {"$set": {
            "reply": payload.reply.strip(),
            "replied_at": datetime.now(timezone.utc).isoformat(),
            "read": True,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True}


@router.delete("/admin/ceo-messages/{message_id}")
async def delete_ceo_message(message_id: str, token_data: dict = Depends(verify_token)):
    await _ensure_admin(token_data)
    await db.ceo_messages.delete_one({"id": message_id})
    return {"ok": True}


# ============= PROFILE REVIEWS =============

class ProfileReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: str = Field(..., min_length=2, max_length=2000)


class ProfileReviewReply(BaseModel):
    reply: str = Field(..., min_length=1, max_length=2000)


@router.get("/profile-reviews/{username}")
async def list_profile_reviews(username: str):
    """Public — list reviews left ON the profile of `username`."""
    target = await db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
        {"_id": 0, "id": 1, "email": 1, "username": 1},
    )
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    target_id = target["id"]
    cursor = db.profile_reviews.find(
        {"target_user_id": target_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(200)
    rows: List[dict] = await cursor.to_list(200)

    avg = None
    if rows:
        avg = round(sum(r.get("rating", 0) for r in rows) / len(rows), 2)

    return {
        "target_username": target["username"],
        "reviews": rows,
        "count": len(rows),
        "avg_rating": avg,
    }


@router.post("/profile-reviews/{username}")
async def create_profile_review(
    username: str,
    payload: ProfileReviewCreate,
    token_data: dict = Depends(verify_token),
):
    """Sign-in required — leave a review on someone's profile.
    Each user can only post ONE review per target (re-posting overwrites)."""
    target = await db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
        {"_id": 0, "id": 1, "username": 1},
    )
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    if target["id"] == token_data["user_id"]:
        raise HTTPException(status_code=400, detail="You can't review your own profile.")

    reviewer = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1, "display_name": 1, "profile_picture_url": 1},
    ) or {}

    existing = await db.profile_reviews.find_one(
        {"target_user_id": target["id"], "reviewer_user_id": token_data["user_id"]},
        {"_id": 0, "id": 1},
    )

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "target_user_id": target["id"],
        "target_username": target["username"],
        "reviewer_user_id": token_data["user_id"],
        "reviewer_username": reviewer.get("username") or "",
        "reviewer_display_name": reviewer.get("display_name") or reviewer.get("username") or "",
        "reviewer_avatar": reviewer.get("profile_picture_url") or "",
        "rating": payload.rating,
        "review": payload.review.strip(),
        "created_at": existing["created_at"] if existing and existing.get("created_at") else now,
        "updated_at": now,
        "owner_reply": existing.get("owner_reply") if existing else None,
        "owner_replied_at": existing.get("owner_replied_at") if existing else None,
    } if existing else {
        "id": str(uuid.uuid4()),
        "target_user_id": target["id"],
        "target_username": target["username"],
        "reviewer_user_id": token_data["user_id"],
        "reviewer_username": reviewer.get("username") or "",
        "reviewer_display_name": reviewer.get("display_name") or reviewer.get("username") or "",
        "reviewer_avatar": reviewer.get("profile_picture_url") or "",
        "rating": payload.rating,
        "review": payload.review.strip(),
        "created_at": now,
        "updated_at": now,
        "owner_reply": None,
        "owner_replied_at": None,
    }

    if existing:
        await db.profile_reviews.update_one(
            {"target_user_id": target["id"], "reviewer_user_id": token_data["user_id"]},
            {"$set": {
                "rating": payload.rating,
                "review": payload.review.strip(),
                "updated_at": now,
            }},
        )
    else:
        await db.profile_reviews.insert_one(doc)

    return {"ok": True, "id": doc["id"]}


@router.post("/profile-reviews/{username}/{review_id}/reply")
async def reply_to_profile_review(
    username: str,
    review_id: str,
    payload: ProfileReviewReply,
    token_data: dict = Depends(verify_token),
):
    """Profile owner can reply to a review on their own profile."""
    target = await db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
        {"_id": 0, "id": 1},
    )
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    if target["id"] != token_data["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the profile owner can reply to reviews here.",
        )

    res = await db.profile_reviews.update_one(
        {"id": review_id, "target_user_id": target["id"]},
        {"$set": {
            "owner_reply": payload.reply.strip(),
            "owner_replied_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"ok": True}


@router.delete("/profile-reviews/{review_id}")
async def delete_profile_review(
    review_id: str,
    token_data: dict = Depends(verify_token),
):
    """Reviewer or admin can delete a review."""
    review = await db.profile_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    is_owner = review.get("reviewer_user_id") == token_data["user_id"]
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    is_admin = bool(admin and admin.get("is_admin"))

    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed.")

    await db.profile_reviews.delete_one({"id": review_id})
    return {"ok": True}


# ============= FOUNDER LOOKUP =============
# Note: Defined in `public_profile_routes.py` (BEFORE `/{username}`) for proper
# route ordering. This file only handles CEO messages and profile reviews.

"""Admin endpoints — dashboard, user mgmt, moderation, feedback, content requests.

Extracted from server.py during the cleanup pass. All routes inherit `/api`
from the app's main router via include_router.
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field

from admin_models import AdminConfig, ReviewReplyCreate
from auth import verify_token
from ceo_config import ceo_emails

logger = logging.getLogger(__name__)
router = APIRouter()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def verify_admin(token_data: dict = Depends(verify_token)):
    """Dependency: ensure caller is an admin."""
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return token_data


async def _is_ceo(user_id: str) -> bool:
    actor = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    actor_email = (actor.get("email") if actor else "").lower()
    return actor_email in ceo_emails()


# ============= DASHBOARD / STATS =============

@router.get("/admin/dashboard")
async def get_admin_dashboard(token_data: dict = Depends(verify_admin)):
    return {
        "total_users": await db.users.count_documents({}),
        "total_ratings": await db.ratings.count_documents({}),
        "total_reviews": await db.ratings.count_documents({"review": {"$ne": None}}),
        "pending_submissions": 0,
        "admin_name": "Cassius Fox",
        "role": "CEO & Founder",
    }


@router.get("/admin/stats")
async def get_admin_stats(token_data: dict = Depends(verify_admin)):
    total_users = await db.users.count_documents({})
    total_reviews = await db.ratings.count_documents({})
    avg_result = await db.ratings.aggregate([
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]).to_list(1)
    avg_rating = avg_result[0]["avg_rating"] if avg_result else 0.0
    admin = await db.admins.find_one({"user_id": token_data["user_id"]}, {"_id": 0})
    return {
        "total_users": total_users,
        "total_reviews": total_reviews,
        "average_rating": round(avg_rating, 2) if avg_rating else 0.0,
        "admin_name": token_data.get("username", "Admin"),
        "role": admin.get("role", "Admin") if admin else "Admin",
    }


@router.get("/admin/check")
async def check_admin_status(token_data: dict = Depends(verify_token)):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    return {
        "is_admin": admin is not None and admin.get("is_admin", False),
        "permissions": admin.get("permissions", []) if admin else [],
    }


# ============= USER MGMT =============

@router.get("/admin/users")
async def get_all_users(token_data: dict = Depends(verify_admin)):
    users = await db.users.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1},
    ).sort("created_at", -1).to_list(1000)

    admin_records = await db.admins.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
    admin_ids = {a["user_id"] for a in admin_records}
    for u in users:
        u["is_admin"] = u["id"] in admin_ids
    return users


@router.delete("/admin/delete-user/{user_id}")
async def delete_user(user_id: str, token_data: dict = Depends(verify_admin)):
    user_to_delete = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    target_admin = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
    target_is_admin = bool(target_admin and target_admin.get("is_admin"))

    if target_is_admin:
        if not await _is_ceo(token_data["user_id"]):
            raise HTTPException(status_code=403, detail="Only the CEO can delete admins")
        if user_id == token_data["user_id"]:
            raise HTTPException(status_code=403, detail="You cannot delete your own CEO account")

    await db.users.delete_one({"id": user_id})
    await db.ratings.delete_many({"user_id": user_id})
    await db.admins.delete_many({"user_id": user_id})
    await db.saved_trailers.delete_many({"user_id": user_id})
    await db.admin_messages.delete_many({"user_id": user_id})
    return {"message": "User deleted successfully", "user_id": user_id}


@router.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: str, token_data: dict = Depends(verify_admin)):
    admin_config = AdminConfig(
        user_id=user_id,
        is_admin=True,
        permissions=["moderate_reviews", "manage_content"],
        created_at=datetime.now(timezone.utc),
    )
    await db.admins.insert_one(admin_config.model_dump())
    return {"message": f"User {user_id} is now an admin"}


class AdminAction(BaseModel):
    user_id: str
    action: str  # "promote" | "demote"


@router.post("/admin/manage-admin")
async def manage_admin_status(action: AdminAction, token_data: dict = Depends(verify_admin)):
    target_user = await db.users.find_one({"id": action.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if action.action == "promote":
        if await db.admins.find_one({"user_id": action.user_id}):
            raise HTTPException(status_code=400, detail="User is already an admin")
        await db.admins.insert_one({
            "user_id": action.user_id,
            "is_admin": True,
            "permissions": ["moderate_reviews", "manage_content", "manage_users"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "role": "Admin",
        })
        return {"message": f"User {target_user['username']} promoted to admin"}

    if action.action == "demote":
        if action.user_id == token_data['user_id']:
            raise HTTPException(status_code=400, detail="Cannot demote yourself")
        if not await _is_ceo(token_data["user_id"]):
            raise HTTPException(status_code=403, detail="Only the CEO can demote admins")
        result = await db.admins.delete_one({"user_id": action.user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User is not an admin")
        return {"message": f"User {target_user['username']} removed from admin"}

    raise HTTPException(status_code=400, detail="Invalid action")


@router.get("/admin/user-details/{user_id}")
async def get_user_details(user_id: str, token_data: dict = Depends(verify_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop('hashed_password', None)

    watchlist = await db.watchlists.find_one({"user_id": user_id}, {"_id": 0})
    reviews = await db.reviews.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    app_reviews = await db.app_reviews.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    content_requests = await db.content_requests.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    feedback = await db.feedback.find({"user_id": user_id}, {"_id": 0}).to_list(100)

    return {
        "user": user,
        "stats": {
            "watchlist_items": len(watchlist.get('movie_ids', [])) if watchlist else 0,
            "reviews_count": len(reviews),
            "app_reviews_count": len(app_reviews),
            "content_requests_count": len(content_requests),
            "feedback_count": len(feedback),
        },
        "recent_reviews": reviews[:5],
        "recent_content_requests": content_requests[:5],
        "recent_feedback": feedback[:5],
    }


@router.post("/admin/promote-ceo")
async def promote_ceo_endpoint(token_data: dict = Depends(verify_token)):
    """One-time endpoint to promote CEO email to admin (kept gated by email allowlist)."""
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "email": 1, "username": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["email"].lower() not in ceo_emails():
        raise HTTPException(status_code=403, detail="This endpoint is only for the CEO email")

    existing_admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if existing_admin:
        return {
            "message": "You're already an admin!",
            "role": existing_admin.get("role", "Admin"),
            "permissions": existing_admin.get("permissions", []),
        }

    await db.admins.insert_one({
        "user_id": token_data["user_id"],
        "is_admin": True,
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "role": "CEO & Founder",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"CEO promoted via endpoint: {user['email']}")
    return {
        "message": "🎉 SUCCESS! You are now GamerGrid CEO!",
        "role": "CEO & Founder",
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "next_steps": "Refresh your page to see the Admin Panel!",
    }


# ============= MODERATION (REVIEWS / REPLIES) =============

@router.get("/admin/reviews")
async def admin_get_all_reviews(token_data: dict = Depends(verify_admin)):
    reviews = await db.ratings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

    user_ids = [r["user_id"] for r in reviews if "user_id" in r]
    users = await db.users.find(
        {"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "username": 1}
    ).to_list(1000)
    user_map = {u["id"]: u["username"] for u in users}

    review_ids = [r["id"] for r in reviews if "id" in r]
    replies_by_review = {}
    if review_ids:
        all_replies = await db.review_replies.find(
            {"review_id": {"$in": review_ids}}, {"_id": 0}
        ).sort("created_at", 1).to_list(None)
        for rep in all_replies:
            replies_by_review.setdefault(rep["review_id"], []).append(rep)

    for r in reviews:
        r["username"] = user_map.get(r["user_id"], "Unknown")
        if not r.get("content_title"):
            r["content_title"] = f"Content ID: {r.get('content_id', 'Unknown')}"
        if "review" in r:
            r["comment"] = r.pop("review")
        r["admin_replies"] = replies_by_review.get(r["id"], [])

    return reviews


@router.post("/admin/reply-to-review")
async def reply_to_review(reply_data: ReviewReplyCreate, token_data: dict = Depends(verify_admin)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "username": 1})
    reply = {
        "id": str(uuid.uuid4()),
        "review_id": reply_data.review_id,
        "admin_id": token_data["user_id"],
        "admin_username": user.get("username", "Admin"),
        "reply_text": reply_data.reply_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.review_replies.insert_one(reply)
    return {"message": "Reply posted successfully"}


@router.post("/admin/reply-to-app-review")
async def reply_to_app_review(reply_data: ReviewReplyCreate, token_data: dict = Depends(verify_admin)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "username": 1})
    reply = {
        "id": str(uuid.uuid4()),
        "review_id": reply_data.review_id,
        "admin_id": token_data["user_id"],
        "admin_username": user.get("username", "Admin"),
        "reply_text": reply_data.reply_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.app_review_replies.insert_one(reply)
    return {"message": "Reply posted successfully"}


@router.get("/admin/review-replies/{review_id}")
async def get_review_replies(review_id: str):
    replies = await db.review_replies.find(
        {"review_id": review_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return {"replies": replies}


@router.delete("/admin/delete-review/{review_id}")
async def delete_review(review_id: str, token_data: dict = Depends(verify_admin)):
    result = await db.ratings.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted successfully"}


# ============= FEEDBACK =============

class FeedbackCreate(BaseModel):
    title: str
    feedback_type: str  # bug, feature, improvement
    description: str
    priority: str = "medium"


class Feedback(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    title: str
    feedback_type: str
    description: str
    priority: str
    status: str = "pending"
    admin_response: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@router.post("/feedback/submit")
async def submit_feedback(feedback: FeedbackCreate, token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "username": 1})
    feedback_doc = Feedback(
        user_id=token_data["user_id"],
        username=user.get("username", "User"),
        title=feedback.title,
        feedback_type=feedback.feedback_type,
        description=feedback.description,
        priority=feedback.priority,
    )
    await db.feedback.insert_one(feedback_doc.model_dump())
    return {"message": "Feedback submitted successfully", "id": feedback_doc.id}


@router.get("/feedback/my-feedback")
async def get_my_feedback(token_data: dict = Depends(verify_token)):
    feedback_list = await db.feedback.find(
        {"user_id": token_data["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"feedback": feedback_list}


@router.get("/admin/feedback")
async def get_all_feedback(token_data: dict = Depends(verify_admin)):
    return await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.put("/admin/feedback/{feedback_id}/respond")
async def respond_to_feedback(
    feedback_id: str,
    response: dict,
    token_data: dict = Depends(verify_admin),
):
    await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {
            "admin_response": response.get("admin_response"),
            "status": response.get("status", "resolved"),
        }},
    )
    return {"message": "Feedback updated successfully"}


# ============= CONTENT REQUESTS =============

class ContentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content_type: str
    description: Optional[str] = None
    reason: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    admin_response: Optional[str] = None


class ContentRequestCreate(BaseModel):
    title: str
    content_type: str
    description: Optional[str] = None
    reason: Optional[str] = None


@router.post("/content-requests/submit")
async def submit_content_request(request: ContentRequestCreate, current_user: dict = Depends(verify_token)):
    request_obj = ContentRequest(user_id=current_user['user_id'], **request.model_dump())
    doc = request_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.content_requests.insert_one(doc)
    return {"message": "Your request has been submitted! We'll review it soon.", "request_id": request_obj.id}


@router.get("/content-requests/my-requests")
async def get_my_content_requests(current_user: dict = Depends(verify_token)):
    requests = await db.content_requests.find(
        {"user_id": current_user['user_id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    return {"requests": requests}


@router.get("/admin/content-requests")
async def get_all_content_requests(token_data: dict = Depends(verify_admin)):
    requests = await db.content_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    user_ids = list({r['user_id'] for r in requests if r.get('user_id')})
    users = await db.users.find(
        {"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "username": 1}
    ).to_list(None) if user_ids else []
    user_map = {u['id']: u.get('username', 'Unknown') for u in users}
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        req['username'] = user_map.get(req.get('user_id'), 'Unknown')
    return {"requests": requests}


@router.post("/admin/content-requests/{request_id}/respond")
async def respond_to_content_request(
    request_id: str,
    response: str,
    new_status: str,
    token_data: dict = Depends(verify_admin),
):
    await db.content_requests.update_one(
        {"id": request_id},
        {"$set": {
            "admin_response": response,
            "status": new_status,
            "responded_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"message": "Response sent successfully"}

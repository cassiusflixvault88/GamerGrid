"""
GamerGrid Analytics Routes
- Anonymous page-view tracking (no PII stored beyond a hashed IP)
- Admin-only dashboard endpoint with daily breakdown, top pages, top referrers,
  total visitors, sessions, and signup-conversion metrics.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import hashlib

from auth import verify_token

router = APIRouter(prefix="/analytics", tags=["analytics"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class TrackEvent(BaseModel):
    visitor_id: str
    session_id: str
    path: str
    referrer: Optional[str] = None


def _hash_ip(ip: str) -> str:
    if not ip:
        return ""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


async def _ensure_admin(token_data: dict):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/track")
async def track_page_view(event: TrackEvent, request: Request):
    """Anonymous pageview tracker. Called from frontend on every route change."""
    now = datetime.now(timezone.utc)
    ip = request.client.host if request.client else ""
    doc = {
        "visitor_id": event.visitor_id,
        "session_id": event.session_id,
        "path": event.path,
        "referrer": event.referrer,
        "user_agent": request.headers.get("user-agent", "")[:300],
        "ip_hash": _hash_ip(ip),
        "ts": now,
        "date": now.strftime("%Y-%m-%d"),
    }
    await db.page_views.insert_one(doc)
    return {"ok": True}


@router.get("/dashboard")
async def analytics_dashboard(
    days: int = 30,
    token_data: dict = Depends(verify_token),
):
    """Admin-only analytics dashboard."""
    await _ensure_admin(token_data)

    if days < 1:
        days = 1
    if days > 365:
        days = 365

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # Totals
    total_views = await db.page_views.count_documents({"ts": {"$gte": start}})

    uv_agg = await db.page_views.aggregate([
        {"$match": {"ts": {"$gte": start}}},
        {"$group": {"_id": "$visitor_id"}},
        {"$count": "count"},
    ]).to_list(1)
    unique_visitors = uv_agg[0]["count"] if uv_agg else 0

    sess_agg = await db.page_views.aggregate([
        {"$match": {"ts": {"$gte": start}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "count"},
    ]).to_list(1)
    sessions = sess_agg[0]["count"] if sess_agg else 0

    # Daily breakdown
    daily = await db.page_views.aggregate([
        {"$match": {"ts": {"$gte": start}}},
        {"$group": {
            "_id": "$date",
            "views": {"$sum": 1},
            "visitors": {"$addToSet": "$visitor_id"},
        }},
        {"$project": {
            "date": "$_id",
            "views": 1,
            "visitors": {"$size": "$visitors"},
            "_id": 0,
        }},
        {"$sort": {"date": 1}},
    ]).to_list(days + 5)

    # Top pages
    top_pages = await db.page_views.aggregate([
        {"$match": {"ts": {"$gte": start}}},
        {"$group": {"_id": "$path", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": 10},
        {"$project": {"path": "$_id", "views": 1, "_id": 0}},
    ]).to_list(10)

    # Top referrers
    top_referrers = await db.page_views.aggregate([
        {"$match": {
            "ts": {"$gte": start},
            "referrer": {"$nin": [None, ""]},
        }},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"referrer": "$_id", "count": 1, "_id": 0}},
    ]).to_list(10)

    # Signup conversion
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents(
        {"created_at": {"$gte": start.isoformat()}}
    )
    conversion_rate = round(
        (new_users / unique_visitors * 100), 2
    ) if unique_visitors > 0 else 0.0

    # All-time totals
    all_time_views = await db.page_views.count_documents({})
    all_time_visitors_agg = await db.page_views.aggregate([
        {"$group": {"_id": "$visitor_id"}},
        {"$count": "count"},
    ]).to_list(1)
    all_time_visitors = all_time_visitors_agg[0]["count"] if all_time_visitors_agg else 0

    return {
        "period_days": days,
        "totals": {
            "page_views": total_views,
            "unique_visitors": unique_visitors,
            "sessions": sessions,
            "total_users": total_users,
            "new_users_in_period": new_users,
            "conversion_rate": conversion_rate,
            "all_time_views": all_time_views,
            "all_time_visitors": all_time_visitors,
        },
        "daily": daily,
        "top_pages": top_pages,
        "top_referrers": top_referrers,
    }

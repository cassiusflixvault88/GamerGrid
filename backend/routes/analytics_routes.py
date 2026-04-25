"""
GamerGrid Analytics Routes
- Anonymous page-view tracking (no PII stored beyond a hashed IP)
- Auto-excludes admin/CEO visits from the public dashboard
- Admin-only dashboard endpoint with daily breakdown, top pages, top referrers,
  total visitors, sessions, recent visits feed, and signup-conversion metrics.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import hashlib
import logging

from auth import verify_token
from jose import jwt as _jose_jwt

logger = logging.getLogger(__name__)

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


async def _admin_user_ids() -> set:
    cursor = db.admins.find({"is_admin": True}, {"_id": 0, "user_id": 1})
    rows = await cursor.to_list(1000)
    return {r["user_id"] for r in rows if r.get("user_id")}


def _user_id_from_authorization(auth_header: Optional[str]) -> Optional[str]:
    """Soft-decode bearer token; never raise, return None on any failure."""
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


@router.post("/track")
async def track_page_view(
    event: TrackEvent,
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    """Anonymous pageview tracker.
    If the request includes a valid bearer token, we record the user_id so the
    dashboard can filter out admin/CEO traffic.
    """
    now = datetime.now(timezone.utc)
    ip = request.client.host if request.client else ""
    user_id = _user_id_from_authorization(authorization)

    # Mark whether this visit is from an admin (excluded from public stats)
    is_admin_visit = False
    if user_id:
        admin = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
        is_admin_visit = bool(admin and admin.get("is_admin"))

    doc = {
        "visitor_id": event.visitor_id,
        "session_id": event.session_id,
        "path": event.path,
        "referrer": event.referrer,
        "user_agent": request.headers.get("user-agent", "")[:300],
        "ip_hash": _hash_ip(ip),
        "ts": now,
        "date": now.strftime("%Y-%m-%d"),
        "user_id": user_id,
        "is_admin_visit": is_admin_visit,
    }
    await db.page_views.insert_one(doc)
    return {"ok": True}


def _humanize_referrer(ref: Optional[str]) -> str:
    if not ref:
        return "Direct"
    try:
        from urllib.parse import urlparse
        host = urlparse(ref).netloc.lower()
        host = host.replace("www.", "")
        if not host:
            return "Direct"
        if "google" in host:
            return f"Google ({host})"
        if "facebook" in host or "fb.com" in host:
            return "Facebook"
        if "twitter" in host or "x.com" in host or "t.co" in host:
            return "X / Twitter"
        if "instagram" in host:
            return "Instagram"
        if "youtube" in host or "youtu.be" in host:
            return "YouTube"
        if "tiktok" in host:
            return "TikTok"
        if "reddit" in host:
            return "Reddit"
        return host
    except Exception:
        return ref[:50]


@router.get("/dashboard")
async def analytics_dashboard(
    days: int = 30,
    token_data: dict = Depends(verify_token),
):
    """Admin-only analytics dashboard. EXCLUDES admin/CEO traffic from all numbers."""
    await _ensure_admin(token_data)

    if days < 1:
        days = 1
    if days > 365:
        days = 365

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    last_24h = now - timedelta(hours=24)

    # Common filter: never count admin/CEO visits in the dashboard.
    base_match = {"is_admin_visit": {"$ne": True}}
    period_match = {**base_match, "ts": {"$gte": start}}

    # Totals (period)
    total_views = await db.page_views.count_documents(period_match)

    uv_agg = await db.page_views.aggregate([
        {"$match": period_match},
        {"$group": {"_id": "$visitor_id"}},
        {"$count": "count"},
    ]).to_list(1)
    unique_visitors = uv_agg[0]["count"] if uv_agg else 0

    sess_agg = await db.page_views.aggregate([
        {"$match": period_match},
        {"$group": {"_id": "$session_id"}},
        {"$count": "count"},
    ]).to_list(1)
    sessions = sess_agg[0]["count"] if sess_agg else 0

    # Last 24 hours
    views_24h = await db.page_views.count_documents({**base_match, "ts": {"$gte": last_24h}})
    visitors_24h_agg = await db.page_views.aggregate([
        {"$match": {**base_match, "ts": {"$gte": last_24h}}},
        {"$group": {"_id": "$visitor_id"}},
        {"$count": "count"},
    ]).to_list(1)
    visitors_24h = visitors_24h_agg[0]["count"] if visitors_24h_agg else 0

    # Daily breakdown
    daily = await db.page_views.aggregate([
        {"$match": period_match},
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
        {"$match": period_match},
        {"$group": {"_id": "$path", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": 10},
        {"$project": {"path": "$_id", "views": 1, "_id": 0}},
    ]).to_list(10)

    # Top referrers
    top_referrers = await db.page_views.aggregate([
        {"$match": {**period_match, "referrer": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"referrer": "$_id", "count": 1, "_id": 0}},
    ]).to_list(10)

    # Recent visits feed — last 50 non-admin visits
    recent_raw = await db.page_views.find(
        base_match,
        {"_id": 0, "ts": 1, "path": 1, "referrer": 1, "visitor_id": 1, "user_agent": 1},
    ).sort("ts", -1).limit(50).to_list(50)

    recent = []
    for r in recent_raw:
        ts = r.get("ts")
        if isinstance(ts, datetime):
            ts_iso = ts.isoformat()
        else:
            ts_iso = str(ts) if ts else None
        ua = (r.get("user_agent") or "").lower()
        if "iphone" in ua or "ipad" in ua:
            device = "iPhone / iPad"
        elif "android" in ua:
            device = "Android"
        elif "mac" in ua:
            device = "Mac"
        elif "windows" in ua:
            device = "Windows"
        else:
            device = "Other"
        recent.append({
            "ts": ts_iso,
            "path": r.get("path"),
            "referrer": _humanize_referrer(r.get("referrer")),
            "visitor_id_short": (r.get("visitor_id") or "")[:8],
            "device": device,
        })

    # Signup conversion (created_at is stored as Date in MongoDB, not string)
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": start}})
    conversion_rate = round(
        (new_users / unique_visitors * 100), 2
    ) if unique_visitors > 0 else 0.0

    # All-time totals (excluding admin)
    all_time_views = await db.page_views.count_documents(base_match)
    all_time_visitors_agg = await db.page_views.aggregate([
        {"$match": base_match},
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
            "views_24h": views_24h,
            "visitors_24h": visitors_24h,
            "total_users": total_users,
            "new_users_in_period": new_users,
            "conversion_rate": conversion_rate,
            "all_time_views": all_time_views,
            "all_time_visitors": all_time_visitors,
        },
        "daily": daily,
        "top_pages": top_pages,
        "top_referrers": top_referrers,
        "recent_visits": recent,
        "note": "All numbers EXCLUDE admin/CEO traffic.",
    }


@router.post("/admin/backfill-admin-flag")
async def backfill_admin_flag(token_data: dict = Depends(verify_token)):
    """One-time backfill: mark old page_views from admin user_ids as admin visits.
    Useful for cleaning out the data accumulated from your own browsing.
    """
    await _ensure_admin(token_data)
    admin_ids = await _admin_user_ids()
    if not admin_ids:
        return {"ok": True, "updated": 0, "note": "No admin user_ids found."}

    result = await db.page_views.update_many(
        {"user_id": {"$in": list(admin_ids)}, "is_admin_visit": {"$ne": True}},
        {"$set": {"is_admin_visit": True}},
    )
    return {"ok": True, "updated": result.modified_count, "admin_ids_checked": len(admin_ids)}


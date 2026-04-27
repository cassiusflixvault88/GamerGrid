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
from ceo_config import is_ceo_email
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

    # Mark whether this visit is from an admin/CEO (excluded from public stats).
    # We check BOTH the admins collection AND the CEO email allowlist, because
    # the founder is sometimes recorded only via the CEO_EMAILS env var.
    is_admin_visit = False
    if user_id:
        admin = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
        if admin and admin.get("is_admin"):
            is_admin_visit = True
        else:
            user_doc = await db.users.find_one(
                {"id": user_id}, {"_id": 0, "email": 1}
            )
            if user_doc and is_ceo_email(user_doc.get("email") or ""):
                is_admin_visit = True

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


async def _count_unique_visitors(match: dict) -> int:
    rows = await db.page_views.aggregate([
        {"$match": match},
        {"$group": {"_id": "$visitor_id"}},
        {"$count": "count"},
    ]).to_list(1)
    return rows[0]["count"] if rows else 0


async def _count_unique_sessions(match: dict) -> int:
    rows = await db.page_views.aggregate([
        {"$match": match},
        {"$group": {"_id": "$session_id"}},
        {"$count": "count"},
    ]).to_list(1)
    return rows[0]["count"] if rows else 0


async def _daily_breakdown(match: dict, max_days: int) -> list:
    return await db.page_views.aggregate([
        {"$match": match},
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
    ]).to_list(max_days + 5)


async def _top_pages(match: dict) -> list:
    return await db.page_views.aggregate([
        {"$match": match},
        {"$group": {"_id": "$path", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": 10},
        {"$project": {"path": "$_id", "views": 1, "_id": 0}},
    ]).to_list(10)


async def _top_referrers(match: dict) -> list:
    return await db.page_views.aggregate([
        {"$match": {**match, "referrer": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"referrer": "$_id", "count": 1, "_id": 0}},
    ]).to_list(10)


def _device_from_ua(ua: str) -> str:
    ua = (ua or "").lower()
    if "iphone" in ua or "ipad" in ua:
        return "iPhone / iPad"
    if "android" in ua:
        return "Android"
    if "mac" in ua:
        return "Mac"
    if "windows" in ua:
        return "Windows"
    return "Other"


async def _recent_visits(base_match: dict, limit: int = 50) -> list:
    raw = await db.page_views.find(
        base_match,
        {"_id": 0, "ts": 1, "path": 1, "referrer": 1, "visitor_id": 1, "user_agent": 1},
    ).sort("ts", -1).limit(limit).to_list(limit)

    out = []
    for r in raw:
        ts = r.get("ts")
        ts_iso = ts.isoformat() if isinstance(ts, datetime) else (str(ts) if ts else None)
        out.append({
            "ts": ts_iso,
            "path": r.get("path"),
            "referrer": _humanize_referrer(r.get("referrer")),
            "visitor_id_short": (r.get("visitor_id") or "")[:8],
            "device": _device_from_ua(r.get("user_agent")),
        })
    return out


async def _user_growth(start: datetime) -> tuple[int, int]:
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": start}})
    return total_users, new_users


@router.get("/dashboard")
async def analytics_dashboard(
    days: int = 30,
    token_data: dict = Depends(verify_token),
):
    """Admin-only analytics dashboard. EXCLUDES admin/CEO traffic from all numbers."""
    await _ensure_admin(token_data)

    days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    last_24h = now - timedelta(hours=24)

    base_match = {"is_admin_visit": {"$ne": True}}
    period_match = {**base_match, "ts": {"$gte": start}}
    last_24h_match = {**base_match, "ts": {"$gte": last_24h}}

    # Period totals
    total_views = await db.page_views.count_documents(period_match)
    unique_visitors = await _count_unique_visitors(period_match)
    sessions = await _count_unique_sessions(period_match)

    # Last 24h
    views_24h = await db.page_views.count_documents(last_24h_match)
    visitors_24h = await _count_unique_visitors(last_24h_match)

    # Breakdowns
    daily = await _daily_breakdown(period_match, days)
    top_pages = await _top_pages(period_match)
    top_referrers = await _top_referrers(period_match)
    recent = await _recent_visits(base_match)

    # User growth
    total_users, new_users = await _user_growth(start)
    conversion_rate = round(
        (new_users / unique_visitors * 100), 2
    ) if unique_visitors > 0 else 0.0

    # All-time totals
    all_time_views = await db.page_views.count_documents(base_match)
    all_time_visitors = await _count_unique_visitors(base_match)

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
    """One-time backfill: mark old page_views from admin user_ids AND CEO emails
    as admin visits. Cleans out the founder's own browsing from public stats.
    """
    await _ensure_admin(token_data)

    # 1) Admins collection
    admin_ids = await _admin_user_ids()

    # 2) CEO emails — fetch user IDs whose email is in the allowlist
    from ceo_config import ceo_emails as _ceo_emails
    emails = list(_ceo_emails())
    if emails:
        ceo_users = await db.users.find(
            {"email": {"$in": emails}}, {"_id": 0, "id": 1}
        ).to_list(50)
        for u in ceo_users:
            if u.get("id"):
                admin_ids.add(u["id"])

    if not admin_ids:
        return {"ok": True, "updated": 0, "note": "No admin/CEO user_ids found."}

    result = await db.page_views.update_many(
        {"user_id": {"$in": list(admin_ids)}, "is_admin_visit": {"$ne": True}},
        {"$set": {"is_admin_visit": True}},
    )
    return {
        "ok": True,
        "updated": result.modified_count,
        "admin_ids_checked": len(admin_ids),
    }


@router.get("/new-visitors-summary")
async def new_visitors_summary(token_data: dict = Depends(verify_token)):
    """Quick-glance card for the admin dashboard / profile widget.
    Returns counts of visitors over the past 24h, 7d, 30d (real users only).
    """
    await _ensure_admin(token_data)
    now = datetime.now(timezone.utc)

    async def _unique_visitors_since(start_dt: datetime) -> int:
        rows = await db.page_views.aggregate([
            {"$match": {"is_admin_visit": {"$ne": True}, "ts": {"$gte": start_dt}}},
            {"$group": {"_id": "$visitor_id"}},
            {"$count": "n"},
        ]).to_list(1)
        return rows[0]["n"] if rows else 0

    async def _new_visitors_since(start_dt: datetime) -> int:
        """Visitors whose FIRST-EVER visit happened after start_dt."""
        rows = await db.page_views.aggregate([
            {"$match": {"is_admin_visit": {"$ne": True}}},
            {"$group": {"_id": "$visitor_id", "first_ts": {"$min": "$ts"}}},
            {"$match": {"first_ts": {"$gte": start_dt}}},
            {"$count": "n"},
        ]).to_list(1)
        return rows[0]["n"] if rows else 0

    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)

    return {
        "last_24h": {
            "visitors": await _unique_visitors_since(last_24h),
            "new_visitors": await _new_visitors_since(last_24h),
        },
        "last_7d": {
            "visitors": await _unique_visitors_since(last_7d),
            "new_visitors": await _new_visitors_since(last_7d),
        },
        "last_30d": {
            "visitors": await _unique_visitors_since(last_30d),
            "new_visitors": await _new_visitors_since(last_30d),
        },
        "as_of": now.isoformat(),
        "note": "Excludes admin/CEO traffic. 'new_visitors' = unique visitor_id whose first-ever pageview was inside the window.",
    }


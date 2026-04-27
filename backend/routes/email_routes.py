"""
GamerGrid Email Routes — Top 10 Weekly Digest

- Admin can preview the weekly digest HTML.
- Admin can send a test email (to themselves).
- Admin can trigger the weekly broadcast to all subscribed users.
- Subscription is controlled by the existing `email_notifications` flag on the user.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
import asyncio
import logging
import resend

from auth import verify_token
from email_utils import (
    db,
    site_url as _site_url,
    sender_email,
    build_digest_html as _build_digest_html,
    fetch_top10_for_email as _fetch_top10_for_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email"])

SENDER_EMAIL = sender_email()


def _api_key() -> str:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Email service not configured. Add RESEND_API_KEY to backend/.env (get one at https://resend.com).",
        )
    return key


async def _ensure_admin(token_data: dict):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


# ===== Subscribe / Unsubscribe (uses existing email_notifications flag) =====
class SubscribePayload(BaseModel):
    subscribed: bool


@router.post("/subscribe")
async def set_subscription(
    payload: SubscribePayload,
    token_data: dict = Depends(verify_token),
):
    """Toggle weekly digest subscription for current user."""
    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {"email_notifications": bool(payload.subscribed)}},
    )
    return {"ok": True, "subscribed": bool(payload.subscribed)}


@router.get("/subscription")
async def get_subscription(token_data: dict = Depends(verify_token)):
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "email_notifications": 1, "email": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "subscribed": bool(user.get("email_notifications", True)),
        "email": user.get("email"),
    }


# ===== Admin: Preview / Test / Send Weekly =====
@router.get("/digest/preview")
async def preview_digest(token_data: dict = Depends(verify_token)):
    """Returns the HTML body that would be sent."""
    await _ensure_admin(token_data)
    top10 = await _fetch_top10_for_email()
    if not top10:
        raise HTTPException(
            status_code=503,
            detail="Top 10 cache is empty. Visit /top10 first to populate.",
        )
    site_url = os.environ.get("FRONTEND_URL") or ""
    html = _build_digest_html(top10, site_url or "https://gamergrid.com")
    return {"html": html, "count": len(top10)}


class SendTestPayload(BaseModel):
    recipient: Optional[str] = None  # defaults to admin's own email


@router.post("/digest/send-test")
async def send_test_digest(
    payload: SendTestPayload = SendTestPayload(),
    token_data: dict = Depends(verify_token),
):
    """Admin sends a test digest to themselves (or specified email)."""
    await _ensure_admin(token_data)
    resend.api_key = _api_key()

    me = await db.users.find_one(
        {"id": token_data["user_id"]}, {"_id": 0, "email": 1}
    )
    recipient = payload.recipient or (me or {}).get("email")
    if not recipient:
        raise HTTPException(status_code=400, detail="No recipient email")

    top10 = await _fetch_top10_for_email()
    if not top10:
        raise HTTPException(status_code=503, detail="Top 10 cache empty")

    html = _build_digest_html(top10, _site_url())
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": "🎮 GamerGrid — This Week's Top 10 Games (TEST)",
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Test digest sent to {recipient}: {result}")
        return {"ok": True, "recipient": recipient, "id": result.get("id")}
    except Exception as e:
        logger.error(f"Test digest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Send failed: {e}")


@router.post("/digest/send-weekly")
async def send_weekly_digest(token_data: dict = Depends(verify_token)):
    """Admin triggers the weekly broadcast to all subscribed users."""
    await _ensure_admin(token_data)
    resend.api_key = _api_key()

    top10 = await _fetch_top10_for_email()
    if not top10:
        raise HTTPException(status_code=503, detail="Top 10 cache empty")

    html = _build_digest_html(top10)

    # Subscribed = email_notifications != False (default opt-in for existing users)
    cursor = db.users.find(
        {"$or": [
            {"email_notifications": {"$ne": False}},
            {"email_notifications": {"$exists": False}},
        ]},
        {"_id": 0, "email": 1, "id": 1, "username": 1},
    )
    subscribers = await cursor.to_list(10000)

    sent = 0
    failed = 0
    failed_emails = []
    subject = "🎮 GamerGrid — This Week's Top 10 Games"

    for sub in subscribers:
        email = (sub.get("email") or "").strip()
        if not email or "@" not in email:
            continue
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": subject,
                "html": html,
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent += 1
            # Resend free tier: 2 req/sec — small delay to be safe
            await asyncio.sleep(0.6)
        except Exception as e:
            failed += 1
            failed_emails.append({"email": email, "error": str(e)[:120]})
            logger.warning(f"Digest send failed for {email}: {e}")

    # Log the run
    await db.digest_runs.insert_one({
        "ts": datetime.now(timezone.utc),
        "sent_count": sent,
        "failed_count": failed,
        "triggered_by": token_data["user_id"],
        "failed_emails": failed_emails[:20],
    })

    return {
        "ok": True,
        "sent": sent,
        "failed": failed,
        "total_subscribers": len(subscribers),
        "failed_samples": failed_emails[:10],
    }


@router.get("/digest/runs")
async def digest_run_history(token_data: dict = Depends(verify_token)):
    """Admin: see history of weekly digest sends."""
    await _ensure_admin(token_data)
    runs = await db.digest_runs.find(
        {}, {"_id": 0}
    ).sort("ts", -1).to_list(50)
    for r in runs:
        if isinstance(r.get("ts"), datetime):
            r["ts"] = r["ts"].isoformat()
    return {"runs": runs}


@router.get("/digest/scheduler-status")
async def digest_scheduler_status(token_data: dict = Depends(verify_token)):
    """Admin: confirm the auto-scheduler is running and see next run time."""
    await _ensure_admin(token_data)
    try:
        from scheduler import get_scheduler_status
        return get_scheduler_status()
    except Exception as e:
        return {"running": False, "error": str(e)}

"""
GamerGrid Email Routes — Top 10 Weekly Digest

- Admin can preview the weekly digest HTML.
- Admin can send a test email (to themselves).
- Admin can trigger the weekly broadcast to all subscribed users.
- Subscription is controlled by the existing `email_notifications` flag on the user.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional
import os
import asyncio
import logging
import resend

from auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


def _api_key() -> str:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Email service not configured. Add RESEND_API_KEY to backend/.env (get one at https://resend.com).",
        )
    return key


def _site_url() -> str:
    """Public URL for the app — used in email links/CTAs.
    Set FRONTEND_URL in backend/.env once you buy a domain.
    """
    url = (os.environ.get("FRONTEND_URL") or "").strip()
    if url:
        return url.rstrip("/")
    # Fallback to the current Emergent preview URL until a real domain is set.
    return "https://hbo-max-app.preview.emergentagent.com"


async def _ensure_admin(token_data: dict):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


# ===== HTML Template =====
def _build_digest_html(top10: list, site_url: str = "https://gamergrid.com") -> str:
    rows = []
    for i, g in enumerate(top10):
        rank = i + 1
        title = g.get("title") or g.get("name") or "Unknown"
        # IGDB cover lives in `poster_path` (full https URL).
        cover = g.get("poster_path") or g.get("cover_url") or g.get("cover") or ""
        # Ratings: vote_average (0-10) preferred; fall back to metacritic_aggregate (0-100).
        vote_avg = g.get("vote_average")
        meta = g.get("metacritic_aggregate")
        if isinstance(vote_avg, (int, float)) and vote_avg > 0:
            rating_str = f"{vote_avg:.1f}/10"
        elif isinstance(meta, (int, float)) and meta > 0:
            rating_str = f"{meta:.0f}/100"
        else:
            rating_str = ""
        platforms = ", ".join((g.get("platforms") or [])[:3])
        delta = g.get("delta")
        if delta is None:
            delta_html = '<span style="color:#888;font-size:11px;">NEW</span>'
        elif delta > 0:
            delta_html = f'<span style="color:#22c55e;font-size:11px;">▲ {delta}</span>'
        elif delta < 0:
            delta_html = f'<span style="color:#ef4444;font-size:11px;">▼ {abs(delta)}</span>'
        else:
            delta_html = '<span style="color:#888;font-size:11px;">—</span>'

        cover_html = (
            f'<img src="{cover}" alt="{title}" width="80" height="106" '
            'style="border-radius:6px;display:block;object-fit:cover;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />'
            if cover else
            '<div style="width:80px;height:106px;background:#222;border-radius:6px;"></div>'
        )

        rating_html = (
            f'<span style="color:#fbbf24;font-weight:bold;">★ {rating_str}</span>'
            if rating_str else ""
        )

        rows.append(f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1f1f1f;" valign="top">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="50" valign="top" style="font-size:32px;font-weight:900;color:#fbbf24;font-family:Arial,sans-serif;line-height:1;padding-right:12px;">
                  {rank}
                </td>
                <td width="80" valign="top" style="padding-right:12px;">
                  {cover_html}
                </td>
                <td valign="top" style="font-family:Arial,sans-serif;color:#ffffff;">
                  <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">{title}</div>
                  <div style="font-size:12px;color:#aaa;margin-bottom:6px;">{platforms}</div>
                  <div style="font-size:13px;">{rating_html} &nbsp; {delta_html}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """)

    week = datetime.now(timezone.utc).strftime("Week of %b %d, %Y")
    return f"""
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0a;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;padding:24px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);text-align:center;">
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:28px;font-weight:900;color:#000;letter-spacing:1px;">GAMERGRID</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;margin-top:4px;">Top 10 Games — {week}</div>
      </td></tr>
      <!-- Intro -->
      <tr><td style="padding:24px 24px 8px 24px;font-family:Arial,sans-serif;color:#fff;">
        <h2 style="margin:0 0 8px 0;color:#fbbf24;font-size:20px;">This Week's Hottest Games</h2>
        <p style="margin:0;color:#aaa;font-size:14px;line-height:1.5;">
          Here are the 10 most-played games right now, blended from Steam, Twitch, and IGDB activity.
        </p>
      </td></tr>
      <!-- Top 10 -->
      <tr><td style="padding:8px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          {''.join(rows)}
        </table>
      </td></tr>
      <!-- CTA -->
      <tr><td style="padding:24px;text-align:center;">
        <a href="{site_url}/top10" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;">View Full Top 10 →</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 24px;background:#000;border-top:1px solid #1f1f1f;font-family:Arial,sans-serif;color:#666;font-size:11px;text-align:center;">
        You're getting this because you're subscribed to GamerGrid weekly digests.<br/>
        <a href="{site_url}/settings" style="color:#666;">Manage preferences</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
"""


async def _fetch_top10_for_email() -> list:
    """Re-use the cached top10 from games_cache; fall back to empty list."""
    cache = await db.games_cache.find_one(
        {"_id": "top10_v3"}, {"_id": 0, "data": 1}
    )
    if cache and cache.get("data") and cache["data"].get("results"):
        return cache["data"]["results"][:10]
    return []


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

"""
Email Verification + Password Reset routes.
Free anti-spam: every new account must click a verification link before login.
Reduces bot signups to near-zero without needing reCAPTCHA.
"""
import os
import secrets
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth-extras"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def _site_url() -> str:
    url = (os.environ.get("FRONTEND_URL") or "").strip()
    return (url or "https://hbo-max-app.emergent.host").rstrip("/")


async def _send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.warning("Resend API key missing — email not sent")
        return False
    try:
        import resend
        resend.api_key = api_key
        sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        await asyncio.to_thread(
            resend.Emails.send,
            {"from": sender, "to": [to], "subject": subject, "html": html},
        )
        return True
    except Exception as e:
        logger.error(f"Email send failed for {to}: {e}")
        return False


def _wrap(content_html: str, accent: str = "#fbbf24") -> str:
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;padding:24px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px;background:linear-gradient(135deg,{accent},#f59e0b);text-align:center;">
        <div style="font-family:Arial Black,sans-serif;font-size:28px;font-weight:900;color:#000;letter-spacing:1px;">GAMERGRID</div>
      </td></tr>
      <tr><td style="padding:32px 24px;font-family:Arial,sans-serif;color:#fff;">{content_html}</td></tr>
      <tr><td style="padding:16px 24px;background:#000;border-top:1px solid #1f1f1f;font-family:Arial,sans-serif;color:#666;font-size:11px;text-align:center;">
        Sent by GamerGrid · If you didn't request this, ignore this email.
      </td></tr>
    </table>
  </td></tr></table></body></html>"""


# ============= EMAIL VERIFICATION =============

class ResendVerifyPayload(BaseModel):
    email: EmailStr


@router.post("/send-verification")
async def send_verification(payload: ResendVerifyPayload):
    """Generate a fresh verification token and email it to the user."""
    user = await db.users.find_one({"email": payload.email}, {"_id": 0, "id": 1, "username": 1, "email_verified": 1})
    if not user:
        # Don't reveal whether email exists
        return {"ok": True, "sent": False}
    if user.get("email_verified"):
        return {"ok": True, "sent": False, "already_verified": True}

    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    await db.email_verifications.delete_many({"user_id": user["id"]})
    await db.email_verifications.insert_one({
        "user_id": user["id"],
        "token": token,
        "email": payload.email,
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    link = f"{_site_url()}/verify-email?token={token}"
    html = _wrap(f"""
        <h2 style="margin:0 0 16px 0;color:#fbbf24;">Verify your email</h2>
        <p style="line-height:1.6;color:#ddd;">Hey {user.get('username', 'there')}, welcome to GamerGrid! Click the button below to verify your email and activate your account.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="{link}" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;">Verify Email →</a>
        </p>
        <p style="color:#888;font-size:12px;line-height:1.5;">Or copy this link: <br/><span style="color:#aaa;word-break:break-all;">{link}</span></p>
        <p style="color:#666;font-size:11px;margin-top:16px;">Expires in 2 days.</p>
    """)
    await _send_email(payload.email, "Verify your GamerGrid account", html)
    return {"ok": True, "sent": True}


@router.get("/verify-email")
async def verify_email(token: str):
    record = await db.email_verifications.find_one({"token": token}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    expires = record.get("expires_at")
    if expires and expires < datetime.now(timezone.utc).isoformat():
        await db.email_verifications.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Verification link expired")

    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"email_verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.email_verifications.delete_one({"token": token})
    return {"ok": True, "message": "Email verified! You can now log in."}


# ============= PASSWORD RESET =============

class ForgotPasswordPayload(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordPayload):
    """Send a password-reset link. Always returns ok (don't reveal account existence)."""
    user = await db.users.find_one({"email": payload.email}, {"_id": 0, "id": 1, "username": 1})
    if not user:
        return {"ok": True}

    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    await db.password_resets.delete_many({"user_id": user["id"]})
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token": token,
        "email": payload.email,
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    link = f"{_site_url()}/reset-password?token={token}"
    html = _wrap(f"""
        <h2 style="margin:0 0 16px 0;color:#fbbf24;">Reset your password</h2>
        <p style="line-height:1.6;color:#ddd;">Hi {user.get('username', '')}, we got a request to reset your GamerGrid password. Click below to choose a new one.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="{link}" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;">Reset Password →</a>
        </p>
        <p style="color:#888;font-size:12px;line-height:1.5;">This link expires in 1 hour. If you didn't ask for this, just ignore the email.</p>
    """, accent="#ef4444")
    await _send_email(payload.email, "Reset your GamerGrid password", html)
    return {"ok": True}


class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    record = await db.password_resets.find_one({"token": payload.token}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    expires = record.get("expires_at")
    if expires and expires < datetime.now(timezone.utc).isoformat():
        await db.password_resets.delete_one({"token": payload.token})
        raise HTTPException(status_code=400, detail="Reset link expired — please request a new one")

    from auth import get_password_hash
    new_hash = get_password_hash(payload.new_password)
    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"hashed_password": new_hash, "password_reset_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.password_resets.delete_one({"token": payload.token})
    return {"ok": True, "message": "Password updated. You can now log in."}

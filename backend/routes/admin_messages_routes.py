"""
Admin Messages Routes
- Admins can send direct messages to any user (e.g., warnings, announcements)
- Users see their messages in their settings/inbox
- Original CEO (cassiusflixvault@gmail.com) is protected from being deleted/demoted
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
import uuid
import asyncio
import logging

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin-messages"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


CEO_EMAILS = {"cassius@flixvault.com", "cassiusflixvault@gmail.com"}


async def _ensure_admin(token_data: dict):
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin


async def _is_ceo(user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    return bool(user and (user.get("email") or "").lower() in CEO_EMAILS)


class MessagePayload(BaseModel):
    user_id: str
    subject: str
    body: str
    severity: Optional[str] = "info"  # info | warning | violation


@router.post("/admin/send-message")
async def admin_send_message(
    payload: MessagePayload,
    token_data: dict = Depends(verify_token),
):
    """Admin sends a direct message to any user. Optionally emails them too."""
    await _ensure_admin(token_data)

    target = await db.users.find_one(
        {"id": payload.user_id},
        {"_id": 0, "email": 1, "username": 1},
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    sender = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1},
    ) or {}

    msg = {
        "id": str(uuid.uuid4()),
        "user_id": payload.user_id,
        "from_admin_id": token_data["user_id"],
        "from_admin_username": sender.get("username", "Admin"),
        "subject": payload.subject,
        "body": payload.body,
        "severity": payload.severity or "info",
        "read": False,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_messages.insert_one(msg)

    # Best-effort email notification
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if api_key and target.get("email"):
        try:
            import resend
            resend.api_key = api_key
            sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
            site_url = (os.environ.get("FRONTEND_URL") or "https://hbo-max-app.emergent.host").rstrip("/")
            severity_color = {"info": "#3b82f6", "warning": "#f59e0b", "violation": "#ef4444"}.get(payload.severity, "#3b82f6")
            html = f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;padding:24px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px;background:{severity_color};text-align:center;">
        <div style="font-family:Arial Black,sans-serif;font-size:24px;font-weight:900;color:#fff;letter-spacing:1px;">GAMERGRID</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#fff;margin-top:4px;text-transform:uppercase;">Message from Admin</div>
      </td></tr>
      <tr><td style="padding:32px 24px;font-family:Arial,sans-serif;color:#fff;">
        <h2 style="margin:0 0 16px 0;color:{severity_color};font-size:20px;">{payload.subject}</h2>
        <p style="line-height:1.6;color:#ddd;font-size:14px;white-space:pre-wrap;">{payload.body}</p>
        <p style="margin-top:24px;color:#888;font-size:12px;">— {sender.get('username', 'GamerGrid Admin')}</p>
      </td></tr>
      <tr><td style="padding:0 24px 24px 24px;text-align:center;">
        <a href="{site_url}/settings" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">View on GamerGrid →</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
"""
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": sender_email,
                    "to": [target["email"]],
                    "subject": f"[GamerGrid] {payload.subject}",
                    "html": html,
                },
            )
        except Exception as e:
            logger.warning(f"Admin message email failed: {e}")

    return {"ok": True, "message_id": msg["id"], "delivered_to": target["email"]}


@router.get("/admin/messages/{user_id}")
async def list_user_messages_admin(user_id: str, token_data: dict = Depends(verify_token)):
    """Admin: see all messages sent to a specific user."""
    await _ensure_admin(token_data)
    items = await db.admin_messages.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("sent_at", -1).to_list(200)
    return {"messages": items}


@router.get("/messages/inbox")
async def my_inbox(token_data: dict = Depends(verify_token)):
    """Current user's inbox of admin messages."""
    items = await db.admin_messages.find(
        {"user_id": token_data["user_id"]}, {"_id": 0}
    ).sort("sent_at", -1).to_list(200)
    unread = sum(1 for m in items if not m.get("read"))
    return {"messages": items, "unread": unread}


@router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str, token_data: dict = Depends(verify_token)):
    result = await db.admin_messages.update_one(
        {"id": message_id, "user_id": token_data["user_id"]},
        {"$set": {"read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True}


@router.post("/messages/{message_id}/reply")
async def user_reply_to_admin_message(
    message_id: str,
    payload: dict,
    token_data: dict = Depends(verify_token),
):
    """User replies to an admin message they received. Reply is delivered to that admin."""
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Reply too long (max 2000 chars)")

    original = await db.admin_messages.find_one(
        {"id": message_id, "user_id": token_data["user_id"]}, {"_id": 0}
    )
    if not original:
        raise HTTPException(status_code=404, detail="Original message not found")

    sender = await db.users.find_one(
        {"id": token_data["user_id"]}, {"_id": 0, "username": 1, "email": 1}
    ) or {}

    # Deliver the reply to the admin who originally sent the message
    reply_msg = {
        "id": str(uuid.uuid4()),
        "user_id": original["from_admin_id"],
        "from_admin_id": token_data["user_id"],
        "from_admin_username": sender.get("username", "User") + " (reply)",
        "subject": f"Re: {original.get('subject', 'message')}",
        "body": text,
        "severity": "info",
        "read": False,
        "in_reply_to": message_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_messages.insert_one(reply_msg)
    return {"ok": True, "reply_id": reply_msg["id"]}

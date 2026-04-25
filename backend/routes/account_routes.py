"""
Account Routes
- Change email (with password confirmation)
- Change password (with current password confirmation)
- Delete own account (CEO is protected)
"""
import os
import re
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

from auth import verify_token, verify_password, get_password_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["account"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class ChangeEmailPayload(BaseModel):
    new_email: EmailStr
    current_password: str


@router.post("/change-email")
async def change_email(payload: ChangeEmailPayload, token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=403, detail="Incorrect password")

    new_email = payload.new_email.lower().strip()
    if new_email == (user.get("email") or "").lower():
        raise HTTPException(status_code=400, detail="That's already your email")

    # Make sure new email isn't taken
    conflict = await db.users.find_one({"email": new_email}, {"_id": 0, "id": 1})
    if conflict:
        raise HTTPException(status_code=409, detail="That email is already in use")

    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {
            "email": new_email,
            "email_verified": False,
            "email_changed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True, "new_email": new_email}


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, token_data: dict = Depends(verify_token)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "hashed_password": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=403, detail="Current password is incorrect")

    new_hash = get_password_hash(payload.new_password)
    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {
            "hashed_password": new_hash,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True}

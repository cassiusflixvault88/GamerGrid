"""Refer-a-Friend System.

Each user gets a unique 8-character referral code. When someone signs up using
that code (via `?ref=CODE` URL param, captured by the frontend), the referral
is recorded. When the invitee upgrades to Pro, BOTH parties get a 1-month
GamerGrid Pro credit.

Endpoints:
  GET  /api/referrals/me              — Get my referral code, share URL, stats
  POST /api/referrals/claim           — Anyone can claim a referral code post-signup
  GET  /api/referrals/leaderboard     — Top 10 referrers (public, fun social)
  POST /api/referrals/redeem-credits  — Apply earned month-credits to extend Pro

Schema:
  referrals: { code, owner_user_id, owner_username, created_at }
  referral_signups: { code, owner_user_id, invitee_user_id, invitee_email,
                      signed_up_at, became_pro: bool, became_pro_at,
                      credit_awarded_owner: bool, credit_awarded_invitee: bool }
  user_credits: { user_id, pro_months_credit, expires_at }
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import secrets
import logging

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def _gen_code() -> str:
    """8-char URL-safe code (uppercase letters + digits)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I confusion
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _get_or_create_code(user_id: str, username: str) -> str:
    existing = await db.referrals.find_one(
        {"owner_user_id": user_id},
        {"_id": 0, "code": 1},
    )
    if existing:
        return existing["code"]
    # Generate unique code
    for _ in range(10):
        code = _gen_code()
        clash = await db.referrals.find_one({"code": code}, {"_id": 0, "code": 1})
        if not clash:
            await db.referrals.insert_one({
                "code": code,
                "owner_user_id": user_id,
                "owner_username": username,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return code
    raise HTTPException(status_code=500, detail="Could not allocate a referral code")


@router.get("/referrals/me")
async def my_referral_info(token_data: dict = Depends(verify_token)):
    """Return the user's referral code, shareable URL, and stats."""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1, "id": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = await _get_or_create_code(user["id"], user.get("username") or "")

    signups = await db.referral_signups.find(
        {"owner_user_id": user["id"]},
        {"_id": 0},
    ).sort("signed_up_at", -1).to_list(500)

    became_pro = sum(1 for s in signups if s.get("became_pro"))

    credits_doc = await db.user_credits.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "pro_months_credit": 1},
    )
    pro_months_credit = (credits_doc or {}).get("pro_months_credit", 0)

    base_url = os.environ.get("FRONTEND_URL") or "https://gamer-grid.com"
    base_url = base_url.rstrip("/")

    return {
        "code": code,
        "share_url": f"{base_url}/?ref={code}",
        "total_signups": len(signups),
        "total_pro_conversions": became_pro,
        "pro_months_credit": pro_months_credit,
        "recent_signups": signups[:20],
    }


class ClaimReferralPayload(BaseModel):
    code: str = Field(..., min_length=4, max_length=12)


@router.post("/referrals/claim")
async def claim_referral(payload: ClaimReferralPayload, token_data: dict = Depends(verify_token)):
    """Called by the frontend right after sign-up if a `ref=CODE` was present.
    Records the referral. Idempotent: re-calls do nothing."""
    code = payload.code.strip().upper()
    invitee_id = token_data["user_id"]

    ref = await db.referrals.find_one({"code": code}, {"_id": 0})
    if not ref:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if ref["owner_user_id"] == invitee_id:
        raise HTTPException(status_code=400, detail="You cannot refer yourself")

    # Already claimed?
    existing = await db.referral_signups.find_one(
        {"invitee_user_id": invitee_id},
        {"_id": 0, "code": 1},
    )
    if existing:
        return {"ok": True, "already_claimed": True}

    invitee = await db.users.find_one(
        {"id": invitee_id},
        {"_id": 0, "email": 1, "username": 1},
    ) or {}

    await db.referral_signups.insert_one({
        "code": code,
        "owner_user_id": ref["owner_user_id"],
        "invitee_user_id": invitee_id,
        "invitee_email": invitee.get("email"),
        "invitee_username": invitee.get("username"),
        "signed_up_at": datetime.now(timezone.utc).isoformat(),
        "became_pro": False,
        "became_pro_at": None,
        "credit_awarded_owner": False,
        "credit_awarded_invitee": False,
    })

    logger.info(f"Referral claimed: {code} → invitee {invitee_id}")
    return {"ok": True, "already_claimed": False}


async def award_referral_pro_credit(invitee_user_id: str) -> None:
    """Called by the payments webhook / Pro-subscription handler when an
    invitee successfully upgrades to Pro. Awards 1 free month to BOTH parties.
    Idempotent — safe to call multiple times."""
    signup = await db.referral_signups.find_one(
        {"invitee_user_id": invitee_user_id},
        {"_id": 0},
    )
    if not signup:
        return  # Wasn't a referral signup
    if signup.get("became_pro"):
        return  # Already credited

    now = datetime.now(timezone.utc).isoformat()
    await db.referral_signups.update_one(
        {"invitee_user_id": invitee_user_id},
        {"$set": {
            "became_pro": True,
            "became_pro_at": now,
            "credit_awarded_owner": True,
            "credit_awarded_invitee": True,
        }},
    )

    # Add 1 month credit to both
    for uid in (signup["owner_user_id"], invitee_user_id):
        await db.user_credits.update_one(
            {"user_id": uid},
            {"$inc": {"pro_months_credit": 1},
             "$setOnInsert": {"created_at": now}},
            upsert=True,
        )

    logger.info(f"🎉 Referral reward — both {signup['owner_user_id']} and {invitee_user_id} got 1 free month")


@router.get("/referrals/leaderboard")
async def referrals_leaderboard():
    """Public top 10 referrers — fuels social proof."""
    pipeline = [
        {"$group": {
            "_id": "$owner_user_id",
            "total_signups": {"$sum": 1},
            "total_pro": {"$sum": {"$cond": ["$became_pro", 1, 0]}},
        }},
        {"$sort": {"total_pro": -1, "total_signups": -1}},
        {"$limit": 10},
    ]
    rows = await db.referral_signups.aggregate(pipeline).to_list(10)

    if not rows:
        return {"leaders": []}

    user_ids = [r["_id"] for r in rows if r.get("_id")]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "username": 1, "display_name": 1, "profile_picture_url": 1},
    ).to_list(len(user_ids))
    user_map = {u["id"]: u for u in users}

    return {
        "leaders": [
            {
                "username": (user_map.get(r["_id"]) or {}).get("username"),
                "display_name": (user_map.get(r["_id"]) or {}).get("display_name") or (user_map.get(r["_id"]) or {}).get("username"),
                "avatar": (user_map.get(r["_id"]) or {}).get("profile_picture_url"),
                "total_signups": r["total_signups"],
                "total_pro": r["total_pro"],
            }
            for r in rows
            if user_map.get(r["_id"])
        ]
    }


@router.post("/referrals/redeem-credits")
async def redeem_credits(token_data: dict = Depends(verify_token)):
    """Apply ALL earned month-credits to extend the user's Pro expiry."""
    user_id = token_data["user_id"]
    credits = await db.user_credits.find_one({"user_id": user_id}, {"_id": 0, "pro_months_credit": 1})
    months = (credits or {}).get("pro_months_credit", 0)
    if months <= 0:
        raise HTTPException(status_code=400, detail="No referral credits to redeem")

    # Extend the user's pro_until / set is_pro
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "pro_until": 1})
    base = datetime.now(timezone.utc)
    if user and user.get("pro_until"):
        try:
            cur = datetime.fromisoformat(user["pro_until"])
            if cur.tzinfo is None:
                cur = cur.replace(tzinfo=timezone.utc)
            if cur > base:
                base = cur
        except Exception:
            pass

    new_until = base + timedelta(days=30 * months)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_pro": True, "pro_until": new_until.isoformat()}},
    )
    await db.user_credits.update_one(
        {"user_id": user_id},
        {"$set": {"pro_months_credit": 0, "redeemed_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {
        "ok": True,
        "months_redeemed": months,
        "pro_until": new_until.isoformat(),
    }

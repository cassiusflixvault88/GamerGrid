"""
Authentication and User Profile Routes
Handles signup, login, profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import logging
import os
import shutil
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

from models import User, UserCreate, UserLogin, UserResponse, UserProfileUpdate, Token
from auth import get_password_hash, verify_password, create_access_token, verify_token

logger = logging.getLogger(__name__)

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/auth", tags=["authentication"])
profile_router = APIRouter(prefix="/user", tags=["user-profile"])


async def _enrich_with_roles(user: dict) -> dict:
    """Attach is_admin (from admins collection) and is_pro (from users doc)."""
    if not user:
        return user
    user.setdefault("is_pro", bool(user.get("is_pro", False)))
    admin = await db.admins.find_one({"user_id": user.get("id")}, {"_id": 0, "is_admin": 1})
    user["is_admin"] = bool(admin and admin.get("is_admin"))
    return user


async def _send_welcome_email(email: str, username: str) -> None:
    """Best-effort welcome email. Silently no-ops if RESEND_API_KEY is missing."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        return
    try:
        import asyncio
        import resend
        resend.api_key = api_key
        sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        site_url = (os.environ.get("FRONTEND_URL") or "https://gamer-grid.com").rstrip("/")
        html = f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;padding:24px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:32px 24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);text-align:center;">
        <div style="font-family:Arial Black,sans-serif;font-size:32px;font-weight:900;color:#000;letter-spacing:1px;">GAMERGRID</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;margin-top:6px;">Welcome to your gaming hub</div>
      </td></tr>
      <tr><td style="padding:32px 24px;font-family:Arial,sans-serif;color:#fff;">
        <h2 style="margin:0 0 12px 0;color:#fbbf24;font-size:22px;">Hey {username} — welcome aboard! 🎮</h2>
        <p style="line-height:1.6;color:#ddd;font-size:15px;">
          You just joined the only gaming discovery hub built for real gamers — track new releases across PS5, Xbox, PC and Switch,
          watch trailers, find live deals, and read community reviews.
        </p>
        <p style="line-height:1.6;color:#ddd;font-size:15px;">Here's what to do first:</p>
        <ul style="line-height:1.8;color:#ddd;font-size:14px;">
          <li>Browse the <strong style="color:#fbbf24;">Top 10</strong> trending games right now</li>
          <li>Add games to your <strong style="color:#fbbf24;">Library</strong> to track them</li>
          <li>Catch the latest gaming news on the <strong style="color:#fbbf24;">News</strong> page</li>
          <li>Subscribe for the weekly Top 10 digest (auto-enabled — opt out anytime in Settings)</li>
        </ul>
      </td></tr>
      <tr><td style="padding:0 24px 32px 24px;text-align:center;">
        <a href="{site_url}" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;">Start Exploring →</a>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#000;border-top:1px solid #1f1f1f;font-family:Arial,sans-serif;color:#666;font-size:11px;text-align:center;">
        Made by Cassius Fox · You can unsubscribe from emails in Settings.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
"""
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": sender,
                "to": [email],
                "subject": "🎮 Welcome to GamerGrid — let's get you playing",
                "html": html,
            },
        )
        logger.info(f"Welcome email sent to {email}")
    except Exception as e:
        logger.warning(f"Welcome email failed for {email}: {e}")


import re

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


@router.post("/signup", response_model=Token)
async def signup(user_data: UserCreate):
    """Register a new user.

    BULLETPROOF: any unexpected failure is caught and returned as a friendly
    400 error, never an unhandled 500 — so the AuthModal toast always shows
    something the user can act on (and never just "error").
    """
    try:
        # Normalize email + username so duplicate detection works case-insensitively
        # and trailing whitespace from mobile keyboards doesn't create accounts that
        # cannot log back in.
        email_clean = (user_data.email or "").strip().lower()
        username_clean = (user_data.username or "").strip()

        if not email_clean or not _EMAIL_RE.match(email_clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid email address (e.g. you@example.com).",
            )
        if not username_clean or len(username_clean) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 2 characters.",
            )
        if len(username_clean) > 40:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 40 characters or fewer.",
            )
        if not user_data.password or len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters.",
            )

        existing_user = await db.users.find_one(
            {"email": email_clean},
            {"_id": 1}
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That email is already registered. Try signing in instead.",
            )

        # Soft username uniqueness: case-insensitive
        existing_username = await db.users.find_one(
            {"username": {"$regex": f"^{re.escape(username_clean)}$", "$options": "i"}},
            {"_id": 1},
        )
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That username is already taken. Please pick another one.",
            )

        try:
            hashed_password = get_password_hash(user_data.password)
        except Exception as e:
            logger.error(f"Password hashing failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not secure your password. Please try again.",
            )

        user = User(
            email=email_clean,
            username=username_clean,
            hashed_password=hashed_password
        )

        await db.users.insert_one(user.model_dump())

        # Auto-promote CEO email to admin (CEO is auto-verified, no email gate)
        ceo_emails_list = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
        is_ceo = email_clean in ceo_emails_list
        if is_ceo:
            try:
                admin_config = {
                    "user_id": user.id,
                    "is_admin": True,
                    "permissions": ["moderate_reviews", "manage_content", "manage_users"],
                    "role": "CEO & Founder",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.admins.insert_one(admin_config)
                await db.users.update_one({"id": user.id}, {"$set": {"email_verified": True}})
                logger.info(f"🎉 Auto-promoted CEO: {email_clean} to admin!")
            except Exception as e:
                logger.warning(f"CEO promotion failed (signup still continues): {e}")

        access_token = create_access_token(data={"sub": user.id})

        # Send welcome email + verification email in BACKGROUND so the response
        # never blocks on Resend latency or transient failures.
        import asyncio as _asyncio

        async def _bg_emails():
            try:
                await _send_welcome_email(user.email, user.username)
            except Exception as e:
                logger.warning(f"bg welcome email failed: {e}")
            if not is_ceo:
                try:
                    from routes.auth_extras_routes import send_verification, ResendVerifyPayload
                    await send_verification(ResendVerifyPayload(email=email_clean))
                except Exception as e:
                    logger.warning(f"bg verification email failed: {e}")

        try:
            _asyncio.create_task(_bg_emails())
        except Exception as e:
            logger.warning(f"Could not schedule bg emails (signup still succeeds): {e}")

        try:
            user_dict = await _enrich_with_roles(user.model_dump())
        except Exception as e:
            logger.warning(f"Role enrichment failed (using defaults): {e}")
            user_dict = user.model_dump()
            user_dict["is_admin"] = False
            user_dict["is_pro"] = False

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user_dict)
        )
    except HTTPException:
        # Friendly errors raised above — let them through unmodified
        raise
    except Exception as e:
        # Anything else: log the full traceback so we can see it in supervisor
        # logs, then return a friendly 500 the AuthModal can render.
        logger.error(f"Unexpected signup failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We hit an unexpected error creating your account. Please try again — if it keeps failing, message Cassius from his profile.",
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    email_clean = (credentials.email or "").strip().lower()

    # First try the normalized (lowercase) email; fall back to the raw value for
    # legacy users who signed up before email normalization existed.
    user = await db.users.find_one(
        {"email": email_clean},
        {"_id": 0, "email": 1, "id": 1, "username": 1, "hashed_password": 1, "created_at": 1, "watchlist": 1, "favorites": 1, "profile_picture_url": 1, "is_pro": 1}
    )
    if not user and email_clean != credentials.email:
        user = await db.users.find_one(
            {"email": credentials.email},
            {"_id": 0, "email": 1, "id": 1, "username": 1, "hashed_password": 1, "created_at": 1, "watchlist": 1, "favorites": 1, "profile_picture_url": 1, "is_pro": 1}
        )

    logger.info(f"Login attempt for {email_clean}: user_found={user is not None}")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    password_valid = verify_password(credentials.password, user["hashed_password"])
    logger.info(f"Password verification for {email_clean}: {password_valid}")

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Auto-promote CEO email to admin if not already
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
    if email_clean in ceo_emails:
        existing_admin = await db.admins.find_one({"user_id": user["id"]})
        if not existing_admin:
            admin_config = {
                "user_id": user["id"],
                "is_admin": True,
                "permissions": ["moderate_reviews", "manage_content", "manage_users"],
                "role": "CEO & Founder",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin_config)
            logger.info(f"🎉 Auto-promoted CEO on login: {email_clean}")

    access_token = create_access_token(data={"sub": user["id"]})

    user = await _enrich_with_roles(user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(token_data: dict = Depends(verify_token)):
    """Get current authenticated user"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1, "favorites": 1,
         "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1, "is_pro": 1, "gaming_mode": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await _enrich_with_roles(user)
    return UserResponse(**user)


@profile_router.get("/profile")
async def get_user_profile(token_data: dict = Depends(verify_token)):
    """Get user profile data"""
    logger.info(f"Fetching profile for user_id: {token_data['user_id']}")
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1, "gaming_mode": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"Retrieved profile data: {user}")
    return user


@profile_router.put("/profile")
async def update_user_profile(profile_data: UserProfileUpdate, token_data: dict = Depends(verify_token)):
    """Update user profile settings"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    logger.info(f"Updating profile for user_id: {token_data['user_id']}")
    logger.info(f"Update data: {update_data}")

    result = await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": update_data}
    )

    logger.info(f"Update result - matched: {result.matched_count}, modified: {result.modified_count}")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Profile updated successfully", "updated_fields": list(update_data.keys())}


@profile_router.post("/upload-profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    """Upload profile picture"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")

    # Validate file size (5MB max)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    try:
        # Create uploads directory if it doesn't exist
        upload_dir = ROOT_DIR / "uploads" / "profile_pictures"
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{token_data['user_id']}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = upload_dir / unique_filename

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Generate URL (using backend URL)
        file_url = f"/uploads/profile_pictures/{unique_filename}"

        logger.info(f"Profile picture uploaded: {file_url}")

        return {"url": file_url, "message": "Profile picture uploaded successfully"}

    except Exception as e:
        logger.error(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

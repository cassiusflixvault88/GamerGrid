from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
import uuid
from datetime import datetime, timezone

from models import User, UserCreate, UserLogin, UserResponse, WatchlistItem, Token
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)

# Import route modules
from routes import auth_routes, watchlist_routes, payments_routes, game_routes, game_reactions_routes, public_profile_routes, news_routes, analytics_routes, email_routes, trailer_routes, saved_trailers_routes, admin_messages_routes, auth_extras_routes, news_social_routes, app_review_social_routes, account_routes, ratings_routes, admin_routes, ceo_messages_routes, saved_articles_routes, referrals_routes


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# CORS middleware - MUST be before static files mount
# Explicit origin list — using `["*"]` with allow_credentials=True is INVALID
# per the CORS spec and causes the browser to silently block POSTs from
# www.gamer-grid.com (which Google search links to). Listing them explicitly
# makes preflight pass cleanly.
_CORS_ALLOWED = [
    "https://gamer-grid.com",
    "https://www.gamer-grid.com",
    "http://gamer-grid.com",
    "http://www.gamer-grid.com",
    "https://hbo-max-app.preview.emergentagent.com",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ALLOWED,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Include route modules
api_router.include_router(auth_routes.router)
api_router.include_router(auth_routes.profile_router)
api_router.include_router(watchlist_routes.router)
api_router.include_router(payments_routes.router)
api_router.include_router(game_routes.router)
api_router.include_router(game_reactions_routes.router)
api_router.include_router(public_profile_routes.router)
api_router.include_router(news_routes.router)
api_router.include_router(analytics_routes.router)
api_router.include_router(email_routes.router)
api_router.include_router(trailer_routes.router)
api_router.include_router(saved_trailers_routes.router)
api_router.include_router(admin_messages_routes.router)
api_router.include_router(auth_extras_routes.router)
api_router.include_router(news_social_routes.router)
api_router.include_router(app_review_social_routes.router)
api_router.include_router(account_routes.router)
api_router.include_router(ratings_routes.router)
api_router.include_router(admin_routes.router)
api_router.include_router(ceo_messages_routes.router)
api_router.include_router(saved_articles_routes.router)
api_router.include_router(referrals_routes.router)


# Add your routes to the router instead of directly to app

# ============= AUTH ROUTES =============

@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserCreate):
    # Check if user exists (optimized query - only fetch _id)
    existing_user = await db.users.find_one(
        {"email": user_data.email},
        {"_id": 1}
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )

    await db.users.insert_one(user.model_dump())

    # Auto-promote CEO email to admin
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
    if user_data.email.lower() in ceo_emails:
        admin_config = {
            "user_id": user.id,
            "is_admin": True,
            "permissions": ["moderate_reviews", "manage_content", "manage_users"],
            "role": "CEO & Founder",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin_config)
        logger.info(f"🎉 Auto-promoted CEO: {user_data.email} to admin!")

    # Create token
    access_token = create_access_token(data={"sub": user.id})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.model_dump())
    )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Optimized query - only fetch needed fields
    user = await db.users.find_one(
        {"email": credentials.email},
        {"_id": 0, "email": 1, "id": 1, "username": 1, "hashed_password": 1, "created_at": 1, "watchlist": 1, "favorites": 1}
    )
    if not user:
        logger.warning(f"Login failed: User not found for email {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    password_valid = verify_password(credentials.password, user["hashed_password"])
    logger.info(f"Login attempt for {credentials.email}: user_found=True, password_valid={password_valid}")

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Auto-promote CEO email to admin if not already
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
    if credentials.email.lower() in ceo_emails:
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
            logger.info(f"🎉 Auto-promoted CEO on login: {credentials.email}")

    access_token = create_access_token(data={"sub": user["id"]})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(token_data: dict = Depends(verify_token)):
    # Optimized query - only fetch needed fields
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1, "favorites": 1,
         "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


# ============= WATCHLIST ROUTES =============

@api_router.post("/watchlist/add")
async def add_to_watchlist(item: WatchlistItem, token_data: dict = Depends(verify_token)):
    # Optimized query - only fetch watchlist
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"watchlist": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already in watchlist
    watchlist = user.get("watchlist", [])
    if any(w["content_id"] == item.content_id for w in watchlist):
        raise HTTPException(status_code=400, detail="Already in watchlist")

    # Add to watchlist
    watchlist.append(item.model_dump())
    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {"watchlist": watchlist}}
    )

    return {"message": "Added to watchlist", "watchlist": watchlist}


@api_router.delete("/watchlist/remove/{content_id}")
async def remove_from_watchlist(content_id: int, token_data: dict = Depends(verify_token)):
    # Optimized query - only fetch watchlist
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"watchlist": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    watchlist = user.get("watchlist", [])
    watchlist = [w for w in watchlist if w["content_id"] != content_id]

    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {"watchlist": watchlist}}
    )

    return {"message": "Removed from watchlist", "watchlist": watchlist}


@api_router.get("/watchlist")
async def get_watchlist(token_data: dict = Depends(verify_token)):
    # Optimized query - only fetch watchlist
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"watchlist": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"watchlist": user.get("watchlist", [])}


# ============= APP REVIEWS (GamerGrid App Itself) =============

class AppReview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    rating: int = Field(ge=1, le=5)
    review: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AppReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: str

@api_router.post("/app-reviews/submit")
async def submit_app_review(review_data: AppReviewCreate, token_data: dict = Depends(verify_token)):
    """Submit a review for the FlixVault app itself"""
    # Get user info
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user already reviewed the app
    existing = await db.app_reviews.find_one(
        {"user_id": token_data["user_id"]},
        {"_id": 0}
    )

    if existing:
        # Update existing review
        await db.app_reviews.update_one(
            {"user_id": token_data["user_id"]},
            {"$set": {
                "rating": review_data.rating,
                "review": review_data.review,
                "created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "App review updated successfully"}
    else:
        # Create new review
        app_review = AppReview(
            user_id=token_data["user_id"],
            username=user.get("username", "Anonymous"),
            rating=review_data.rating,
            review=review_data.review
        )
        await db.app_reviews.insert_one(app_review.model_dump())
        return {"message": "App review submitted successfully"}

@api_router.get("/app-reviews")
async def get_app_reviews():
    """Get all FlixVault app reviews with admin replies"""
    reviews = await db.app_reviews.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # ⚡ Batch-fetch all admin replies in ONE query (was N+1)
    review_ids = [r["id"] for r in reviews if r.get("id")]
    replies_by_review = {}
    if review_ids:
        all_replies = await db.app_review_replies.find(
            {"review_id": {"$in": review_ids}},
            {"_id": 0}
        ).sort("created_at", 1).to_list(None)
        for rep in all_replies:
            replies_by_review.setdefault(rep["review_id"], []).append(rep)

    for review in reviews:
        review["admin_replies"] = replies_by_review.get(review.get("id"), [])

    # Calculate average rating
    if reviews:
        avg_rating = sum(r.get("rating", 0) for r in reviews) / len(reviews)
    else:
        avg_rating = 0

    return {
        "reviews": reviews,
        "total": len(reviews),
        "average_rating": round(avg_rating, 1)
    }

@api_router.delete("/admin/delete-app-review/{review_id}")
async def delete_app_review(review_id: str, token_data: dict = Depends(verify_token)):
    """Admin: Delete an app review"""
    # Check admin status
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.app_reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"message": "App review deleted successfully"}


# ============= USER PROFILE & SETTINGS =============
# (Canonical handlers live in routes/auth_routes.py via profile_router; legacy duplicates removed.)


# ============= ROOT =============

@api_router.get("/")
async def root():
    return {"message": "GamerGrid API - Created by Cassius Fox"}

# Include the router in the main app
app.include_router(api_router)

# (Removed duplicate CORSMiddleware — single middleware above is the source of truth.)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("startup")
async def start_background_scheduler():
    try:
        from scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

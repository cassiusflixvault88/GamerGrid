from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models import User, UserCreate, UserLogin, UserResponse, UserProfileUpdate, WatchlistItem, Token
from ratings import Rating, RatingCreate, RatingResponse, WatchHistory, WatchHistoryCreate, UserReplyCreate, UserReply
from admin_models import AdminConfig, ReviewReply, ReviewReplyCreate
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)
from public_domain_videos_clean import get_public_domain_movies, get_public_domain_by_id

# Import route modules
from routes import auth_routes, watchlist_routes, payments_routes, game_routes, public_profile_routes, news_routes, analytics_routes, email_routes, trailer_routes, saved_trailers_routes, admin_messages_routes, auth_extras_routes, news_social_routes, app_review_social_routes


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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
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


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

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


@api_router.get("/user/profile_legacy_disabled", include_in_schema=False)
async def _legacy_get_user_profile_v1():
    raise HTTPException(404, "moved")


@api_router.put("/user/profile_legacy_disabled", include_in_schema=False)
async def _legacy_put_user_profile_v1():
    raise HTTPException(404, "moved")


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


# ============= PUBLIC DOMAIN CONTENT ROUTES =============

@api_router.get("/public-domain/movies")
async def get_public_movies():
    """Get curated free public domain movies - all verified working"""
    movies = get_public_domain_movies()
    
    return {
        "movies": movies, 
        "total": len(movies),
        "sources": {
            "curated": len(movies),
            "archive_org": 0,
            "plex": 0
        }
    }


@api_router.get("/public-domain/movie/{content_id}")
async def get_public_movie(content_id: int):
    movie = get_public_domain_by_id(content_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


# ============= TRENDING / WHAT'S HOT ROUTE =============

@api_router.get("/trending/whats-hot")
async def get_whats_hot():
    """
    Get trending content based on FlixVault community activity
    Algorithm: Recent ratings (7d) × 2.0 + Avg rating × 1.5 + Watchlist adds (7d) × 1.5
    """
    from datetime import timedelta
    import requests
    
    try:
        # Calculate date 7 days ago
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Get all ratings from last 7 days
        recent_ratings = await db.ratings.find(
            {"created_at": {"$gte": seven_days_ago.isoformat()}},
            {"_id": 0}
        ).to_list(1000)
        
        # Get all watchlist activity (approximate based on user watchlists)
        users_with_watchlists = await db.users.find(
            {"watchlist": {"$exists": True, "$ne": []}},
            {"_id": 0, "watchlist": 1}
        ).to_list(1000)
        
        # Calculate trending scores
        trending_scores = {}
        
        # Score from recent ratings
        for rating in recent_ratings:
            content_id = str(rating.get("content_id"))
            if content_id not in trending_scores:
                trending_scores[content_id] = {
                    "rating_count": 0,
                    "rating_sum": 0,
                    "watchlist_count": 0,
                    "has_comments": 0
                }
            
            trending_scores[content_id]["rating_count"] += 1
            trending_scores[content_id]["rating_sum"] += rating.get("rating", 0)
            
            # Bonus for comments
            if rating.get("comment"):
                trending_scores[content_id]["has_comments"] += 1
        
        # Score from watchlists
        for user in users_with_watchlists:
            for item in user.get("watchlist", []):
                content_id = str(item.get("content_id"))
                if content_id not in trending_scores:
                    trending_scores[content_id] = {
                        "rating_count": 0,
                        "rating_sum": 0,
                        "watchlist_count": 0,
                        "has_comments": 0
                    }
                trending_scores[content_id]["watchlist_count"] += 1
        
        # Calculate final trending score
        scored_content = []
        for content_id, data in trending_scores.items():
            rating_count = data["rating_count"]
            avg_rating = (data["rating_sum"] / rating_count) if rating_count > 0 else 0
            watchlist_count = data["watchlist_count"]
            
            # Trending formula: ratings × 2.0 + avg_rating × 1.5 + watchlist × 1.5 + comments × 0.5
            trending_score = (
                (rating_count * 2.0) +
                (avg_rating * 1.5) +
                (watchlist_count * 1.5) +
                (data["has_comments"] * 0.5)
            )
            
            scored_content.append({
                "content_id": content_id,
                "trending_score": trending_score,
                "rating_count": rating_count,
                "avg_rating": avg_rating,
                "watchlist_count": watchlist_count
            })
        
        # Sort by trending score
        scored_content.sort(key=lambda x: x["trending_score"], reverse=True)
        
        # Get top 12 trending
        top_trending_ids = [item["content_id"] for item in scored_content[:12]]
        
        # If we don't have enough trending from community, supplement with TMDB trending
        tmdb_key = os.environ.get('TMDB_API_KEY')
        trending_content = []
        
        if len(top_trending_ids) < 12 and tmdb_key:
            # Fetch TMDB trending to supplement
            tmdb_response = requests.get(
                f"https://api.themoviedb.org/3/trending/all/week?api_key={tmdb_key}"
            )
            if tmdb_response.status_code == 200:
                tmdb_trending = tmdb_response.json().get("results", [])
                
                # Add TMDB trending items
                for item in tmdb_trending[:12]:
                    if str(item["id"]) not in top_trending_ids:
                        item["trending_score"] = 0  # No community score yet
                        item["is_tmdb_trending"] = True
                        trending_content.append(item)
                        if len(trending_content) + len(top_trending_ids) >= 12:
                            break
        
        # Fetch details for community trending items
        if top_trending_ids and tmdb_key:
            for content_id in top_trending_ids:
                # Try to get from ratings to determine media type
                rating = await db.ratings.find_one(
                    {"content_id": content_id},
                    {"_id": 0, "media_type": 1}
                )
                
                media_type = rating.get("media_type", "movie") if rating else "movie"
                
                # Fetch from TMDB
                try:
                    tmdb_response = requests.get(
                        f"https://api.themoviedb.org/3/{media_type}/{content_id}?api_key={tmdb_key}"
                    )
                    if tmdb_response.status_code == 200:
                        item = tmdb_response.json()
                        item["media_type"] = media_type
                        item["trending_score"] = next(
                            (x["trending_score"] for x in scored_content if x["content_id"] == content_id),
                            0
                        )
                        item["is_community_trending"] = True
                        trending_content.insert(0, item)  # Community trending goes first
                except Exception:
                    continue
        
        return {
            "results": trending_content[:12],
            "total": len(trending_content),
            "algorithm": "community_activity_7d",
            "period": "last_7_days"
        }
        
    except Exception as e:
        logger.error(f"Error calculating trending: {str(e)}")
        # Fallback to TMDB trending
        tmdb_key = os.environ.get('TMDB_API_KEY')
        if tmdb_key:
            try:
                response = requests.get(
                    f"https://api.themoviedb.org/3/trending/all/week?api_key={tmdb_key}"
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "results": data.get("results", [])[:12],
                        "total": len(data.get("results", [])[:12]),
                        "algorithm": "tmdb_fallback",
                        "period": "last_7_days"
                    }
            except Exception:
                pass
        
        return {"results": [], "total": 0, "algorithm": "none", "period": "last_7_days"}


# ============= APP REVIEWS (FlixVault App Itself) =============

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
    
    # Get admin replies for each review
    for review in reviews:
        review_id = review.get("id")
        if review_id:
            replies = await db.app_review_replies.find(
                {"review_id": review_id},
                {"_id": 0}
            ).sort("created_at", 1).to_list(100)
            review["admin_replies"] = replies
        else:
            review["admin_replies"] = []
    
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


# ============= RATINGS & REVIEWS ROUTES =============

@api_router.post("/ratings", response_model=RatingResponse)
async def add_rating(rating_data: RatingCreate, token_data: dict = Depends(verify_token)):
    # Get user info
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"username": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already rated this content
    existing = await db.ratings.find_one({
        "user_id": token_data["user_id"],
        "content_id": rating_data.content_id
    })
    
    if existing:
        # Update existing rating
        await db.ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "rating": rating_data.rating,
                "review": rating_data.review,
                "content_title": rating_data.content_title,
                "created_at": datetime.utcnow()
            }}
        )
        rating_id = existing["id"]
    else:
        # Create new rating
        rating = Rating(
            user_id=token_data["user_id"],
            content_id=rating_data.content_id,
            content_title=rating_data.content_title,
            rating=rating_data.rating,
            review=rating_data.review
        )
        await db.ratings.insert_one(rating.model_dump())
        rating_id = rating.id
    
    return RatingResponse(
        id=rating_id,
        user_id=token_data["user_id"],
        username=user["username"],
        content_id=rating_data.content_id,
        rating=rating_data.rating,
        review=rating_data.review,
        created_at=datetime.utcnow()
    )


@api_router.get("/ratings/{content_id}")
async def get_ratings(content_id: int):
    ratings = await db.ratings.find({"content_id": content_id}, {"_id": 0}).to_list(1000)
    
    # Get usernames for all ratings
    user_ids = [r["user_id"] for r in ratings]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "username": 1}
    ).to_list(1000)
    
    user_map = {u["id"]: u["username"] for u in users}
    
    # Calculate average
    avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
    
    enriched_ratings = []
    for r in ratings:
        # Get admin replies for this rating
        replies = await db.review_replies.find(
            {"review_id": r["id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        
        rating_obj = RatingResponse(
            id=r["id"],
            user_id=r["user_id"],
            username=user_map.get(r["user_id"], "Unknown"),
            content_id=r["content_id"],
            rating=r["rating"],
            review=r.get("review"),
            created_at=r["created_at"]
        )
        # Add admin_replies as dict attribute
        rating_dict = rating_obj.model_dump()
        rating_dict["admin_replies"] = replies
        enriched_ratings.append(rating_dict)
    
    return {
        "average": round(avg_rating, 1),
        "count": len(ratings),
        "ratings": enriched_ratings
    }


@api_router.get("/ratings/user/content/{content_id}")
async def get_user_rating(content_id: int, token_data: dict = Depends(verify_token)):
    rating = await db.ratings.find_one({
        "user_id": token_data["user_id"],
        "content_id": content_id
    })
    
    if not rating:
        return None
    
    user = await db.users.find_one({"id": token_data["user_id"]}, {"username": 1})
    
    return RatingResponse(
        id=rating["id"],
        user_id=rating["user_id"],
        username=user["username"] if user else "Unknown",
        content_id=rating["content_id"],
        rating=rating["rating"],
        review=rating.get("review"),
        created_at=rating["created_at"]
    )


@api_router.get("/reviews/all")
async def get_all_reviews(limit: int = 100, skip: int = 0):
    """Get all reviews across all content - for Reviews page"""
    try:
        # Fetch all ratings with reviews from database
        all_ratings = await db.ratings.find(
            {"review": {"$exists": True, "$ne": None, "$ne": ""}},  # Only get ratings with actual reviews
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).skip(skip).to_list(length=limit)
        
        # Fetch user data for each rating to get username
        enriched_reviews = []
        for rating in all_ratings:
            user = await db.users.find_one(
                {"id": rating["user_id"]},
                {"_id": 0, "username": 1}
            )
            
            enriched_reviews.append({
                "id": rating["id"],
                "content_id": rating["content_id"],
                "content_title": rating.get("content_title", "Unknown"),
                "username": user.get("username", "Anonymous") if user else "Anonymous",
                "rating": rating["rating"],
                "review": rating["review"],
                "created_at": rating["created_at"],
                "media_type": rating.get("media_type", "movie")
            })
        
        return enriched_reviews
        
    except Exception as e:
        logging.error(f"Error fetching all reviews: {e}")
        return []



# ============= WATCH HISTORY / CONTINUE WATCHING ROUTES =============

@api_router.put("/ratings/{rating_id}")
async def update_rating(rating_id: str, rating_data: RatingCreate, token_data: dict = Depends(verify_token)):
    """Update user's own rating/review"""
    existing = await db.ratings.find_one({"id": rating_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rating not found")
    
    if existing["user_id"] != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="Can only edit your own reviews")
    
    await db.ratings.update_one(
        {"id": rating_id},
        {"$set": {
            "rating": rating_data.rating,
            "review": rating_data.review,
            "content_title": rating_data.content_title,
            "created_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Rating updated successfully"}


@api_router.post("/user-reply-to-admin")
async def user_reply_to_admin(reply_data: UserReplyCreate, token_data: dict = Depends(verify_token)):
    """User replies to an admin reply"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1}
    )
    
    reply = UserReply(
        admin_reply_id=reply_data.admin_reply_id,
        user_id=token_data["user_id"],
        username=user.get("username", "User"),
        reply_text=reply_data.reply_text
    )
    
    await db.user_replies.insert_one(reply.model_dump())
    return {"message": "Reply posted successfully"}


# ============= EDIT / DELETE REPLIES =============

class ReplyEdit(BaseModel):
    reply_text: str


@api_router.put("/user-reply/{reply_id}")
async def edit_user_reply(reply_id: str, body: ReplyEdit, token_data: dict = Depends(verify_token)):
    """User edits their own reply (any of: user_replies, review_replies, app_review_replies)."""
    me = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "is_admin": 1}) or {}
    is_admin = bool(me.get("is_admin"))
    for col_name in ("user_replies", "review_replies", "app_review_replies"):
        col = db[col_name]
        existing = await col.find_one({"id": reply_id}, {"_id": 0})
        if not existing:
            continue
        owner_id = existing.get("user_id") or existing.get("admin_id")
        if owner_id != token_data["user_id"] and not is_admin:
            raise HTTPException(status_code=403, detail="Can only edit your own replies")
        await col.update_one(
            {"id": reply_id},
            {"$set": {"reply_text": body.reply_text, "edited_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Reply updated", "reply_id": reply_id}
    raise HTTPException(status_code=404, detail="Reply not found")


@api_router.delete("/user-reply/{reply_id}")
async def delete_user_reply(reply_id: str, token_data: dict = Depends(verify_token)):
    """User deletes their own reply. Admins/CEOs can delete any reply (moderation)."""
    me = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "is_admin": 1}) or {}
    is_admin = bool(me.get("is_admin"))
    for col_name in ("user_replies", "review_replies", "app_review_replies"):
        col = db[col_name]
        existing = await col.find_one({"id": reply_id}, {"_id": 0})
        if not existing:
            continue
        owner_id = existing.get("user_id") or existing.get("admin_id")
        if owner_id != token_data["user_id"] and not is_admin:
            raise HTTPException(status_code=403, detail="Can only delete your own replies")
        await col.delete_one({"id": reply_id})
        return {"message": "Reply deleted", "reply_id": reply_id}
    raise HTTPException(status_code=404, detail="Reply not found")


@api_router.delete("/ratings/{rating_id}")
async def delete_rating(rating_id: str, token_data: dict = Depends(verify_token)):
    """Delete a rating/review. Users can delete their own; admins can delete any (moderation)."""
    existing = await db.ratings.find_one({"id": rating_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rating not found")

    # Check admin status
    admin_doc = await db.admins.find_one({"user_id": token_data["user_id"]}, {"_id": 0, "is_admin": 1})
    is_admin = bool(admin_doc and admin_doc.get("is_admin"))

    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own reviews")

    await db.ratings.delete_one({"id": rating_id})
    return {"message": "Rating deleted successfully"}


# ============= WATCH HISTORY / CONTINUE WATCHING ROUTES =============

@api_router.post("/watch-history")
async def update_watch_history(history_data: WatchHistoryCreate, token_data: dict = Depends(verify_token)):
    # Check if entry exists
    existing = await db.watch_history.find_one({
        "user_id": token_data["user_id"],
        "content_id": history_data.content_id
    })
    
    if existing:
        # Update existing entry
        await db.watch_history.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "progress": history_data.progress,
                "last_watched": datetime.utcnow()
            }}
        )
    else:
        # Create new entry
        history = WatchHistory(
            user_id=token_data["user_id"],
            content_id=history_data.content_id,
            content_title=history_data.content_title,
            poster_path=history_data.poster_path,
            media_type=history_data.media_type,
            progress=history_data.progress
        )
        await db.watch_history.insert_one(history.model_dump())
    
    return {"message": "Watch history updated"}


@api_router.get("/watch-history")
async def get_watch_history(token_data: dict = Depends(verify_token)):
    history = await db.watch_history.find(
        {"user_id": token_data["user_id"]},
        {"user_id": 1, "content_id": 1, "content_title": 1, "poster_path": 1, "media_type": 1, "progress": 1, "last_watched": 1}
    ).sort("last_watched", -1).to_list(50)
    
    return {"history": history}


@api_router.get("/continue-watching")
async def get_continue_watching(token_data: dict = Depends(verify_token)):
    # Get items that are in progress (not completed)
    history = await db.watch_history.find(
        {
            "user_id": token_data["user_id"],
            "progress": {"$gt": 5, "$lt": 95}  # Between 5% and 95%
        },
        {"user_id": 1, "content_id": 1, "content_title": 1, "poster_path": 1, "media_type": 1, "progress": 1, "last_watched": 1}
    ).sort("last_watched", -1).limit(10).to_list(10)
    
    return {"continue_watching": history}


# ============= ANALYTICS / TRENDING ROUTES =============

@api_router.get("/trending/flixvault")
async def get_flixvault_trending():
    # Get most watched content from last 7 days
    pipeline = [
        {
            "$group": {
                "_id": "$content_id",
                "count": {"$sum": 1},
                "content_title": {"$first": "$content_title"},
                "poster_path": {"$first": "$poster_path"},
                "media_type": {"$first": "$media_type"}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    
    trending = await db.watch_history.aggregate(pipeline).to_list(20)
    
    return {"trending": trending}


# ============= ADMIN MIDDLEWARE =============

async def verify_admin(token_data: dict = Depends(verify_token)):
    """Verify user is an admin"""
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return token_data


# ============= ADMIN ROUTES =============

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(token_data: dict = Depends(verify_admin)):
    """Get admin dashboard stats"""
    total_users = await db.users.count_documents({})
    total_ratings = await db.ratings.count_documents({})
    total_reviews = await db.ratings.count_documents({"review": {"$ne": None}})
    pending_submissions = await db.movie_submissions.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_ratings": total_ratings,
        "total_reviews": total_reviews,
        "pending_submissions": pending_submissions,
        "admin_name": "Cassius Fox",
        "role": "CEO & Founder"
    }


@api_router.get("/admin/stats")
async def get_admin_stats(token_data: dict = Depends(verify_admin)):
    """Get admin dashboard statistics"""
    # Count total users
    total_users = await db.users.count_documents({})
    
    # Count total reviews
    total_reviews = await db.ratings.count_documents({})
    
    # Calculate average rating
    pipeline = [
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]
    avg_result = await db.ratings.aggregate(pipeline).to_list(1)
    avg_rating = avg_result[0]["avg_rating"] if avg_result else 0.0
    
    # Get admin info
    admin = await db.admins.find_one({"user_id": token_data["user_id"]}, {"_id": 0})
    
    return {
        "total_users": total_users,
        "total_reviews": total_reviews,
        "average_rating": round(avg_rating, 2) if avg_rating else 0.0,
        "admin_name": token_data.get("username", "Admin"),
        "role": admin.get("role", "Admin") if admin else "Admin"
    }


@api_router.get("/admin/users")
async def get_all_users(token_data: dict = Depends(verify_admin)):
    """Get all users with admin status"""
    users = await db.users.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1}
    ).sort("created_at", -1).to_list(1000)
    
    # Get all admin user IDs
    admin_records = await db.admins.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
    admin_ids = {admin["user_id"] for admin in admin_records}
    
    # Add is_admin flag to users
    for user in users:
        user["is_admin"] = user["id"] in admin_ids
    
    return users


@api_router.get("/admin/reviews")
async def get_all_reviews(token_data: dict = Depends(verify_admin)):
    """Get all reviews for moderation with admin replies"""
    reviews = await db.ratings.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get usernames for reviews
    user_ids = [r["user_id"] for r in reviews if "user_id" in r]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "username": 1}
    ).to_list(1000)
    
    user_map = {u["id"]: u["username"] for u in users}
    
    for review in reviews:
        review["username"] = user_map.get(review["user_id"], "Unknown")
        # Add content_title if it exists (movie/show name)
        if "content_title" not in review or not review.get("content_title"):
            review["content_title"] = f"Content ID: {review.get('content_id', 'Unknown')}"
        # Rename 'review' field to 'comment' for frontend compatibility
        if "review" in review:
            review["comment"] = review.pop("review")
        
        # Get admin replies for this review
        replies = await db.review_replies.find(
            {"review_id": review["id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        review["admin_replies"] = replies
    
    return reviews


@api_router.post("/admin/reply-to-review")
async def reply_to_review(reply_data: ReviewReplyCreate, token_data: dict = Depends(verify_admin)):
    """Admin reply to a user review"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1}
    )
    
    reply = {
        "id": str(uuid.uuid4()),
        "review_id": reply_data.review_id,
        "admin_id": token_data["user_id"],
        "admin_username": user.get("username", "Admin"),
        "reply_text": reply_data.reply_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.review_replies.insert_one(reply)
    
    return {"message": "Reply posted successfully"}


@api_router.post("/admin/reply-to-app-review")
async def reply_to_app_review(reply_data: ReviewReplyCreate, token_data: dict = Depends(verify_admin)):
    """Admin reply to an app review"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1}
    )
    
    reply = {
        "id": str(uuid.uuid4()),
        "review_id": reply_data.review_id,
        "admin_id": token_data["user_id"],
        "admin_username": user.get("username", "Admin"),
        "reply_text": reply_data.reply_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.app_review_replies.insert_one(reply)
    
    # Return without _id
    return {"message": "Reply posted successfully"}


@api_router.get("/admin/review-replies/{review_id}")
async def get_review_replies(review_id: str):
    """Get admin replies for a review"""
    replies = await db.review_replies.find(
        {"review_id": review_id}
    ).sort("created_at", 1).to_list(100)
    
    return {"replies": replies}


@api_router.delete("/admin/delete-review/{review_id}")
async def delete_review(review_id: str, token_data: dict = Depends(verify_admin)):
    """Delete inappropriate review"""
    result = await db.ratings.delete_one({"id": review_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted successfully"}


@api_router.delete("/admin/delete-user/{user_id}")
async def delete_user(user_id: str, token_data: dict = Depends(verify_admin)):
    """Delete a user and all their data. Only the original CEO can delete admins."""
    # Check if user exists
    user_to_delete = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    # Determine if target is admin
    target_admin = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
    target_is_admin = bool(target_admin and target_admin.get("is_admin"))

    # CEO check: only the original CEO email can delete other admins
    if target_is_admin:
        actor = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "email": 1})
        actor_email = (actor.get("email") if actor else "").lower()
        ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
        if actor_email not in ceo_emails:
            raise HTTPException(status_code=403, detail="Only the CEO can delete admins")
        # Even the CEO cannot delete themselves
        if user_id == token_data["user_id"]:
            raise HTTPException(status_code=403, detail="You cannot delete your own CEO account")
    
    # Delete user and all related data
    await db.users.delete_one({"id": user_id})
    await db.ratings.delete_many({"user_id": user_id})
    await db.watch_history.delete_many({"user_id": user_id})
    await db.admins.delete_many({"user_id": user_id})
    await db.saved_trailers.delete_many({"user_id": user_id})
    await db.admin_messages.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully", "user_id": user_id}


@api_router.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: str, token_data: dict = Depends(verify_admin)):
    """Grant admin access to another user"""
    admin_config = AdminConfig(
        user_id=user_id,
        is_admin=True,
        permissions=["moderate_reviews", "manage_content"],
        created_at=datetime.utcnow()
    )
    
    await db.admins.insert_one(admin_config.model_dump())
    
    return {"message": f"User {user_id} is now an admin"}


@api_router.post("/admin/reset-ceo-accounts")
async def reset_ceo_accounts_endpoint():
    """Emergency endpoint to delete all CEO accounts - allows fresh signup"""
    
    deleted_count = 0
    deleted_users = []
    
    # Find all users with cassius in email
    cursor = db.users.find({
        "$or": [
            {"email": {"$regex": "cassius", "$options": "i"}},
            {"email": {"$regex": "flixvault", "$options": "i"}}
        ]
    }, {"_id": 0})
    
    users_to_delete = await cursor.to_list(length=100)
    
    for user in users_to_delete:
        user_id = user['id']
        deleted_users.append({
            "email": user['email'],
            "username": user.get('username', 'N/A'),
            "user_id": user_id
        })
        
        # Delete user and all related data
        await db.users.delete_one({"id": user_id})
        await db.ratings.delete_many({"user_id": user_id})
        await db.watchlist.delete_many({"user_id": user_id})
        await db.admins.delete_many({"user_id": user_id})
    
    return {"message": f"Deleted {len(deleted_users)} users", "deleted_users": deleted_users}


# ============= FEEDBACK / REPORT ISSUE ROUTES =============

class FeedbackCreate(BaseModel):
    title: str
    feedback_type: str  # bug, feature, improvement
    description: str
    priority: str = "medium"  # low, medium, high, critical


class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    title: str
    feedback_type: str
    description: str
    priority: str
    status: str = "pending"  # pending, in_progress, resolved, wont_fix
    admin_response: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@api_router.post("/feedback/submit")
async def submit_feedback(feedback: FeedbackCreate, token_data: dict = Depends(verify_token)):
    """Submit feedback/bug report"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1}
    )
    
    feedback_doc = Feedback(
        user_id=token_data["user_id"],
        username=user.get("username", "User"),
        title=feedback.title,
        feedback_type=feedback.feedback_type,
        description=feedback.description,
        priority=feedback.priority
    )
    
    await db.feedback.insert_one(feedback_doc.model_dump())
    
    return {"message": "Feedback submitted successfully", "id": feedback_doc.id}


@api_router.get("/feedback/my-feedback")
async def get_my_feedback(token_data: dict = Depends(verify_token)):
    """Get user's own feedback submissions"""
    feedback_list = await db.feedback.find(
        {"user_id": token_data["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"feedback": feedback_list}


@api_router.get("/admin/feedback")
async def get_all_feedback(token_data: dict = Depends(verify_admin)):
    """Admin: Get all feedback"""
    feedback_list = await db.feedback.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return feedback_list


@api_router.put("/admin/feedback/{feedback_id}/respond")
async def respond_to_feedback(
    feedback_id: str,
    response: dict,
    token_data: dict = Depends(verify_admin)
):
    """Admin: Respond to feedback and update status"""
    await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {
            "admin_response": response.get("admin_response"),
            "status": response.get("status", "resolved")
        }}
    )
    
    return {"message": "Feedback updated successfully"}


@api_router.get("/admin/check")
async def check_admin_status(token_data: dict = Depends(verify_token)):
    """Check if current user is admin"""
    admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    
    return {
        "is_admin": admin is not None and admin.get("is_admin", False),
        "permissions": admin.get("permissions", []) if admin else []
    }


@api_router.post("/admin/promote-ceo")
async def promote_ceo_endpoint(token_data: dict = Depends(verify_token)):
    """One-time endpoint to promote CEO email to admin"""
    # Get user info
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "email": 1, "username": 1})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if this is the CEO email
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
    if user["email"].lower() not in ceo_emails:
        raise HTTPException(
            status_code=403, 
            detail="This endpoint is only for the CEO email"
        )
    
    # Check if already admin
    existing_admin = await db.admins.find_one({"user_id": token_data["user_id"]})
    if existing_admin:
        return {
            "message": "You're already an admin!",
            "role": existing_admin.get("role", "Admin"),
            "permissions": existing_admin.get("permissions", [])
        }
    
    # Promote to admin
    admin_config = {
        "user_id": token_data["user_id"],
        "is_admin": True,
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "role": "CEO & Founder",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_config)
    
    logger.info(f"🎉 CEO promoted via endpoint: {user['email']}")
    
    return {
        "message": "🎉 SUCCESS! You are now FlixVault CEO!",
        "role": "CEO & Founder",
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "next_steps": "Refresh your page to see the Admin Panel!"
    }


# ============= USER-SUBMITTED MOVIES (Community Feature) =============

class MovieSubmission(BaseModel):
    title: str
    overview: str
    release_year: int
    genre: str
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None


@api_router.post("/submit-movie")
async def submit_movie(submission: MovieSubmission, token_data: dict = Depends(verify_token)):
    """Allow users to suggest movies to add to FlixVault"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"username": 1}
    )
    
    movie_data = {
        "id": str(uuid.uuid4()),
        "title": submission.title,
        "overview": submission.overview,
        "release_year": submission.release_year,
        "genre": submission.genre,
        "poster_url": submission.poster_url,
        "trailer_url": submission.trailer_url,
        "submitted_by": token_data["user_id"],
        "submitted_by_username": user["username"],
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow()
    }
    
    await db.movie_submissions.insert_one(movie_data)
    
    return {"message": "Movie submitted! We'll review and add it soon.", "submission_id": movie_data["id"]}


@api_router.post("/admin/force-reset-ceo-password")
async def force_reset_ceo_password():
    """Emergency endpoint to reset CEO password - USE ONCE then remove"""
    ceo_email = "cassiusgamergrid@gmail.com"
    new_password = "FlixVault2026!"
    
    # Hash the new password
    hashed_password = get_password_hash(new_password)
    
    # Update the CEO account
    result = await db.users.update_one(
        {"email": ceo_email},
        {
            "$set": {
                "hashed_password": hashed_password,
                "is_admin": True
            }
        }
    )
    
    if result.matched_count > 0:
        return {
            "success": True,
            "message": "CEO password reset successfully!",
            "email": ceo_email,
            "new_password": new_password,
            "note": "Login now with these credentials"
        }
    else:
        raise HTTPException(status_code=404, detail="CEO account not found")


@api_router.get("/my-submissions")
async def get_my_submissions(token_data: dict = Depends(verify_token)):
    """Get user's submitted movies"""
    submissions = await db.movie_submissions.find(
        {"submitted_by": token_data["user_id"]}
    ).sort("created_at", -1).to_list(100)
    
    return {"submissions": submissions}


@api_router.get("/admin/submissions")
async def get_all_submissions(token_data: dict = Depends(verify_token)):
    """Admin: Get all pending movie submissions"""
    # In future, add admin check here
    submissions = await db.movie_submissions.find(
        {"status": "pending"}
    ).sort("created_at", -1).to_list(100)
    
    return {"submissions": submissions}


@api_router.post("/admin/approve-movie/{submission_id}")
async def approve_movie(submission_id: str, token_data: dict = Depends(verify_token)):
    """Admin: Approve and add movie to FlixVault"""
    # In future, add admin check here
    submission = await db.movie_submissions.find_one({"id": submission_id})
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Update status
    await db.movie_submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
    )
    
    return {"message": f"Movie '{submission['title']}' approved and added to FlixVault!"}


# ============= CONTENT REQUEST FEATURE =============

class ContentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content_type: str  # "movie", "series", "documentary"
    description: Optional[str] = None
    reason: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    admin_response: Optional[str] = None

class ContentRequestCreate(BaseModel):
    title: str
    content_type: str
    description: Optional[str] = None
    reason: Optional[str] = None

@api_router.post("/content-requests/submit")
async def submit_content_request(request: ContentRequestCreate, current_user: dict = Depends(verify_token)):
    """Submit a content request"""
    request_dict = request.model_dump()
    request_obj = ContentRequest(user_id=current_user['user_id'], **request_dict)
    
    doc = request_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.content_requests.insert_one(doc)
    
    return {"message": "Your request has been submitted! We'll review it soon.", "request_id": request_obj.id}

@api_router.get("/content-requests/my-requests")
async def get_my_content_requests(current_user: dict = Depends(verify_token)):
    """Get user's content requests"""
    requests = await db.content_requests.find(
        {"user_id": current_user['user_id']}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for req in requests:
        if isinstance(req['created_at'], str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    
    return {"requests": requests}

@api_router.get("/admin/content-requests")
async def get_all_content_requests(current_user: dict = Depends(verify_token)):
    """Admin: Get all content requests"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    requests = await db.content_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        if isinstance(req['created_at'], str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        # Get username
        user = await db.users.find_one({"id": req['user_id']}, {"_id": 0, "username": 1})
        req['username'] = user.get('username', 'Unknown') if user else 'Unknown'
    
    return {"requests": requests}

@api_router.post("/admin/content-requests/{request_id}/respond")
async def respond_to_content_request(
    request_id: str,
    response: str,
    new_status: str,
    current_user: dict = Depends(verify_token)
):
    """Admin: Respond to content request"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.content_requests.update_one(
        {"id": request_id},
        {"$set": {
            "admin_response": response,
            "status": new_status,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Response sent successfully"}


# ============= USER PROFILE & SETTINGS =============
# (Canonical handlers live in routes/auth_routes.py via profile_router; legacy duplicates removed.)


# ============= ADMIN MANAGEMENT & USER DETAILS =============

class AdminAction(BaseModel):
    user_id: str
    action: str  # "promote", "demote"

@api_router.post("/admin/manage-admin")
async def manage_admin_status(action: AdminAction, token_data: dict = Depends(verify_admin)):
    """Admin: Promote or demote user to/from admin"""
    target_user = await db.users.find_one({"id": action.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if action.action == "promote":
        # Check if already admin
        existing_admin = await db.admins.find_one({"user_id": action.user_id})
        if existing_admin:
            raise HTTPException(status_code=400, detail="User is already an admin")
        
        # Add to admins collection
        admin_config = {
            "user_id": action.user_id,
            "is_admin": True,
            "permissions": ["moderate_reviews", "manage_content", "manage_users"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "role": "Admin"
        }
        await db.admins.insert_one(admin_config)
        return {"message": f"User {target_user['username']} promoted to admin"}
        
    elif action.action == "demote":
        # Prevent demoting self
        if action.user_id == token_data['user_id']:
            raise HTTPException(status_code=400, detail="Cannot demote yourself")

        # CEO check: only the original CEO email can demote other admins
        actor = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0, "email": 1})
        actor_email = (actor.get("email") if actor else "").lower()
        ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com", "cassiusgamergrid@gmail.com"]
        if actor_email not in ceo_emails:
            raise HTTPException(status_code=403, detail="Only the CEO can demote admins")

        # Remove from admins collection
        result = await db.admins.delete_one({"user_id": action.user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User is not an admin")
        
        return {"message": f"User {target_user['username']} removed from admin"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/admin/user-details/{user_id}")
async def get_user_details(user_id: str, token_data: dict = Depends(verify_admin)):
    """Admin: Get detailed user information"""
    # Get user basic info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove sensitive data
    if 'hashed_password' in user:
        del user['hashed_password']
    
    # Get watchlist
    watchlist = await db.watchlists.find_one({"user_id": user_id}, {"_id": 0})
    watchlist_count = len(watchlist.get('movie_ids', [])) if watchlist else 0
    
    # Get reviews count
    reviews = await db.reviews.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    reviews_count = len(reviews)
    
    # Get app reviews
    app_reviews = await db.app_reviews.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    app_reviews_count = len(app_reviews)
    
    # Get content requests
    content_requests = await db.content_requests.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    content_requests_count = len(content_requests)
    
    # Get feedback submissions
    feedback = await db.feedback.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    feedback_count = len(feedback)
    
    return {
        "user": user,
        "stats": {
            "watchlist_items": watchlist_count,
            "reviews_count": reviews_count,
            "app_reviews_count": app_reviews_count,
            "content_requests_count": content_requests_count,
            "feedback_count": feedback_count
        },
        "recent_reviews": reviews[:5],
        "recent_content_requests": content_requests[:5],
        "recent_feedback": feedback[:5]
    }


# # ============= FEEDBACK & BUG REPORTS SYSTEM =============
# 
# class Feedback(BaseModel):
#     model_config = ConfigDict(extra="ignore")
#     
#     id: str = Field(default_factory=lambda: str(uuid.uuid4()))
#     user_id: str
#     title: str
#     feedback_type: str  # "bug", "feature", "improvement"
#     description: str
#     priority: str = "medium"  # "low", "medium", "high", "critical"
#     status: str = "pending"  # pending, in_progress, resolved, wont_fix
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
#     admin_response: Optional[str] = None
#     resolved_at: Optional[datetime] = None
# 
# class FeedbackCreate(BaseModel):
#     title: str
#     feedback_type: str
#     description: str
#     priority: str = "medium"
# 
# @api_router.post("/feedback/submit")
# async def submit_feedback(feedback: FeedbackCreate, current_user: dict = Depends(verify_token)):
#     """Submit feedback/bug report"""
#     feedback_dict = feedback.model_dump()
#     feedback_obj = Feedback(user_id=current_user['user_id'], **feedback_dict)
#     
#     doc = feedback_obj.model_dump()
#     doc['created_at'] = doc['created_at'].isoformat()
#     
#     await db.feedback.insert_one(doc)
#     
#     return {"message": "Feedback submitted successfully!", "feedback_id": feedback_obj.id}
# 
# @api_router.get("/feedback/my-feedback")
# async def get_my_feedback(current_user: dict = Depends(verify_token)):
#     """Get user's feedback submissions"""
#     feedback_items = await db.feedback.find(
#         {"user_id": current_user['user_id']}, 
#         {"_id": 0}
#     ).sort("created_at", -1).to_list(100)
#     
#     for item in feedback_items:
#         if isinstance(item['created_at'], str):
#             item['created_at'] = datetime.fromisoformat(item['created_at'])
#     
#     return {"feedback": feedback_items}
# 
# @api_router.get("/admin/feedback")
# async def get_all_feedback(current_user: dict = Depends(verify_token)):
#     """Admin: Get all feedback submissions"""
#     user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
#     if not user or not user.get('is_admin'):
#         raise HTTPException(status_code=403, detail="Admin access required")
#     
#     feedback_items = await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
#     
#     for item in feedback_items:
#         if isinstance(item['created_at'], str):
#             item['created_at'] = datetime.fromisoformat(item['created_at'])
#         # Get username
#         user = await db.users.find_one({"id": item['user_id']}, {"_id": 0, "username": 1})
#         item['username'] = user.get('username', 'Unknown') if user else 'Unknown'
#     
#     return {"feedback": feedback_items}
# 
# @api_router.post("/admin/feedback/{feedback_id}/respond")
# async def respond_to_feedback(
#     feedback_id: str,
#     response: str,
#     new_status: str,
#     current_user: dict = Depends(verify_token)
# ):
#     """Admin: Respond to feedback"""
#     user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
#     if not user or not user.get('is_admin'):
#         raise HTTPException(status_code=403, detail="Admin access required")
#     
#     update_data = {
#         "admin_response": response,
#         "status": new_status,
#         "responded_at": datetime.now(timezone.utc).isoformat()
#     }
#     
#     if new_status == "resolved":
#         update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
#     
#     await db.feedback.update_one(
#         {"id": feedback_id},
#         {"$set": update_data}
#     )
#     
#     return {"message": "Response sent successfully"}
# 
# 
# ============= ORIGINAL ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "FlixVault API - Created by Cassius Fox"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
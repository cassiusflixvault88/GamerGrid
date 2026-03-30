from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
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
from ratings import Rating, RatingCreate, RatingResponse, WatchHistory, WatchHistoryCreate
from admin_models import AdminConfig, ReviewReply, ReviewReplyCreate
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)
from public_domain_videos_clean import get_public_domain_movies, get_public_domain_by_id


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


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
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com"]
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
        {"email": 1, "id": 1, "username": 1, "hashed_password": 1, "created_at": 1, "watchlist": 1, "favorites": 1}
    )
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Auto-promote CEO email to admin if not already
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com"]
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


@api_router.get("/user/profile")
async def get_user_profile(token_data: dict = Depends(verify_token)):
    """Get user profile data"""
    logger.info(f"Fetching profile for user_id: {token_data['user_id']}")
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"Retrieved profile data: {user}")
    return user


@api_router.put("/user/profile")
async def update_user_profile(profile_data: UserProfileUpdate, token_data: dict = Depends(verify_token)):
    """Update user profile settings"""
    # Build update dict with only provided fields
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
                "created_at": datetime.utcnow()
            }}
        )
        rating_id = existing["id"]
    else:
        # Create new rating
        rating = Rating(
            user_id=token_data["user_id"],
            content_id=rating_data.content_id,
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
    ratings = await db.ratings.find({"content_id": content_id}).to_list(1000)
    
    # Get usernames for all ratings
    user_ids = [r["user_id"] for r in ratings]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"id": 1, "username": 1}
    ).to_list(1000)
    
    user_map = {u["id"]: u["username"] for u in users}
    
    # Calculate average
    avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
    
    return {
        "average": round(avg_rating, 1),
        "count": len(ratings),
        "ratings": [
            RatingResponse(
                id=r["id"],
                user_id=r["user_id"],
                username=user_map.get(r["user_id"], "Unknown"),
                content_id=r["content_id"],
                rating=r["rating"],
                review=r.get("review"),
                created_at=r["created_at"]
            ) for r in ratings
        ]
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
    """Get all users"""
    users = await db.users.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1}
    ).sort("created_at", -1).to_list(1000)
    
    return users


@api_router.get("/admin/reviews")
async def get_all_reviews(token_data: dict = Depends(verify_admin)):
    """Get all reviews for moderation"""
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
        # Rename 'review' field to 'comment' for frontend compatibility
        if "review" in review:
            review["comment"] = review.pop("review")
    
    return reviews


@api_router.post("/admin/reply-to-review")
async def reply_to_review(reply_data: ReviewReplyCreate, token_data: dict = Depends(verify_admin)):
    """Admin reply to a user review"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"username": 1}
    )
    
    reply = ReviewReply(
        id=str(uuid.uuid4()),
        review_id=reply_data.review_id,
        admin_id=token_data["user_id"],
        admin_username=user["username"],
        reply_text=reply_data.reply_text,
        created_at=datetime.utcnow()
    )
    
    await db.review_replies.insert_one(reply.model_dump())
    
    return {"message": "Reply posted successfully", "reply": reply}


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
    """Delete a user and all their data"""
    # Check if user exists
    user_to_delete = await db.users.find_one({"id": user_id}, {"_id": 0, "is_admin": 1})
    
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting admin users
    if user_to_delete.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    # Delete user and all related data
    await db.users.delete_one({"id": user_id})
    await db.ratings.delete_many({"user_id": user_id})
    await db.watch_history.delete_many({"user_id": user_id})
    
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
        await db.admins.delete_many({"user_id": user_id})
        await db.ratings.delete_many({"user_id": user_id})
        
        deleted_count += 1
    
    return {
        "message": f"✅ Deleted {deleted_count} CEO account(s)",
        "deleted_accounts": deleted_users,
        "next_step": "You can now sign up fresh with cassiusflixvault@gmail.com!"
    }


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
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com"]
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
    ceo_email = "cassiusflixvault@gmail.com"
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
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

from models import User, UserCreate, UserLogin, UserResponse, WatchlistItem, Token
from ratings import Rating, RatingCreate, RatingResponse, WatchHistory, WatchHistoryCreate
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)
from public_domain_videos import get_public_domain_movies, get_public_domain_by_id


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
        {"id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1, "favorites": 1}
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


# ============= PUBLIC DOMAIN CONTENT ROUTES =============

@api_router.get("/public-domain/movies")
async def get_public_movies():
    return {"movies": get_public_domain_movies()}


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
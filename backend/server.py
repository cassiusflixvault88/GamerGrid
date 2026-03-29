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


# ============= ORIGINAL ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "StreamFlix API - Created by Cassius Fox"}

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
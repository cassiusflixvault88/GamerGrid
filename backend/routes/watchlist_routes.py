"""
Watchlist Routes
Handles adding, removing, and fetching user watchlists
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

from models import WatchlistItem
from auth import verify_token

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.post("/add")
async def add_to_watchlist(item: WatchlistItem, token_data: dict = Depends(verify_token)):
    """Add content to user's watchlist"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"watchlist": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    watchlist = user.get("watchlist", [])
    if any(w["content_id"] == item.content_id for w in watchlist):
        raise HTTPException(status_code=400, detail="Already in watchlist")
    
    watchlist.append(item.model_dump())
    await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": {"watchlist": watchlist}}
    )
    
    return {"message": "Added to watchlist", "watchlist": watchlist}


@router.delete("/remove/{content_id}")
async def remove_from_watchlist(content_id: int, token_data: dict = Depends(verify_token)):
    """Remove content from watchlist"""
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


@router.get("")
async def get_watchlist(token_data: dict = Depends(verify_token)):
    """Get user's watchlist"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "watchlist": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.get("watchlist", [])

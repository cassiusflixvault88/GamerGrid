"""
Movies and Public Domain Routes
Handles public domain movies, trending content, and TMDB integration
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import requests
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

from public_domain_videos_clean import get_public_domain_movies, get_public_domain_by_id

logger = logging.getLogger(__name__)

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(tags=["movies"])


@router.get("/public-domain/movies")
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


@router.get("/public-domain/movie/{content_id}")
async def get_public_movie(content_id: int):
    """Get specific public domain movie by ID"""
    movie = get_public_domain_by_id(content_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.get("/trending/whats-hot")
async def get_whats_hot():
    """
    Get trending content based on FlixVault community activity
    Algorithm: Recent ratings (7d) × 2.0 + Avg rating × 1.5 + Watchlist adds (7d) × 1.5
    """
    try:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Get recent ratings
        recent_ratings = await db.ratings.find(
            {"created_at": {"$gte": seven_days_ago.isoformat()}},
            {"_id": 0}
        ).to_list(1000)
        
        # Get watchlist activity
        users_with_watchlists = await db.users.find(
            {"watchlist": {"$exists": True, "$ne": []}},
            {"_id": 0, "watchlist": 1}
        ).to_list(1000)
        
        # Calculate trending scores
        trending_scores = {}
        
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
            
            if rating.get("comment"):
                trending_scores[content_id]["has_comments"] += 1
        
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
        
        # Calculate final scores
        scored_content = []
        for content_id, data in trending_scores.items():
            rating_count = data["rating_count"]
            avg_rating = (data["rating_sum"] / rating_count) if rating_count > 0 else 0
            watchlist_count = data["watchlist_count"]
            
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
        
        scored_content.sort(key=lambda x: x["trending_score"], reverse=True)
        top_trending_ids = [item["content_id"] for item in scored_content[:12]]
        
        # Supplement with TMDB trending if needed
        tmdb_key = os.environ.get('TMDB_API_KEY')
        trending_content = []
        
        if len(top_trending_ids) < 12 and tmdb_key:
            tmdb_response = requests.get(
                f"https://api.themoviedb.org/3/trending/all/week?api_key={tmdb_key}"
            )
            if tmdb_response.status_code == 200:
                tmdb_trending = tmdb_response.json().get("results", [])
                
                for item in tmdb_trending[:12]:
                    if str(item["id"]) not in top_trending_ids:
                        item["trending_score"] = 0
                        item["is_tmdb_trending"] = True
                        trending_content.append(item)
                        if len(trending_content) + len(top_trending_ids) >= 12:
                            break
        
        # Fetch details for community trending
        if top_trending_ids and tmdb_key:
            for content_id in top_trending_ids:
                rating = await db.ratings.find_one(
                    {"content_id": content_id},
                    {"_id": 0, "media_type": 1}
                )
                
                media_type = rating.get("media_type", "movie") if rating else "movie"
                
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
                        trending_content.insert(0, item)
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


@router.get("/trending/flixvault")
async def get_flixvault_trending():
    """Get FlixVault internal trending (ratings-based only)"""
    try:
        # Get all ratings
        all_ratings = await db.ratings.find({}, {"_id": 0}).to_list(10000)
        
        # Calculate scores
        content_scores = {}
        for rating in all_ratings:
            content_id = str(rating.get("content_id"))
            if content_id not in content_scores:
                content_scores[content_id] = {"count": 0, "sum": 0}
            
            content_scores[content_id]["count"] += 1
            content_scores[content_id]["sum"] += rating.get("rating", 0)
        
        # Calculate averages and sort
        trending = []
        for content_id, data in content_scores.items():
            avg_rating = data["sum"] / data["count"]
            score = avg_rating * data["count"]
            
            trending.append({
                "content_id": content_id,
                "avg_rating": avg_rating,
                "rating_count": data["count"],
                "trending_score": score
            })
        
        trending.sort(key=lambda x: x["trending_score"], reverse=True)
        
        # Get TMDB details for top 20
        tmdb_key = os.environ.get('TMDB_API_KEY')
        results = []
        
        if tmdb_key:
            for item in trending[:20]:
                try:
                    rating = await db.ratings.find_one(
                        {"content_id": item["content_id"]},
                        {"_id": 0, "media_type": 1}
                    )
                    media_type = rating.get("media_type", "movie") if rating else "movie"
                    
                    tmdb_response = requests.get(
                        f"https://api.themoviedb.org/3/{media_type}/{item['content_id']}?api_key={tmdb_key}"
                    )
                    if tmdb_response.status_code == 200:
                        tmdb_data = tmdb_response.json()
                        tmdb_data["media_type"] = media_type
                        tmdb_data["flixvault_rating"] = item["avg_rating"]
                        tmdb_data["flixvault_rating_count"] = item["rating_count"]
                        results.append(tmdb_data)
                except Exception:
                    continue
        
        return {"results": results, "total": len(results)}
        
    except Exception as e:
        logger.error(f"Error getting FlixVault trending: {str(e)}")
        return {"results": [], "total": 0}

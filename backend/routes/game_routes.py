"""
Gaming routes for GamerGrid
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

router = APIRouter(prefix="/api/games", tags=["games"])

logger = logging.getLogger(__name__)

# Temporary mock data until IGDB keys are provided
MOCK_GAMES = [
    {
        "id": 1,
        "name": "Crimson Desert",
        "platform": "PS5",
        "rating": 95,
        "cover_url": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400",
        "release_date": "2025-12-01",
        "genre": "Action RPG"
    },
    {
        "id": 2,
        "name": "Grand Theft Auto VI",
        "platform": "PS5",
        "rating": 98,
        "cover_url": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400",
        "release_date": "2025-10-15",
        "genre": "Action"
    },
    {
        "id": 3,
        "name": "Halo Infinite",
        "platform": "Xbox",
        "rating": 87,
        "cover_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
        "release_date": "2024-05-01",
        "genre": "FPS"
    },
]

@router.get("/trending")
async def get_trending_games(limit: int = Query(50, ge=1, le=500)):
    """Get trending games."""
    logger.info(f"Fetching {limit} trending games")
    return MOCK_GAMES[:limit]

@router.get("/upcoming")
async def get_upcoming_releases(
    days_ahead: int = Query(90, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """Get upcoming game releases."""
    logger.info(f"Fetching upcoming releases for next {days_ahead} days")
    return MOCK_GAMES[:limit]

@router.get("/platform/{platform_name}")
async def get_games_by_platform(
    platform_name: str,
    limit: int = Query(50, ge=1, le=500)
):
    """Get games by platform (PS5, Xbox, PC, Switch)."""
    logger.info(f"Fetching games for platform: {platform_name}")
    
    platform_map = {
        "playstation": "PS5",
        "xbox": "Xbox",
        "pc": "PC",
        "switch": "Switch"
    }
    
    platform = platform_map.get(platform_name.lower(), "PS5")
    filtered = [g for g in MOCK_GAMES if platform.lower() in g["platform"].lower()]
    
    return filtered[:limit]

@router.get("/search")
async def search_games(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Search games by name."""
    logger.info(f"Searching games: {query}")
    results = [g for g in MOCK_GAMES if query.lower() in g["name"].lower()]
    return results[:limit]

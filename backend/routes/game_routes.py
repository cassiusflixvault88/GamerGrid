"""
Gaming routes for GamerGrid - Using IGDB API
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/games", tags=["games"])
logger = logging.getLogger(__name__)

# IGDB credentials
IGDB_CLIENT_ID = os.getenv('IGDB_CLIENT_ID')
IGDB_CLIENT_SECRET = os.getenv('IGDB_CLIENT_SECRET')

# Token cache
_token_cache = {'token': None, 'expires': 0}

async def get_igdb_token():
    """Get IGDB access token (cached)."""
    import time
    
    if _token_cache['token'] and time.time() < _token_cache['expires']:
        return _token_cache['token']
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            'https://id.twitch.tv/oauth2/token',
            params={
                'client_id': IGDB_CLIENT_ID,
                'client_secret': IGDB_CLIENT_SECRET,
                'grant_type': 'client_credentials'
            }
        )
        resp.raise_for_status()
        data = resp.json()
        
        _token_cache['token'] = data['access_token']
        _token_cache['expires'] = time.time() + 3600  # 1 hour
        
        return _token_cache['token']

async def query_igdb(query: str):
    """Query IGDB API."""
    token = await get_igdb_token()
    
    headers = {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            'https://api.igdb.com/v4/games',
            headers=headers,
            content=query
        )
        resp.raise_for_status()
        return resp.json()

@router.get("/trending")
async def get_trending_games(limit: int = Query(50, ge=1, le=500)):
    """Get trending games from IGDB."""
    logger.info(f"Fetching {limit} trending games from IGDB")
    
    query = f"fields name,rating,popularity,cover.url,platforms.name,first_release_date; where rating > 70; sort popularity desc; limit {limit};"
    
    try:
        games = await query_igdb(query)
        return {"results": games, "total": len(games)}
    except Exception as e:
        logger.error(f"IGDB error: {e}")
        raise HTTPException(500, f"Failed to fetch games: {str(e)}")

@router.get("/upcoming")
async def get_upcoming_releases(
    days_ahead: int = Query(90, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """Get upcoming game releases."""
    import time
    
    now = int(time.time())
    future = now + (days_ahead * 24 * 60 * 60)
    
    query = f"fields name,first_release_date,cover.url,platforms.name; where first_release_date > {now} & first_release_date < {future}; sort first_release_date asc; limit {limit};"
    
    try:
        games = await query_igdb(query)
        return {"results": games, "total": len(games)}
    except Exception as e:
        logger.error(f"IGDB error: {e}")
        raise HTTPException(500, str(e))

@router.get("/platform/{platform_name}")
async def get_games_by_platform(
    platform_name: str,
    limit: int = Query(50, ge=1, le=500)
):
    """Get games by platform."""
    # Platform IDs: PS5=167, Xbox Series=169, PC=6, Switch=130
    platform_map = {
        "playstation": "167,48",  # PS5, PS4
        "xbox": "169,49",  # Xbox Series, Xbox One
        "pc": "6",
        "switch": "130"
    }
    
    platform_ids = platform_map.get(platform_name.lower(), "6")
    query = f"fields name,rating,cover.url,first_release_date; where platforms = ({platform_ids}) & rating > 60; sort rating desc; limit {limit};"
    
    try:
        games = await query_igdb(query)
        return {"results": games, "total": len(games)}
    except Exception as e:
        logger.error(f"IGDB error: {e}")
        raise HTTPException(500, str(e))

@router.get("/search")
async def search_games(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Search games by name."""
    query = f"search \"{q}\"; fields name,rating,cover.url,platforms.name; limit {limit};"
    
    try:
        games = await query_igdb(query)
        return {"results": games, "total": len(games)}
    except Exception as e:
        logger.error(f"IGDB error: {e}")
        raise HTTPException(500, str(e))

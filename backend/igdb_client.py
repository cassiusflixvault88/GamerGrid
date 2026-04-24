"""
IGDB API Client for fetching gaming data
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import httpx
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class TokenManager:
    """Manages Twitch OAuth2 tokens with automatic refresh."""
    
    def __init__(self):
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self.client_id = os.getenv('IGDB_CLIENT_ID')
        self.client_secret = os.getenv('IGDB_CLIENT_SECRET')
    
    async def get_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        async with self._lock:
            # Check if token exists and is still valid (with 60 second buffer)
            if self._token and self._token_expiry:
                if datetime.utcnow() < (self._token_expiry - timedelta(seconds=60)):
                    return self._token
            
            # Token is expired or doesn't exist, get a new one
            self._token = await self._fetch_new_token()
            self._token_expiry = datetime.utcnow() + timedelta(hours=4)
            return self._token
    
    async def _fetch_new_token(self) -> str:
        """Fetch a new token from Twitch OAuth2 endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://id.twitch.tv/oauth2/token',
                params={
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'client_credentials'
                }
            )
            response.raise_for_status()
            data = response.json()
            return data['access_token']

class IGDBClient:
    """Async client for IGDB API v4."""
    
    def __init__(self):
        self.base_url = "https://api.igdb.com/v4"
        self.token_manager = TokenManager()
        self._semaphore = asyncio.Semaphore(4)  # Max 4 concurrent requests
    
    async def _make_request(self, endpoint: str, query: str) -> List[Dict[str, Any]]:
        """Make an authenticated request to the IGDB API."""
        async with self._semaphore:
            token = await self.token_manager.get_token()
            
            headers = {
                'Client-ID': self.token_manager.client_id,
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            }
            
            url = f"{self.base_url}/{endpoint}"
            
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        content=query.encode('utf-8')
                    )
                    response.raise_for_status()
                    return response.json()
            except Exception as e:
                logger.error(f"IGDB API error: {e}")
                raise
    
    async def get_games(
        self,
        limit: int = 500,
        offset: int = 0,
        platforms: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch games from IGDB."""
        fields = [
            'id', 'name', 'summary', 'rating', 'first_release_date',
            'genres.name', 'platforms.name', 'cover.url', 'videos.video_id',
            'popularity', 'hypes', 'release_dates.*'
        ]
        
        query_parts = [f"fields {','.join(fields)};"]
        
        if platforms:
            platform_list = ','.join(map(str, platforms))
            query_parts.append(f"where platforms = ({platform_list});")
        
        query_parts.extend([
            f"limit {limit};",
            f"offset {offset};",
            "sort popularity desc;"
        ])
        
        query = ' '.join(query_parts)
        return await self._make_request('games', query)
    
    async def get_upcoming_releases(self, days_ahead: int = 90, limit: int = 100) -> List[Dict]:
        """Fetch upcoming game releases."""
        today = int(datetime.utcnow().timestamp())
        future_date = int((datetime.utcnow() + timedelta(days=days_ahead)).timestamp())
        
        query = f"""
            fields id,name,first_release_date,rating,cover.url,platforms.name;
            where first_release_date > {today} & first_release_date < {future_date};
            sort first_release_date asc;
            limit {limit};
        """
        return await self._make_request('games', query)
    
    async def get_trending_games(self, limit: int = 50) -> List[Dict]:
        """Fetch currently trending games."""
        query = f"fields name,rating,popularity,cover.url,platforms.name; where rating > 70 & popularity > 0; sort popularity desc; limit {limit};"
        return await self._make_request('games', query)
    
    async def get_platforms(self) -> List[Dict]:
        """Fetch all gaming platforms."""
        query = """
            fields id,name,abbreviation,category;
            limit 200;
        """
        return await self._make_request('platforms', query)

# Singleton instance
igdb_client = IGDBClient()

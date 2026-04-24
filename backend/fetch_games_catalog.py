"""
Background script to fetch 10,000+ games from IGDB
Runs in batches to avoid timeouts
"""
import asyncio
import httpx
import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv(Path(__file__).parent / '.env')

CLIENT_ID = os.getenv('IGDB_CLIENT_ID')
CLIENT_SECRET = os.getenv('IGDB_CLIENT_SECRET')

async def get_token():
    """Get IGDB token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            'https://id.twitch.tv/oauth2/token',
            params={
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'grant_type': 'client_credentials'
            }
        )
        resp.raise_for_status()
        return resp.json()['access_token']

async def fetch_games_batch(token, offset=0, limit=500):
    """Fetch a batch of games."""
    headers = {
        'Client-ID': CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }
    
    # Query for popular games with all needed data
    query = f"fields name,rating,popularity,cover.url,platforms.name,first_release_date,genres.name,videos.video_id,screenshots.url,summary; where rating > 60; sort popularity desc; limit {limit}; offset {offset};"
    
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            'https://api.igdb.com/v4/games',
            headers=headers,
            content=query
        )
        resp.raise_for_status()
        return resp.json()

async def main():
    print("🎮 Starting IGDB game catalog fetch...")
    print(f"Target: 10,000 games")
    print(f"This will take ~15-20 minutes due to rate limits\n")
    
    token = await get_token()
    print(f"✅ Got IGDB token\n")
    
    all_games = []
    batch_size = 500
    total_to_fetch = 10000
    
    for i in range(0, total_to_fetch, batch_size):
        try:
            print(f"📥 Fetching games {i} to {i+batch_size}...")
            games = await fetch_games_batch(token, offset=i, limit=batch_size)
            
            if not games:
                print(f"⚠️ No more games returned at offset {i}")
                break
            
            all_games.extend(games)
            print(f"   Got {len(games)} games. Total: {len(all_games)}")
            
            # Rate limit: 4 requests per second max
            await asyncio.sleep(0.3)
            
            # Save progress every 2000 games
            if len(all_games) % 2000 == 0:
                print(f"\n💾 Saving progress... ({len(all_games)} games so far)")
                with open('/app/backend/igdb_catalog_temp.json', 'w') as f:
                    json.dump(all_games, f)
                    
        except Exception as e:
            print(f"❌ Error at offset {i}: {e}")
            await asyncio.sleep(2)
            continue
    
    print(f"\n✅ Fetch complete! Got {len(all_games)} total games")
    
    # Save final catalog
    print("💾 Saving final catalog...")
    
    # Create Python file
    with open('/app/backend/igdb_catalog.py', 'w') as f:
        f.write('# IGDB Gaming Catalog - Auto-generated\n')
        f.write(f'# Total games: {len(all_games)}\n\n')
        f.write('IGDB_CATALOG = ')
        f.write(json.dumps(all_games, indent=2))
        f.write('\n\ndef get_games_catalog():\n')
        f.write('    return IGDB_CATALOG\n')
    
    print(f"✅ Saved to /app/backend/igdb_catalog.py")
    print(f"🎮 {len(all_games)} games ready to use!")

if __name__ == '__main__':
    asyncio.run(main())

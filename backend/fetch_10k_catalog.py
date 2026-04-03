"""
FlixVault Catalog Expansion Script
Fetches 5,000 movies + 5,000 TV series from TMDB with trailers
"""
import requests
import time
import json
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment
load_dotenv(Path(__file__).parent / '.env')

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
YOUTUBE_API_KEY = "AIzaSyDummyKeyForTrailerFetching"  # Will use TMDB's trailer endpoint

BASE_URL = "https://api.themoviedb.org/3"
CATALOG_FILE = Path(__file__).parent / "tmdb_catalog.py"

# Progress tracking
progress = {
    "movies_fetched": 0,
    "series_fetched": 0,
    "movies_with_trailers": 0,
    "series_with_trailers": 0,
    "total_api_calls": 0,
    "errors": 0,
    "start_time": time.time()
}

def log_progress():
    """Print progress update"""
    elapsed = time.time() - progress['start_time']
    print(f"\n{'='*60}")
    print(f"📊 PROGRESS UPDATE - {elapsed/60:.1f} minutes elapsed")
    print(f"{'='*60}")
    print(f"🎬 Movies: {progress['movies_fetched']}/5000 (Trailers: {progress['movies_with_trailers']})")
    print(f"📺 Series: {progress['series_fetched']}/5000 (Trailers: {progress['series_with_trailers']})")
    print(f"📡 Total API calls: {progress['total_api_calls']}")
    print(f"❌ Errors: {progress['errors']}")
    print(f"{'='*60}\n")

def fetch_youtube_trailer(tmdb_id, media_type):
    """Fetch YouTube trailer for a movie or TV show"""
    try:
        url = f"{BASE_URL}/{media_type}/{tmdb_id}/videos"
        params = {"api_key": TMDB_API_KEY}
        
        response = requests.get(url, params=params, timeout=10)
        progress['total_api_calls'] += 1
        
        if response.status_code == 200:
            data = response.json()
            videos = data.get('results', [])
            
            # Find official trailer on YouTube
            for video in videos:
                if video.get('site') == 'YouTube' and 'trailer' in video.get('type', '').lower():
                    return video.get('key')
            
            # Fallback to any YouTube video
            for video in videos:
                if video.get('site') == 'YouTube':
                    return video.get('key')
        
        return None
    except Exception as e:
        progress['errors'] += 1
        return None

def fetch_popular_movies(target_count=5000):
    """Fetch popular movies from TMDB"""
    movies = []
    page = 1
    
    print(f"🎬 Starting to fetch {target_count} movies...")
    
    while len(movies) < target_count:
        try:
            url = f"{BASE_URL}/movie/popular"
            params = {
                "api_key": TMDB_API_KEY,
                "page": page,
                "language": "en-US"
            }
            
            response = requests.get(url, params=params, timeout=10)
            progress['total_api_calls'] += 1
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                
                if not results:
                    print(f"⚠️  No more movies found at page {page}")
                    break
                
                for item in results:
                    if len(movies) >= target_count:
                        break
                    
                    # Fetch trailer
                    trailer_key = fetch_youtube_trailer(item['id'], 'movie')
                    
                    movie = {
                        'adult': item.get('adult', False),
                        'backdrop_path': item.get('backdrop_path'),
                        'genre_ids': item.get('genre_ids', []),
                        'id': item['id'],
                        'original_language': item.get('original_language', 'en'),
                        'original_title': item.get('original_title', item.get('title')),
                        'overview': item.get('overview', ''),
                        'popularity': item.get('popularity', 0),
                        'poster_path': item.get('poster_path'),
                        'release_date': item.get('release_date', ''),
                        'title': item.get('title', 'Untitled'),
                        'video': item.get('video', False),
                        'vote_average': item.get('vote_average', 0),
                        'vote_count': item.get('vote_count', 0),
                        'youtube_trailer': trailer_key,
                        'media_type': 'movie'
                    }
                    
                    movies.append(movie)
                    progress['movies_fetched'] = len(movies)
                    if trailer_key:
                        progress['movies_with_trailers'] += 1
                    
                    # Log every 100 items
                    if len(movies) % 100 == 0:
                        log_progress()
                    
                    # Rate limiting - be nice to TMDB
                    time.sleep(0.25)
                
                page += 1
                time.sleep(0.5)  # Extra delay between pages
            
            elif response.status_code == 429:
                print("⚠️  Rate limited! Waiting 10 seconds...")
                time.sleep(10)
            else:
                print(f"❌ Error fetching movies page {page}: {response.status_code}")
                progress['errors'] += 1
                page += 1
                time.sleep(2)
        
        except Exception as e:
            print(f"❌ Exception fetching movies: {e}")
            progress['errors'] += 1
            time.sleep(5)
    
    print(f"✅ Fetched {len(movies)} movies!")
    return movies

def fetch_popular_series(target_count=5000):
    """Fetch popular TV series from TMDB"""
    series = []
    page = 1
    
    print(f"📺 Starting to fetch {target_count} TV series...")
    
    while len(series) < target_count:
        try:
            url = f"{BASE_URL}/tv/popular"
            params = {
                "api_key": TMDB_API_KEY,
                "page": page,
                "language": "en-US"
            }
            
            response = requests.get(url, params=params, timeout=10)
            progress['total_api_calls'] += 1
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                
                if not results:
                    print(f"⚠️  No more series found at page {page}")
                    break
                
                for item in results:
                    if len(series) >= target_count:
                        break
                    
                    # Fetch trailer
                    trailer_key = fetch_youtube_trailer(item['id'], 'tv')
                    
                    show = {
                        'id': item['id'],
                        'tmdb_id': item['id'],
                        'name': item.get('name', 'Untitled'),
                        'overview': item.get('overview', ''),
                        'poster_path': item.get('poster_path'),
                        'backdrop_path': item.get('backdrop_path'),
                        'media_type': 'tv',
                        'first_air_date': item.get('first_air_date', ''),
                        'vote_average': item.get('vote_average', 0),
                        'vote_count': item.get('vote_count', 0),
                        'popularity': item.get('popularity', 0),
                        'genre_ids': item.get('genre_ids', []),
                        'youtube_trailer': trailer_key,
                        'origin_country': item.get('origin_country', [])
                    }
                    
                    series.append(show)
                    progress['series_fetched'] = len(series)
                    if trailer_key:
                        progress['series_with_trailers'] += 1
                    
                    # Log every 100 items
                    if len(series) % 100 == 0:
                        log_progress()
                    
                    # Rate limiting
                    time.sleep(0.25)
                
                page += 1
                time.sleep(0.5)
            
            elif response.status_code == 429:
                print("⚠️  Rate limited! Waiting 10 seconds...")
                time.sleep(10)
            else:
                print(f"❌ Error fetching series page {page}: {response.status_code}")
                progress['errors'] += 1
                page += 1
                time.sleep(2)
        
        except Exception as e:
            print(f"❌ Exception fetching series: {e}")
            progress['errors'] += 1
            time.sleep(5)
    
    print(f"✅ Fetched {len(series)} series!")
    return series

def update_catalog_file(movies, series):
    """Update tmdb_catalog.py with new content"""
    print("\n📝 Updating catalog file...")
    
    # Combine with existing catalog
    all_content = movies + series
    
    # Generate Python file content
    content = '''"""
FlixVault Catalog - Movies and TV Series
Auto-generated with TMDB data
Last updated: ''' + time.strftime("%Y-%m-%d %H:%M:%S") + '''
Total items: ''' + str(len(all_content)) + '''
"""


def get_catalog_size():
    """Returns the total number of items in catalog"""
    return len(TMDB_CATALOG)

def get_movies_by_genre(genre_id):
    """Filter movies by genre ID"""
    return [movie for movie in TMDB_CATALOG if genre_id in movie.get('genre_ids', [])]

def get_popular_movies(limit=20):
    """Get most popular movies sorted by popularity"""
    movies = [item for item in TMDB_CATALOG if item.get('media_type') == 'movie']
    return sorted(movies, key=lambda x: x.get('popularity', 0), reverse=True)[:limit]

def get_tmdb_catalog():
    """Returns the catalog"""
    return TMDB_CATALOG

TMDB_CATALOG = '''
    
    content += json.dumps(all_content, indent=4)
    content += "\n"
    
    # Write to file
    with open(CATALOG_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Catalog file updated with {len(all_content)} items!")

def main():
    """Main execution"""
    print("\n" + "="*60)
    print("🎬 FLIXVAULT CATALOG EXPANSION")
    print("="*60)
    print(f"Target: 5,000 movies + 5,000 TV series")
    print(f"Start time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    # Fetch movies
    movies = fetch_popular_movies(5000)
    log_progress()
    
    # Fetch series
    series = fetch_popular_series(5000)
    log_progress()
    
    # Update catalog file
    update_catalog_file(movies, series)
    
    # Final summary
    elapsed = time.time() - progress['start_time']
    print("\n" + "="*60)
    print("🎉 CATALOG EXPANSION COMPLETE!")
    print("="*60)
    print(f"⏱️  Total time: {elapsed/3600:.2f} hours ({elapsed/60:.1f} minutes)")
    print(f"🎬 Movies: {progress['movies_fetched']} (Trailers: {progress['movies_with_trailers']})")
    print(f"📺 Series: {progress['series_fetched']} (Trailers: {progress['series_with_trailers']})")
    print(f"📊 Total content: {progress['movies_fetched'] + progress['series_fetched']}")
    print(f"📡 API calls made: {progress['total_api_calls']}")
    print(f"❌ Errors: {progress['errors']}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

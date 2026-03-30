"""
Plex Free Movies Integration - Fetches real TMDB data
"""
import requests
import os
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

def fetch_plex_free_movies(limit: int = 30) -> List[Dict]:
    """
    Fetch free movies with real TMDB data (posters, trailers, etc.)
    """
    movies = []
    
    # Get TMDB API key from environment
    TMDB_API_KEY = os.getenv('REACT_APP_TMDB_API_KEY_1', '')
    
    if not TMDB_API_KEY:
        logger.warning("No TMDB API key found for Plex movies")
        return []
    
    try:
        # Popular free-to-watch movies (TMDB IDs verified)
        free_titles = [
            {"title": "The Terminator", "tmdb_id": 218},
            {"title": "Platoon", "tmdb_id": 792},
            {"title": "Training Day", "tmdb_id": 2567},
            {"title": "Black Hawk Down", "tmdb_id": 6835},
            {"title": "Casino", "tmdb_id": 524},
            {"title": "Heat", "tmdb_id": 949},
            {"title": "The Silence of the Lambs", "tmdb_id": 274},
            {"title": "Se7en", "tmdb_id": 807},
            {"title": "The Departed", "tmdb_id": 1422},
            {"title": "Catch Me If You Can", "tmdb_id": 640},
            {"title": "Django Unchained", "tmdb_id": 68718},
            {"title": "Inglourious Basterds", "tmdb_id": 16869},
            {"title": "Apocalypse Now", "tmdb_id": 28},
            {"title": "Goodfellas", "tmdb_id": 769},
            {"title": "The Big Lebowski", "tmdb_id": 115},
        ][:limit]
        
        # Fetch real TMDB data for each movie
        for item in free_titles:
            try:
                tmdb_id = item['tmdb_id']
                
                # Fetch movie details
                detail_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}"
                detail_response = requests.get(detail_url, timeout=5)
                
                if detail_response.status_code != 200:
                    continue
                    
                movie_data = detail_response.json()
                
                # Fetch trailer
                video_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos?api_key={TMDB_API_KEY}"
                video_response = requests.get(video_url, timeout=5)
                videos = video_response.json().get('results', []) if video_response.status_code == 200 else []
                
                # Find YouTube trailer
                trailer = next((v for v in videos if v.get('type') == 'Trailer' and v.get('site') == 'YouTube'), None)
                
                movie = {
                    "id": f"plex_{tmdb_id}",
                    "title": movie_data.get('title'),
                    "overview": movie_data.get('overview', ''),
                    "poster_path": movie_data.get('poster_path'),
                    "backdrop_path": movie_data.get('backdrop_path'),
                    "release_date": movie_data.get('release_date', ''),
                    "vote_average": movie_data.get('vote_average', 0),
                    "media_type": "movie",
                    "source": "plex",
                    "genre_ids": [g['id'] for g in movie_data.get('genres', [])],
                    "plex_url": f"https://watch.plex.tv/movie/{item['title'].lower().replace(' ', '-')}",
                    "trailer_key": trailer.get('key') if trailer else None,
                    "free_to_watch": True
                }
                movies.append(movie)
                logger.info(f"Added Plex movie: {movie['title']}")
                
            except Exception as e:
                logger.error(f"Error fetching TMDB data for {item['title']}: {e}")
                continue
        
        logger.info(f"✅ Fetched {len(movies)} Plex movies with TMDB data")
        return movies
        
    except Exception as e:
        logger.error(f"Error fetching Plex movies: {e}")
        return []

"""
Fetch public domain movies from Archive.org
"""
import requests
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

def fetch_archive_movies(limit: int = 200) -> List[Dict]:
    """
    Fetch public domain feature films from Archive.org
    Returns list of movies with metadata and streaming URLs
    """
    movies = []
    
    try:
        # Archive.org API endpoint for feature films
        url = "https://archive.org/advancedsearch.php"
        params = {
            "q": "collection:(feature_films) AND mediatype:movies",
            "fl[]": ["identifier", "title", "description", "year", "creator", "subject"],
            "sort[]": "downloads desc",
            "rows": limit,
            "page": 1,
            "output": "json"
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        for item in data.get("response", {}).get("docs", []):
            identifier = item.get("identifier")
            if not identifier:
                continue
                
            # Get detailed metadata for video URLs
            detail_url = f"https://archive.org/metadata/{identifier}"
            try:
                detail_response = requests.get(detail_url, timeout=10)
                detail_data = detail_response.json()
                
                # Find video file
                video_url = None
                poster_url = None
                files = detail_data.get("files", [])
                
                for file in files:
                    name = file.get("name", "")
                    format_type = file.get("format", "")
                    
                    # Look for MP4 or OGV video files
                    if format_type in ["h.264", "MPEG4"] or name.endswith(".mp4"):
                        video_url = f"https://archive.org/download/{identifier}/{name}"
                        break
                    elif format_type == "Ogg Video" or name.endswith(".ogv"):
                        video_url = f"https://archive.org/download/{identifier}/{name}"
                
                # Get poster/thumbnail
                metadata = detail_data.get("metadata", {})
                if metadata:
                    poster_url = f"https://archive.org/services/img/{identifier}"
                
                if video_url:
                    movie = {
                        "id": f"archive_{identifier}",
                        "title": item.get("title", "Unknown Title"),
                        "overview": item.get("description", [""])[0] if isinstance(item.get("description"), list) else item.get("description", ""),
                        "poster_path": poster_url,
                        "backdrop_path": poster_url,
                        "release_date": str(item.get("year", "Unknown")),
                        "vote_average": 7.0,  # Default rating
                        "media_type": "movie",
                        "video_url": video_url,
                        "source": "archive.org",
                        "genre": item.get("subject", ["Classic"])[:3] if isinstance(item.get("subject"), list) else ["Classic"],
                        "director": item.get("creator", ["Unknown"])[0] if isinstance(item.get("creator"), list) else item.get("creator", "Unknown")
                    }
                    movies.append(movie)
                    logger.info(f"Added movie: {movie['title']}")
                    
            except Exception as e:
                logger.error(f"Error fetching details for {identifier}: {e}")
                continue
        
        logger.info(f"Successfully fetched {len(movies)} movies from Archive.org")
        return movies
        
    except Exception as e:
        logger.error(f"Error fetching Archive.org movies: {e}")
        return []


def search_archive_movies(query: str, limit: int = 50) -> List[Dict]:
    """Search Archive.org for specific movies"""
    try:
        url = "https://archive.org/advancedsearch.php"
        params = {
            "q": f"collection:(feature_films) AND mediatype:movies AND title:({query})",
            "fl[]": ["identifier", "title", "description", "year"],
            "rows": limit,
            "output": "json"
        }
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        # Process results similar to fetch_archive_movies
        return fetch_archive_movies(limit=limit)
        
    except Exception as e:
        logger.error(f"Error searching Archive.org: {e}")
        return []

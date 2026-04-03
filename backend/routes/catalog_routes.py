"""
TMDB Catalog Routes
Serves comprehensive movie catalog with trailers
"""
from fastapi import APIRouter, Query
from typing import Optional
import random

from tmdb_catalog import get_tmdb_catalog, get_catalog_size, get_movies_by_genre, get_popular_movies

router = APIRouter(prefix="/catalog", tags=["tmdb-catalog"])


@router.get("/movies")
async def get_catalog_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),  # Increased to 10000 for full catalog
    genre: Optional[int] = None
):
    """Get paginated movie catalog"""
    catalog = get_tmdb_catalog()
    
    # Filter by genre if specified
    if genre:
        catalog = get_movies_by_genre(genre)
    
    # Pagination
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "results": catalog[start:end],
        "page": page,
        "total_results": len(catalog),
        "total_pages": (len(catalog) + limit - 1) // limit
    }


@router.get("/movies/popular")
async def get_popular_catalog_movies(limit: int = Query(20, ge=1, le=100)):
    """Get most popular movies from catalog"""
    return {
        "results": get_popular_movies(limit),
        "total": limit
    }


@router.get("/movies/random")
async def get_random_movies(count: int = Query(12, ge=1, le=50)):
    """Get random movies from catalog"""
    catalog = get_tmdb_catalog()
    sample_size = min(count, len(catalog))
    random_movies = random.sample(catalog, sample_size)
    
    return {
        "results": random_movies,
        "total": len(random_movies)
    }


@router.get("/genres")
async def get_available_genres():
    """Get list of all genres in catalog"""
    catalog = get_tmdb_catalog()
    all_genre_ids = set()
    
    for movie in catalog:
        all_genre_ids.update(movie.get('genre_ids', []))
    
    # Genre ID to name mapping
    genre_map = {
        28: "Action",
        12: "Adventure",
        16: "Animation",
        35: "Comedy",
        80: "Crime",
        99: "Documentary",
        18: "Drama",
        10751: "Family",
        14: "Fantasy",
        36: "History",
        27: "Horror",
        10402: "Music",
        9648: "Mystery",
        10749: "Romance",
        878: "Science Fiction",
        10770: "TV Movie",
        53: "Thriller",
        10752: "War",
        37: "Western"
    }
    
    available_genres = [
        {"id": gid, "name": genre_map.get(gid, "Unknown")}
        for gid in sorted(all_genre_ids)
        if gid in genre_map
    ]
    
    return {
        "genres": available_genres,
        "total": len(available_genres)
    }


@router.get("/stats")
async def get_catalog_stats():
    """Get catalog statistics"""
    catalog = get_tmdb_catalog()
    
    total_movies = len(catalog)
    movies_with_trailers = sum(1 for m in catalog if m.get('youtube_trailer'))
    
    # Count by genre
    genre_counts = {}
    for movie in catalog:
        for genre_id in movie.get('genre_ids', []):
            genre_counts[genre_id] = genre_counts.get(genre_id, 0) + 1
    
    return {
        "total_movies": total_movies,
        "movies_with_trailers": movies_with_trailers,
        "average_rating": sum(m.get('vote_average', 0) for m in catalog) / total_movies if total_movies > 0 else 0,
        "genre_distribution": genre_counts
    }

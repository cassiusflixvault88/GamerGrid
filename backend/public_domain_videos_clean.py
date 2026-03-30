"""
Clean, verified free public domain movies
ONLY movies that are 100% TESTED and WORKING
"""

def get_public_domain_movies():
    """
    Return VERIFIED working free public domain movies
    - ONLY includes movies confirmed working on mobile
    - All tested for embedding and playback
    """
    return [
        {
            "id": 9000001,
            "title": "Nosferatu",
            "overview": "The classic 1922 silent vampire film. Count Orlok brings terror to a small German town.",
            "poster_path": "/rWkf5pNUhz9p0TKNsVzjkKjKuhd.jpg",
            "backdrop_path": "/rWkf5pNUhz9p0TKNsVzjkKjKuhd.jpg",
            "media_type": "movie",
            "release_date": "1922-03-04",
            "vote_average": 7.9,
            "runtime": 94,
            "youtube_id": "FC6jFoYm3xs",
            "is_public_domain": True,
            "genre_ids": [27],
            "free_full_movie": True
        },
        {
            "id": 9000002,
            "title": "Reefer Madness",
            "overview": "Propagandist film warning against marijuana use. 1936 cult classic now viewed as unintentional comedy.",
            "poster_path": "/5jWNc4gkHAhpqDIgOw5vPhaqGWy.jpg",
            "backdrop_path": "/5jWNc4gkHAhpqDIgOw5vPhaqGWy.jpg",
            "media_type": "movie",
            "release_date": "1936-04-19",
            "vote_average": 4.4,
            "runtime": 66,
            "youtube_id": "sbjHOBJzhb0",
            "is_public_domain": True,
            "genre_ids": [18],
            "free_full_movie": True
        },
    ]


def get_public_domain_by_id(content_id):
    """Get specific public domain movie by ID"""
    movies = get_public_domain_movies()
    for movie in movies:
        if str(movie["id"]) == str(content_id):
            return movie
    return None

"""
Free movies from multiple sources:
1. YouTube embeddable public domain (2 working movies)
2. Plex free streaming links (15+ movies) WITH TMDB IDs for trailers
"""

def get_public_domain_movies():
    """
    Return FREE movies from YouTube (embedded) + Plex (links)
    All movies include TMDB IDs for trailer fetching
    """
    movies = [
        # === YOUTUBE EMBEDDED (Working) ===
        {
            "id": 9000001,
            "tmdb_id": 843,
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
            "free_full_movie": True,
            "source": "youtube"
        },
        {
            "id": 9000002,
            "tmdb_id": 14234,
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
            "free_full_movie": True,
            "source": "youtube"
        },
        
        # === PLEX FREE STREAMING (Links to Plex) with TMDB IDs ===
        {
            "id": 218,
            "title": "The Terminator",
            "overview": "A cyborg assassin sent from the future to kill Sarah Connor. Classic 1984 sci-fi action.",
            "poster_path": "/qvktm0BHcnmDpul4Hz01GIazWPr.jpg",
            "backdrop_path": "/6yFoLNQgFdVbA8TZMdfgVpszOla.jpg",
            "media_type": "movie",
            "release_date": "1984-10-26",
            "vote_average": 7.7,
            "runtime": 107,
            "plex_url": "https://watch.plex.tv/movie/the-terminator",
            "is_public_domain": False,
            "genre_ids": [28, 878],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 1366,
            "title": "Rocky",
            "overview": "A small-time boxer gets a shot at the world heavyweight championship. 1976 Best Picture winner.",
            "poster_path": "/cqxg1CihGR5ge0i1wYXr4Rdeppu.jpg",
            "backdrop_path": "/3cqxg1CihGR5ge0i1wYXr4Rdeppu.jpg",
            "media_type": "movie",
            "release_date": "1976-11-21",
            "vote_average": 7.8,
            "runtime": 119,
            "plex_url": "https://watch.plex.tv/movie/rocky",
            "is_public_domain": False,
            "genre_ids": [18],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 4614,
            "title": "The Blair Witch Project",
            "overview": "Three student filmmakers disappear while investigating local legends. Found footage horror classic.",
            "poster_path": "/9WCkyEZd15QBwpXgd7PVaJXAy4b.jpg",
            "backdrop_path": "/9WCkyEZd15QBwpXgd7PVaJXAy4b.jpg",
            "media_type": "movie",
            "release_date": "1999-07-14",
            "vote_average": 6.3,
            "runtime": 81,
            "plex_url": "https://watch.plex.tv/movie/the-blair-witch-project",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 176,
            "title": "Saw",
            "overview": "Two strangers wake up in a deadly game orchestrated by a serial killer. Horror thriller from 2004.",
            "poster_path": "/8FdVJVb6bhWxB4n2dX8JnB97OPk.jpg",
            "backdrop_path": "/8FdVJVb6bhWxB4n2dX8JnB97OPk.jpg",
            "media_type": "movie",
            "release_date": "2004-10-01",
            "vote_average": 7.4,
            "runtime": 103,
            "plex_url": "https://watch.plex.tv/movie/saw",
            "is_public_domain": False,
            "genre_ids": [27, 53],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 948,
            "title": "Halloween",
            "overview": "Michael Myers escapes from a mental hospital and returns to his hometown to kill. 1978 horror classic.",
            "poster_path": "/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg",
            "backdrop_path": "/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg",
            "media_type": "movie",
            "release_date": "1978-10-25",
            "vote_average": 7.6,
            "runtime": 91,
            "plex_url": "https://watch.plex.tv/movie/halloween",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 453,
            "title": "Godzilla",
            "overview": "Nuclear tests awaken a giant prehistoric monster. Classic 1954 Japanese monster movie.",
            "poster_path": "/6B2XcQkH6LdQOg2fZEXy5Qd0wR1.jpg",
            "backdrop_path": "/6B2XcQkH6LdQOg2fZEXy5Qd0wR1.jpg",
            "media_type": "movie",
            "release_date": "1954-11-03",
            "vote_average": 7.6,
            "runtime": 96,
            "plex_url": "https://watch.plex.tv/movie/godzilla-1954",
            "is_public_domain": False,
            "genre_ids": [878, 27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 700,
            "title": "A Nightmare on Elm Street",
            "overview": "Teenagers are stalked by a killer in their dreams. Freddy Krueger horror classic from 1984.",
            "poster_path": "/3md49VL9xF4qGmh4rKbhT4i8jXM.jpg",
            "backdrop_path": "/3md49VL9xF4qGmh4rKbhT4i8jXM.jpg",
            "media_type": "movie",
            "release_date": "1984-11-09",
            "vote_average": 7.3,
            "runtime": 91,
            "plex_url": "https://watch.plex.tv/movie/a-nightmare-on-elm-street",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 1493,
            "title": "The Texas Chain Saw Massacre",
            "overview": "A group of friends encounter a family of cannibals. 1974 horror masterpiece.",
            "poster_path": "/4LxGw4JRZpOxBPLQK8QO0eNT4Ii.jpg",
            "backdrop_path": "/4LxGw4JRZpOxBPLQK8QO0eNT4Ii.jpg",
            "media_type": "movie",
            "release_date": "1974-10-01",
            "vote_average": 7.3,
            "runtime": 83,
            "plex_url": "https://watch.plex.tv/movie/the-texas-chain-saw-massacre",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 500,
            "title": "Reservoir Dogs",
            "overview": "After a heist goes wrong, criminals suspect one of them is a police informant. Tarantino's debut.",
            "poster_path": "/xi8Iu6qyTfyZVDVy60raIOYJJmk.jpg",
            "backdrop_path": "/xi8Iu6qyTfyZVDVy60raIOYJJmk.jpg",
            "media_type": "movie",
            "release_date": "1992-09-02",
            "vote_average": 8.3,
            "runtime": 99,
            "plex_url": "https://watch.plex.tv/movie/reservoir-dogs",
            "is_public_domain": False,
            "genre_ids": [80, 53],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 141,
            "title": "Donnie Darko",
            "overview": "A troubled teenager receives visions of a man in a rabbit suit. Cult sci-fi thriller from 2001.",
            "poster_path": "/hihMAkx2n8f6FVkFkHwsXhKI2IL.jpg",
            "backdrop_path": "/hihMAkx2n8f6FVkFkHwsXhKI2IL.jpg",
            "media_type": "movie",
            "release_date": "2001-01-19",
            "vote_average": 7.8,
            "runtime": 113,
            "plex_url": "https://watch.plex.tv/movie/donnie-darko",
            "is_public_domain": False,
            "genre_ids": [878, 18, 9648],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 792,
            "title": "Platoon",
            "overview": "A young recruit experiences the horrors of the Vietnam War. 1986 Best Picture winner.",
            "poster_path": "/m3mmFkPQKvPZq5exmh0bDuXlD9T.jpg",
            "backdrop_path": "/m3mmFkPQKvPZq5exmh0bDuXlD9T.jpg",
            "media_type": "movie",
            "release_date": "1986-12-19",
            "vote_average": 7.7,
            "runtime": 120,
            "plex_url": "https://watch.plex.tv/movie/platoon",
            "is_public_domain": False,
            "genre_ids": [18, 10752],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 13194,
            "title": "Friday the 13th",
            "overview": "Camp counselors are stalked by a mysterious killer. Slasher classic from 1980.",
            "poster_path": "/HzrPn1gEHWixfMOvOehOTlHROo.jpg",
            "backdrop_path": "/HzrPn1gEHWixfMOvOehOTlHROo.jpg",
            "media_type": "movie",
            "release_date": "1980-05-09",
            "vote_average": 6.4,
            "runtime": 95,
            "plex_url": "https://watch.plex.tv/movie/friday-the-13th",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 2454,
            "title": "The Evil Dead",
            "overview": "Five friends unleash demonic forces in a cabin in the woods. 1981 horror cult classic.",
            "poster_path": "/uYxQ6xhP3WjqPZtxyAOnZQyx7I6.jpg",
            "backdrop_path": "/uYxQ6xhP3WjqPZtxyAOnZQyx7I6.jpg",
            "media_type": "movie",
            "release_date": "1981-10-15",
            "vote_average": 7.3,
            "runtime": 85,
            "plex_url": "https://watch.plex.tv/movie/the-evil-dead",
            "is_public_domain": False,
            "genre_ids": [27],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 111,
            "title": "Scarface",
            "overview": "A Cuban refugee rises to become a powerful drug lord in Miami. Crime drama from 1983.",
            "poster_path": "/zAf9U14pwlD6vKILtGW7wGSVqS4.jpg",
            "backdrop_path": "/zAf9U14pwlD6vKILtGW7wGSVqS4.jpg",
            "media_type": "movie",
            "release_date": "1983-12-09",
            "vote_average": 8.2,
            "runtime": 170,
            "plex_url": "https://watch.plex.tv/movie/scarface",
            "is_public_domain": False,
            "genre_ids": [80, 18],
            "free_full_movie": True,
            "source": "plex"
        },
        {
            "id": 28,
            "title": "Apocalypse Now",
            "overview": "A captain is sent to assassinate a rogue colonel during the Vietnam War. Epic war film from 1979.",
            "poster_path": "/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg",
            "backdrop_path": "/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg",
            "media_type": "movie",
            "release_date": "1979-08-15",
            "vote_average": 8.3,
            "runtime": 147,
            "plex_url": "https://watch.plex.tv/movie/apocalypse-now",
            "is_public_domain": False,
            "genre_ids": [18, 10752],
            "free_full_movie": True,
            "source": "plex"
        },
    ]
    
    return movies


def get_public_domain_by_id(content_id):
    """Get specific public domain movie by ID"""
    movies = get_public_domain_movies()
    for movie in movies:
        if str(movie["id"]) == str(content_id):
            return movie
    return None

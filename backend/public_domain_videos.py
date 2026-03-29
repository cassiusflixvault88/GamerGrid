"""
Public Domain Movies and Videos
These are legally free to watch and distribute
"""

PUBLIC_DOMAIN_CONTENT = [
    {
        "id": 9000001,
        "title": "Night of the Living Dead",
        "overview": "A group of people hide from bloodthirsty zombies in a farmhouse. Classic horror film from 1968.",
        "poster_path": "/inNUOa9WZGdyRXQlt7eqmHtCttl.jpg",
        "backdrop_path": "/3md49VRGgu5aLr9n5MXJgJRM8a.jpg",
        "media_type": "movie",
        "release_date": "1968-10-01",
        "vote_average": 7.5,
        "runtime": 96,
        "youtube_id": "NSfixing9zWk",  # Full movie on YouTube
        "is_public_domain": True,
        "genre_ids": [27, 53]
    },
    {
        "id": 9000002,
        "title": "Charade",
        "overview": "A young widow is helped by a charming playboy as she tries to solve a murder mystery. Starring Cary Grant and Audrey Hepburn.",
        "poster_path": "/kkU5mr85wOr7d2BGDOcN2YpqvD0.jpg",
        "backdrop_path": "/5Z1OhCLdTyfbMWsJBT9WJLmXS6U.jpg",
        "media_type": "movie",
        "release_date": "1963-12-05",
        "vote_average": 7.9,
        "runtime": 113,
        "youtube_id": "c_O-a5J7av4",
        "is_public_domain": True,
        "genre_ids": [9648, 35, 10749]
    },
    {
        "id": 9000003,
        "title": "Plan 9 from Outer Space",
        "overview": "Evil aliens attack Earth and plan to resurrect the dead. Often called 'the worst movie ever made' but a cult classic.",
        "poster_path": "/9ei4HxR62VPTc8FVaFYqCOxQhyY.jpg",
        "backdrop_path": "/nVKmEqJGTjhJYLTdNOFjHMhC5Vr.jpg",
        "media_type": "movie",
        "release_date": "1959-07-22",
        "vote_average": 4.0,
        "runtime": 79,
        "youtube_id": "9eF74CfnbRg",
        "is_public_domain": True,
        "genre_ids": [27, 878]
    },
    {
        "id": 9000004,
        "title": "The Little Shop of Horrors",
        "overview": "A clumsy florist discovers a carnivorous plant that feeds on human blood. Dark comedy classic.",
        "poster_path": "/rGPDZARb5ovhvlqHX5PWLIWLCrF.jpg",
        "backdrop_path": "/oWfQQPtlPrXVjNNQlN5u1sVqFvN.jpg",
        "media_type": "movie",
        "release_date": "1960-09-01",
        "vote_average": 6.2,
        "runtime": 72,
        "youtube_id": "NfxUmB1_vxE",
        "is_public_domain": True,
        "genre_ids": [35, 27]
    },
    {
        "id": 9000005,
        "title": "Nosferatu",
        "overview": "Vampire Count Orlok expresses interest in a new residence and real estate agent's wife. Silent horror masterpiece from 1922.",
        "poster_path": "/rGJXxKvfght7ThdNdTmkMVqnMIl.jpg",
        "backdrop_path": "/vVtf8seDCqn6JiIgT5KnhQq5QHN.jpg",
        "media_type": "movie",
        "release_date": "1922-03-04",
        "vote_average": 7.7,
        "runtime": 94,
        "youtube_id": "FC6jFoYm3xs",
        "is_public_domain": True,
        "genre_ids": [27, 14]
    },
    {
        "id": 9000006,
        "title": "Metropolis",
        "overview": "In a futuristic city sharply divided between the working class and the city planners, the son of the city's mastermind falls in love with a working-class prophet. Silent sci-fi masterpiece from 1927.",
        "poster_path": "/pWwlMu6iNgf3L0tiMAy7PVeR1bz.jpg",
        "backdrop_path": "/uhRYVvxVLvWLhCWVVfViHZqKRHN.jpg",
        "media_type": "movie",
        "release_date": "1927-03-13",
        "vote_average": 8.1,
        "runtime": 153,
        "youtube_id": "Q0NzALRJifI",
        "is_public_domain": True,
        "genre_ids": [878, 18]
    }
]


def get_public_domain_movies():
    """Returns list of public domain movies"""
    return PUBLIC_DOMAIN_CONTENT


def get_public_domain_by_id(content_id: int):
    """Get specific public domain content by ID"""
    for content in PUBLIC_DOMAIN_CONTENT:
        if content["id"] == content_id:
            return content
    return None

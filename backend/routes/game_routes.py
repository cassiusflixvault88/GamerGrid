"""
Gaming routes for GamerGrid - Using IGDB API (Twitch)

Normalizes IGDB responses into TMDB-shaped payloads so the existing
frontend components (ContentCard, HeroBanner, ContentModal) keep working
with minimal changes.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import asyncio
import logging
import time
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

router = APIRouter(prefix="/games", tags=["games"])
logger = logging.getLogger(__name__)

IGDB_CLIENT_ID = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")

# ---------- Token cache ----------
_token_cache: Dict[str, Any] = {"token": None, "expires": 0.0}
_token_lock = asyncio.Lock()


async def get_igdb_token() -> str:
    async with _token_lock:
        if _token_cache["token"] and time.time() < _token_cache["expires"]:
            return _token_cache["token"]
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://id.twitch.tv/oauth2/token",
                params={
                    "client_id": IGDB_CLIENT_ID,
                    "client_secret": IGDB_CLIENT_SECRET,
                    "grant_type": "client_credentials",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            _token_cache["token"] = data["access_token"]
            _token_cache["expires"] = time.time() + data.get("expires_in", 3600) - 120
            return _token_cache["token"]


async def igdb_query(endpoint: str, query: str) -> list:
    token = await get_igdb_token()
    headers = {
        "Client-ID": IGDB_CLIENT_ID,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    url = f"https://api.igdb.com/v4/{endpoint}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, content=query)
        if resp.status_code >= 400:
            logger.error(f"IGDB error {resp.status_code}: {resp.text}")
            resp.raise_for_status()
        return resp.json()


# ---------- In-memory response cache ----------
_response_cache: Dict[str, Any] = {}
_CACHE_TTL = 60 * 30  # 30 min


async def cached_query(key: str, endpoint: str, query: str, ttl: int = _CACHE_TTL):
    now = time.time()
    entry = _response_cache.get(key)
    if entry and now < entry["exp"]:
        return entry["data"]
    data = await igdb_query(endpoint, query)
    _response_cache[key] = {"data": data, "exp": now + ttl}
    return data


# ---------- Normalization helpers ----------
IGDB_IMG = "https://images.igdb.com/igdb/image/upload"


def _img(url: Optional[str], size: str) -> Optional[str]:
    """Convert IGDB image url to full https URL with requested size."""
    if not url:
        return None
    # url arrives like '//images.igdb.com/igdb/image/upload/t_thumb/abc.jpg'
    u = url
    if u.startswith("//"):
        u = "https:" + u
    # Replace size token
    for tok in ("t_thumb", "t_cover_small", "t_cover_big", "t_720p", "t_1080p", "t_screenshot_med", "t_screenshot_big", "t_screenshot_huge"):
        if f"/{tok}/" in u:
            u = u.replace(f"/{tok}/", f"/{size}/")
            return u
    return u


def _cover_url(game: dict, big: bool = True) -> Optional[str]:
    cover = game.get("cover")
    if isinstance(cover, dict):
        return _img(cover.get("url"), "t_cover_big" if big else "t_cover_small")
    return None


def _backdrop_url(game: dict) -> Optional[str]:
    shots = game.get("screenshots") or []
    if shots and isinstance(shots[0], dict):
        return _img(shots[0].get("url"), "t_1080p")
    # fall back to artwork, then cover in larger size
    arts = game.get("artworks") or []
    if arts and isinstance(arts[0], dict):
        return _img(arts[0].get("url"), "t_1080p")
    return _img((game.get("cover") or {}).get("url"), "t_1080p")


def _release_date(ts: Optional[int]) -> Optional[str]:
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return None


def _platforms(game: dict) -> List[str]:
    plats = game.get("platforms") or []
    out = []
    for p in plats:
        if isinstance(p, dict) and p.get("name"):
            out.append(p["name"])
    return out


def _genres(game: dict) -> List[str]:
    gs = game.get("genres") or []
    return [g.get("name") for g in gs if isinstance(g, dict) and g.get("name")]


def _youtube_id(game: dict) -> Optional[str]:
    videos = game.get("videos") or []
    if videos and isinstance(videos[0], dict):
        return videos[0].get("video_id")
    return None


def _screenshot_urls(game: dict) -> List[str]:
    shots = game.get("screenshots") or []
    return [_img(s.get("url"), "t_screenshot_huge") for s in shots if isinstance(s, dict) and s.get("url")]


def _video_ids(game: dict) -> List[Dict[str, Any]]:
    videos = game.get("videos") or []
    return [
        {"id": v.get("id"), "video_id": v.get("video_id"), "name": v.get("name", "Video")}
        for v in videos
        if isinstance(v, dict) and v.get("video_id")
    ]


def normalize_game(game: dict) -> dict:
    """Transform an IGDB game into a TMDB-shaped object consumed by the UI."""
    rating_10 = None
    if game.get("rating") is not None:
        rating_10 = round(game["rating"] / 10.0, 1)
    elif game.get("total_rating") is not None:
        rating_10 = round(game["total_rating"] / 10.0, 1)

    return {
        "id": game.get("id"),
        "title": game.get("name"),
        "name": game.get("name"),
        "overview": game.get("summary") or "",
        "poster_path": _cover_url(game, big=True),
        "backdrop_path": _backdrop_url(game),
        "vote_average": rating_10 or 0,
        "vote_count": game.get("total_rating_count") or 0,
        "release_date": _release_date(game.get("first_release_date")),
        "first_air_date": _release_date(game.get("first_release_date")),
        "genres": _genres(game),
        "platforms": _platforms(game),
        "screenshots": _screenshot_urls(game),
        "videos": _video_ids(game),
        "youtube_video_id": _youtube_id(game),
        "metacritic_aggregate": game.get("aggregated_rating"),  # Meta/IGN from IGDB aggregated
        "aggregated_rating_count": game.get("aggregated_rating_count") or 0,
        "media_type": "game",
        "is_game": True,
    }


# Fields used across most list endpoints
LIST_FIELDS = (
    "id,name,summary,rating,total_rating,total_rating_count,aggregated_rating,"
    "aggregated_rating_count,first_release_date,genres.name,platforms.name,"
    "cover.url,screenshots.url,videos.video_id,videos.name"
)


# ---------- Platform presets ----------
PLATFORM_MAP = {
    # Key -> (label, IGDB platform ids)
    "playstation": ("PlayStation", [167, 48]),         # PS5, PS4
    "xbox": ("Xbox", [169, 49]),                       # Series X|S, Xbox One
    "pc": ("PC / Steam", [6]),                         # PC (Windows)
    "switch": ("Nintendo Switch", [130]),              # Switch
    "nintendo": ("Nintendo Switch", [130]),
}


# ---------- Endpoints ----------
@router.get("/trending")
async def get_trending_games(limit: int = Query(30, ge=1, le=100)):
    """Currently trending games (by total rating count on highly rated titles)."""
    q = (
        f"fields {LIST_FIELDS};"
        " where rating >= 75 & total_rating_count > 50;"
        " sort total_rating_count desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"trending:{limit}", "games", q)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"trending error: {e}")
        raise HTTPException(500, f"Failed to fetch trending: {e}")


@router.get("/top-rated")
async def get_top_rated(limit: int = Query(30, ge=1, le=100)):
    q = (
        f"fields {LIST_FIELDS};"
        " where rating >= 85 & total_rating_count > 100;"
        " sort rating desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"toprated:{limit}", "games", q)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"top-rated error: {e}")
        raise HTTPException(500, f"Failed to fetch top-rated: {e}")


@router.get("/upcoming")
async def get_upcoming_releases(
    days_ahead: int = Query(180, ge=1, le=365),
    limit: int = Query(30, ge=1, le=100),
):
    now = int(time.time())
    future = now + (days_ahead * 86400)
    q = (
        f"fields {LIST_FIELDS};"
        f" where first_release_date > {now} & first_release_date < {future} & hypes > 1;"
        " sort first_release_date asc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"upcoming:{days_ahead}:{limit}", "games", q)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"upcoming error: {e}")
        raise HTTPException(500, f"Failed to fetch upcoming: {e}")


@router.get("/new-releases")
async def get_new_releases(days_back: int = Query(90, ge=1, le=365), limit: int = Query(30, ge=1, le=100)):
    """Recently released games."""
    now = int(time.time())
    past = now - (days_back * 86400)
    q = (
        f"fields {LIST_FIELDS};"
        f" where first_release_date > {past} & first_release_date < {now} & rating > 60;"
        " sort first_release_date desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"new:{days_back}:{limit}", "games", q)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"new-releases error: {e}")
        raise HTTPException(500, f"Failed to fetch new releases: {e}")


@router.get("/platform/{platform_name}")
async def get_games_by_platform(
    platform_name: str,
    limit: int = Query(40, ge=1, le=100),
    sort: str = Query("rating", pattern="^(rating|release|popular)$"),
):
    preset = PLATFORM_MAP.get(platform_name.lower())
    if not preset:
        raise HTTPException(400, f"Unknown platform: {platform_name}")
    _, ids = preset
    ids_str = ",".join(str(i) for i in ids)

    sort_clause = {
        "rating": "sort rating desc;",
        "release": "sort first_release_date desc;",
        "popular": "sort total_rating_count desc;",
    }[sort]

    q = (
        f"fields {LIST_FIELDS};"
        f" where platforms = ({ids_str}) & rating > 70 & total_rating_count > 20;"
        f" {sort_clause}"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"platform:{platform_name}:{sort}:{limit}", "games", q)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"platform error: {e}")
        raise HTTPException(500, f"Failed to fetch {platform_name}: {e}")


@router.get("/search")
async def search_games(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=50)):
    safe = q.replace('"', "'")
    query = (
        f'search "{safe}";'
        f" fields {LIST_FIELDS};"
        f" limit {limit};"
    )
    try:
        games = await igdb_query("games", query)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"search error: {e}")
        raise HTTPException(500, f"Search failed: {e}")


# Detail fields (richer)
DETAIL_FIELDS = (
    "id,name,summary,storyline,rating,total_rating,total_rating_count,"
    "aggregated_rating,aggregated_rating_count,first_release_date,genres.name,"
    "platforms.name,platforms.abbreviation,involved_companies.company.name,"
    "involved_companies.developer,involved_companies.publisher,cover.url,"
    "screenshots.url,artworks.url,videos.video_id,videos.name,similar_games.name,"
    "similar_games.cover.url,similar_games.rating,similar_games.id,"
    "game_modes.name,themes.name,websites.url,websites.category,age_ratings.rating"
)


def _companies(game: dict):
    companies = game.get("involved_companies") or []
    devs = []
    pubs = []
    for c in companies:
        if not isinstance(c, dict):
            continue
        comp = (c.get("company") or {}).get("name")
        if not comp:
            continue
        if c.get("developer"):
            devs.append(comp)
        if c.get("publisher"):
            pubs.append(comp)
    return devs, pubs


@router.get("/details/{game_id}")
async def get_game_details(game_id: int):
    q = f"fields {DETAIL_FIELDS}; where id = {game_id}; limit 1;"
    try:
        arr = await igdb_query("games", q)
        if not arr:
            raise HTTPException(404, "Game not found")
        game = arr[0]
        normalized = normalize_game(game)
        devs, pubs = _companies(game)
        normalized.update(
            {
                "storyline": game.get("storyline") or "",
                "developers": devs,
                "publishers": pubs,
                "game_modes": [m.get("name") for m in (game.get("game_modes") or []) if isinstance(m, dict)],
                "themes": [t.get("name") for t in (game.get("themes") or []) if isinstance(t, dict)],
                "similar": [
                    {
                        "id": s.get("id"),
                        "title": s.get("name"),
                        "name": s.get("name"),
                        "poster_path": _img((s.get("cover") or {}).get("url"), "t_cover_big"),
                        "vote_average": round((s.get("rating") or 0) / 10.0, 1) if s.get("rating") else 0,
                        "media_type": "game",
                    }
                    for s in (game.get("similar_games") or [])
                    if isinstance(s, dict) and s.get("cover")
                ][:12],
                "websites": [w.get("url") for w in (game.get("websites") or []) if isinstance(w, dict) and w.get("url")],
            }
        )
        return normalized
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"details error: {e}")
        raise HTTPException(500, f"Failed to fetch details: {e}")


@router.get("/videos/{game_id}")
async def get_game_videos(game_id: int):
    """Return YouTube videos for a game in TMDB-compatible shape."""
    q = f"fields videos.video_id,videos.name; where id = {game_id}; limit 1;"
    try:
        arr = await igdb_query("games", q)
        if not arr:
            return []
        vids = arr[0].get("videos") or []
        return [
            {
                "id": v.get("id"),
                "key": v.get("video_id"),
                "name": v.get("name", "Gameplay Trailer"),
                "site": "YouTube",
                "type": "Trailer",
            }
            for v in vids
            if isinstance(v, dict) and v.get("video_id")
        ]
    except Exception as e:
        logger.error(f"videos error: {e}")
        return []


@router.get("/platforms")
async def list_platforms():
    """Return the fixed platform list we support on the UI."""
    return [
        {"key": k, "label": v[0], "ids": v[1]}
        for k, v in PLATFORM_MAP.items()
        if k != "nintendo"
    ]

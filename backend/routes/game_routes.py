"""
Gaming routes for GamerGrid - Using IGDB API (Twitch)

Normalizes IGDB responses into TMDB-shaped payloads so existing frontend
components work with minimal changes. Adds:
  - MongoDB-backed response cache (sub-second loads after first hit)
  - genre + year filters on list endpoints
  - Store/buy links on game details (Steam, GOG, Epic, Itch, PSN, Xbox, Nintendo, Amazon)
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from urllib.parse import quote_plus
import asyncio
import logging
import time
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

router = APIRouter(prefix="/games", tags=["games"])
logger = logging.getLogger(__name__)

IGDB_CLIENT_ID = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")

# ---------- DB ----------
_mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo_client[os.environ["DB_NAME"]]
_cache_col = _db["games_cache"]
_genres_col = _db["games_genres"]


# ---------- Token cache (process-local; tokens are cheap to regenerate) ----------
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


# ---------- MongoDB-backed cache ----------
async def cached_query(key: str, endpoint: str, query: str, ttl_seconds: int = 60 * 60) -> list:
    """Return cached data if fresh, else hit IGDB and cache the result."""
    now = datetime.now(timezone.utc)
    doc = await _cache_col.find_one({"_id": key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp > now and doc.get("data") is not None:
                return doc["data"]
        except Exception:
            pass

    data = await igdb_query(endpoint, query)
    expires = (now + timedelta(seconds=ttl_seconds)).isoformat()
    await _cache_col.update_one(
        {"_id": key},
        {"$set": {"data": data, "expires_at": expires, "updated_at": now.isoformat()}},
        upsert=True,
    )
    return data


# ---------- Normalization helpers ----------
IGDB_IMG = "https://images.igdb.com/igdb/image/upload"


def _img(url: Optional[str], size: str) -> Optional[str]:
    if not url:
        return None
    u = url
    if u.startswith("//"):
        u = "https:" + u
    for tok in (
        "t_thumb", "t_cover_small", "t_cover_big", "t_720p", "t_1080p",
        "t_screenshot_med", "t_screenshot_big", "t_screenshot_huge",
    ):
        if f"/{tok}/" in u:
            return u.replace(f"/{tok}/", f"/{size}/")
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
    return [p["name"] for p in (game.get("platforms") or []) if isinstance(p, dict) and p.get("name")]


def _genres(game: dict) -> List[str]:
    return [g["name"] for g in (game.get("genres") or []) if isinstance(g, dict) and g.get("name")]


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
        "metacritic_aggregate": game.get("aggregated_rating"),
        "aggregated_rating_count": game.get("aggregated_rating_count") or 0,
        "media_type": "game",
        "is_game": True,
    }


# Standard list fields
LIST_FIELDS = (
    "id,name,summary,rating,total_rating,total_rating_count,aggregated_rating,"
    "aggregated_rating_count,first_release_date,genres.name,platforms.name,"
    "cover.url,screenshots.url,videos.video_id,videos.name"
)


# ---------- Platform & filter presets ----------
PLATFORM_MAP = {
    "playstation": ("PlayStation", [167, 48]),  # PS5, PS4
    "xbox": ("Xbox", [169, 49]),                # Series X|S, Xbox One
    "pc": ("PC / Steam", [6]),                  # PC (Windows)
    "switch": ("Nintendo Switch", [130]),
    "nintendo": ("Nintendo Switch", [130]),
}


def _year_window(year: Optional[int]) -> Optional[str]:
    if not year:
        return None
    start = int(datetime(year, 1, 1, tzinfo=timezone.utc).timestamp())
    end = int(datetime(year + 1, 1, 1, tzinfo=timezone.utc).timestamp())
    return f"first_release_date >= {start} & first_release_date < {end}"


def _build_where(parts: List[str]) -> str:
    parts = [p for p in parts if p]
    return f"where {' & '.join(parts)};" if parts else ""


# ---------- Endpoints ----------
@router.get("/genres")
async def list_genres():
    """Return IGDB genre list (cached)."""
    cached = await _genres_col.find_one({"_id": "all"}, {"_id": 0, "data": 1, "expires_at": 1})
    if cached:
        try:
            exp = cached.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp > datetime.now(timezone.utc):
                return cached["data"]
        except Exception:
            pass
    rows = await igdb_query("genres", "fields id,name; limit 50; sort name asc;")
    data = [{"id": r["id"], "name": r["name"]} for r in rows if r.get("name")]
    await _genres_col.update_one(
        {"_id": "all"},
        {"$set": {
            "data": data,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        }},
        upsert=True,
    )
    return data


@router.get("/trending")
async def get_trending_games(
    limit: int = Query(30, ge=1, le=100),
    genre: Optional[int] = None,
    year: Optional[int] = Query(None, ge=1970, le=2100),
):
    where_parts = ["rating >= 75", "total_rating_count > 50"]
    if genre:
        where_parts.append(f"genres = ({genre})")
    yw = _year_window(year)
    if yw:
        where_parts.append(yw)
    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        " sort total_rating_count desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"trending:{limit}:{genre}:{year}", "games", q, ttl_seconds=60 * 60)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"trending error: {e}")
        raise HTTPException(500, f"Failed to fetch trending: {e}")


@router.get("/top-rated")
async def get_top_rated(
    limit: int = Query(30, ge=1, le=100),
    genre: Optional[int] = None,
    year: Optional[int] = Query(None, ge=1970, le=2100),
):
    where_parts = ["rating >= 85", "total_rating_count > 100"]
    if genre:
        where_parts.append(f"genres = ({genre})")
    yw = _year_window(year)
    if yw:
        where_parts.append(yw)
    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        " sort rating desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"toprated:{limit}:{genre}:{year}", "games", q, ttl_seconds=60 * 60 * 6)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"top-rated error: {e}")
        raise HTTPException(500, f"Failed to fetch top-rated: {e}")


@router.get("/upcoming")
async def get_upcoming_releases(
    days_ahead: int = Query(180, ge=1, le=365),
    limit: int = Query(30, ge=1, le=100),
    genre: Optional[int] = None,
):
    now = int(time.time())
    future = now + (days_ahead * 86400)
    where_parts = [f"first_release_date > {now}", f"first_release_date < {future}", "hypes > 1"]
    if genre:
        where_parts.append(f"genres = ({genre})")
    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        " sort first_release_date asc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"upcoming:{days_ahead}:{limit}:{genre}", "games", q, ttl_seconds=60 * 30)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"upcoming error: {e}")
        raise HTTPException(500, f"Failed to fetch upcoming: {e}")


@router.get("/new-releases")
async def get_new_releases(
    days_back: int = Query(90, ge=1, le=365),
    limit: int = Query(30, ge=1, le=100),
    genre: Optional[int] = None,
):
    now = int(time.time())
    past = now - (days_back * 86400)
    where_parts = [f"first_release_date > {past}", f"first_release_date < {now}", "rating > 60"]
    if genre:
        where_parts.append(f"genres = ({genre})")
    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        " sort first_release_date desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"new:{days_back}:{limit}:{genre}", "games", q, ttl_seconds=60 * 30)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"new-releases error: {e}")
        raise HTTPException(500, f"Failed to fetch new releases: {e}")


@router.get("/platform/{platform_name}")
async def get_games_by_platform(
    platform_name: str,
    limit: int = Query(40, ge=1, le=100),
    sort: str = Query("rating", pattern="^(rating|release|popular)$"),
    genre: Optional[int] = None,
    year: Optional[int] = Query(None, ge=1970, le=2100),
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

    where_parts = [
        f"platforms = ({ids_str})",
        "rating > 70",
        "total_rating_count > 20",
    ]
    if genre:
        where_parts.append(f"genres = ({genre})")
    yw = _year_window(year)
    if yw:
        where_parts.append(yw)

    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        f" {sort_clause}"
        f" limit {limit};"
    )
    try:
        games = await cached_query(
            f"platform:{platform_name}:{sort}:{limit}:{genre}:{year}",
            "games", q, ttl_seconds=60 * 60 * 2,
        )
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
        # Search results are NOT cached (queries vary too much) but underlying token is cached
        games = await igdb_query("games", query)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"search error: {e}")
        raise HTTPException(500, f"Search failed: {e}")


# ---------- Details w/ buy links ----------
DETAIL_FIELDS = (
    "id,name,summary,storyline,rating,total_rating,total_rating_count,"
    "aggregated_rating,aggregated_rating_count,first_release_date,genres.name,"
    "platforms.name,platforms.abbreviation,involved_companies.company.name,"
    "involved_companies.developer,involved_companies.publisher,cover.url,"
    "screenshots.url,artworks.url,videos.video_id,videos.name,similar_games.name,"
    "similar_games.cover.url,similar_games.rating,similar_games.id,"
    "game_modes.name,themes.name,websites.url,websites.type"
)

# IGDB website types (v4 uses `type`, not `category`)
WEBSITE_CATEGORIES = {
    1: "official",
    13: "steam",
    15: "itch",
    16: "epicgames",
    17: "gog",
    22: "xbox",         # direct Xbox store
    23: "psn",          # direct PlayStation store
    24: "nintendo",     # direct Nintendo store
}

AMAZON_AFFILIATE_TAG = os.getenv("AMAZON_AFFILIATE_TAG", "")  # optional


def _companies(game: dict):
    companies = game.get("involved_companies") or []
    devs, pubs = [], []
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


def _build_buy_links(game: dict, normalized: dict) -> List[Dict[str, str]]:
    """Return a list of {label, url, kind} where to play / buy a game."""
    links: List[Dict[str, str]] = []
    seen = set()
    title = normalized.get("title") or ""
    plats = [p.lower() for p in normalized.get("platforms") or []]

    # Direct store URLs from IGDB websites (type field)
    for w in (game.get("websites") or []):
        if not isinstance(w, dict):
            continue
        cat = w.get("type")
        url = w.get("url")
        if not url or cat not in WEBSITE_CATEGORIES:
            continue
        kind = WEBSITE_CATEGORIES[cat]
        if kind in seen:
            continue
        seen.add(kind)
        labels = {
            "official": "Official Site",
            "steam": "Steam",
            "epicgames": "Epic Games",
            "gog": "GOG",
            "itch": "itch.io",
            "psn": "PlayStation Store",
            "xbox": "Xbox Store",
            "nintendo": "Nintendo eShop",
        }
        links.append({"label": labels[kind], "url": url, "kind": kind})

    # Fallback: search URLs only when IGDB doesn't have a direct store URL
    name_q = quote_plus(title)
    if "psn" not in seen and any("playstation" in p for p in plats):
        links.append({"label": "PlayStation Store", "url": f"https://store.playstation.com/en-us/search/{name_q}", "kind": "psn"})
    if "xbox" not in seen and any("xbox" in p for p in plats):
        links.append({"label": "Xbox Store", "url": f"https://www.xbox.com/en-US/games/store/search?q={name_q}", "kind": "xbox"})
    if "nintendo" not in seen and any("nintendo" in p or "switch" in p for p in plats):
        links.append({"label": "Nintendo eShop", "url": f"https://www.nintendo.com/us/search/?q={name_q}&p=1&cat=gme", "kind": "nintendo"})

    # Amazon (always — for physical copies / merch)
    amz = f"https://www.amazon.com/s?k={name_q}+video+game"
    if AMAZON_AFFILIATE_TAG:
        amz += f"&tag={AMAZON_AFFILIATE_TAG}"
    links.append({"label": "Amazon", "url": amz, "kind": "amazon"})

    return links


@router.get("/details/{game_id}")
async def get_game_details(game_id: int):
    cache_key = f"details:{game_id}"
    # Check cache first (24h TTL — details rarely change)
    doc = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("data") and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp > datetime.now(timezone.utc):
                return doc["data"]
        except Exception:
            pass

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
                "buy_links": _build_buy_links(game, normalized),
            }
        )
        await _cache_col.update_one(
            {"_id": cache_key},
            {"$set": {
                "data": normalized,
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            }},
            upsert=True,
        )
        return normalized
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"details error: {e}")
        raise HTTPException(500, f"Failed to fetch details: {e}")


@router.get("/videos/{game_id}")
async def get_game_videos(game_id: int):
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
    return [
        {"key": k, "label": v[0], "ids": v[1]}
        for k, v in PLATFORM_MAP.items()
        if k != "nintendo"
    ]

"""
Gaming routes for GamerGrid - Using IGDB API (Twitch)

Normalizes IGDB responses into TMDB-shaped payloads so existing frontend
components work with minimal changes. Adds:
  - MongoDB-backed response cache (sub-second loads after first hit)
  - genre + year filters on list endpoints
  - Store/buy links on game details (Steam, GOG, Epic, Itch, PSN, Xbox, Nintendo, Amazon)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
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

from auth import verify_token
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
async def _ensure_ttl_index():
    """Ensure a TTL index on `expires_at` so MongoDB auto-evicts stale entries."""
    try:
        await _cache_col.create_index("expires_at", expireAfterSeconds=0)
        await _genres_col.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Could not create TTL index: {e}")


_ttl_initialized = False


async def _maybe_init_ttl():
    global _ttl_initialized
    if not _ttl_initialized:
        _ttl_initialized = True
        await _ensure_ttl_index()


async def cached_query(key: str, endpoint: str, query: str, ttl_seconds: int = 60 * 60) -> list:
    """Return cached data if fresh, else hit IGDB and cache the result."""
    await _maybe_init_ttl()
    now = datetime.now(timezone.utc)
    doc = await _cache_col.find_one({"_id": key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now and doc.get("data") is not None:
                return doc["data"]
        except Exception:
            pass

    data = await igdb_query(endpoint, query)
    expires_dt = now + timedelta(seconds=ttl_seconds)
    await _cache_col.update_one(
        {"_id": key},
        {"$set": {"data": data, "expires_at": expires_dt, "updated_at": now}},
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

    # Pull primary developer + publisher for card display
    devs, pubs = [], []
    for c in (game.get("involved_companies") or []):
        if not isinstance(c, dict):
            continue
        comp = (c.get("company") or {}).get("name")
        if not comp:
            continue
        if c.get("developer") and comp not in devs:
            devs.append(comp)
        if c.get("publisher") and comp not in pubs:
            pubs.append(comp)

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
        "developers": devs[:3],
        "publishers": pubs[:2],
        "developer": devs[0] if devs else None,
        "publisher": pubs[0] if pubs else None,
        "media_type": "game",
        "is_game": True,
    }


# Standard list fields (now including primary developer/publisher for card display)
LIST_FIELDS = (
    "id,name,summary,rating,total_rating,total_rating_count,aggregated_rating,"
    "aggregated_rating_count,first_release_date,genres.name,platforms.name,"
    "cover.url,screenshots.url,videos.video_id,videos.name,"
    "involved_companies.company.name,involved_companies.developer,involved_companies.publisher"
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
    await _maybe_init_ttl()
    cached = await _genres_col.find_one({"_id": "all"}, {"_id": 0, "data": 1, "expires_at": 1})
    if cached:
        try:
            exp = cached.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
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
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        }},
        upsert=True,
    )
    return data


@router.get("/trending")
async def get_trending_games(
    limit: int = Query(30, ge=1, le=500),
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


async def _fetch_blended_popularity(limit: int) -> list:
    """Fetch and blend IGDB popularity from 4 sources to surface Fortnite, Crimson Desert,
    Roblox, console-exclusive titles etc. Sources:
      - type 5: Steam 24hr peak players
      - type 3: IGDB Playing (cross-platform)
      - type 34: 24hr Twitch hours watched
      - type 9: Global Top Sellers
    Returns list of {game_id, score} sorted by blended score desc.
    """
    types = [(5, 1.0), (3, 1.5), (34, 0.7), (9, 0.9)]
    score_by_game: Dict[int, float] = {}
    for ptype, weight in types:
        try:
            rows = await igdb_query(
                "popularity_primitives",
                f"fields game_id,value; where popularity_type = {ptype}; sort value desc; limit 50;",
            )
            if not rows:
                continue
            # Rank-based scoring (rank 1 = top score) since absolute values aren't comparable across types
            for idx, r in enumerate(rows):
                gid = r.get("game_id")
                if not gid:
                    continue
                rank_score = (50 - idx) * weight
                score_by_game[gid] = score_by_game.get(gid, 0) + rank_score
        except Exception as e:
            logger.warning(f"popularity type {ptype} failed: {e}")
    return sorted(
        [{"game_id": gid, "score": score} for gid, score in score_by_game.items()],
        key=lambda x: x["score"],
        reverse=True,
    )[:limit]


@router.get("/most-popular")
async def get_most_popular(limit: int = Query(30, ge=1, le=500)):
    """Most popular RIGHT NOW — blends Steam + IGDB Playing + Twitch + Top Sellers.

    This surfaces real-world hits across all platforms: Fortnite, Roblox,
    Crimson Desert, Counter-Strike 2, Elden Ring Nightreign, Helldivers 2, etc.
    """
    cache_key = f"mostpopular_v3:{limit}"
    await _maybe_init_ttl()
    doc = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("data") and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                return doc["data"]
        except Exception:
            pass

    blended = await _fetch_blended_popularity(limit)
    if not blended:
        return {"results": [], "total": 0}

    game_ids = [str(b["game_id"]) for b in blended]
    ids_str = ",".join(game_ids)
    games = await igdb_query(
        "games",
        f"fields {LIST_FIELDS}; where id = ({ids_str}); limit {len(game_ids)};",
    )
    by_id = {g["id"]: g for g in games}
    ordered = [by_id[int(gid)] for gid in game_ids if int(gid) in by_id]

    payload = {"results": [normalize_game(g) for g in ordered], "total": len(ordered)}
    await _cache_col.update_one(
        {"_id": cache_key},
        {"$set": {
            "data": payload,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
        }},
        upsert=True,
    )
    return payload


@router.get("/top10")
async def get_top10():
    """Top 10 games right now — randomized pick from a larger blended-popularity pool
    so the carousel feels fresh on each visit instead of showing the same fixed list.

    Each item also includes `delta` — change in rank vs yesterday's snapshot.
    """
    cache_key = "top10_v4"
    await _maybe_init_ttl()
    doc = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("data") and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                return doc["data"]
        except Exception:
            pass

    # Fetch a LARGER pool (top 40) so we can rotate which 10 are featured.
    blended = await _fetch_blended_popularity(40)
    if not blended:
        return {"results": [], "total": 0}

    # Always keep the absolute #1-3 fixed (they ARE the most popular right now),
    # then randomly pick 7 from the next 37 — keeps the chart "real" but fresh.
    import random
    top_fixed = blended[:3]
    pool = blended[3:]
    random.shuffle(pool)
    selected = top_fixed + pool[:7]

    game_ids = [str(b["game_id"]) for b in selected]
    ids_str = ",".join(game_ids)
    games = await igdb_query(
        "games",
        f"fields {LIST_FIELDS}; where id = ({ids_str}); limit 10;",
    )
    by_id = {g["id"]: g for g in games}
    ordered = [by_id[int(gid)] for gid in game_ids if int(gid) in by_id]
    normalized = [normalize_game(g) for g in ordered]

    # Daily snapshot for delta computation
    today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snap_id = f"top10_snapshot:{today_key}"
    today_snap = await _cache_col.find_one({"_id": snap_id}, {"_id": 0, "data": 1})
    if not today_snap:
        await _cache_col.update_one(
            {"_id": snap_id},
            {"$set": {
                "data": {str(n["id"]): i + 1 for i, n in enumerate(normalized)},
                "expires_at": datetime.now(timezone.utc) + timedelta(days=8),
            }},
            upsert=True,
        )

    yesterday_key = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    y_snap = await _cache_col.find_one({"_id": f"top10_snapshot:{yesterday_key}"}, {"_id": 0, "data": 1})
    yesterday_ranks = (y_snap or {}).get("data") or {}

    for i, n in enumerate(normalized):
        current = i + 1
        prev_rank = yesterday_ranks.get(str(n["id"])) or yesterday_ranks.get(n["id"])
        if prev_rank:
            n["delta"] = prev_rank - current
            n["prev_rank"] = prev_rank
        else:
            n["delta"] = None
            n["prev_rank"] = None

    payload = {"results": normalized, "total": len(normalized)}
    # Shorter TTL (5 min) so the rotation actually feels alive
    await _cache_col.update_one(
        {"_id": cache_key},
        {"$set": {"data": payload, "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5)}},
        upsert=True,
    )
    return payload


@router.get("/goty")
async def get_game_of_the_year(year: Optional[int] = Query(None, ge=1990, le=2100), limit: int = Query(20, ge=1, le=50)):
    """Game of the Year shortlist — highest rated games of the given year (defaults to last full year)."""
    if not year:
        # Default to last year — gives a fuller list since most GOTY-tier games
        # are released across the full year (and through Q1 of the next).
        now = datetime.now(timezone.utc)
        year = now.year - 1
    yw = _year_window(year)
    where_parts = [yw, "rating >= 80", "total_rating_count > 30"]
    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        " sort rating desc;"
        f" limit {limit};"
    )
    try:
        games = await cached_query(f"goty:{year}:{limit}", "games", q, ttl_seconds=60 * 60 * 24)
        return {"year": year, "results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"goty error: {e}")
        raise HTTPException(500, f"Failed to fetch GOTY: {e}")


@router.get("/top-rated")
async def get_top_rated(
    limit: int = Query(30, ge=1, le=500),
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
    limit: int = Query(30, ge=1, le=500),
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
    limit: int = Query(30, ge=1, le=500),
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
    limit: int = Query(40, ge=1, le=500),
    offset: int = Query(0, ge=0, le=9500),
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

    # Quality threshold scales by request depth. Surface paginated tail (offset>0)
    # and large requests with a lower bar so newer/niche titles like
    # "Assassin's Creed Shadows" (which can have low total_rating_count at launch)
    # also appear in the catalog.
    deep = limit >= 200 or offset > 0
    where_parts = [
        f"platforms = ({ids_str})",
        "rating > 50" if deep else "rating > 70",
        "total_rating_count > 1" if deep else "total_rating_count > 20",
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
        f" offset {offset};"
    )
    try:
        games = await cached_query(
            f"platform:{platform_name}:{sort}:{limit}:{offset}:{genre}:{year}",
            "games", q, ttl_seconds=60 * 60 * 2,
        )
        return {"results": [normalize_game(g) for g in games], "total": len(games), "offset": offset}
    except Exception as e:
        logger.error(f"platform error: {e}")
        raise HTTPException(500, f"Failed to fetch {platform_name}: {e}")


@router.get("/for-you")
async def get_for_you(current_user: dict = Depends(verify_token)):
    """Personalized 'Just For You' rail.

    Strategy: pull user's watchlist → fetch those games' genres in ONE IGDB
    batch query → tally top 3 genres → query IGDB for highly-rated games in
    those genres that the user HASN'T watchlisted yet. Cached 15 min per user.
    Falls back to 'most popular' if the user has an empty watchlist.
    """
    user_id = current_user["user_id"]
    cache_key = f"foryou:{user_id}"
    await _maybe_init_ttl()
    cached = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if cached and cached.get("data") and cached.get("expires_at"):
        try:
            exp = cached["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                return cached["data"]
        except Exception:
            pass

    # Fetch user doc for watchlist
    user = await _db.users.find_one(
        {"id": user_id},
        {"_id": 0, "watchlist": 1},
    )
    watchlist = (user or {}).get("watchlist") or []
    wl_ids = [int(w["content_id"]) for w in watchlist if w.get("content_id")]

    from collections import Counter
    top_genres: List[int] = []

    if wl_ids:
        # Batch-fetch genres for all watchlist items in a single IGDB call.
        ids_str = ",".join(str(i) for i in wl_ids[:100])
        try:
            gq = f"fields genres; where id = ({ids_str}); limit {min(len(wl_ids), 100)};"
            gres = await igdb_query("games", gq)
            counter: Counter = Counter()
            for g in gres:
                for gid in (g.get("genres") or []):
                    counter[gid] += 1
            top_genres = [gid for gid, _ in counter.most_common(3)]
        except Exception as e:
            logger.warning(f"for-you genre fetch failed: {e}")

    # Build query: recommend top-rated games in the user's favorite genres,
    # excluding what they've already watchlisted.
    where_parts = [
        "rating > 75",
        "total_rating_count > 50",
    ]
    if top_genres:
        where_parts.append(f"genres = ({','.join(str(x) for x in top_genres)})")
    else:
        # Empty watchlist → fall back to universally loved games.
        where_parts.append("total_rating_count > 500")
    if wl_ids:
        ids_excl = ",".join(str(i) for i in wl_ids[:200])
        where_parts.append(f"id != ({ids_excl})")

    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        f" sort total_rating_count desc;"
        f" limit 30;"
    )
    try:
        games = await igdb_query("games", q)
        result = {
            "results": [normalize_game(g) for g in games],
            "reason": "Based on your watchlist" if top_genres else "Popular with gamers",
            "top_genres": top_genres,
        }
        await _cache_col.update_one(
            {"_id": cache_key},
            {"$set": {
                "data": result,
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
            }},
            upsert=True,
        )
        return result
    except Exception as e:
        logger.error(f"for-you error: {e}")
        return {"results": [], "reason": "", "top_genres": []}



@router.get("/category")
async def get_by_category(
    genre: Optional[int] = None,
    theme: Optional[int] = None,
    limit: int = Query(40, ge=1, le=500),
    sort: str = Query("popular", pattern="^(rating|release|popular)$"),
    min_rating: int = Query(70, ge=0, le=100),
):
    """Generic genre/theme rail endpoint.

    IGDB genre IDs (common): 4 Fighting, 5 Shooter, 8 Platform, 9 Puzzle,
    10 Racing, 11 RTS, 12 RPG, 13 Simulator, 14 Sport, 15 Strategy,
    16 Turn-based, 24 Tactical, 25 Hack & Slash, 31 Adventure, 32 Indie,
    33 Arcade, 34 Visual Novel, 35 Card & Board, 36 MOBA.

    IGDB theme IDs (common): 1 Action, 17 Fantasy, 18 Sci-Fi, 19 Horror,
    20 Thriller, 21 Survival, 22 Historical, 23 Stealth, 27 Comedy,
    33 Sandbox, 38 Open World, 39 Warfare, 41 4X, 43 Mystery.
    """
    if not genre and not theme:
        raise HTTPException(400, "Provide at least one of: genre, theme")

    where_parts = [f"rating >= {min_rating}", "total_rating_count > 30"]
    if genre:
        where_parts.append(f"genres = ({genre})")
    if theme:
        where_parts.append(f"themes = ({theme})")

    sort_clause = {
        "rating": "sort rating desc;",
        "release": "sort first_release_date desc;",
        "popular": "sort total_rating_count desc;",
    }[sort]

    q = (
        f"fields {LIST_FIELDS};"
        f" {_build_where(where_parts)}"
        f" {sort_clause}"
        f" limit {limit};"
    )
    try:
        cache_key = f"category:{genre}:{theme}:{sort}:{limit}:{min_rating}"
        games = await cached_query(cache_key, "games", q, ttl_seconds=60 * 60 * 6)
        return {"results": [normalize_game(g) for g in games], "total": len(games)}
    except Exception as e:
        logger.error(f"category error: {e}")
        raise HTTPException(500, f"Failed to fetch category: {e}")


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
    "game_modes.name,themes.name,websites.url,websites.type,"
    "expansions.id,expansions.name,expansions.cover.url,expansions.first_release_date,expansions.summary,"
    "dlcs.id,dlcs.name,dlcs.cover.url,dlcs.first_release_date,dlcs.summary,"
    "remakes.id,remakes.name,remakes.cover.url,remakes.first_release_date"
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

    # GameStop (always — physical + digital, biggest dedicated US gaming retailer).
    # If GAMESTOP_AFFILIATE_ID env var is set (e.g. via CJ Affiliate / Impact),
    # we wrap the search URL through the deep-link tracker. Otherwise plain search.
    gs_search = f"https://www.gamestop.com/search/?q={name_q}"
    gs_aff_id = os.getenv("GAMESTOP_AFFILIATE_ID")
    if gs_aff_id:
        # CJ Affiliate deep link wrapper — works once user has joined GameStop's CJ program
        gs_url = f"https://www.anrdoezrs.net/click-{gs_aff_id}?url={quote_plus(gs_search)}"
    else:
        gs_url = gs_search
    links.append({"label": "GameStop", "url": gs_url, "kind": "gamestop"})

    return links


@router.get("/details/{game_id}")
async def get_game_details(game_id: int):
    cache_key = f"details:{game_id}"
    await _maybe_init_ttl()
    # Check cache first (24h TTL — details rarely change)
    doc = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("data") and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
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
                "dlcs": [
                    {
                        "id": d.get("id"),
                        "name": d.get("name"),
                        "summary": d.get("summary"),
                        "release_date": _release_date(d.get("first_release_date")),
                        "poster_path": _img((d.get("cover") or {}).get("url"), "t_cover_big"),
                    }
                    for d in (game.get("dlcs") or [])
                    if isinstance(d, dict)
                ],
                "expansions": [
                    {
                        "id": e.get("id"),
                        "name": e.get("name"),
                        "summary": e.get("summary"),
                        "release_date": _release_date(e.get("first_release_date")),
                        "poster_path": _img((e.get("cover") or {}).get("url"), "t_cover_big"),
                    }
                    for e in (game.get("expansions") or [])
                    if isinstance(e, dict)
                ],
            }
        )
        await _cache_col.update_one(
            {"_id": cache_key},
            {"$set": {
                "data": normalized,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
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


# ---------- CheapShark deals (real-time price tracker) ----------
@router.get("/deals")
async def get_deals(title: str = Query(..., min_length=2), limit: int = Query(8, ge=1, le=20)):
    """Look up live PC deals for a game title via CheapShark (free, no API key)."""
    cache_key = f"deals:{title.lower().strip()}:{limit}"
    await _maybe_init_ttl()
    doc = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if doc and doc.get("data") and doc.get("expires_at"):
        try:
            exp = doc["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                return doc["data"]
        except Exception:
            pass

    # CheapShark store names (lookup once per process)
    global _cheapshark_stores
    try:
        _cheapshark_stores
    except NameError:
        _cheapshark_stores = {}

    async with httpx.AsyncClient(
        timeout=15,
        headers={"User-Agent": "GamerGrid/1.0 (https://gamergrid.app)"},
    ) as client:
        if not _cheapshark_stores:
            try:
                r = await client.get("https://www.cheapshark.com/api/1.0/stores")
                if r.status_code == 200:
                    _cheapshark_stores = {str(s["storeID"]): s["storeName"] for s in r.json()}
            except Exception as e:
                logger.warning(f"cheapshark stores lookup failed: {e}")

        try:
            resp = await client.get(
                "https://www.cheapshark.com/api/1.0/deals",
                params={
                    "title": title,
                    "exact": 0,
                    "pageSize": limit,
                    "sortBy": "DealRating",
                },
            )
            resp.raise_for_status()
            deals_raw = resp.json()
        except Exception as e:
            logger.error(f"cheapshark deals error: {e}")
            return {"results": [], "total": 0}

    results = []
    for d in deals_raw:
        store_id = str(d.get("storeID", ""))
        store_name = _cheapshark_stores.get(store_id, f"Store {store_id}")
        sale = float(d.get("salePrice") or 0)
        normal = float(d.get("normalPrice") or 0)
        savings = float(d.get("savings") or 0)
        results.append({
            "title": d.get("title"),
            "store_id": store_id,
            "store_name": store_name,
            "sale_price": sale,
            "normal_price": normal,
            "savings_pct": round(savings, 1),
            "is_on_sale": savings > 0,
            "deal_rating": float(d.get("dealRating") or 0),
            "deal_url": f"https://www.cheapshark.com/redirect?dealID={d.get('dealID')}",
            "thumb": d.get("thumb"),
        })

    payload = {"results": results, "total": len(results), "title": title}
    await _cache_col.update_one(
        {"_id": cache_key},
        {"$set": {
            "data": payload,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=2),
        }},
        upsert=True,
    )
    return payload

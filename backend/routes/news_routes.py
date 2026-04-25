"""Gaming News aggregator — pulls RSS feeds from major gaming sites.

Free, no API keys, no rate limits. Cached in MongoDB for 15 minutes.
"""
import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import re
import html
import httpx
import feedparser
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/news", tags=["news"])
logger = logging.getLogger(__name__)

_mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo_client[os.environ["DB_NAME"]]
_cache_col = _db["news_cache"]


# Major gaming news RSS feeds — all free, all public.
SOURCES = [
    {"name": "IGN", "url": "https://feeds.feedburner.com/ign/games-all", "color": "#fa3939"},
    {"name": "GameSpot", "url": "https://www.gamespot.com/feeds/news/", "color": "#FFCD00"},
    {"name": "PCGamer", "url": "https://www.pcgamer.com/rss/", "color": "#00ff7f"},
    {"name": "Eurogamer", "url": "https://www.eurogamer.net/feed", "color": "#7938eb"},
    {"name": "Polygon", "url": "https://www.polygon.com/rss/index.xml", "color": "#ff6b00"},
    {"name": "Kotaku", "url": "https://kotaku.com/rss", "color": "#ed3833"},
    {"name": "Rock Paper Shotgun", "url": "https://www.rockpapershotgun.com/feed", "color": "#ff8800"},
    {"name": "VG247", "url": "https://www.vg247.com/feed", "color": "#3399ff"},
]


def _strip_html(text: str) -> str:
    """Remove HTML tags + decode entities + truncate."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:280] + ("…" if len(clean) > 280 else "")


def _extract_image(entry: Any) -> Optional[str]:
    """Try every common RSS image location."""
    # 1. media:content / media:thumbnail
    media = entry.get("media_content") or entry.get("media_thumbnail")
    if media and isinstance(media, list) and media[0].get("url"):
        return media[0]["url"]
    # 2. enclosures (podcast-style)
    enclosures = entry.get("enclosures") or []
    for e in enclosures:
        if e.get("type", "").startswith("image"):
            return e.get("href") or e.get("url")
    # 3. img tag in summary/content
    text = entry.get("summary", "") or ""
    if entry.get("content"):
        try:
            text += " " + entry["content"][0].get("value", "")
        except Exception:
            pass
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', text)
    if m:
        return m.group(1)
    return None


def _parse_feed(source: dict, raw_xml: bytes) -> List[Dict[str, Any]]:
    """Parse one RSS feed into normalized article dicts."""
    parsed = feedparser.parse(raw_xml)
    out: List[Dict[str, Any]] = []
    for entry in parsed.entries[:12]:
        try:
            published = None
            if entry.get("published_parsed"):
                published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
            elif entry.get("updated_parsed"):
                published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()

            out.append({
                "id": entry.get("id") or entry.get("link"),
                "title": _strip_html(entry.get("title", "Untitled")),
                "summary": _strip_html(entry.get("summary", "")),
                "link": entry.get("link"),
                "image": _extract_image(entry),
                "source": source["name"],
                "source_color": source["color"],
                "published": published,
                "author": entry.get("author"),
            })
        except Exception as e:
            logger.warning(f"Failed to parse entry from {source['name']}: {e}")
    return out


async def _fetch_one(client: httpx.AsyncClient, source: dict) -> List[Dict[str, Any]]:
    try:
        r = await client.get(source["url"], timeout=12, follow_redirects=True, headers={
            "User-Agent": "GamerGrid/1.0 (https://gamergrid.app)"
        })
        if r.status_code != 200:
            return []
        return _parse_feed(source, r.content)
    except Exception as e:
        logger.warning(f"news source failed {source['name']}: {e}")
        return []


@router.get("")
async def get_news(
    source: Optional[str] = Query(None, description="Filter by source name (IGN, GameSpot, …)"),
    limit: int = Query(60, ge=1, le=200),
):
    """Aggregate gaming news from all RSS sources, sorted newest first.

    Cached 15 min in MongoDB.
    """
    cache_key = f"news_all:{source or 'all'}:{limit}"
    now = datetime.now(timezone.utc)

    cached = await _cache_col.find_one({"_id": cache_key}, {"_id": 0, "data": 1, "expires_at": 1})
    if cached and cached.get("data") and cached.get("expires_at"):
        try:
            exp = cached["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now:
                return cached["data"]
        except Exception:
            pass

    selected = SOURCES
    if source:
        selected = [s for s in SOURCES if s["name"].lower() == source.lower()]
        if not selected:
            raise HTTPException(404, f"Unknown source: {source}")

    async with httpx.AsyncClient() as client:
        results_lists = await asyncio.gather(*[_fetch_one(client, s) for s in selected])

    articles: List[Dict[str, Any]] = []
    for lst in results_lists:
        articles.extend(lst)

    # Sort newest first; entries without a date go last
    def sort_key(a):
        return a.get("published") or "0"
    articles.sort(key=sort_key, reverse=True)
    articles = articles[:limit]

    payload = {
        "articles": articles,
        "total": len(articles),
        "sources": [{"name": s["name"], "color": s["color"]} for s in SOURCES],
        "fetched_at": now.isoformat(),
    }

    # Index for TTL cleanup
    try:
        await _cache_col.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass

    await _cache_col.update_one(
        {"_id": cache_key},
        {"$set": {"data": payload, "expires_at": now + timedelta(minutes=15)}},
        upsert=True,
    )
    return payload


@router.get("/sources")
async def list_sources():
    return [{"name": s["name"], "color": s["color"]} for s in SOURCES]

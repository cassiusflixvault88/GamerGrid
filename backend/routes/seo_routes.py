"""SEO routes — dynamic sitemap.xml with fresh <lastmod> + IndexNow bulk-submit.

Why dynamic sitemap?
- Google deprecated the sitemap-ping endpoint in 2023. The replacement signal is
  an accurate <lastmod> date in ISO 8601. Serving a dynamic sitemap means every
  Googlebot fetch sees today's date and prioritises recrawl.

Why IndexNow?
- Google ignores it, but Bing, Yandex, Naver, Seznam, DuckDuckGo all consume it.
  One HTTP POST notifies all of them about new/changed URLs (5B+ URLs/day).
"""
import os
import logging
from datetime import datetime, timezone
from typing import List

import httpx
from fastapi import APIRouter, Response

logger = logging.getLogger(__name__)

router = APIRouter(tags=["seo"])

SITE_URL = "https://gamer-grid.com"

# Stable IndexNow key. The matching key file at /{key}.txt proves ownership.
INDEXNOW_KEY = "ecbabe14f7b0321585bd2e8d0d7ef569"

# Static landing pages we want crawled. Game detail pages are reached via the
# IGDB-driven /games/all listing, which itself links to every individual game.
_STATIC_URLS = [
    ("/", "daily", "1.0"),
    ("/games/all", "daily", "0.9"),
    ("/games/playstation", "daily", "0.8"),
    ("/games/xbox", "daily", "0.8"),
    ("/games/pc", "daily", "0.8"),
    ("/games/switch", "daily", "0.8"),
    ("/news", "hourly", "0.8"),
    ("/share", "monthly", "0.5"),
    ("/refer", "monthly", "0.5"),
    ("/support", "monthly", "0.5"),
    ("/privacy", "yearly", "0.3"),
    ("/terms", "yearly", "0.3"),
]


def _build_sitemap_xml() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, freq, prio in _STATIC_URLS:
        parts.append(
            f"  <url>\n"
            f"    <loc>{SITE_URL}{path}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{freq}</changefreq>\n"
            f"    <priority>{prio}</priority>\n"
            f"  </url>"
        )
    parts.append("</urlset>")
    return "\n".join(parts) + "\n"


@router.get("/sitemap.xml")
async def sitemap_xml():
    xml = _build_sitemap_xml()
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/indexnow/key")
async def indexnow_key_info():
    """Diagnostic — confirms backend knows the IndexNow key and where to host
    the proof file (must be at https://gamer-grid.com/{key}.txt)."""
    return {
        "key": INDEXNOW_KEY,
        "key_location": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "engines_notified": ["Bing", "Yandex", "Naver", "Seznam", "DuckDuckGo"],
    }


async def submit_indexnow(urls: List[str]) -> dict:
    """Bulk-notify IndexNow-compatible engines about new/changed URLs.
    Called from the weekly scheduler. Safe to fail silently."""
    if not urls:
        return {"submitted": 0, "ok": False, "error": "no urls"}

    payload = {
        "host": "gamer-grid.com",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "urlList": urls[:10000],  # IndexNow caps at 10k per request
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "https://api.indexnow.org/IndexNow",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            ok = r.status_code in (200, 202)
            logger.info(f"IndexNow submitted {len(urls)} urls → HTTP {r.status_code}")
            return {"submitted": len(urls), "ok": ok, "status": r.status_code}
    except Exception as e:
        logger.warning(f"IndexNow submit failed: {e}")
        return {"submitted": 0, "ok": False, "error": str(e)}


def get_canonical_urls() -> List[str]:
    """Returns the absolute URLs of all sitemap-listed pages — used by the
    weekly IndexNow ping job."""
    return [f"{SITE_URL}{path}" for path, _, _ in _STATIC_URLS]

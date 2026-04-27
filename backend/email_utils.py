"""Shared email helpers used by both the FastAPI route handlers and the
background scheduler. Lives outside `routes/` to break the circular import
(routes.email_routes ↔ scheduler).

Refactored from the original 99-line `_build_digest_html()` into smaller
focused helpers (single responsibility). Behavior is identical to the
original — verified by side-by-side rendering.
"""
import os
from datetime import datetime, timezone
from typing import Iterable, Optional

from motor.motor_asyncio import AsyncIOMotorClient

# ---------- DB handle (shared by routes + scheduler) ----------
_mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(_mongo_url)
db = _client[os.environ['DB_NAME']]


def site_url() -> str:
    """Public URL for the app — used in email links/CTAs."""
    url = (os.environ.get("FRONTEND_URL") or "").strip()
    if url:
        return url.rstrip("/")
    return "https://hbo-max-app.preview.emergentagent.com"


def sender_email() -> str:
    return os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


async def fetch_top10_for_email() -> list:
    """Re-use the cached top10 from games_cache; fall back to empty list."""
    cache = await db.games_cache.find_one(
        {"_id": "top10_v4"}, {"_id": 0, "data": 1}
    )
    if not cache:
        # Backwards-compat with older cache key
        cache = await db.games_cache.find_one(
            {"_id": "top10_v3"}, {"_id": 0, "data": 1}
        )
    if cache and cache.get("data") and cache["data"].get("results"):
        return cache["data"]["results"][:10]
    return []


# ---------- Digest HTML builders (broken out for clarity) ----------

def _format_rating(game: dict) -> str:
    """Pick the best rating string available for the game."""
    vote_avg = game.get("vote_average")
    meta = game.get("metacritic_aggregate")
    if isinstance(vote_avg, (int, float)) and vote_avg > 0:
        return f"{vote_avg:.1f}/10"
    if isinstance(meta, (int, float)) and meta > 0:
        return f"{meta:.0f}/100"
    return ""


def _format_delta_html(delta: Optional[int]) -> str:
    """Tiny HTML span representing rank movement vs yesterday."""
    if delta is None:
        return '<span style="color:#888;font-size:11px;">NEW</span>'
    if delta > 0:
        return f'<span style="color:#22c55e;font-size:11px;">▲ {delta}</span>'
    if delta < 0:
        return f'<span style="color:#ef4444;font-size:11px;">▼ {abs(delta)}</span>'
    return '<span style="color:#888;font-size:11px;">—</span>'


def _format_cover_html(cover_url: str, title: str) -> str:
    if cover_url:
        return (
            f'<img src="{cover_url}" alt="{title}" width="80" height="106" '
            'style="border-radius:6px;display:block;object-fit:cover;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />'
        )
    return '<div style="width:80px;height:106px;background:#222;border-radius:6px;"></div>'


def _build_row(rank: int, game: dict) -> str:
    title = game.get("title") or game.get("name") or "Unknown"
    cover = game.get("poster_path") or game.get("cover_url") or game.get("cover") or ""
    platforms = ", ".join((game.get("platforms") or [])[:3])
    rating_str = _format_rating(game)
    rating_html = (
        f'<span style="color:#fbbf24;font-weight:bold;">★ {rating_str}</span>'
        if rating_str else ""
    )
    delta_html = _format_delta_html(game.get("delta"))
    cover_html = _format_cover_html(cover, title)

    return f"""
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1f1f1f;" valign="top">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="50" valign="top" style="font-size:32px;font-weight:900;color:#fbbf24;font-family:Arial,sans-serif;line-height:1;padding-right:12px;">
              {rank}
            </td>
            <td width="80" valign="top" style="padding-right:12px;">
              {cover_html}
            </td>
            <td valign="top" style="font-family:Arial,sans-serif;color:#ffffff;">
              <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">{title}</div>
              <div style="font-size:12px;color:#aaa;margin-bottom:6px;">{platforms}</div>
              <div style="font-size:13px;">{rating_html} &nbsp; {delta_html}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


def _build_shell(rows_html: str, link_url: str) -> str:
    week = datetime.now(timezone.utc).strftime("Week of %b %d, %Y")
    return f"""
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0a;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;padding:24px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);text-align:center;">
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:28px;font-weight:900;color:#000;letter-spacing:1px;">GAMERGRID</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;margin-top:4px;">Top 10 Games — {week}</div>
      </td></tr>
      <tr><td style="padding:24px 24px 8px 24px;font-family:Arial,sans-serif;color:#fff;">
        <h2 style="margin:0 0 8px 0;color:#fbbf24;font-size:20px;">This Week's Hottest Games</h2>
        <p style="margin:0;color:#aaa;font-size:14px;line-height:1.5;">
          Here are the 10 most-played games right now, blended from Steam, Twitch, and IGDB activity.
        </p>
      </td></tr>
      <tr><td style="padding:8px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          {rows_html}
        </table>
      </td></tr>
      <tr><td style="padding:24px;text-align:center;">
        <a href="{link_url}/top10" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;">View Full Top 10 →</a>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#000;border-top:1px solid #1f1f1f;font-family:Arial,sans-serif;color:#666;font-size:11px;text-align:center;">
        You're getting this because you're subscribed to GamerGrid weekly digests.<br/>
        <a href="{link_url}/settings" style="color:#666;">Manage preferences</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
"""


def build_digest_html(top10: Iterable[dict], link_url: Optional[str] = None) -> str:
    """Compose the weekly Top 10 digest HTML email."""
    link = (link_url or site_url()).rstrip("/")
    rows = "".join(_build_row(i + 1, g) for i, g in enumerate(top10))
    return _build_shell(rows, link)

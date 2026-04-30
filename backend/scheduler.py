"""
Background scheduler — sends Top 10 Weekly Digest every Monday 9am UTC automatically.
No manual button needed. Includes a status endpoint for the admin dashboard.
"""
import os
import logging
import asyncio
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

scheduler = AsyncIOScheduler(timezone="UTC")
_last_run = {"ts": None, "sent": 0, "failed": 0, "error": None}


async def _run_weekly_digest():
    """Job that runs every Monday 9am UTC."""
    logger.info("🕘 Auto-running Top 10 Weekly Digest…")
    api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if not api_key:
        logger.warning("Skipping weekly digest — RESEND_API_KEY not set")
        _last_run.update({"ts": datetime.now(timezone.utc).isoformat(), "error": "RESEND_API_KEY missing"})
        return

    try:
        from email_utils import build_digest_html, fetch_top10_for_email, site_url, sender_email

        top10 = await fetch_top10_for_email()
        if not top10:
            logger.warning("Weekly digest skipped — top10 cache empty")
            _last_run.update({"ts": datetime.now(timezone.utc).isoformat(), "error": "top10 cache empty"})
            return

        import resend
        resend.api_key = api_key
        sender = sender_email()
        html = build_digest_html(top10, site_url())

        cursor = db.users.find(
            {"$or": [
                {"email_notifications": {"$ne": False}},
                {"email_notifications": {"$exists": False}},
            ]},
            {"_id": 0, "email": 1, "id": 1},
        )
        subscribers = await cursor.to_list(10000)

        sent, failed = 0, 0
        for sub in subscribers:
            email = (sub.get("email") or "").strip()
            if not email or "@" not in email:
                continue
            try:
                await asyncio.to_thread(
                    resend.Emails.send,
                    {
                        "from": sender,
                        "to": [email],
                        "subject": "🎮 GamerGrid — This Week's Top 10 Games",
                        "html": html,
                    },
                )
                sent += 1
                await asyncio.sleep(0.6)  # Resend free tier rate limit
            except Exception as e:
                failed += 1
                logger.warning(f"Auto-digest failed for {email}: {e}")

        await db.digest_runs.insert_one({
            "ts": datetime.now(timezone.utc),
            "sent_count": sent,
            "failed_count": failed,
            "triggered_by": "scheduler",
        })
        _last_run.update({
            "ts": datetime.now(timezone.utc).isoformat(),
            "sent": sent,
            "failed": failed,
            "error": None,
        })
        logger.info(f"✅ Weekly digest auto-sent: {sent} success, {failed} failed")
    except Exception as e:
        logger.exception(f"Weekly digest auto-run crashed: {e}")
        _last_run.update({"ts": datetime.now(timezone.utc).isoformat(), "error": str(e)})


async def _refresh_homepage_caches():
    """Prewarms the homepage rails so users always hit warm cache.
    Fires every 30 minutes — clears cached entries for trending/top-rated/etc.
    so the very next request to those endpoints triggers a fresh IGDB fetch.
    """
    try:
        prefixes = [
            "trending:", "toprated:", "top10:", "popular:", "newreleases:",
            "upcoming:", "platform:", "category:", "goty:", "new:",
        ]
        regex = "^(" + "|".join(prefixes) + ")"
        # Cache lives in `games_cache` (the same collection game_routes uses).
        # Earlier code wrongly used `response_cache` — which doesn't exist —
        # so this job was silently a no-op. Now it actually clears stale rails.
        # NEVER clear `top10_v*` (the email digest depends on it) or
        # `top10_snapshot:*` (used for delta computation).
        r = await db.games_cache.delete_many({
            "_id": {"$regex": regex, "$not": {"$regex": "^top10_(v|snapshot)"}}
        })
        logger.info(f"🔄 Auto-refresh: cleared {r.deleted_count} cache entries — rails will rebuild on next visit")
    except Exception as e:
        logger.warning(f"Auto-refresh failed: {e}")


def start_scheduler():
    """Called once at app startup."""
    if scheduler.running:
        return
    # Weekly digest — every Monday at 9am UTC (4am EST / 1am PST)
    scheduler.add_job(
        _run_weekly_digest,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_digest",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Homepage cache refresh — every 30 minutes around the clock
    scheduler.add_job(
        _refresh_homepage_caches,
        trigger=CronTrigger(minute="*/30"),
        id="cache_refresh",
        replace_existing=True,
        misfire_grace_time=600,
    )
    scheduler.start()
    logger.info("📅 Scheduler started — weekly digest Mon 9am UTC + cache refresh every 30 min")


def get_scheduler_status():
    job = scheduler.get_job("weekly_digest") if scheduler.running else None
    next_run = job.next_run_time.isoformat() if job and job.next_run_time else None
    return {
        "running": scheduler.running,
        "next_run": next_run,
        "last_run": _last_run,
    }

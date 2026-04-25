"""
News Reactions + Comments
Per-article likes/dislikes and threaded comments.
Articles are identified by URL hash (since they come from RSS feeds).
"""
import hashlib
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/news", tags=["news-social"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def _article_id(url: str) -> str:
    """Stable per-article ID from URL."""
    return hashlib.sha256((url or "").encode()).hexdigest()[:16]


async def _is_admin(user_id: str) -> bool:
    a = await db.admins.find_one({"user_id": user_id}, {"_id": 0, "is_admin": 1})
    return bool(a and a.get("is_admin"))


# ============= REACTIONS =============

class ReactPayload(BaseModel):
    article_url: str
    article_title: Optional[str] = None
    reaction: str  # "like" | "dislike"


@router.post("/react")
async def react(payload: ReactPayload, token_data: dict = Depends(verify_token)):
    if payload.reaction not in ("like", "dislike"):
        raise HTTPException(status_code=400, detail="Invalid reaction")
    aid = _article_id(payload.article_url)

    existing = await db.news_reactions.find_one(
        {"article_id": aid, "user_id": token_data["user_id"]},
        {"_id": 0, "reaction": 1},
    )

    if existing and existing["reaction"] == payload.reaction:
        # toggle off
        await db.news_reactions.delete_one({"article_id": aid, "user_id": token_data["user_id"]})
        return {"ok": True, "your_reaction": None}

    await db.news_reactions.update_one(
        {"article_id": aid, "user_id": token_data["user_id"]},
        {"$set": {
            "article_id": aid,
            "article_url": payload.article_url,
            "article_title": payload.article_title,
            "user_id": token_data["user_id"],
            "reaction": payload.reaction,
            "ts": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "your_reaction": payload.reaction}


@router.get("/reactions/{article_url:path}")
async def get_reactions(article_url: str, token_data: Optional[dict] = None):
    """Public: returns total likes/dislikes. Optionally returns current user's reaction if authed."""
    aid = _article_id(article_url)
    likes = await db.news_reactions.count_documents({"article_id": aid, "reaction": "like"})
    dislikes = await db.news_reactions.count_documents({"article_id": aid, "reaction": "dislike"})
    return {"likes": likes, "dislikes": dislikes, "article_id": aid}


@router.post("/reactions-for")
async def my_reactions(payload: dict, token_data: dict = Depends(verify_token)):
    """Batch fetch: pass {article_urls: [...]} → get back {url: 'like'|'dislike'|null}."""
    urls = payload.get("article_urls") or []
    if not urls:
        return {}
    aids = {_article_id(u): u for u in urls}
    cursor = db.news_reactions.find(
        {"article_id": {"$in": list(aids.keys())}, "user_id": token_data["user_id"]},
        {"_id": 0, "article_id": 1, "reaction": 1},
    )
    rows = await cursor.to_list(len(urls))
    by_aid = {r["article_id"]: r["reaction"] for r in rows}
    return {url: by_aid.get(aid) for aid, url in aids.items()}


# ============= COMMENTS =============

class CommentPayload(BaseModel):
    article_url: str
    article_title: Optional[str] = None
    text: str


@router.post("/comment")
async def post_comment(payload: CommentPayload, token_data: dict = Depends(verify_token)):
    text = (payload.text or "").strip()
    if len(text) < 1:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 chars)")

    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "username": 1, "profile_picture_url": 1},
    ) or {}
    aid = _article_id(payload.article_url)
    doc = {
        "id": str(uuid.uuid4()),
        "article_id": aid,
        "article_url": payload.article_url,
        "article_title": payload.article_title,
        "user_id": token_data["user_id"],
        "username": user.get("username", "User"),
        "avatar": user.get("profile_picture_url"),
        "text": text,
        "is_admin": await _is_admin(token_data["user_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.news_comments.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "comment": doc}


@router.get("/comments")
async def list_comments(article_url: str):
    aid = _article_id(article_url)
    items = await db.news_comments.find(
        {"article_id": aid}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"comments": items, "total": len(items)}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, token_data: dict = Depends(verify_token)):
    existing = await db.news_comments.find_one({"id": comment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    is_admin = await _is_admin(token_data["user_id"])
    if existing["user_id"] != token_data["user_id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")
    await db.news_comments.delete_one({"id": comment_id})
    return {"ok": True}

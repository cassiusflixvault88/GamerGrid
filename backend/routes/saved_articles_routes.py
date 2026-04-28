"""Saved Articles — bookmark news articles into the user's library."""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import os
import uuid

from auth import verify_token

router = APIRouter()

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


class SaveArticlePayload(BaseModel):
    article_url: str = Field(..., min_length=4, max_length=2000)
    title: str = Field(..., min_length=1, max_length=500)
    summary: Optional[str] = Field(None, max_length=2000)
    image: Optional[str] = Field(None, max_length=2000)
    source: Optional[str] = Field(None, max_length=100)
    source_color: Optional[str] = Field(None, max_length=20)
    published: Optional[str] = Field(None, max_length=80)


@router.post("/saved-articles")
async def save_article(payload: SaveArticlePayload, token_data: dict = Depends(verify_token)):
    """Save (or re-save) an article for the current user."""
    user_id = token_data["user_id"]

    existing = await db.saved_articles.find_one(
        {"user_id": user_id, "article_url": payload.article_url},
        {"_id": 0, "id": 1},
    )
    if existing:
        return {"ok": True, "id": existing["id"], "already_saved": True}

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "article_url": payload.article_url,
        "title": payload.title.strip(),
        "summary": (payload.summary or "").strip()[:2000],
        "image": payload.image,
        "source": payload.source,
        "source_color": payload.source_color,
        "published": payload.published,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saved_articles.insert_one(doc)
    return {"ok": True, "id": doc["id"], "already_saved": False}


@router.get("/saved-articles")
async def list_saved_articles(token_data: dict = Depends(verify_token)):
    user_id = token_data["user_id"]
    cursor = db.saved_articles.find({"user_id": user_id}, {"_id": 0}).sort("saved_at", -1).limit(500)
    return {"articles": await cursor.to_list(500)}


@router.delete("/saved-articles/{article_id}")
async def delete_saved_article(article_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data["user_id"]
    res = await db.saved_articles.delete_one({"id": article_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved article not found")
    return {"ok": True}


@router.get("/saved-articles/check")
async def is_article_saved(article_url: str, token_data: dict = Depends(verify_token)):
    user_id = token_data["user_id"]
    doc = await db.saved_articles.find_one(
        {"user_id": user_id, "article_url": article_url},
        {"_id": 0, "id": 1},
    )
    return {"saved": bool(doc), "id": doc.get("id") if doc else None}

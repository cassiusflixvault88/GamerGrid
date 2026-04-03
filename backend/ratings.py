from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: int
    content_title: Optional[str] = None  # Movie/show title
    rating: float  # 1-5 stars
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RatingCreate(BaseModel):
    content_id: int
    content_title: Optional[str] = None  # Movie/show title
    rating: float
    review: Optional[str] = None


class RatingResponse(BaseModel):
    id: str
    user_id: str
    username: str
    content_id: int
    rating: float
    review: Optional[str]
    created_at: datetime


class WatchHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: int
    content_title: str
    poster_path: Optional[str]
    media_type: str
    progress: float = 0  # Percentage watched (0-100)
    last_watched: datetime = Field(default_factory=datetime.utcnow)


class WatchHistoryCreate(BaseModel):
    content_id: int
    content_title: str
    poster_path: Optional[str]
    media_type: str
    progress: float = 0

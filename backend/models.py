from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
import uuid


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    watchlist: List[dict] = []
    favorites: List[dict] = []


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime
    watchlist: List[dict] = []
    favorites: List[dict] = []


class WatchlistItem(BaseModel):
    content_id: int
    title: str
    poster_path: Optional[str]
    media_type: str
    added_at: datetime = Field(default_factory=datetime.utcnow)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

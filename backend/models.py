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
    # Profile fields
    display_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = "/flixvault-icon.svg"
    # Preferences
    autoplay_trailers: bool = True
    email_notifications: bool = True
    maturity_rating: str = "PG-13"


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
    # Profile fields
    display_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = "/flixvault-icon.svg"
    # Preferences
    autoplay_trailers: bool = True
    email_notifications: bool = True
    maturity_rating: str = "PG-13"


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None  # Allow username changes
    display_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = "/flixvault-icon.svg"
    autoplay_trailers: Optional[bool] = None
    email_notifications: Optional[bool] = None
    maturity_rating: Optional[str] = None


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

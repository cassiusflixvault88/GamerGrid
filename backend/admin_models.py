from pydantic import BaseModel
from datetime import datetime


class AdminConfig(BaseModel):
    """Admin user configuration"""
    user_id: str
    is_admin: bool = True
    permissions: list = ["all"]  # all, moderate_reviews, manage_users, manage_content
    created_at: datetime


class ReviewReply(BaseModel):
    id: str
    review_id: str
    admin_id: str
    admin_username: str
    reply_text: str
    created_at: datetime


class ReviewReplyCreate(BaseModel):
    review_id: str
    reply_text: str

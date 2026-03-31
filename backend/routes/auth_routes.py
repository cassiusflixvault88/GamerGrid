"""
Authentication and User Profile Routes
Handles signup, login, profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import logging
import os
import shutil
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

from models import User, UserCreate, UserLogin, UserResponse, UserProfileUpdate, Token
from auth import get_password_hash, verify_password, create_access_token, verify_token

logger = logging.getLogger(__name__)

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/auth", tags=["authentication"])
profile_router = APIRouter(prefix="/user", tags=["user-profile"])


@router.post("/signup", response_model=Token)
async def signup(user_data: UserCreate):
    """Register a new user"""
    existing_user = await db.users.find_one(
        {"email": user_data.email},
        {"_id": 1}
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Auto-promote CEO email to admin
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com"]
    if user_data.email.lower() in ceo_emails:
        admin_config = {
            "user_id": user.id,
            "is_admin": True,
            "permissions": ["moderate_reviews", "manage_content", "manage_users"],
            "role": "CEO & Founder",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin_config)
        logger.info(f"🎉 Auto-promoted CEO: {user_data.email} to admin!")
    
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.model_dump())
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one(
        {"email": credentials.email},
        {"email": 1, "id": 1, "username": 1, "hashed_password": 1, "created_at": 1, "watchlist": 1, "favorites": 1, "profile_picture_url": 1}
    )
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Auto-promote CEO email to admin if not already
    ceo_emails = ["cassius@flixvault.com", "cassiusflixvault@gmail.com"]
    if credentials.email.lower() in ceo_emails:
        existing_admin = await db.admins.find_one({"user_id": user["id"]})
        if not existing_admin:
            admin_config = {
                "user_id": user["id"],
                "is_admin": True,
                "permissions": ["moderate_reviews", "manage_content", "manage_users"],
                "role": "CEO & Founder",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin_config)
            logger.info(f"🎉 Auto-promoted CEO on login: {credentials.email}")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(token_data: dict = Depends(verify_token)):
    """Get current authenticated user"""
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1, "watchlist": 1, "favorites": 1, 
         "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@profile_router.get("/profile")
async def get_user_profile(token_data: dict = Depends(verify_token)):
    """Get user profile data"""
    logger.info(f"Fetching profile for user_id: {token_data['user_id']}")
    user = await db.users.find_one(
        {"id": token_data["user_id"]},
        {"_id": 0, "display_name": 1, "phone": 1, "address": 1, "profile_picture_url": 1,
         "autoplay_trailers": 1, "email_notifications": 1, "maturity_rating": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"Retrieved profile data: {user}")
    return user


@profile_router.put("/profile")
async def update_user_profile(profile_data: UserProfileUpdate, token_data: dict = Depends(verify_token)):
    """Update user profile settings"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    logger.info(f"Updating profile for user_id: {token_data['user_id']}")
    logger.info(f"Update data: {update_data}")
    
    result = await db.users.update_one(
        {"id": token_data["user_id"]},
        {"$set": update_data}
    )
    
    logger.info(f"Update result - matched: {result.matched_count}, modified: {result.modified_count}")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Profile updated successfully", "updated_fields": list(update_data.keys())}


@profile_router.post("/upload-profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    """Upload profile picture"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")
    
    # Validate file size (5MB max)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = ROOT_DIR / "uploads" / "profile_pictures"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{token_data['user_id']}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate URL (using backend URL)
        file_url = f"/uploads/profile_pictures/{unique_filename}"
        
        logger.info(f"Profile picture uploaded: {file_url}")
        
        return {"url": file_url, "message": "Profile picture uploaded successfully"}
        
    except Exception as e:
        logger.error(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

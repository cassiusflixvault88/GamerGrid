"""
Script to make Cassius Fox the admin of FlixVault
Run this once to grant admin access
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def make_cassius_admin():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Find Cassius Fox's user account
    cassius = await db.users.find_one({"email": "cassius@flixvault.com"})
    
    if not cassius:
        print("⚠️  Cassius Fox account not found!")
        print("Please sign up first with email: cassius@flixvault.com")
        print("Then run this script again.")
        return
    
    # Check if already admin
    existing_admin = await db.admins.find_one({"user_id": cassius["id"]})
    
    if existing_admin:
        print("✓ Cassius Fox is already an admin!")
        return
    
    # Grant admin access
    admin_config = {
        "user_id": cassius["id"],
        "is_admin": True,
        "permissions": ["all"],  # Full permissions
        "created_at": datetime.utcnow(),
        "role": "CEO & Founder"
    }
    
    await db.admins.insert_one(admin_config)
    
    print("=" * 50)
    print("✅ SUCCESS! Cassius Fox is now ADMIN!")
    print("=" * 50)
    print(f"User ID: {cassius['id']}")
    print(f"Username: {cassius['username']}")
    print(f"Email: {cassius['email']}")
    print(f"Role: CEO & Founder")
    print(f"Permissions: FULL ACCESS")
    print("=" * 50)
    print("\n🔐 You can now access the Admin Dashboard at:")
    print("👉 /admin")
    print("\nYou have full control over:")
    print("  • All user accounts")
    print("  • All reviews and ratings")
    print("  • Reply to reviews")
    print("  • Delete inappropriate content")
    print("  • Approve/reject movie submissions")
    print("  • Grant admin access to others")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(make_cassius_admin())

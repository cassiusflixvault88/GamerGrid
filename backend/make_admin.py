"""
Script to promote a user to FlixVault Admin/CEO
Usage: python make_admin.py <email>
Example: python make_admin.py Cassius@FlixVault.com
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def make_user_admin(email):
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Find user account (case-insensitive)
    user = await db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    
    if not user:
        print(f"❌ User with email '{email}' not found!")
        print()
        print("Please:")
        print("1. Make sure you've signed up at your FlixVault")
        print("2. Check the email spelling")
        print("3. Try running: python make_admin.py <correct_email>")
        client.close()
        return
    
    # Check if already admin
    existing_admin = await db.admins.find_one({"user_id": user["id"]})
    
    if existing_admin:
        print(f"✓ {user['username']} is already an admin!")
        print(f"  Role: {existing_admin.get('role', 'Admin')}")
        print(f"  Permissions: {', '.join(existing_admin.get('permissions', []))}")
        client.close()
        return
    
    # Grant admin access
    admin_config = {
        "user_id": user["id"],
        "is_admin": True,
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": "CEO & Founder"
    }
    
    await db.admins.insert_one(admin_config)
    
    print("=" * 60)
    print("🎉🎉🎉 SUCCESS! ADMIN PROMOTION COMPLETE! 🎉🎉🎉")
    print("=" * 60)
    print(f"👤 User ID: {user['id']}")
    print(f"👤 Username: {user['username']}")
    print(f"📧 Email: {user['email']}")
    print(f"👑 Role: CEO & Founder")
    print()
    print("✅ Permissions Granted:")
    print("   • Moderate Reviews (reply/delete)")
    print("   • Manage Content (approve submissions)")
    print("   • Manage Users (view all users)")
    print("=" * 60)
    print()
    print("🔐 Access Your Admin Dashboard:")
    print("   1. Refresh your FlixVault page")
    print("   2. Click your user dropdown (top right)")
    print("   3. Click 'Admin Panel' (in yellow)")
    print()
    print("You now have full CEO control! 👑")
    
    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        print("Example: python make_admin.py Cassius@FlixVault.com")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_user_admin(email))

"""
Auto-promote existing CEO account to admin
Run this once if CEO already signed up before auto-promotion was added
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def auto_promote_ceo():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]

    # Find CEO account
    ceo_email = "cassius@flixvault.com"
    user = await db.users.find_one({"email": {"$regex": f"^{ceo_email}$", "$options": "i"}})

    if not user:
        print(f"❌ No account found with {ceo_email}")
        print("   Sign up first, then this will auto-promote you!")
        client.close()
        return

    # Check if already admin
    admin = await db.admins.find_one({"user_id": user["id"]})
    if admin:
        print(f"✅ {user['username']} is already CEO/Admin!")
        client.close()
        return

    # Promote to admin
    admin_config = {
        "user_id": user["id"],
        "is_admin": True,
        "permissions": ["moderate_reviews", "manage_content", "manage_users"],
        "role": "CEO & Founder",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_config)

    print("=" * 60)
    print("🎉 CEO AUTO-PROMOTION COMPLETE!")
    print("=" * 60)
    print(f"Username: {user['username']}")
    print(f"Email: {user['email']}")
    print("Role: CEO & Founder")
    print()
    print("✅ Refresh your page - Admin Panel is now available!")
    print("=" * 60)

    client.close()

if __name__ == "__main__":
    asyncio.run(auto_promote_ceo())

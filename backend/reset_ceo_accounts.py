"""
Emergency account reset - deletes all CEO-related accounts
Run this if you need to start completely fresh
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def reset_ceo_accounts():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    ceo_emails = [
        "cassius@flixvault.com",
        "cassiusflixvault@gmail.com",
        "Cassius@FlixVault.com"
    ]

    deleted_count = 0

    for email in ceo_emails:
        user = await db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
        if user:
            print(f"🗑️  Deleting: {user['email']} (ID: {user['id']})")

            # Delete user and all related data
            await db.users.delete_one({"id": user['id']})
            await db.admins.delete_many({"user_id": user['id']})
            await db.ratings.delete_many({"user_id": user['id']})
            await db.watch_history.delete_many({"user_id": user['id']})

            deleted_count += 1

    print(f"\n✅ Deleted {deleted_count} account(s)")
    print("✅ You can now sign up fresh with cassiusflixvault@gmail.com!")

    client.close()

if __name__ == "__main__":
    asyncio.run(reset_ceo_accounts())

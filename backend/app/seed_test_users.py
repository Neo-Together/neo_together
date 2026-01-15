"""
Seed test users for multi-user testing.
Run with: python -m app.seed_test_users
"""

import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models import User, Interest
from app.utils.security import hash_private_key


TEST_USERS = [
    {
        "first_name": "Alex",
        "birth_year": 1995,
        "gender": "other",
        "private_key": "test_alex_123",  # Easy to remember for testing
        "interest_names": ["Hiking", "Photography", "Coffee"],
    },
    {
        "first_name": "Jordan",
        "birth_year": 1992,
        "gender": "other",
        "private_key": "test_jordan_123",
        "interest_names": ["Hiking", "Board Games", "Coffee", "Yoga"],
    },
    {
        "first_name": "Sam",
        "birth_year": 1998,
        "gender": "other",
        "private_key": "test_sam_123",
        "interest_names": ["Photography", "Music", "Cooking"],
    },
]


async def seed_test_users():
    async with async_session_maker() as db:
        for user_data in TEST_USERS:
            # Check if user already exists
            result = await db.execute(
                select(User).where(User.first_name == user_data["first_name"])
            )
            existing = result.scalars().first()

            if existing:
                print(f"User {user_data['first_name']} already exists, skipping...")
                continue

            # Get interests
            result = await db.execute(
                select(Interest).where(Interest.name.in_(user_data["interest_names"]))
            )
            interests = list(result.scalars().all())

            # Create user
            user = User(
                first_name=user_data["first_name"],
                birth_year=user_data["birth_year"],
                gender=user_data["gender"],
                private_key_hash=hash_private_key(user_data["private_key"]),
                interests=interests,
                is_available=True,
            )

            db.add(user)
            await db.commit()

            print(f"Created test user: {user_data['first_name']}")
            print(f"  Login with: {user_data['first_name']} / {user_data['private_key']}")

        print("\n=== TEST ACCOUNTS ===")
        print("Use these in different browser windows to test multi-user interactions:\n")
        for user_data in TEST_USERS:
            print(f"  Name: {user_data['first_name']}")
            print(f"  Key:  {user_data['private_key']}")
            print()


if __name__ == "__main__":
    asyncio.run(seed_test_users())

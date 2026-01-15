"""Seed script to populate initial data."""

import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import async_session_maker
from app.models import Interest, User, Availability
from app.utils.security import generate_private_key, hash_private_key


INTERESTS_DATA = [
    # Outdoors & Sports
    {"name": "Hiking", "category": "Outdoors"},
    {"name": "Running", "category": "Outdoors"},
    {"name": "Cycling", "category": "Outdoors"},
    {"name": "Swimming", "category": "Outdoors"},
    {"name": "Camping", "category": "Outdoors"},
    {"name": "Rock Climbing", "category": "Outdoors"},
    {"name": "Soccer", "category": "Sports"},
    {"name": "Basketball", "category": "Sports"},
    {"name": "Tennis", "category": "Sports"},
    {"name": "Yoga", "category": "Fitness"},
    {"name": "Gym", "category": "Fitness"},
    {"name": "Martial Arts", "category": "Fitness"},

    # Creative
    {"name": "Photography", "category": "Creative"},
    {"name": "Painting", "category": "Creative"},
    {"name": "Drawing", "category": "Creative"},
    {"name": "Writing", "category": "Creative"},
    {"name": "Music", "category": "Creative"},
    {"name": "Dancing", "category": "Creative"},
    {"name": "Crafts", "category": "Creative"},
    {"name": "Pottery", "category": "Creative"},

    # Social
    {"name": "Board Games", "category": "Social"},
    {"name": "Video Games", "category": "Social"},
    {"name": "Trivia", "category": "Social"},
    {"name": "Book Club", "category": "Social"},
    {"name": "Language Exchange", "category": "Social"},
    {"name": "Volunteering", "category": "Social"},

    # Food & Drink
    {"name": "Cooking", "category": "Food"},
    {"name": "Baking", "category": "Food"},
    {"name": "Wine Tasting", "category": "Food"},
    {"name": "Coffee", "category": "Food"},
    {"name": "Foodie Adventures", "category": "Food"},

    # Tech & Learning
    {"name": "Programming", "category": "Tech"},
    {"name": "AI & ML", "category": "Tech"},
    {"name": "Startups", "category": "Tech"},
    {"name": "Science", "category": "Learning"},
    {"name": "History", "category": "Learning"},
    {"name": "Philosophy", "category": "Learning"},

    # Entertainment
    {"name": "Movies", "category": "Entertainment"},
    {"name": "Theater", "category": "Entertainment"},
    {"name": "Concerts", "category": "Entertainment"},
    {"name": "Comedy", "category": "Entertainment"},
    {"name": "Anime", "category": "Entertainment"},

    # Other
    {"name": "Pets", "category": "Lifestyle"},
    {"name": "Travel", "category": "Lifestyle"},
    {"name": "Meditation", "category": "Wellness"},
    {"name": "Gardening", "category": "Lifestyle"},
]


async def seed_interests():
    """Seed the interests table if empty."""
    async with async_session_maker() as session:
        # Check if interests already exist
        result = await session.execute(select(Interest).limit(1))
        if result.scalar_one_or_none():
            print("Interests already seeded, skipping...")
            return

        # Insert interests
        for data in INTERESTS_DATA:
            interest = Interest(**data)
            session.add(interest)

        await session.commit()
        print(f"Seeded {len(INTERESTS_DATA)} interests")


TEST_USERS = [
    {
        "first_name": "Alex",
        "birth_year": 1999,
        "gender": "male",
        "interests": ["Hiking", "Coffee", "Programming", "Board Games"],
        "min_age_preference": 22,
        "max_age_preference": 35,
        "gender_preferences": ["female", "non-binary"],
        "availability": {
            "location_name": "Central Park, New York",
            "latitude": 40.785091,
            "longitude": -73.968285,
            "time_start": "10:00",
            "time_end": "14:00",
            "repeat_days": [5, 6],  # Sat, Sun
        },
    },
    {
        "first_name": "Jordan",
        "birth_year": 1994,
        "gender": "female",
        "interests": ["Photography", "Coffee", "Yoga", "Travel", "Book Club"],
        "min_age_preference": 25,
        "max_age_preference": 40,
        "gender_preferences": ["male"],
        "availability": {
            "location_name": "Brooklyn Coffee Roasters",
            "latitude": 40.6892,
            "longitude": -73.9857,
            "time_start": "08:00",
            "time_end": "11:00",
            "repeat_days": [0, 1, 2, 3, 4],  # Mon-Fri
        },
    },
    {
        "first_name": "Sam",
        "birth_year": 1996,
        "gender": "non-binary",
        "interests": ["Soccer", "Video Games", "Anime", "Cooking"],
        "min_age_preference": None,
        "max_age_preference": None,
        "gender_preferences": [],  # No preference
        "availability": {
            "location_name": "Chelsea Piers",
            "latitude": 40.7465,
            "longitude": -74.0071,
            "time_start": "18:00",
            "time_end": "21:00",
            "repeat_days": [1, 3],  # Tue, Thu
        },
    },
    {
        "first_name": "Taylor",
        "birth_year": 1989,
        "gender": "male",
        "interests": ["Music", "Concerts", "Wine Tasting", "Foodie Adventures"],
        "min_age_preference": 28,
        "max_age_preference": 45,
        "gender_preferences": ["female", "non-binary"],
        "availability": {
            "location_name": "East Village Bar",
            "latitude": 40.7264,
            "longitude": -73.9877,
            "time_start": "19:00",
            "time_end": "23:00",
            "repeat_days": [4, 5],  # Fri, Sat
        },
    },
    {
        "first_name": "Morgan",
        "birth_year": 2001,
        "gender": "female",
        "interests": ["AI & ML", "Startups", "Running", "Meditation", "Travel"],
        "min_age_preference": 21,
        "max_age_preference": 30,
        "gender_preferences": ["male", "female"],
        "availability": {
            "location_name": "Bryant Park",
            "latitude": 40.7536,
            "longitude": -73.9832,
            "time_start": "12:00",
            "time_end": "14:00",
            "repeat_days": [0, 2, 4],  # Mon, Wed, Fri
        },
    },
]


async def seed_test_users():
    """Seed test users with interests and availability."""
    async with async_session_maker() as session:
        # Check if test users already exist
        result = await session.execute(
            select(User).where(User.first_name.in_([u["first_name"] for u in TEST_USERS]))
        )
        existing = result.scalars().all()
        if existing:
            print(f"Test users already exist ({len(existing)} found), skipping...")
            return

        # Get all interests for mapping
        result = await session.execute(select(Interest))
        all_interests = {i.name: i for i in result.scalars().all()}

        print("\n" + "=" * 50)
        print("TEST USER CREDENTIALS (SAVE THESE!)")
        print("=" * 50)

        for user_data in TEST_USERS:
            # Generate private key
            private_key = generate_private_key()
            private_key_hash = hash_private_key(private_key)

            # Create user
            user = User(
                first_name=user_data["first_name"],
                birth_year=user_data["birth_year"],
                gender=user_data["gender"],
                private_key_hash=private_key_hash,
                is_available=True,
                min_age_preference=user_data["min_age_preference"],
                max_age_preference=user_data["max_age_preference"],
                gender_preferences=user_data["gender_preferences"],
            )

            # Add interests
            for interest_name in user_data["interests"]:
                if interest_name in all_interests:
                    user.interests.append(all_interests[interest_name])

            session.add(user)
            await session.flush()  # Get the user ID

            # Create availability
            avail_data = user_data["availability"]
            availability = Availability(
                user_id=user.id,
                location_name=avail_data["location_name"],
                latitude=avail_data["latitude"],
                longitude=avail_data["longitude"],
                time_start=avail_data["time_start"],
                time_end=avail_data["time_end"],
                repeat_days=avail_data["repeat_days"],
                is_active=True,
            )
            session.add(availability)

            # Print credentials
            print(f"\nUser: {user_data['first_name']}")
            print(f"  Gender: {user_data['gender']}, Age: {2024 - user_data['birth_year']}")
            print(f"  Private Key: {private_key}")
            print(f"  Location: {avail_data['location_name']}")

        await session.commit()
        print("\n" + "=" * 50)
        print(f"Created {len(TEST_USERS)} test users")
        print("=" * 50 + "\n")


async def main():
    await seed_interests()

    # Check for --with-test-users flag
    if "--with-test-users" in sys.argv:
        await seed_test_users()


if __name__ == "__main__":
    asyncio.run(main())

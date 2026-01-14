"""Seed script to populate initial data."""

import asyncio
from sqlalchemy import select

from app.database import async_session_maker
from app.models import Interest


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


async def main():
    await seed_interests()


if __name__ == "__main__":
    asyncio.run(main())

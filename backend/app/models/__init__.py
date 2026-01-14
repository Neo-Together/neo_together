"""Database models for Neo Together."""

from app.models.user import User, Interest, user_interests
from app.models.availability import Availability
from app.models.meetup import MeetupRequest, Meetup, RequestStatus, MeetupStatus
from app.models.interest_match import UserInterest, Match

__all__ = [
    "User",
    "Interest",  # Topics/hobbies like "hiking", "photography"
    "user_interests",  # Many-to-many table for user <-> topic interests
    "Availability",
    "MeetupRequest",
    "Meetup",
    "RequestStatus",
    "MeetupStatus",
    "UserInterest",  # User expressing interest in meeting another user
    "Match",  # Mutual interest between two users
]

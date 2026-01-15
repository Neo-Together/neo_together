"""Schemas for user interest and matching."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.schemas.user import UserRead
from app.schemas.availability import AvailabilityRead


class ExpressInterestRequest(BaseModel):
    """Request to express interest in meeting someone."""

    target_id: UUID
    availability_id: int


class UserInterestRead(BaseModel):
    """User interest as returned by API."""

    id: int
    requester_id: UUID
    target_id: UUID
    availability_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MatchRead(BaseModel):
    """Match (mutual interest) as returned by API."""

    id: int
    user1_id: UUID
    user2_id: UUID
    availability_id: int
    status: str
    proposed_datetime: datetime | None
    proposed_by_id: UUID | None
    confirmed_at: datetime | None
    created_at: datetime

    # Include related data
    other_user: UserRead | None = None  # The other person in the match
    availability: AvailabilityRead | None = None

    class Config:
        from_attributes = True


class ProposeTimeRequest(BaseModel):
    """Request to propose a meetup time."""

    proposed_datetime: datetime


class PersonAtLocation(BaseModel):
    """A person available at a specific location."""

    user: UserRead
    availability: AvailabilityRead
    shared_interests: list[str]  # Names of shared interests
    other_interests: list[str]  # Names of their interests that are NOT shared
    times_overlap: bool
    overlapping_times: list[dict] | None = None  # If times overlap, which slots


class LocationWithPeople(BaseModel):
    """A location with people available there."""

    availability: AvailabilityRead
    people_count: int
    people: list[PersonAtLocation] = []

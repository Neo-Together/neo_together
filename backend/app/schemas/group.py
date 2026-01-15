"""Schemas for groups."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.schemas.user import UserRead
from app.schemas.availability import AvailabilityRead


class GroupMemberRead(BaseModel):
    """Group member as returned by API."""

    id: int
    user_id: UUID
    role: str
    status: str
    joined_at: datetime
    user: UserRead | None = None

    class Config:
        from_attributes = True


class GroupRead(BaseModel):
    """Group as returned by API."""

    id: int
    availability_id: int
    status: str
    created_at: datetime
    members: list[GroupMemberRead] = []
    availability: AvailabilityRead | None = None

    class Config:
        from_attributes = True


class GroupJoinRequestRead(BaseModel):
    """Group join request as returned by API."""

    id: int
    group_id: int
    user_id: UUID
    status: str
    created_at: datetime
    responded_at: datetime | None = None
    user: UserRead | None = None
    group: GroupRead | None = None

    class Config:
        from_attributes = True


class GroupAtLocation(BaseModel):
    """A group at a specific location for discovery."""

    group: GroupRead
    shared_interests: list[str]  # Combined shared interests with all members
    times_overlap: bool

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.meetup import RequestStatus, MeetupStatus
from app.schemas.user import UserRead


class MeetupRequestCreate(BaseModel):
    """Schema for creating a meetup request."""

    recipient_id: UUID
    availability_id: int
    proposed_datetime: datetime


class MeetupRequestRead(BaseModel):
    """Meetup request as returned by API."""

    id: int
    requester_id: UUID
    recipient_id: UUID
    availability_id: int
    proposed_datetime: datetime
    status: RequestStatus
    created_at: datetime
    responded_at: datetime | None

    # Include user details when fetching requests
    requester: UserRead | None = None
    recipient: UserRead | None = None

    class Config:
        from_attributes = True


class MeetupRequestRespond(BaseModel):
    """Schema for responding to a meetup request."""

    accept: bool


class MeetupRead(BaseModel):
    """Confirmed meetup as returned by API."""

    id: int
    request_id: int
    location_name: str
    latitude: float
    longitude: float
    scheduled_datetime: datetime
    status: MeetupStatus
    reminder_sent: bool

    # Include the full request with user details
    request: MeetupRequestRead | None = None

    class Config:
        from_attributes = True

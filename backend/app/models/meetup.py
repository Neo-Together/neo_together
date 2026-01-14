import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class RequestStatus(str, Enum):
    """Status of a meetup request."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class MeetupStatus(str, Enum):
    """Status of a confirmed meetup."""

    UPCOMING = "upcoming"
    COMPLETED = "completed"


class MeetupRequest(Base):
    """
    Request from one user to meet another.
    Requires mutual opt-in to become a confirmed Meetup.
    """

    __tablename__ = "meetup_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    availability_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availabilities.id"), nullable=False
    )

    proposed_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=RequestStatus.PENDING.value, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships (using string references to avoid circular imports)
    requester = relationship(
        "User", foreign_keys=[requester_id], back_populates="sent_requests"
    )
    recipient = relationship(
        "User", foreign_keys=[recipient_id], back_populates="received_requests"
    )
    availability = relationship("Availability", back_populates="meetup_requests")
    meetup = relationship("Meetup", back_populates="request", uselist=False)


class Meetup(Base):
    """
    Confirmed meetup between two users.
    Created when a MeetupRequest is accepted.
    """

    __tablename__ = "meetups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("meetup_requests.id"), unique=True, nullable=False
    )

    # Location snapshot (in case availability changes)
    location_name: Mapped[str] = mapped_column(String(200), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    scheduled_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=MeetupStatus.UPCOMING.value, nullable=False
    )
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    request = relationship("MeetupRequest", back_populates="meetup")

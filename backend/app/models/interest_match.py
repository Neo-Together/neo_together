"""User interest/matching models."""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class UserInterest(Base):
    """
    Represents one user's interest in meeting another user.
    When both users have mutual interest, they can proceed to schedule a meetup.
    """

    __tablename__ = "user_interests"
    __table_args__ = (
        # Each user can only express interest in another user once per availability
        UniqueConstraint("requester_id", "target_id", "availability_id", name="unique_interest"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Who is expressing interest
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Who they're interested in meeting
    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # At which availability/location
    availability_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availabilities.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id])
    target = relationship("User", foreign_keys=[target_id])
    availability = relationship("Availability")


class Match(Base):
    """
    A confirmed mutual interest between two users.
    Created automatically when both users express interest in each other.
    """

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", "availability_id", name="unique_match"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # The two users (user1_id < user2_id to ensure uniqueness)
    user1_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    user2_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # The location where they want to meet
    availability_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availabilities.id"), nullable=False
    )

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending, time_proposed, confirmed, completed, cancelled

    # Time coordination
    proposed_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    proposed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    availability = relationship("Availability")
    proposed_by = relationship("User", foreign_keys=[proposed_by_id])

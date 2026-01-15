import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Table, Column, ForeignKey, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


# Many-to-many association table for User <-> Interest
user_interests = Table(
    "user_interests",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("interest_id", Integer, ForeignKey("interests.id"), primary_key=True),
)


class User(Base):
    """User model - represents a person using the app."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    private_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_year: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Preferences for matching
    min_age_preference: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_age_preference: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender_preferences: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # Group size preferences
    min_group_size: Mapped[int] = mapped_column(Integer, default=2)
    max_group_size: Mapped[int] = mapped_column(Integer, default=10)

    # Email authentication (optional for existing users, required for new)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    magic_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    magic_token_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships (using string references)
    interests = relationship("Interest", secondary=user_interests, back_populates="users")
    availabilities = relationship(
        "Availability", back_populates="user", cascade="all, delete-orphan"
    )
    sent_requests = relationship(
        "MeetupRequest",
        foreign_keys="MeetupRequest.requester_id",
        back_populates="requester",
    )
    received_requests = relationship(
        "MeetupRequest",
        foreign_keys="MeetupRequest.recipient_id",
        back_populates="recipient",
    )
    group_memberships = relationship("GroupMember", back_populates="user")
    group_join_requests = relationship("GroupJoinRequest", back_populates="user")


class Interest(Base):
    """Interest/topic that users can be interested in."""

    __tablename__ = "interests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    users = relationship("User", secondary=user_interests, back_populates="interests")

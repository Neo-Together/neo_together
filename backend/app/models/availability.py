import uuid
from sqlalchemy import String, Integer, Boolean, Time, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from geoalchemy2 import Geometry

from app.database import Base


class Availability(Base):
    """
    Availability slot - when and where a user is available to meet.
    Users can have multiple availability slots.
    """

    __tablename__ = "availabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Location info
    location_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )  # User's label, e.g., "Downtown Coffee Shop"
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    # PostGIS point for efficient geospatial queries
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    radius_meters: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Optional: "anywhere within X meters"

    # Time info
    time_start: Mapped[str] = mapped_column(
        String(5), nullable=False
    )  # "HH:MM" format, e.g., "14:00"
    time_end: Mapped[str] = mapped_column(
        String(5), nullable=False
    )  # "HH:MM" format, e.g., "18:00"

    # Repeat schedule - days of week (0=Monday, 6=Sunday)
    # Stored as array of integers, e.g., [0, 2, 4] = Mon, Wed, Fri
    repeat_days: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, default=[]
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships (using string references to avoid circular imports)
    user = relationship("User", back_populates="availabilities")
    meetup_requests = relationship("MeetupRequest", back_populates="availability")

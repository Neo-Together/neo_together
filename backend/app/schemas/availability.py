from pydantic import BaseModel, Field, field_validator


class AvailabilityBase(BaseModel):
    """Base schema for availability slots."""

    location_name: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_meters: int | None = Field(None, ge=100, le=50000)
    time_start: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    time_end: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    repeat_days: list[int] = Field(..., min_length=1)  # 0-6 for Mon-Sun

    @field_validator("repeat_days")
    @classmethod
    def validate_days(cls, v: list[int]) -> list[int]:
        if not all(0 <= day <= 6 for day in v):
            raise ValueError("Days must be between 0 (Monday) and 6 (Sunday)")
        return sorted(set(v))  # Remove duplicates and sort


class AvailabilityCreate(AvailabilityBase):
    """Schema for creating an availability slot."""

    pass


class AvailabilityUpdate(BaseModel):
    """Schema for updating an availability slot."""

    location_name: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    radius_meters: int | None = Field(None, ge=100, le=50000)
    time_start: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    time_end: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    repeat_days: list[int] | None = None
    is_active: bool | None = None


class AvailabilityRead(AvailabilityBase):
    """Availability as returned by API."""

    id: int
    is_active: bool

    class Config:
        from_attributes = True

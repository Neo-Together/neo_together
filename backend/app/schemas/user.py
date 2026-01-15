from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class InterestBase(BaseModel):
    """Base schema for interests."""

    name: str
    category: str | None = None


class InterestRead(InterestBase):
    """Interest as returned by API."""

    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    """Base schema for user data."""

    first_name: str = Field(..., min_length=1, max_length=50)
    birth_year: int = Field(..., ge=1900, le=2020)
    gender: str = Field(..., min_length=1, max_length=20)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    interest_ids: list[int] = Field(..., min_length=1)


class UserRead(UserBase):
    """User as returned by API (public profile)."""

    id: UUID
    is_available: bool
    interests: list[InterestRead]
    created_at: datetime
    min_age_preference: int | None = None
    max_age_preference: int | None = None
    gender_preferences: list[str] = []
    min_group_size: int = 2
    max_group_size: int = 10

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences."""

    min_age_preference: int | None = Field(None, ge=18, le=100)
    max_age_preference: int | None = Field(None, ge=18, le=100)
    gender_preferences: list[str] | None = None
    min_group_size: int | None = Field(None, ge=2, le=20)
    max_group_size: int | None = Field(None, ge=2, le=20)


class UserSignupResponse(BaseModel):
    """Response after successful signup - includes the private key (shown once!)."""

    user: UserRead
    private_key: str = Field(
        ..., description="Save this! It's your only way to log in."
    )


class LoginRequest(BaseModel):
    """Schema for login request."""

    first_name: str
    private_key: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"

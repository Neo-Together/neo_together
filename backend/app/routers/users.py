from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User
from app.schemas.user import UserRead, UserPreferencesUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile."""
    # Reload with interests
    result = await db.execute(
        select(User).where(User.id == current_user.id).options(selectinload(User.interests))
    )
    user = result.scalar_one()
    return UserRead.model_validate(user)


@router.patch("/me/availability")
async def toggle_availability(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle the current user's availability status."""
    current_user.is_available = not current_user.is_available
    await db.commit()
    return {"is_available": current_user.is_available}


@router.patch("/me/preferences", response_model=UserRead)
async def update_preferences(
    data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's matching preferences."""
    if data.min_age_preference is not None:
        current_user.min_age_preference = data.min_age_preference
    if data.max_age_preference is not None:
        current_user.max_age_preference = data.max_age_preference
    if data.gender_preferences is not None:
        current_user.gender_preferences = data.gender_preferences
    if data.min_group_size is not None:
        current_user.min_group_size = data.min_group_size
    if data.max_group_size is not None:
        current_user.max_group_size = data.max_group_size

    await db.commit()

    # Reload with interests
    result = await db.execute(
        select(User).where(User.id == current_user.id).options(selectinload(User.interests))
    )
    user = result.scalar_one()
    return UserRead.model_validate(user)

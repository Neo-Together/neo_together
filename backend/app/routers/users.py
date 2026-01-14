from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User
from app.schemas import UserRead
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

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Interest
from app.schemas import InterestRead

router = APIRouter(prefix="/interests", tags=["Interests"])


@router.get("", response_model=list[InterestRead])
async def list_interests(db: AsyncSession = Depends(get_db)):
    """Get all available interests."""
    result = await db.execute(select(Interest).order_by(Interest.category, Interest.name))
    interests = result.scalars().all()
    return [InterestRead.model_validate(i) for i in interests]

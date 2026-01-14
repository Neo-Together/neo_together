from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_MakePoint

from app.database import get_db
from app.models import User, Availability
from app.schemas import AvailabilityCreate, AvailabilityUpdate, AvailabilityRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/availability", tags=["Availability"])


@router.get("", response_model=list[AvailabilityRead])
async def list_my_availability(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all availability slots for the current user."""
    result = await db.execute(
        select(Availability)
        .where(Availability.user_id == current_user.id)
        .order_by(Availability.id)
    )
    slots = result.scalars().all()
    return [AvailabilityRead.model_validate(s) for s in slots]


@router.post("", response_model=AvailabilityRead, status_code=status.HTTP_201_CREATED)
async def create_availability(
    data: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new availability slot."""
    # Create the availability with PostGIS point
    slot = Availability(
        user_id=current_user.id,
        location_name=data.location_name,
        latitude=data.latitude,
        longitude=data.longitude,
        location=func.ST_SetSRID(ST_MakePoint(data.longitude, data.latitude), 4326),
        radius_meters=data.radius_meters,
        time_start=data.time_start,
        time_end=data.time_end,
        repeat_days=data.repeat_days,
        is_active=True,
    )

    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    return AvailabilityRead.model_validate(slot)


@router.get("/{slot_id}", response_model=AvailabilityRead)
async def get_availability(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific availability slot."""
    result = await db.execute(
        select(Availability).where(
            Availability.id == slot_id,
            Availability.user_id == current_user.id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    return AvailabilityRead.model_validate(slot)


@router.patch("/{slot_id}", response_model=AvailabilityRead)
async def update_availability(
    slot_id: int,
    data: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an availability slot."""
    result = await db.execute(
        select(Availability).where(
            Availability.id == slot_id,
            Availability.user_id == current_user.id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    # Update fields that were provided
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(slot, field, value)

    # Update PostGIS point if lat/lng changed
    if "latitude" in update_data or "longitude" in update_data:
        lat = update_data.get("latitude", slot.latitude)
        lng = update_data.get("longitude", slot.longitude)
        slot.location = func.ST_SetSRID(ST_MakePoint(lng, lat), 4326)

    await db.commit()
    await db.refresh(slot)

    return AvailabilityRead.model_validate(slot)


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an availability slot."""
    result = await db.execute(
        select(Availability).where(
            Availability.id == slot_id,
            Availability.user_id == current_user.id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    await db.delete(slot)
    await db.commit()

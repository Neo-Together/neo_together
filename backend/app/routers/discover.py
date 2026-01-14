"""Discovery and matching endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Availability, Interest, UserInterest, Match
from app.schemas.matching import (
    ExpressInterestRequest,
    MatchRead,
    ProposeTimeRequest,
    PersonAtLocation,
    LocationWithPeople,
)
from app.schemas.user import UserRead
from app.schemas.availability import AvailabilityRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/discover", tags=["Discovery & Matching"])


@router.get("/locations", response_model=list[LocationWithPeople])
async def get_locations_with_people(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all locations that have available people.
    Returns locations grouped with count of people at each.
    """
    # Get all active availabilities from other users who are available
    result = await db.execute(
        select(Availability)
        .join(User)
        .where(
            Availability.is_active == True,
            User.is_available == True,
            User.id != current_user.id,
        )
        .options(selectinload(Availability.user))
    )
    availabilities = result.scalars().all()

    # Group by location (using lat/lng as key)
    locations_map: dict[tuple[float, float], list[Availability]] = {}
    for avail in availabilities:
        key = (round(avail.latitude, 5), round(avail.longitude, 5))
        if key not in locations_map:
            locations_map[key] = []
        locations_map[key].append(avail)

    # Build response
    locations = []
    for (lat, lng), avails in locations_map.items():
        # Use first availability as the representative
        rep = avails[0]
        locations.append(
            LocationWithPeople(
                availability=AvailabilityRead.model_validate(rep),
                people_count=len(avails),
            )
        )

    return locations


@router.get("/locations/{availability_id}/people", response_model=list[PersonAtLocation])
async def get_people_at_location(
    availability_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all people available at a specific location.
    Shows whether their times overlap with the current user's availability.
    """
    # Get the target availability
    result = await db.execute(
        select(Availability).where(Availability.id == availability_id)
    )
    target_avail = result.scalar_one_or_none()

    if not target_avail:
        raise HTTPException(status_code=404, detail="Location not found")

    # Get current user's interests for comparison
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.interests))
    )
    current_user_full = result.scalar_one()
    my_interest_ids = {i.id for i in current_user_full.interests}

    # Get current user's availabilities for time overlap check
    result = await db.execute(
        select(Availability).where(
            Availability.user_id == current_user.id,
            Availability.is_active == True,
        )
    )
    my_availabilities = result.scalars().all()

    # Find all availabilities at the same location (within ~100m)
    result = await db.execute(
        select(Availability)
        .join(User)
        .where(
            Availability.is_active == True,
            User.is_available == True,
            User.id != current_user.id,
            # Same location (approximate match)
            func.abs(Availability.latitude - target_avail.latitude) < 0.001,
            func.abs(Availability.longitude - target_avail.longitude) < 0.001,
        )
        .options(
            selectinload(Availability.user).selectinload(User.interests)
        )
    )
    availabilities = result.scalars().all()

    # Build response
    people = []
    for avail in availabilities:
        user = avail.user

        # Calculate shared interests
        their_interest_ids = {i.id for i in user.interests}
        shared_ids = my_interest_ids & their_interest_ids
        shared_names = [i.name for i in user.interests if i.id in shared_ids]

        # Check time overlap
        times_overlap = False
        overlapping_times = []

        for my_avail in my_availabilities:
            # Check if days overlap
            day_overlap = set(my_avail.repeat_days) & set(avail.repeat_days)
            if not day_overlap:
                continue

            # Check if times overlap
            my_start = my_avail.time_start
            my_end = my_avail.time_end
            their_start = avail.time_start
            their_end = avail.time_end

            # Simple string comparison works for HH:MM format
            if my_start < their_end and their_start < my_end:
                times_overlap = True
                overlap_start = max(my_start, their_start)
                overlap_end = min(my_end, their_end)
                overlapping_times.append({
                    "days": list(day_overlap),
                    "start": overlap_start,
                    "end": overlap_end,
                })

        people.append(
            PersonAtLocation(
                user=UserRead.model_validate(user),
                availability=AvailabilityRead.model_validate(avail),
                shared_interests=shared_names,
                times_overlap=times_overlap,
                overlapping_times=overlapping_times if times_overlap else None,
            )
        )

    # Sort: overlapping times first, then by number of shared interests
    people.sort(key=lambda p: (-p.times_overlap, -len(p.shared_interests)))

    return people


@router.post("/interest", status_code=status.HTTP_201_CREATED)
async def express_interest(
    data: ExpressInterestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Express interest in meeting someone at a location.
    If mutual interest exists, a Match is created.
    """
    if data.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot express interest in yourself")

    # Check target user exists
    result = await db.execute(select(User).where(User.id == data.target_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check availability exists
    result = await db.execute(
        select(Availability).where(Availability.id == data.availability_id)
    )
    availability = result.scalar_one_or_none()
    if not availability:
        raise HTTPException(status_code=404, detail="Availability not found")

    # Check if interest already exists
    result = await db.execute(
        select(UserInterest).where(
            UserInterest.requester_id == current_user.id,
            UserInterest.target_id == data.target_id,
            UserInterest.availability_id == data.availability_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already expressed interest")

    # Create the interest
    interest = UserInterest(
        requester_id=current_user.id,
        target_id=data.target_id,
        availability_id=data.availability_id,
    )
    db.add(interest)

    # Check for mutual interest
    result = await db.execute(
        select(UserInterest).where(
            UserInterest.requester_id == data.target_id,
            UserInterest.target_id == current_user.id,
            # Any availability at same location
            UserInterest.availability_id == data.availability_id,
        )
    )
    mutual = result.scalar_one_or_none()

    match_created = False
    if mutual:
        # Create a match! Order user IDs for consistency
        user1_id, user2_id = sorted([current_user.id, data.target_id])

        # Check if match already exists
        result = await db.execute(
            select(Match).where(
                Match.user1_id == user1_id,
                Match.user2_id == user2_id,
                Match.availability_id == data.availability_id,
            )
        )
        existing_match = result.scalar_one_or_none()

        if not existing_match:
            match = Match(
                user1_id=user1_id,
                user2_id=user2_id,
                availability_id=data.availability_id,
                status="pending",
            )
            db.add(match)
            match_created = True

    await db.commit()

    return {
        "message": "Interest expressed",
        "mutual_match": match_created,
    }


@router.get("/matches", response_model=list[MatchRead])
async def get_my_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all matches (mutual interests) for the current user."""
    result = await db.execute(
        select(Match)
        .where(
            or_(
                Match.user1_id == current_user.id,
                Match.user2_id == current_user.id,
            )
        )
        .options(
            selectinload(Match.user1).selectinload(User.interests),
            selectinload(Match.user2).selectinload(User.interests),
            selectinload(Match.availability),
        )
        .order_by(Match.created_at.desc())
    )
    matches = result.scalars().all()

    # Build response with "other user" field
    response = []
    for match in matches:
        other_user = match.user2 if match.user1_id == current_user.id else match.user1

        match_read = MatchRead(
            id=match.id,
            user1_id=match.user1_id,
            user2_id=match.user2_id,
            availability_id=match.availability_id,
            status=match.status,
            proposed_datetime=match.proposed_datetime,
            proposed_by_id=match.proposed_by_id,
            confirmed_at=match.confirmed_at,
            created_at=match.created_at,
            other_user=UserRead.model_validate(other_user),
            availability=AvailabilityRead.model_validate(match.availability),
        )
        response.append(match_read)

    return response


@router.post("/matches/{match_id}/propose-time")
async def propose_meetup_time(
    match_id: int,
    data: ProposeTimeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Propose a time for the meetup."""
    result = await db.execute(
        select(Match).where(
            Match.id == match_id,
            or_(
                Match.user1_id == current_user.id,
                Match.user2_id == current_user.id,
            ),
        )
    )
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status not in ("pending", "time_proposed"):
        raise HTTPException(status_code=400, detail="Cannot propose time for this match")

    match.proposed_datetime = data.proposed_datetime
    match.proposed_by_id = current_user.id
    match.status = "time_proposed"

    await db.commit()

    return {"message": "Time proposed", "proposed_datetime": data.proposed_datetime}


@router.post("/matches/{match_id}/confirm")
async def confirm_meetup_time(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm the proposed meetup time."""
    result = await db.execute(
        select(Match).where(
            Match.id == match_id,
            or_(
                Match.user1_id == current_user.id,
                Match.user2_id == current_user.id,
            ),
        )
    )
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status != "time_proposed":
        raise HTTPException(status_code=400, detail="No time proposed yet")

    if match.proposed_by_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot confirm your own proposal")

    match.status = "confirmed"
    match.confirmed_at = datetime.utcnow()

    await db.commit()

    return {"message": "Meetup confirmed!", "scheduled_datetime": match.proposed_datetime}


@router.get("/interests/sent")
async def get_sent_interests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all interests I've expressed (to see who I've already liked)."""
    result = await db.execute(
        select(UserInterest)
        .where(UserInterest.requester_id == current_user.id)
        .options(
            selectinload(UserInterest.target).selectinload(User.interests),
            selectinload(UserInterest.availability),
        )
    )
    interests = result.scalars().all()

    return [
        {
            "id": i.id,
            "target_id": str(i.target_id),
            "availability_id": i.availability_id,
            "created_at": i.created_at,
        }
        for i in interests
    ]

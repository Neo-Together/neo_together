"""Groups endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Group, GroupMember, GroupJoinRequest
from app.schemas.group import GroupRead, GroupJoinRequestRead
from app.schemas.user import UserRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("/", response_model=list[GroupRead])
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all groups I'm a member of."""
    result = await db.execute(
        select(Group)
        .join(GroupMember)
        .where(
            GroupMember.user_id == current_user.id,
            GroupMember.status == "confirmed",
            Group.status == "active",
        )
        .options(
            selectinload(Group.members).selectinload(GroupMember.user).selectinload(User.interests),
            selectinload(Group.availability),
        )
    )
    groups = result.scalars().unique().all()

    # Build response with user data
    response = []
    for group in groups:
        group_read = GroupRead.model_validate(group)
        for member in group_read.members:
            member_obj = next((m for m in group.members if m.id == member.id), None)
            if member_obj and member_obj.user:
                member.user = UserRead.model_validate(member_obj.user)
        response.append(group_read)

    return response


@router.get("/join-requests", response_model=list[GroupJoinRequestRead])
async def get_pending_join_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pending join requests for groups I'm a member of."""
    # Get groups where I'm a member
    result = await db.execute(
        select(Group.id)
        .join(GroupMember)
        .where(
            GroupMember.user_id == current_user.id,
            GroupMember.status == "confirmed",
        )
    )
    my_group_ids = [g for g in result.scalars().all()]

    if not my_group_ids:
        return []

    # Get pending requests for those groups
    result = await db.execute(
        select(GroupJoinRequest)
        .where(
            GroupJoinRequest.group_id.in_(my_group_ids),
            GroupJoinRequest.status == "pending",
        )
        .options(
            selectinload(GroupJoinRequest.user).selectinload(User.interests),
            selectinload(GroupJoinRequest.group).selectinload(Group.members),
        )
    )
    requests = result.scalars().all()

    response = []
    for req in requests:
        req_read = GroupJoinRequestRead.model_validate(req)
        if req.user:
            req_read.user = UserRead.model_validate(req.user)
        response.append(req_read)

    return response


@router.post("/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def request_to_join_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request to join a group."""
    # Get the group
    result = await db.execute(
        select(Group)
        .where(Group.id == group_id, Group.status == "active")
        .options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if already a member
    is_member = any(m.user_id == current_user.id and m.status == "confirmed" for m in group.members)
    if is_member:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    # Check if request already exists
    result = await db.execute(
        select(GroupJoinRequest).where(
            GroupJoinRequest.group_id == group_id,
            GroupJoinRequest.user_id == current_user.id,
            GroupJoinRequest.status == "pending",
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already requested to join")

    # Check max group size
    confirmed_members = [m for m in group.members if m.status == "confirmed"]
    for member in confirmed_members:
        if member.user and len(confirmed_members) >= member.user.max_group_size:
            raise HTTPException(
                status_code=400,
                detail="One member prefers smaller groups - group is at maximum size"
            )

    # Create join request
    join_request = GroupJoinRequest(
        group_id=group_id,
        user_id=current_user.id,
        status="pending",
    )
    db.add(join_request)
    await db.commit()

    return {
        "message": "Join request sent! You can assume you can join, but the group will let you know if they prefer to stay amongst themselves.",
        "request_id": join_request.id,
    }


@router.post("/join-requests/{request_id}/accept")
async def accept_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a join request (any group member can accept)."""
    # Get the request
    result = await db.execute(
        select(GroupJoinRequest)
        .where(GroupJoinRequest.id == request_id)
        .options(selectinload(GroupJoinRequest.group).selectinload(Group.members))
    )
    join_request = result.scalar_one_or_none()

    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    if join_request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    # Check if current user is a member of the group
    is_member = any(
        m.user_id == current_user.id and m.status == "confirmed"
        for m in join_request.group.members
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Accept the request
    join_request.status = "accepted"
    join_request.responded_at = datetime.utcnow()

    # Add as member
    new_member = GroupMember(
        group_id=join_request.group_id,
        user_id=join_request.user_id,
        role="member",
        status="confirmed",
    )
    db.add(new_member)

    await db.commit()

    return {"message": "Member added to group"}


@router.post("/join-requests/{request_id}/decline")
async def decline_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Decline a join request (any group member can decline)."""
    # Get the request
    result = await db.execute(
        select(GroupJoinRequest)
        .where(GroupJoinRequest.id == request_id)
        .options(selectinload(GroupJoinRequest.group).selectinload(Group.members))
    )
    join_request = result.scalar_one_or_none()

    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    if join_request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    # Check if current user is a member of the group
    is_member = any(
        m.user_id == current_user.id and m.status == "confirmed"
        for m in join_request.group.members
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Decline the request
    join_request.status = "declined"
    join_request.responded_at = datetime.utcnow()

    await db.commit()

    return {"message": "Join request declined"}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Interest
from app.schemas import UserCreate, UserSignupResponse, UserRead, LoginRequest, TokenResponse
from app.utils import (
    generate_private_key,
    hash_private_key,
    verify_private_key,
    create_access_token,
    is_approved_name,
    normalize_name,
    get_approved_names,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserSignupResponse)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new user account.
    Returns the user profile and a private key (shown only once!).
    """
    # Validate name is approved
    normalized_name = normalize_name(user_data.first_name)
    if not is_approved_name(normalized_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Name '{user_data.first_name}' is not in the approved list. "
                   f"Please choose from the approved names.",
        )

    # Validate birth year
    if user_data.birth_year < 1900 or user_data.birth_year > 2010:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Birth year must be between 1900 and 2010",
        )

    # Fetch selected interests
    result = await db.execute(
        select(Interest).where(Interest.id.in_(user_data.interest_ids))
    )
    interests = result.scalars().all()

    if len(interests) != len(user_data.interest_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more interest IDs are invalid",
        )

    # Generate private key
    private_key = generate_private_key()
    hashed_key = hash_private_key(private_key)

    # Create user
    user = User(
        first_name=normalized_name,
        birth_year=user_data.birth_year,
        gender=user_data.gender,
        private_key_hash=hashed_key,
        interests=list(interests),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Load interests relationship for response
    result = await db.execute(
        select(User).where(User.id == user.id).options(selectinload(User.interests))
    )
    user = result.scalar_one()

    return UserSignupResponse(
        user=UserRead.model_validate(user),
        private_key=private_key,
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login with first name and private key.
    Returns a JWT access token.
    """
    normalized_name = normalize_name(credentials.first_name)

    # Find users with this name (there could be multiple)
    result = await db.execute(
        select(User).where(User.first_name == normalized_name)
    )
    users = result.scalars().all()

    # Try to find a user whose private key matches
    authenticated_user = None
    for user in users:
        if verify_private_key(credentials.private_key, user.private_key_hash):
            authenticated_user = user
            break

    if authenticated_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid name or private key",
        )

    # Create access token
    access_token = create_access_token(data={"sub": str(authenticated_user.id)})

    return TokenResponse(access_token=access_token)


@router.get("/approved-names", response_model=list[str])
async def list_approved_names():
    """Get the list of approved first names."""
    return get_approved_names()

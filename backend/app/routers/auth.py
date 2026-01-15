from datetime import datetime
from pydantic import BaseModel, EmailStr

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
from app.utils.email import generate_magic_token, get_magic_token_expiry, send_magic_link_email
from app.config import get_settings

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


# Magic Link Authentication Schemas
class MagicLinkRequest(BaseModel):
    """Request to send a magic link."""
    email: EmailStr


class MagicLinkVerify(BaseModel):
    """Request to verify a magic link token."""
    token: str


# Magic Link Authentication Endpoints
@router.post("/request-magic-link")
async def request_magic_link(data: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """
    Request a magic link to be sent to the email address.
    If the email exists, sends a login link.
    If not, returns success anyway (security: don't reveal if email exists).
    """
    settings = get_settings()

    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        # Generate magic token
        token = generate_magic_token()
        user.magic_token = token
        user.magic_token_expires = get_magic_token_expiry()
        await db.commit()

        # Send email
        send_magic_link_email(data.email, token, settings.frontend_url)

    # Always return success (don't reveal if email exists)
    return {
        "message": "If an account exists with this email, a login link has been sent.",
        "check_email": True,
    }


@router.post("/verify-magic-link", response_model=TokenResponse)
async def verify_magic_link(data: MagicLinkVerify, db: AsyncSession = Depends(get_db)):
    """
    Verify a magic link token and return a JWT access token.
    """
    # Find user by token
    result = await db.execute(
        select(User).where(
            User.magic_token == data.token,
            User.magic_token_expires > datetime.utcnow(),
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link. Please request a new one.",
        )

    # Clear the token (single use)
    user.magic_token = None
    user.magic_token_expires = None
    await db.commit()

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(access_token=access_token)


class EmailSignupRequest(BaseModel):
    """Request to create account with email."""
    email: EmailStr
    first_name: str
    birth_year: int
    gender: str
    interest_ids: list[int]


@router.post("/signup-with-email")
async def signup_with_email(data: EmailSignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new user account with email authentication.
    Sends a magic link to verify the email and complete signup.
    """
    settings = get_settings()

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Validate name is approved
    normalized_name = normalize_name(data.first_name)
    if not is_approved_name(normalized_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Name '{data.first_name}' is not in the approved list.",
        )

    # Validate birth year
    if data.birth_year < 1900 or data.birth_year > 2010:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Birth year must be between 1900 and 2010",
        )

    # Fetch selected interests
    result = await db.execute(
        select(Interest).where(Interest.id.in_(data.interest_ids))
    )
    interests = result.scalars().all()

    if len(interests) != len(data.interest_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more interest IDs are invalid",
        )

    # Generate magic token and a placeholder private key (for backwards compat)
    magic_token = generate_magic_token()
    private_key = generate_private_key()
    hashed_key = hash_private_key(private_key)

    # Create user
    user = User(
        email=data.email,
        first_name=normalized_name,
        birth_year=data.birth_year,
        gender=data.gender,
        private_key_hash=hashed_key,
        interests=list(interests),
        magic_token=magic_token,
        magic_token_expires=get_magic_token_expiry(),
    )

    db.add(user)
    await db.commit()

    # Send verification email
    send_magic_link_email(data.email, magic_token, settings.frontend_url)

    return {
        "message": "Account created! Check your email for a login link.",
        "check_email": True,
    }


class AddEmailRequest(BaseModel):
    """Request to add email to existing account."""
    email: EmailStr


@router.post("/add-email")
async def add_email_to_account(
    data: AddEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Add email to an existing account (for users who signed up with private key).
    Requires authentication via header.
    """
    from app.dependencies import get_current_user

    # This would need auth - simplified for now
    # In production, use: current_user: User = Depends(get_current_user)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Use PATCH /users/me/email instead",
    )

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


def generate_private_key() -> str:
    """
    Generate a cryptographically secure private key.
    Returns a 32-character hex string (128 bits of entropy).
    """
    return secrets.token_hex(16)


def hash_private_key(private_key: str) -> str:
    """Hash a private key for storage using SHA256."""
    return hashlib.sha256(private_key.encode()).hexdigest()


def verify_private_key(plain_key: str, hashed_key: str) -> bool:
    """Verify a private key against its SHA256 hash."""
    return hashlib.sha256(plain_key.encode()).hexdigest() == hashed_key


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token. Returns None if invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None

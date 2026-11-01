import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import bcrypt
import jwt
from backend.app.core.config import config

JWT_SECRET_KEY = config.JWT_SECRET_KEY
JWT_ALGORITHM = config.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = config.REFRESH_TOKEN_EXPIRE_DAYS


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash in constant time."""
    if not plain_password or not hashed_password:
        return False
    try:
        password_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates a secure, salted bcrypt hash of the password."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    full_name: str,
    jti: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str, datetime]:
    """
    Creates a signed JWT Access Token carrying user identity and authorization claims.
    Returns: (token_string, jti, expires_at)
    """
    token_jti = jti or str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    if expires_delta:
        expires_at = now + expires_delta
    else:
        expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "full_name": full_name,
        "jti": token_jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp())
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, token_jti, expires_at


def create_refresh_token(
    user_id: int,
    jti: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str, datetime]:
    """
    Creates a signed JWT Refresh Token for session continuation.
    Returns: (token_string, jti, expires_at)
    """
    token_jti = jti or str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    if expires_delta:
        expires_at = now + expires_delta
    else:
        expires_at = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "jti": token_jti,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp())
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, token_jti, expires_at


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT token.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM]
    )

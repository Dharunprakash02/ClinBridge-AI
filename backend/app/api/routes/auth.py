from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import jwt

from backend.app.api.dependencies import get_db, get_current_user, oauth2_scheme
from backend.app.db.models import User, UserSession, RevokedToken
from backend.app.core.config import config
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
    PasswordChangeRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new clinical user with role-based access control.
    Atomic database transaction with automatic rollback on error.
    """
    normalized_email = request.email.strip().lower()

    # Check for existing user with same email
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered. Please sign in or use another email."
        )

    try:
        hashed_pwd = get_password_hash(request.password)
        new_user = User(
            email=normalized_email,
            hashed_password=hashed_pwd,
            full_name=request.full_name.strip(),
            role=request.role,
            organization=request.organization.strip() if request.organization else None,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates clinical user with constant-time password verification.
    Issues signed JWT Access Token and Refresh Token with JTI tracking.
    """
    normalized_email = request.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your system administrator.",
        )

    try:
        # Create access token and refresh token
        access_token, access_jti, access_exp = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
            full_name=user.full_name
        )
        refresh_token, refresh_jti, refresh_exp = create_refresh_token(user_id=user.id)

        # Store session in database for audit trail
        session_entry = UserSession(
            jti=access_jti,
            user_id=user.id,
            token_type="access",
            is_revoked=False,
            expires_at=access_exp
        )
        db.add(session_entry)
        db.commit()

        expires_in = config.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication service error: {str(e)}"
        )


@router.post("/logout")
def logout_user(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately revokes the user's active JWT Access Token by registering its JTI
    in the revoked tokens blocklist, preventing replay attacks.
    """
    try:
        payload = decode_token(token)
        jti = payload.get("jti")
        exp_ts = payload.get("exp")
        exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)

        if jti:
            revocation = RevokedToken(
                jti=jti,
                user_id=current_user.id,
                expires_at=exp_dt
            )
            db.add(revocation)

            # Update session if tracked
            session = db.query(UserSession).filter(UserSession.jti == jti).first()
            if session:
                session.is_revoked = True
                session.revoked_at = datetime.now(timezone.utc)

            db.commit()

        return {"status": "success", "message": "Successfully logged out. Session revoked."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and active role."""
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Rotates a valid Refresh Token into a fresh Access Token and new Refresh Token.
    """
    try:
        payload = decode_token(request.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token signature or claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Refresh token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti:
        revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed refresh token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Revoke the used refresh token (token rotation)
        if jti:
            exp_ts = payload.get("exp")
            exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)
            db.add(RevokedToken(jti=jti, user_id=user.id, expires_at=exp_dt))

        # Generate new pair
        access_token, access_jti, access_exp = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
            full_name=user.full_name
        )
        new_refresh_token, _, _ = create_refresh_token(user_id=user.id)

        # Store session
        db.add(UserSession(
            jti=access_jti,
            user_id=user.id,
            token_type="access",
            is_revoked=False,
            expires_at=access_exp
        ))
        db.commit()

        expires_in = config.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failure: {str(e)}"
        )


@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows an authenticated user to update their password securely."""
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    try:
        current_user.hashed_password = get_password_hash(request.new_password)
        db.commit()
        return {"status": "success", "message": "Password changed successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}"
        )


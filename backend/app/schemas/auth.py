import re
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, ConfigDict

# Robust standard email validation regex (RFC 5322 compatible subset)
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# Password policy regex: min 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{}|;:,.<>/~`])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{}|;:,.<>/~`]{8,}$")

class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="Unique clinical/institutional email address")
    password: str = Field(..., min_length=8, description="Strong password adhering to HIPAA security standards")
    full_name: str = Field(..., min_length=2, max_length=150, description="Full name and clinical credentials (e.g., Dr. Ananya Sharma, BAMS)")
    role: Literal["clinician", "reviewer", "admin"] = Field(
        default="clinician",
        description="Assigned RBAC role: clinician, reviewer, or admin"
    )
    organization: Optional[str] = Field(default=None, max_length=200, description="Hospital, clinic, or AYUSH research institute")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                "Password must be at least 8 characters long and contain at least one uppercase letter, "
                "one lowercase letter, one numeric digit, and one special symbol (@$!%*?&#^()_+-=)."
            )
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return clean


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token lifespan in seconds")
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid JWT Refresh Token")


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New strong password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                "New password must be at least 8 characters long and contain at least one uppercase letter, "
                "one lowercase letter, one numeric digit, and one special symbol."
            )
        return v

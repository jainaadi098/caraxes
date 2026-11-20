from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)
    company_name: str = Field(min_length=1)
    role: Literal["admin", "creator", "reviewer"] = "admin"


class LoginRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=1)


class OtpSendRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)


class OtpVerifyRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    token: str = Field(min_length=4)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: UUID | str
    email: str
    full_name: str
    role: str
    org_id: UUID | str
    org_name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    success: bool = True
    message: str
    email: str | None = None

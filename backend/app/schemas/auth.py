from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    invitation_code: str
    school_name: Optional[str] = None
    grade: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    school_name: Optional[str] = None
    grade: Optional[str] = None

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    school_name: Optional[str] = None
    grade: Optional[str] = None
    invitation_code: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    school_name: Optional[str] = None
    grade: Optional[str] = None
    is_active: bool
    invitation_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

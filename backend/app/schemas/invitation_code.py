from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class InvitationCodeBase(BaseModel):
    code: str
    label: Optional[str] = None
    max_uses: int = 1
    is_active: bool = True

class InvitationCodeCreate(InvitationCodeBase):
    pass

class InvitationCodeUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None

class InvitationCodeOut(InvitationCodeBase):
    id: uuid.UUID
    uses_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

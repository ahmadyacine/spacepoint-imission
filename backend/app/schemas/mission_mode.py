from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class MissionModeCreate(BaseModel):
    mode_name: str
    display_order: int = 0
    duration_min: float = 0.0
    description: Optional[str] = None

class MissionModeUpdate(BaseModel):
    duration_min: Optional[float] = None
    description: Optional[str] = None
    mode_name: Optional[str] = None

class MissionModeOut(BaseModel):
    id: uuid.UUID
    mission_id: uuid.UUID
    mode_name: str
    display_order: int
    duration_min: float
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

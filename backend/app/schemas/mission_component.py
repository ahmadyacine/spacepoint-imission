from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.schemas.component import ComponentOut

class MissionComponentAdd(BaseModel):
    component_id: uuid.UUID
    quantity: int = 1

class MissionComponentOut(BaseModel):
    id: uuid.UUID
    mission_id: uuid.UUID
    component_id: uuid.UUID
    quantity: int
    created_at: datetime
    component: ComponentOut

    class Config:
        from_attributes = True

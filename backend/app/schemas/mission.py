from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class MissionCreate(BaseModel):
    mission_name: str
    mission_objective: str
    orbit_type: str
    orbit_duration_min: float
    orbits_per_day: float

class MissionOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    mission_name: str
    mission_objective: str
    orbit_type: str
    orbit_duration_min: float
    orbits_per_day: float
    created_at: datetime

    class Config:
        from_attributes = True

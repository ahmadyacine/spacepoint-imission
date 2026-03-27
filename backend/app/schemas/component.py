from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class ComponentCreate(BaseModel):
    component_name: str
    subsystem: str
    example_role: Optional[str] = None
    scaled_description: Optional[str] = None
    scaled_dimensions_mm: Optional[str] = None
    scaled_mass_g: Optional[float] = None
    voltage_v: Optional[float] = None
    current_ma: Optional[float] = None
    data_size: Optional[str] = None
    assumed_cost_usd: Optional[float] = None
    temperature_range: Optional[str] = None
    key_specs: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True
    notes: Optional[str] = None
    component_code: Optional[str] = None

class ComponentUpdate(BaseModel):
    component_name: Optional[str] = None
    subsystem: Optional[str] = None
    example_role: Optional[str] = None
    scaled_description: Optional[str] = None
    scaled_dimensions_mm: Optional[str] = None
    scaled_mass_g: Optional[float] = None
    voltage_v: Optional[float] = None
    current_ma: Optional[float] = None
    data_size: Optional[str] = None
    assumed_cost_usd: Optional[float] = None
    temperature_range: Optional[str] = None
    key_specs: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    component_code: Optional[str] = None

class ComponentOut(BaseModel):
    id: uuid.UUID
    component_name: str
    subsystem: str
    example_role: Optional[str]
    scaled_description: Optional[str]
    scaled_dimensions_mm: Optional[str]
    scaled_mass_g: Optional[float]
    voltage_v: Optional[float]
    current_ma: Optional[float]
    data_size: Optional[str]
    assumed_cost_usd: Optional[float]
    temperature_range: Optional[str]
    key_specs: Optional[str]
    image_url: Optional[str]
    is_active: bool
    notes: Optional[str]
    component_code: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

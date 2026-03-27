from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid

# ── Save payload ──────────────────────────────────────────────────────────────

class ModeDurationUpdate(BaseModel):
    mode_id: uuid.UUID
    duration_min: float

class CellState(BaseModel):
    mission_component_id: uuid.UUID
    mission_mode_id: uuid.UUID
    is_on: bool

class ConopsSavePayload(BaseModel):
    mode_durations: List[ModeDurationUpdate]
    cell_states: List[CellState]

# ── Full matrix response ───────────────────────────────────────────────────────

class ModeHeader(BaseModel):
    id: uuid.UUID
    mode_name: str
    display_order: int
    duration_min: float

class ComponentRow(BaseModel):
    mission_component_id: uuid.UUID
    component_id: uuid.UUID
    component_name: str
    subsystem: str
    image_url: Optional[str]
    quantity: int
    # mode_id -> is_on
    states: Dict[str, bool]          # keyed by str(mode_id)

class ConopsMatrixOut(BaseModel):
    mission_id: uuid.UUID
    orbit_duration_min: float
    modes: List[ModeHeader]
    components: List[ComponentRow]

# ── Summary response ──────────────────────────────────────────────────────────

class ModePercentage(BaseModel):
    mode_id: uuid.UUID
    mode_name: str
    duration_min: float
    percentage: float

class ComponentActiveTime(BaseModel):
    mission_component_id: uuid.UUID
    component_name: str
    subsystem: str
    active_time_min: float

class ConopsSummaryOut(BaseModel):
    orbit_duration_min: float
    total_mode_duration_min: float
    duration_difference_min: float
    duration_valid: bool
    per_mode: List[ModePercentage]
    component_active_times: List[ComponentActiveTime]
    subsystem_active_times: Dict[str, float]
    unused_components: List[str]
    validation_messages: List[str]

from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid
from datetime import datetime

# ── Entry (student-editable fields) ────────────────────────────────────────────

class DataBudgetEntryInput(BaseModel):
    mission_component_id: uuid.UUID
    data_type: Optional[str] = None
    data_size_per_measurement_kb: float = 0.0
    measurements_per_minute: float = 0.0
    priority: str = "Medium"
    storage_mode: str = "Stored"
    notes: Optional[str] = None

class DataBudgetSavePayload(BaseModel):
    entries: List[DataBudgetEntryInput]

# ── Full merged row returned to the frontend ──────────────────────────────────

class DataBudgetRowOut(BaseModel):
    mission_component_id: uuid.UUID
    component_id: uuid.UUID
    component_name: str
    subsystem: str
    image_url: Optional[str]
    quantity: int
    # CONOPS-sourced (read-only)
    active_time_per_orbit_min: float
    orbits_per_day: float
    # Student-editable saved values
    data_type: Optional[str]
    data_size_per_measurement_kb: float
    measurements_per_minute: float
    priority: str
    storage_mode: str
    notes: Optional[str]
    # Calculated outputs
    data_per_orbit_kb: float
    data_per_day_kb: float

    class Config:
        from_attributes = True

# ── Summary/totals ────────────────────────────────────────────────────────────

class SubsystemDataTotal(BaseModel):
    subsystem: str
    data_per_orbit_kb: float
    data_per_day_kb: float

class TopComponent(BaseModel):
    component_name: str
    subsystem: str
    data_per_day_kb: float

class DataBudgetSummaryOut(BaseModel):
    # Totals
    total_data_per_orbit_kb: float
    total_data_per_day_kb: float
    total_stored_per_day_kb: float
    total_sent_per_day_kb: float
    # Storage constraint
    max_storage_kb: float
    required_storage_margin_kb: float
    storage_used_kb: float
    storage_remaining_kb: float
    storage_margin_ok: bool
    storage_capacity_ok: bool
    is_valid: bool
    # Breakdown
    subsystem_totals: List[SubsystemDataTotal]
    top_components: List[TopComponent]
    validation_messages: List[str]

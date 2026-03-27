from pydantic import BaseModel
from typing import Optional, List
import uuid


# ── CubeSat preset ────────────────────────────────────────────────────────────

class CubeSatPreset(BaseModel):
    size: str
    available_volume_cm3: float
    max_mass_kg: float


# ── Per-row output ────────────────────────────────────────────────────────────

class MassBudgetRowOut(BaseModel):
    mission_component_id: uuid.UUID
    component_id: uuid.UUID
    component_name: str
    subsystem: str
    image_url: Optional[str]
    quantity: int
    mass_per_unit_g: Optional[float]
    length_x_mm: Optional[float]
    width_y_mm: Optional[float]
    height_z_mm: Optional[float]
    # Calculated
    total_mass_g: float
    volume_per_unit_mm3: float
    total_volume_mm3: float
    row_status: str   # "OK" | "Missing Mass" | "Missing Dims" | "Zero Qty"

    class Config:
        from_attributes = True


# ── Save payload ──────────────────────────────────────────────────────────────

class MassBudgetEntryInput(BaseModel):
    mission_component_id: uuid.UUID
    quantity: int = 1
    mass_per_unit_g: Optional[float] = None
    length_x_mm: Optional[float] = None
    width_y_mm: Optional[float] = None
    height_z_mm: Optional[float] = None
    notes: Optional[str] = None


class MassBudgetSavePayload(BaseModel):
    entries: List[MassBudgetEntryInput]


# ── Constraint sub-schema ─────────────────────────────────────────────────────

class MassConstraintsOut(BaseModel):
    max_allowed_mass_kg: float
    selected_cubesat_size: str
    available_internal_volume_cm3: float
    presets: List[CubeSatPreset]


class ConstraintUpdate(BaseModel):
    max_allowed_mass_kg: Optional[float] = None
    selected_cubesat_size: Optional[str] = None
    available_internal_volume_cm3: Optional[float] = None



# ── Summary ───────────────────────────────────────────────────────────────────

class SubsystemMassTotal(BaseModel):
    subsystem: str
    total_mass_g: float
    total_volume_mm3: float


class TopMassComponent(BaseModel):
    component_name: str
    subsystem: str
    total_mass_g: float


class MassBudgetSummaryOut(BaseModel):
    # Mass
    total_mass_g: float
    total_mass_kg: float
    max_allowed_mass_kg: float
    mass_margin_kg: float
    launch_status: str      # "✅ Within Mass Limit" | "❌ Too Heavy"
    mass_ok: bool
    # Volume
    total_volume_mm3: float
    total_volume_cm3: float
    selected_cubesat_size: str
    available_internal_volume_cm3: float
    volume_margin_cm3: float
    size_status: str        # "✅ Fits Selected Size" | "❌ Too Large"
    volume_ok: bool
    # Combined
    is_valid: bool
    # Breakdown
    subsystem_totals: List[SubsystemMassTotal]
    top_components: List[TopMassComponent]
    validation_messages: List[str]

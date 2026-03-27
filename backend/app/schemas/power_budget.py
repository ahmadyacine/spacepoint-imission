from pydantic import BaseModel
from typing import Optional, List
import uuid

# ── Per-row output ─────────────────────────────────────────────────────────────

class PowerBudgetRowOut(BaseModel):
    mission_component_id: uuid.UUID
    component_id: uuid.UUID
    component_name: str
    subsystem: str
    image_url: Optional[str]
    quantity: int
    # CONOPS-sourced (read-only)
    active_time_per_orbit_min: float
    orbits_per_day: float
    # Component library defaults / saved entry
    voltage_v: float
    current_ma: float
    # Calculated
    power_mw: float
    energy_per_orbit_mwh: float
    power_status: str   # "OK" | "Missing Input" | "Inactive" | "Zero Power"
    is_saved: bool = False

    class Config:
        from_attributes = True

# ── Save payload ───────────────────────────────────────────────────────────────

class PowerBudgetEntryInput(BaseModel):
    mission_component_id: uuid.UUID
    voltage_v: float = 0.0
    current_ma: float = 0.0
    notes: Optional[str] = None

class PowerBudgetSavePayload(BaseModel):
    entries: List[PowerBudgetEntryInput]
    selected_solar_cells: int = 0

# ── Summary ────────────────────────────────────────────────────────────────────

class SubsystemPowerTotal(BaseModel):
    subsystem: str
    power_mw: float
    energy_per_orbit_mwh: float

class TopEnergyComponent(BaseModel):
    component_name: str
    subsystem: str
    energy_per_orbit_mwh: float

class PowerBudgetSummaryOut(BaseModel):
    # Totals
    total_power_consumption_mw: float
    total_power_consumption_w: float
    total_energy_per_orbit_mwh: float
    orbits_per_day: float
    total_energy_per_day_mwh: float
    # Solar sizing
    power_per_solar_cell_w: float
    required_number_of_solar_cells: int
    selected_solar_cells: int
    solar_panels_generated_power_w: float
    power_margin_w: float
    # Validation
    is_valid: bool
    power_status: str   # "Enough Power" | "Exactly Matched" | "Not Enough Power"
    # Breakdown
    subsystem_totals: List[SubsystemPowerTotal]
    top_components: List[TopEnergyComponent]
    validation_messages: List[str]

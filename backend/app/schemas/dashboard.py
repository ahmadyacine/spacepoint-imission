from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class MissionInfo(BaseModel):
    id: str
    mission_name: str
    mission_objective: Optional[str] = None
    orbit_type: Optional[str] = None
    orbit_duration_min: Optional[float] = None
    orbits_per_day: Optional[float] = None
    selected_cubesat_size: Optional[str] = None
    components_count: int = 0
    last_updated: Optional[str] = None
    student_name: Optional[str] = None
    school_name: Optional[str] = None
    grade: Optional[str] = None

class OverallStatus(BaseModel):
    status: str  # "Ready" | "Needs Review" | "Invalid Mission"
    all_valid: bool
    warnings_count: int
    errors_count: int

class StepStatus(BaseModel):
    step: str
    status: str  # "complete" | "warning" | "invalid" | "incomplete"
    page: str

class KPIs(BaseModel):
    total_components: int
    total_modes: int
    total_data_per_day_kb: float
    total_power_consumption_mw: float
    total_mass_kg: float
    total_platform_cost_aed: float
    system_link_margin_db: float

class MarginItem(BaseModel):
    label: str
    value: float
    unit: str
    status: str  # "good" | "warning" | "fail"
    interpretation: str

class ModuleCard(BaseModel):
    module: str
    status: str  # "complete" | "warning" | "invalid" | "incomplete"
    kpi1_label: str
    kpi1_value: str
    kpi2_label: str
    kpi2_value: str
    note: str
    page: str

class SubsystemChartItem(BaseModel):
    subsystem: str
    value: float

class TopComponentItem(BaseModel):
    component_name: str
    subsystem: str
    value: float

class ModeDistItem(BaseModel):
    mode_name: str
    duration_min: float
    percentage: float

class Charts(BaseModel):
    components_by_subsystem: List[SubsystemChartItem]
    data_by_subsystem: List[SubsystemChartItem]
    power_by_subsystem: List[SubsystemChartItem]
    mass_by_subsystem: List[SubsystemChartItem]
    cost_by_subsystem: List[SubsystemChartItem]
    mode_distribution: List[ModeDistItem]
    top_by_data: List[TopComponentItem]
    top_by_power: List[TopComponentItem]
    top_by_mass: List[TopComponentItem]
    top_by_cost: List[TopComponentItem]

class DashboardOut(BaseModel):
    mission: MissionInfo
    overall_status: OverallStatus
    step_status: List[StepStatus]
    kpis: KPIs
    margins: List[MarginItem]
    module_cards: List[ModuleCard]
    charts: Charts
    alerts: List[str]
    recommendations: List[str]

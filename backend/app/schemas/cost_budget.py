from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class CostBudgetRowOut(BaseModel):
    mission_component_id: UUID
    component_name: str
    subsystem: str
    image_url: Optional[str] = None
    
    quantity: int
    cost_per_unit_aed: Optional[float] = None
    total_cost_aed: float
    
    vendor: Optional[str] = None
    priority: Optional[str] = None
    purchase_link: Optional[str] = None
    notes: Optional[str] = None
    
    is_saved: bool = False

class CostBudgetEntryInput(BaseModel):
    mission_component_id: UUID
    quantity: int
    cost_per_unit_aed: Optional[float] = None
    vendor: Optional[str] = None
    priority: Optional[str] = None
    purchase_link: Optional[str] = None
    notes: Optional[str] = None

class CostBudgetSavePayload(BaseModel):
    entries: List[CostBudgetEntryInput]

class SubsystemCostTotal(BaseModel):
    subsystem: str
    cost: float

class TopComponentCost(BaseModel):
    component_name: str
    subsystem: str
    total_cost_aed: float

class CostBudgetSummaryOut(BaseModel):
    total_platform_cost_aed: float
    maximum_budget_aed: float
    cost_margin_aed: float
    budget_status: str
    is_valid: bool
    
    most_expensive_component: Optional[str] = None
    most_expensive_cost: float = 0.0
    
    subsystem_totals: List[SubsystemCostTotal]
    top_components: List[TopComponentCost]
    validation_messages: List[str]

class CostBudgetOut(BaseModel):
    mission: dict
    constraints: dict
    rows: List[CostBudgetRowOut]

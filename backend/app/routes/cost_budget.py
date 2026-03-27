from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from collections import defaultdict
from typing import List

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_component import MissionComponent
from app.models.mission_constraint import MissionConstraint
from app.models.cost_budget_entry import CostBudgetEntry
from app.schemas.cost_budget import (
    CostBudgetOut, CostBudgetRowOut, CostBudgetSavePayload,
    CostBudgetSummaryOut, SubsystemCostTotal, TopComponentCost
)

router = APIRouter(prefix="/missions/{mission_id}/cost-budget", tags=["Cost Budget"])

@router.get("", response_model=CostBudgetOut)
def get_cost_budget(mission_id: UUID, db: Session = Depends(get_db)):
    # 1. Get mission & constraints
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    constraints = db.query(MissionConstraint).filter(MissionConstraint.mission_id == mission_id).first()
    if not constraints:
        constraints = MissionConstraint(mission_id=mission_id)
        db.add(constraints)
        db.commit()
        db.refresh(constraints)

    # 2. Get mission components with linked Component & CostBudgetEntry
    mcs = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    
    # 3. Build merged rows
    rows = []
    for mc in mcs:
        c = mc.component
        entry = db.query(CostBudgetEntry).filter(CostBudgetEntry.mission_component_id == mc.id).first()
        
        # Quantity logic
        quantity = mc.quantity
        if entry and entry.quantity is not None:
            quantity = entry.quantity
            
        # Cost logic
        cost_per_unit = 0.0
        if entry and entry.cost_per_unit_aed is not None:
            cost_per_unit = entry.cost_per_unit_aed
        elif c.assumed_cost_usd is not None:
            cost_per_unit = c.assumed_cost_usd * 3.67  # Simple USD to AED conversion

        total_cost = quantity * cost_per_unit

        row_data = {
            "mission_component_id": mc.id,
            "component_name": c.component_name,
            "subsystem": c.subsystem,
            "image_url": c.image_url,
            "quantity": quantity,
            "cost_per_unit_aed": cost_per_unit,
            "total_cost_aed": total_cost,
            "vendor": entry.vendor if entry else None,
            "priority": entry.priority if entry else None,
            "purchase_link": entry.purchase_link if entry else None,
            "notes": entry.notes if entry else None,
            "is_saved": entry is not None
        }
        rows.append(CostBudgetRowOut(**row_data))
        
    # Sort for consistent display (subsystem, then name)
    rows.sort(key=lambda r: (r.subsystem, r.component_name))

    return CostBudgetOut(
        mission={"id": str(mission.id), "mission_name": mission.mission_name, "orbit_type": mission.orbit_type},
        constraints={"maximum_budget_aed": constraints.maximum_budget_aed},
        rows=rows
    )

@router.post("/save")
def save_cost_budget(mission_id: UUID, payload: CostBudgetSavePayload, db: Session = Depends(get_db)):
    # Verify mission
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    for input_row in payload.entries:
        entry = db.query(CostBudgetEntry).filter(CostBudgetEntry.mission_component_id == input_row.mission_component_id).first()
        
        if not entry:
            entry = CostBudgetEntry(mission_component_id=input_row.mission_component_id)
            db.add(entry)
            
        entry.quantity = input_row.quantity
        entry.cost_per_unit_aed = input_row.cost_per_unit_aed
        entry.vendor = input_row.vendor
        entry.priority = input_row.priority
        entry.purchase_link = input_row.purchase_link
        entry.notes = input_row.notes

    db.commit()
    return {"status": "ok", "message": "Cost budget saved successfully"}

@router.get("/summary", response_model=CostBudgetSummaryOut)
def get_cost_budget_summary(mission_id: UUID, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    constraints = db.query(MissionConstraint).filter(MissionConstraint.mission_id == mission_id).first()
    if not constraints:
        raise HTTPException(status_code=400, detail="Mission constraints not initialized")

    mcs = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    
    total_platform_cost = 0.0
    sub_totals = defaultdict(float)
    component_costs = []
    
    for mc in mcs:
        c = mc.component
        entry = db.query(CostBudgetEntry).filter(CostBudgetEntry.mission_component_id == mc.id).first()
        
        quantity = mc.quantity
        if entry and entry.quantity is not None:
            quantity = entry.quantity
            
        cost_per_unit = 0.0
        if entry and entry.cost_per_unit_aed is not None:
            cost_per_unit = entry.cost_per_unit_aed
        elif c.assumed_cost_usd is not None:
            cost_per_unit = c.assumed_cost_usd * 3.67
            
        cost = quantity * cost_per_unit
        
        total_platform_cost += cost
        sub_totals[c.subsystem] += cost
        
        component_costs.append({
            "component_name": c.component_name,
            "subsystem": c.subsystem,
            "total_cost_aed": cost
        })

    # Sort and pick top 6 components by cost
    component_costs.sort(key=lambda x: x["total_cost_aed"], reverse=True)
    top_components = component_costs[:6]
    
    most_expensive_component = None
    most_expensive_cost = 0.0
    if top_components:
        most_expensive_component = top_components[0]["component_name"]
        most_expensive_cost = top_components[0]["total_cost_aed"]

    subsystem_list = [SubsystemCostTotal(subsystem=k, cost=v) for k, v in sub_totals.items() if v > 0]
    subsystem_list.sort(key=lambda x: x.cost, reverse=True)

    max_budget = constraints.maximum_budget_aed
    cost_margin = max_budget - total_platform_cost
    
    is_valid = True
    validation_messages = []
    
    budget_status = "✅ Within Budget"
    if cost_margin < 0:
        is_valid = False
        budget_status = "❌ Over Budget"
        validation_messages.append(f"Mission cost exceeds the maximum budget. Margin: {cost_margin:,.2f} AED.")
    else:
        validation_messages.append("Mission cost is within the allowed budget.")

    return CostBudgetSummaryOut(
        total_platform_cost_aed=total_platform_cost,
        maximum_budget_aed=max_budget,
        cost_margin_aed=cost_margin,
        budget_status=budget_status,
        is_valid=is_valid,
        most_expensive_component=most_expensive_component,
        most_expensive_cost=most_expensive_cost,
        subsystem_totals=subsystem_list,
        top_components=[TopComponentCost(**tc) for tc in top_components],
        validation_messages=validation_messages
    )

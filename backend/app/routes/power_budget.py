import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_component import MissionComponent
from app.models.mission_mode import MissionMode
from app.models.component_mode_state import ComponentModeState
from app.models.mission_constraint import MissionConstraint
from app.models.power_budget_entry import PowerBudgetEntry
from app.models.user import User
from app.schemas.power_budget import (
    PowerBudgetRowOut, PowerBudgetSavePayload, PowerBudgetSummaryOut,
    SubsystemPowerTotal, TopEnergyComponent
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/missions", tags=["Power Budget"])

# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_mission_or_404(mission_id: uuid.UUID, student_id: uuid.UUID, db: Session) -> Mission:
    m = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == student_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return m

def _ensure_constraint(mission: Mission, db: Session) -> MissionConstraint:
    c = db.query(MissionConstraint).filter(MissionConstraint.mission_id == mission.id).first()
    if not c:
        c = MissionConstraint(mission_id=mission.id)
        db.add(c)
        db.commit()
        db.refresh(c)
    return c

def _calc_active_time(mc_id: uuid.UUID, modes: list, db: Session) -> float:
    states = db.query(ComponentModeState).filter(
        ComponentModeState.mission_component_id == mc_id
    ).all()
    state_map = {str(s.mission_mode_id): s.is_on for s in states}
    return sum(m.duration_min for m in modes if state_map.get(str(m.id), False))

def _row_status(voltage: float, current: float, active: float) -> str:
    if active == 0:
        return "Inactive"
    if voltage == 0 and current == 0:
        return "Missing Input"
    if voltage == 0 or current == 0:
        return "Zero Power"
    return "OK"

def _build_row(mc: MissionComponent, active_min: float, orbits_per_day: float) -> PowerBudgetRowOut:
    entry = mc.power_budget_entry
    comp = mc.component

    if entry:
        voltage = entry.voltage_v
        current = entry.current_ma
    else:
        voltage = comp.voltage_v if comp.voltage_v else 0.0
        current = comp.current_ma if comp.current_ma else 0.0

    power_mw = round(voltage * current, 4)
    energy_mwh = round(power_mw * active_min / 60, 4)
    status = _row_status(voltage, current, active_min)

    return PowerBudgetRowOut(
        mission_component_id=mc.id,
        component_id=mc.component_id,
        component_name=comp.component_name,
        subsystem=comp.subsystem,
        image_url=comp.image_url,
        quantity=mc.quantity,
        active_time_per_orbit_min=round(active_min, 4),
        orbits_per_day=orbits_per_day,
        voltage_v=voltage,
        current_ma=current,
        power_mw=power_mw,
        energy_per_orbit_mwh=energy_mwh,
        power_status=status,
        is_saved=entry is not None,
    )

# ── GET /missions/{id}/power-budget ───────────────────────────────────────────

@router.get("/{mission_id}/power-budget", response_model=List[PowerBudgetRowOut])
def get_power_budget(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    return [_build_row(mc, _calc_active_time(mc.id, modes, db), mission.orbits_per_day) for mc in mc_list]

# ── POST /missions/{id}/power-budget/save ─────────────────────────────────────

@router.post("/{mission_id}/power-budget/save")
def save_power_budget(
    mission_id: uuid.UUID,
    payload: PowerBudgetSavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)

    # Save selected solar cells to constraint
    constraint.selected_solar_cells = payload.selected_solar_cells
    constraint.updated_at = datetime.utcnow()

    for entry_in in payload.entries:
        mc = db.query(MissionComponent).filter(
            MissionComponent.id == entry_in.mission_component_id,
            MissionComponent.mission_id == mission_id
        ).first()
        if not mc:
            continue

        entry = db.query(PowerBudgetEntry).filter(
            PowerBudgetEntry.mission_component_id == entry_in.mission_component_id
        ).first()

        if entry:
            entry.voltage_v = entry_in.voltage_v
            entry.current_ma = entry_in.current_ma
            entry.notes = entry_in.notes
            entry.updated_at = datetime.utcnow()
        else:
            db.add(PowerBudgetEntry(
                mission_component_id=entry_in.mission_component_id,
                voltage_v=entry_in.voltage_v,
                current_ma=entry_in.current_ma,
                notes=entry_in.notes,
            ))

    db.commit()
    return {"message": "Power budget saved successfully"}

# ── GET /missions/{id}/power-budget/summary ───────────────────────────────────

@router.get("/{mission_id}/power-budget/summary", response_model=PowerBudgetSummaryOut)
def get_power_budget_summary(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    total_power_mw = 0.0
    total_energy_mwh = 0.0
    subsys: dict = {}
    top: list = []
    messages: list = []

    for mc in mc_list:
        active_min = _calc_active_time(mc.id, modes, db)
        row = _build_row(mc, active_min, mission.orbits_per_day)
        total_power_mw += row.power_mw
        total_energy_mwh += row.energy_per_orbit_mwh

        sub = row.subsystem
        if sub not in subsys:
            subsys[sub] = {"power": 0.0, "energy": 0.0}
        subsys[sub]["power"] += row.power_mw
        subsys[sub]["energy"] += row.energy_per_orbit_mwh

        if row.energy_per_orbit_mwh > 0:
            top.append(TopEnergyComponent(
                component_name=row.component_name,
                subsystem=row.subsystem,
                energy_per_orbit_mwh=row.energy_per_orbit_mwh
            ))

    total_power_w = total_power_mw / 1000
    total_energy_day = total_energy_mwh * mission.orbits_per_day
    cell_w = constraint.power_per_solar_cell_w or 1.1
    selected_cells = int(constraint.selected_solar_cells or 0)

    # New simplified solar logic
    req_cells = math.ceil(total_power_w / cell_w) if total_power_w > 0 and cell_w > 0 else 0
    generated_power_w = selected_cells * cell_w
    margin_w = generated_power_w - total_power_w

    # Validity: only depends on margin >= 0
    is_valid = margin_w >= 0

    if margin_w > 0:
        power_status = "Enough Power"
        messages.append(f"✓ Power margin is {margin_w:.3f} W. Your solar cells provide more than enough power.")
    elif margin_w == 0:
        power_status = "Exactly Matched"
        messages.append("⚠️ Power is exactly matched. Consider adding 1 more solar cell for safety margin.")
    else:
        power_status = "Not Enough Power"
        messages.append(f"❌ Power deficit of {abs(margin_w):.3f} W. You need at least {req_cells} solar cells.")

    if selected_cells < req_cells:
        messages.append(f"⚠️ You selected {selected_cells} solar cells but need at least {req_cells}.")
    elif selected_cells == 0 and req_cells == 0:
        messages.append("No active components with power consumption detected.")

    subsystem_totals = [
        SubsystemPowerTotal(subsystem=k, power_mw=round(v["power"], 3), energy_per_orbit_mwh=round(v["energy"], 3))
        for k, v in subsys.items()
    ]
    top_sorted = sorted(top, key=lambda x: x.energy_per_orbit_mwh, reverse=True)[:8]

    return PowerBudgetSummaryOut(
        total_power_consumption_mw=round(total_power_mw, 3),
        total_power_consumption_w=round(total_power_w, 4),
        total_energy_per_orbit_mwh=round(total_energy_mwh, 3),
        orbits_per_day=mission.orbits_per_day,
        total_energy_per_day_mwh=round(total_energy_day, 3),
        power_per_solar_cell_w=cell_w,
        required_number_of_solar_cells=req_cells,
        selected_solar_cells=selected_cells,
        solar_panels_generated_power_w=round(generated_power_w, 3),
        power_margin_w=round(margin_w, 4),
        is_valid=is_valid,
        power_status=power_status,
        subsystem_totals=subsystem_totals,
        top_components=top_sorted,
        validation_messages=messages,
    )

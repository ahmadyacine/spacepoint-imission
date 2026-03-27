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
from app.models.data_budget_entry import DataBudgetEntry
from app.models.user import User
from app.schemas.data_budget import (
    DataBudgetRowOut, DataBudgetSavePayload, DataBudgetSummaryOut,
    SubsystemDataTotal, TopComponent
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/missions", tags=["Data Budget"])

# ── Helpers ───────────────────────────────────────────────────────────────────

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
    """Sum duration of all modes where this component is ON."""
    states = db.query(ComponentModeState).filter(
        ComponentModeState.mission_component_id == mc_id
    ).all()
    state_map = {str(s.mission_mode_id): s.is_on for s in states}
    return sum(m.duration_min for m in modes if state_map.get(str(m.id), False))

def _build_row(mc: MissionComponent, active_min: float, orbits_per_day: float) -> DataBudgetRowOut:
    entry = mc.data_budget_entry
    sz = entry.data_size_per_measurement_kb if entry else 0.0
    mpm = entry.measurements_per_minute if entry else 0.0
    dpo = round(sz * mpm * active_min, 4)
    dpd = round(dpo * orbits_per_day, 4)
    return DataBudgetRowOut(
        mission_component_id=mc.id,
        component_id=mc.component_id,
        component_name=mc.component.component_name,
        subsystem=mc.component.subsystem,
        image_url=mc.component.image_url,
        quantity=mc.quantity,
        active_time_per_orbit_min=round(active_min, 4),
        orbits_per_day=orbits_per_day,
        data_type=entry.data_type if entry else None,
        data_size_per_measurement_kb=sz,
        measurements_per_minute=mpm,
        priority=entry.priority if entry else "Medium",
        storage_mode=entry.storage_mode if entry else "Stored",
        notes=entry.notes if entry else None,
        data_per_orbit_kb=dpo,
        data_per_day_kb=dpd,
    )

# ── GET /missions/{id}/data-budget ────────────────────────────────────────────

@router.get("/{mission_id}/data-budget", response_model=List[DataBudgetRowOut])
def get_data_budget(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    rows = []
    for mc in mc_list:
        active_min = _calc_active_time(mc.id, modes, db)
        rows.append(_build_row(mc, active_min, mission.orbits_per_day))
    return rows

# ── POST /missions/{id}/data-budget/save ─────────────────────────────────────

@router.post("/{mission_id}/data-budget/save")
def save_data_budget(
    mission_id: uuid.UUID,
    payload: DataBudgetSavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mission_or_404(mission_id, current_user.id, db)

    for entry_in in payload.entries:
        # Verify component belongs to mission
        mc = db.query(MissionComponent).filter(
            MissionComponent.id == entry_in.mission_component_id,
            MissionComponent.mission_id == mission_id
        ).first()
        if not mc:
            continue

        entry = db.query(DataBudgetEntry).filter(
            DataBudgetEntry.mission_component_id == entry_in.mission_component_id
        ).first()

        if entry:
            entry.data_type = entry_in.data_type
            entry.data_size_per_measurement_kb = entry_in.data_size_per_measurement_kb
            entry.measurements_per_minute = entry_in.measurements_per_minute
            entry.priority = entry_in.priority
            entry.storage_mode = entry_in.storage_mode
            entry.notes = entry_in.notes
            entry.updated_at = datetime.utcnow()
        else:
            db.add(DataBudgetEntry(
                mission_component_id=entry_in.mission_component_id,
                data_type=entry_in.data_type,
                data_size_per_measurement_kb=entry_in.data_size_per_measurement_kb,
                measurements_per_minute=entry_in.measurements_per_minute,
                priority=entry_in.priority,
                storage_mode=entry_in.storage_mode,
                notes=entry_in.notes,
            ))

    db.commit()
    return {"message": "Data budget saved successfully"}

# ── GET /missions/{id}/data-budget/summary ────────────────────────────────────

@router.get("/{mission_id}/data-budget/summary", response_model=DataBudgetSummaryOut)
def get_data_budget_summary(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    total_per_orbit = 0.0
    total_per_day = 0.0
    total_stored = 0.0
    total_sent = 0.0
    subsys: dict = {}
    top: list = []
    messages: list = []

    for mc in mc_list:
        active_min = _calc_active_time(mc.id, modes, db)
        row = _build_row(mc, active_min, mission.orbits_per_day)
        total_per_orbit += row.data_per_orbit_kb
        total_per_day += row.data_per_day_kb

        mode = row.storage_mode
        if mode == "Stored":
            total_stored += row.data_per_day_kb
        elif mode == "Sent":
            total_sent += row.data_per_day_kb
        elif mode == "Both":
            total_stored += row.data_per_day_kb
            total_sent += row.data_per_day_kb

        sub = row.subsystem
        if sub not in subsys:
            subsys[sub] = {"dpo": 0.0, "dpd": 0.0}
        subsys[sub]["dpo"] += row.data_per_orbit_kb
        subsys[sub]["dpd"] += row.data_per_day_kb

        if row.data_per_day_kb > 0:
            top.append(TopComponent(
                component_name=row.component_name,
                subsystem=row.subsystem,
                data_per_day_kb=row.data_per_day_kb
            ))

    # Storage validation
    storage_used = total_stored
    storage_remaining = constraint.max_storage_kb - storage_used
    capacity_ok = storage_used <= constraint.max_storage_kb
    margin_ok = storage_remaining >= constraint.required_storage_margin_kb
    is_valid = capacity_ok and margin_ok

    if not capacity_ok:
        messages.append(f"Storage capacity exceeded: {storage_used:.1f} KB used of {constraint.max_storage_kb:.1f} KB max.")
    if not margin_ok and capacity_ok:
        messages.append(f"Storage margin below required threshold: {storage_remaining:.1f} KB remaining, {constraint.required_storage_margin_kb:.1f} KB required.")
    if is_valid:
        messages.append("Data budget is within allowed storage capacity.")

    subsystem_totals = [
        SubsystemDataTotal(subsystem=k, data_per_orbit_kb=round(v["dpo"], 3), data_per_day_kb=round(v["dpd"], 3))
        for k, v in subsys.items()
    ]
    top_sorted = sorted(top, key=lambda x: x.data_per_day_kb, reverse=True)[:8]

    return DataBudgetSummaryOut(
        total_data_per_orbit_kb=round(total_per_orbit, 3),
        total_data_per_day_kb=round(total_per_day, 3),
        total_stored_per_day_kb=round(total_stored, 3),
        total_sent_per_day_kb=round(total_sent, 3),
        max_storage_kb=constraint.max_storage_kb,
        required_storage_margin_kb=constraint.required_storage_margin_kb,
        storage_used_kb=round(storage_used, 3),
        storage_remaining_kb=round(storage_remaining, 3),
        storage_margin_ok=margin_ok,
        storage_capacity_ok=capacity_ok,
        is_valid=is_valid,
        subsystem_totals=subsystem_totals,
        top_components=top_sorted,
        validation_messages=messages,
    )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_component import MissionComponent
from app.models.mission_constraint import MissionConstraint
from app.models.mass_budget_entry import MassBudgetEntry
from app.models.user import User
from app.schemas.mass_budget import (
    MassBudgetRowOut, MassBudgetSavePayload, MassBudgetSummaryOut,
    MassConstraintsOut, CubeSatPreset, SubsystemMassTotal, TopMassComponent,
    ConstraintUpdate
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/missions", tags=["Mass Budget"])

# ── CubeSat volume presets ────────────────────────────────────────────────────

CUBESAT_PRESETS = {
    "1U": {"available_volume_cm3": 1000.0, "max_mass_kg": 1.33},
    "2U": {"available_volume_cm3": 2000.0, "max_mass_kg": 2.66},
    "3U": {"available_volume_cm3": 3000.0, "max_mass_kg": 4.00},
    "6U": {"available_volume_cm3": 6000.0, "max_mass_kg": 8.00},
}

def _cubesat_preset_list() -> List[CubeSatPreset]:
    return [CubeSatPreset(size=k, available_volume_cm3=v["available_volume_cm3"], max_mass_kg=v["max_mass_kg"]) for k, v in CUBESAT_PRESETS.items()]

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
        db.add(c); db.commit(); db.refresh(c)
    return c

def _parse_dim(val) -> float:
    """Safely parse a dimension float, returning 0 if missing or bad."""
    try:
        return float(val) if val is not None else 0.0
    except (TypeError, ValueError):
        return 0.0

def _parse_scaled_dims(comp) -> tuple:
    """
    Try to parse component.scaled_dimensions_mm (e.g. '68.6 x 53.4 x 15')
    Returns (L, W, H) as floats or (0, 0, 0).
    """
    raw = getattr(comp, 'scaled_dimensions_mm', None)
    if not raw:
        return 0.0, 0.0, 0.0
    parts = [p.strip() for p in str(raw).replace('x', 'X').split('X')]
    if len(parts) >= 3:
        try:
            return float(parts[0]), float(parts[1]), float(parts[2])
        except ValueError:
            pass
    return 0.0, 0.0, 0.0

def _row_status(mass: float | None, lx: float | None, wy: float | None, hz: float | None, qty: int) -> str:
    if qty == 0:
        return "Zero Qty"
    if mass is None or mass == 0:
        return "Missing Mass"
    if (lx is None or lx == 0) and (wy is None or wy == 0) and (hz is None or hz == 0):
        return "Missing Dims"
    return "OK"

def _build_row(mc: MissionComponent) -> MassBudgetRowOut:
    entry = mc.mass_budget_entry
    comp = mc.component
    lib_mass = getattr(comp, 'scaled_mass_g', None)
    lib_l, lib_w, lib_h = _parse_scaled_dims(comp)

    if entry:
        qty   = entry.quantity
        mass  = entry.mass_per_unit_g  if entry.mass_per_unit_g  is not None else lib_mass
        lx    = entry.length_x_mm     if entry.length_x_mm     is not None else (lib_l or None)
        wy    = entry.width_y_mm      if entry.width_y_mm      is not None else (lib_w or None)
        hz    = entry.height_z_mm     if entry.height_z_mm     is not None else (lib_h or None)
    else:
        qty  = mc.quantity or 1
        mass = lib_mass
        lx   = lib_l or None
        wy   = lib_w or None
        hz   = lib_h or None

    mass_val = mass or 0.0
    lx_val   = lx   or 0.0
    wy_val   = wy   or 0.0
    hz_val   = hz   or 0.0

    vol_unit  = lx_val * wy_val * hz_val
    total_m   = qty * mass_val
    total_v   = qty * vol_unit
    status    = _row_status(mass, lx, wy, hz, qty)

    return MassBudgetRowOut(
        mission_component_id=mc.id,
        component_id=mc.component_id,
        component_name=comp.component_name,
        subsystem=comp.subsystem,
        image_url=comp.image_url,
        quantity=qty,
        mass_per_unit_g=mass,
        length_x_mm=lx,
        width_y_mm=wy,
        height_z_mm=hz,
        total_mass_g=round(total_m, 4),
        volume_per_unit_mm3=round(vol_unit, 2),
        total_volume_mm3=round(total_v, 2),
        row_status=status,
    )

# ── GET /missions/{id}/mass-budget ────────────────────────────────────────────

@router.get("/{mission_id}/mass-budget")
def get_mass_budget(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    rows = [_build_row(mc) for mc in mc_list]

    cubesat_size = getattr(constraint, 'selected_cubesat_size', None) or '1U'
    avail_vol = constraint.available_internal_volume_cm3

    return {
        "constraints": {
            "max_allowed_mass_kg": constraint.max_allowed_mass_kg,
            "selected_cubesat_size": cubesat_size,
            "available_internal_volume_cm3": avail_vol,
            "presets": [p.dict() for p in _cubesat_preset_list()],
        },
        "rows": [r.dict() for r in rows],
    }

# ── POST /missions/{id}/mass-budget/save ─────────────────────────────────────

@router.post("/{mission_id}/mass-budget/save")
def save_mass_budget(
    mission_id: uuid.UUID,
    payload: MassBudgetSavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_mission_or_404(mission_id, current_user.id, db)

    for ei in payload.entries:
        mc = db.query(MissionComponent).filter(
            MissionComponent.id == ei.mission_component_id,
            MissionComponent.mission_id == mission_id,
        ).first()
        if not mc:
            continue

        entry = db.query(MassBudgetEntry).filter(
            MassBudgetEntry.mission_component_id == ei.mission_component_id
        ).first()

        if entry:
            entry.quantity      = ei.quantity
            entry.mass_per_unit_g = ei.mass_per_unit_g
            entry.length_x_mm   = ei.length_x_mm
            entry.width_y_mm    = ei.width_y_mm
            entry.height_z_mm   = ei.height_z_mm
            entry.notes         = ei.notes
            entry.updated_at    = datetime.utcnow()
        else:
            db.add(MassBudgetEntry(
                mission_component_id=ei.mission_component_id,
                quantity=ei.quantity,
                mass_per_unit_g=ei.mass_per_unit_g,
                length_x_mm=ei.length_x_mm,
                width_y_mm=ei.width_y_mm,
                height_z_mm=ei.height_z_mm,
                notes=ei.notes,
            ))

    db.commit()
    return {"message": "Mass budget saved successfully"}

# ── GET /missions/{id}/mass-budget/summary ────────────────────────────────────

@router.get("/{mission_id}/mass-budget/summary", response_model=MassBudgetSummaryOut)
def get_mass_budget_summary(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    total_mass_g   = 0.0
    total_vol_mm3  = 0.0
    subsys: dict   = {}
    top: list      = []
    messages: list = []

    for mc in mc_list:
        row = _build_row(mc)
        total_mass_g  += row.total_mass_g
        total_vol_mm3 += row.total_volume_mm3

        sub = row.subsystem
        if sub not in subsys:
            subsys[sub] = {"mass": 0.0, "vol": 0.0}
        subsys[sub]["mass"] += row.total_mass_g
        subsys[sub]["vol"]  += row.total_volume_mm3

        if row.total_mass_g > 0:
            top.append(TopMassComponent(
                component_name=row.component_name,
                subsystem=row.subsystem,
                total_mass_g=row.total_mass_g,
            ))

    total_mass_kg    = total_mass_g / 1000
    total_vol_cm3    = total_vol_mm3 / 1000
    max_mass         = constraint.max_allowed_mass_kg
    avail_vol        = constraint.available_internal_volume_cm3
    cubesat_size     = getattr(constraint, 'selected_cubesat_size', None) or '1U'
    mass_margin      = max_mass - total_mass_kg
    vol_margin       = avail_vol - total_vol_cm3
    mass_ok          = mass_margin >= 0
    vol_ok           = vol_margin >= 0
    is_valid         = mass_ok and vol_ok

    launch_status = "✅ Within Mass Limit" if mass_ok else "❌ Too Heavy"
    size_status   = "✅ Fits Selected Size" if vol_ok  else "❌ Too Large"

    if not mass_ok:
        messages.append(f"Satellite exceeds launch mass limit ({total_mass_kg:.3f} kg > {max_mass} kg).")
    else:
        messages.append("Mass budget is within allowed limits.")
    if not vol_ok:
        messages.append(f"Satellite exceeds selected CubeSat internal volume ({total_vol_cm3:.1f} cm³ > {avail_vol} cm³).")
    else:
        messages.append(f"Satellite fits inside selected CubeSat size ({cubesat_size}).")

    subsystem_totals = [
        SubsystemMassTotal(subsystem=k, total_mass_g=round(v["mass"], 3), total_volume_mm3=round(v["vol"], 1))
        for k, v in subsys.items()
    ]
    top_sorted = sorted(top, key=lambda x: x.total_mass_g, reverse=True)[:6]

    return MassBudgetSummaryOut(
        total_mass_g=round(total_mass_g, 3),
        total_mass_kg=round(total_mass_kg, 6),
        max_allowed_mass_kg=max_mass,
        mass_margin_kg=round(mass_margin, 6),
        launch_status=launch_status,
        mass_ok=mass_ok,
        total_volume_mm3=round(total_vol_mm3, 1),
        total_volume_cm3=round(total_vol_cm3, 3),
        selected_cubesat_size=cubesat_size,
        available_internal_volume_cm3=avail_vol,
        volume_margin_cm3=round(vol_margin, 3),
        size_status=size_status,
        volume_ok=vol_ok,
        is_valid=is_valid,
        subsystem_totals=subsystem_totals,
        top_components=top_sorted,
        validation_messages=messages,
    )


# ── PUT /missions/{id}/constraints ────────────────────────────────────────────

@router.put("/{mission_id}/constraints")
def update_constraints(
    mission_id: uuid.UUID,
    data: ConstraintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_mission_or_404(mission_id, current_user.id, db)
    c = _ensure_constraint(db.query(Mission).get(mission_id), db)

    if data.max_allowed_mass_kg is not None:
        c.max_allowed_mass_kg = data.max_allowed_mass_kg
    if data.selected_cubesat_size is not None:
        c.selected_cubesat_size = data.selected_cubesat_size
    if data.available_internal_volume_cm3 is not None:
        c.available_internal_volume_cm3 = data.available_internal_volume_cm3

    c.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Constraints updated"}


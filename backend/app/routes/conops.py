from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_mode import MissionMode
from app.models.mission_component import MissionComponent
from app.models.component_mode_state import ComponentModeState
from app.models.user import User
from app.schemas.mission_mode import MissionModeOut, MissionModeUpdate
from app.schemas.conops import (
    ConopsSavePayload, ConopsMatrixOut, ConopsSummaryOut,
    ModeHeader, ComponentRow, ModePercentage, ComponentActiveTime
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/missions", tags=["CONOPS"])

# Default mission modes to auto-create on first load
DEFAULT_MODES = [
    {"mode_name": "Sun Pointing",           "display_order": 0, "description": "Satellite pointing solar panels toward the sun"},
    {"mode_name": "Nadir/Payload Pointing", "display_order": 1, "description": "Satellite pointing payload toward Earth"},
    {"mode_name": "Ground Station",         "display_order": 2, "description": "Communicating with ground station for downlink/uplink"},
    {"mode_name": "Safe/Eclipse Mode",      "display_order": 3, "description": "Low-power survival mode during anomaly or eclipse"},
]

# ── Helper: ensure student owns mission ────────────────────────────────────────

def _get_mission_or_404(mission_id: uuid.UUID, student_id: uuid.UUID, db: Session) -> Mission:
    m = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == student_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return m

# ── Helper: auto-create default modes if none exist ───────────────────────────

def _ensure_default_modes(mission: Mission, db: Session) -> List[MissionMode]:
    existing = db.query(MissionMode).filter(MissionMode.mission_id == mission.id).all()
    if existing:
        return existing
    modes = []
    for d in DEFAULT_MODES:
        mode = MissionMode(mission_id=mission.id, **d)
        db.add(mode)
        modes.append(mode)
    db.commit()
    for m in modes:
        db.refresh(m)
    return modes

# ── Helper: ensure all component×mode state cells exist ───────────────────────

def _ensure_states(mission_id: uuid.UUID, db: Session):
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).all()
    for mc in mc_list:
        for mode in modes:
            exists = db.query(ComponentModeState).filter(
                ComponentModeState.mission_component_id == mc.id,
                ComponentModeState.mission_mode_id == mode.id
            ).first()
            if not exists:
                db.add(ComponentModeState(
                    mission_component_id=mc.id,
                    mission_mode_id=mode.id,
                    is_on=False
                ))
    db.commit()

# ── GET /missions/{id}/modes ───────────────────────────────────────────────────

@router.get("/{mission_id}/modes", response_model=List[MissionModeOut])
def get_modes(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    modes = _ensure_default_modes(mission, db)
    return sorted(modes, key=lambda m: m.display_order)

# ── PUT /missions/{id}/modes/{mode_id} ────────────────────────────────────────

@router.put("/{mission_id}/modes/{mode_id}", response_model=MissionModeOut)
def update_mode(
    mission_id: uuid.UUID,
    mode_id: uuid.UUID,
    data: MissionModeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mission_or_404(mission_id, current_user.id, db)
    mode = db.query(MissionMode).filter(MissionMode.id == mode_id, MissionMode.mission_id == mission_id).first()
    if not mode:
        raise HTTPException(status_code=404, detail="Mode not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(mode, field, value)
    mode.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mode)
    return mode

# ── GET /missions/{id}/conops ─────────────────────────────────────────────────

@router.get("/{mission_id}/conops", response_model=ConopsMatrixOut)
def get_conops(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    _ensure_default_modes(mission, db)
    _ensure_states(mission_id, db)

    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    mode_headers = [ModeHeader(
        id=m.id, mode_name=m.mode_name, display_order=m.display_order, duration_min=m.duration_min
    ) for m in modes]

    component_rows = []
    for mc in mc_list:
        states_db = db.query(ComponentModeState).filter(
            ComponentModeState.mission_component_id == mc.id
        ).all()
        states_map = {str(s.mission_mode_id): s.is_on for s in states_db}
        component_rows.append(ComponentRow(
            mission_component_id=mc.id,
            component_id=mc.component_id,
            component_name=mc.component.component_name,
            subsystem=mc.component.subsystem,
            image_url=mc.component.image_url,
            quantity=mc.quantity,
            states=states_map,
        ))

    return ConopsMatrixOut(
        mission_id=mission_id,
        orbit_duration_min=mission.orbit_duration_min,
        modes=mode_headers,
        components=component_rows,
    )

# ── POST /missions/{id}/conops/save ───────────────────────────────────────────

@router.post("/{mission_id}/conops/save")
def save_conops(
    mission_id: uuid.UUID,
    payload: ConopsSavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mission_or_404(mission_id, current_user.id, db)

    # Update mode durations
    for md in payload.mode_durations:
        mode = db.query(MissionMode).filter(
            MissionMode.id == md.mode_id, MissionMode.mission_id == mission_id
        ).first()
        if mode:
            mode.duration_min = md.duration_min
            mode.updated_at = datetime.utcnow()

    # Upsert cell states
    for cell in payload.cell_states:
        state = db.query(ComponentModeState).filter(
            ComponentModeState.mission_component_id == cell.mission_component_id,
            ComponentModeState.mission_mode_id == cell.mission_mode_id,
        ).first()
        if state:
            state.is_on = cell.is_on
            state.updated_at = datetime.utcnow()
        else:
            db.add(ComponentModeState(
                mission_component_id=cell.mission_component_id,
                mission_mode_id=cell.mission_mode_id,
                is_on=cell.is_on,
            ))

    db.commit()
    return {"message": "CONOPS saved successfully"}

# ── GET /missions/{id}/conops/summary ─────────────────────────────────────────

@router.get("/{mission_id}/conops/summary", response_model=ConopsSummaryOut)
def get_summary(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    orbit_dur = mission.orbit_duration_min

    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

    total_mode_dur = sum(m.duration_min for m in modes)
    diff = round(total_mode_dur - orbit_dur, 4)
    valid = abs(diff) < 0.001

    per_mode = [ModePercentage(
        mode_id=m.id,
        mode_name=m.mode_name,
        duration_min=m.duration_min,
        percentage=round((m.duration_min / orbit_dur * 100) if orbit_dur else 0, 2)
    ) for m in modes]

    component_active_times = []
    subsystem_totals: dict = {}
    unused = []
    messages = []

    for mc in mc_list:
        states = db.query(ComponentModeState).filter(
            ComponentModeState.mission_component_id == mc.id
        ).all()
        state_map = {str(s.mission_mode_id): s.is_on for s in states}
        active_min = sum(m.duration_min for m in modes if state_map.get(str(m.id), False))
        component_active_times.append(ComponentActiveTime(
            mission_component_id=mc.id,
            component_name=mc.component.component_name,
            subsystem=mc.component.subsystem,
            active_time_min=round(active_min, 4),
        ))
        sub = mc.component.subsystem
        subsystem_totals[sub] = round(subsystem_totals.get(sub, 0) + active_min, 4)
        if active_min == 0:
            unused.append(mc.component.component_name)

    if not valid:
        messages.append(f"Total mode duration ({total_mode_dur} min) does not match orbit duration ({orbit_dur} min). Difference: {diff:+.3f} min.")
    if unused:
        messages.append(f"Components never active: {', '.join(unused)}")
    for m in modes:
        if m.duration_min < 0:
            messages.append(f"Mode '{m.mode_name}' has a negative duration.")

    return ConopsSummaryOut(
        orbit_duration_min=orbit_dur,
        total_mode_duration_min=round(total_mode_dur, 4),
        duration_difference_min=diff,
        duration_valid=valid,
        per_mode=per_mode,
        component_active_times=component_active_times,
        subsystem_active_times=subsystem_totals,
        unused_components=unused,
        validation_messages=messages,
    )

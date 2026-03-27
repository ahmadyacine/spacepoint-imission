from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_constraint import MissionConstraint
from app.models.link_budget_entry import LinkBudgetEntry
from app.models.user import User
from app.schemas.link_budget import (
    LinkBudgetEntryInput, LinkBudgetGetOut, LinkBudgetSummaryOut,
    LinkBudgetCalculated, LinkConstraintsOut, BandPreset
)
from app.utils.dependencies import get_current_user
from app.utils.rf_calc import calculate_link_budget, BAND_PRESETS

router = APIRouter(prefix="/missions", tags=["Link Budget"])

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
        db.add(c); db.commit(); db.refresh(c)
    return c

def _ensure_entry(mission_id: uuid.UUID, db: Session) -> LinkBudgetEntry:
    e = db.query(LinkBudgetEntry).filter(LinkBudgetEntry.mission_id == mission_id).first()
    if not e:
        e = LinkBudgetEntry(mission_id=mission_id)
        db.add(e); db.commit(); db.refresh(e)
    return e

def _make_calculated(entry: LinkBudgetEntry, constraint: MissionConstraint) -> LinkBudgetCalculated:
    result = calculate_link_budget(
        downlink_frequency_mhz=entry.downlink_frequency_mhz,
        satellite_antenna_gain_dbi=entry.satellite_antenna_gain_dbi,
        data_rate_kbps=entry.data_rate_kbps,
        required_signal_quality_db=entry.required_signal_quality_db,
        transmit_power_dbm=constraint.transmit_power_dbm,
        distance_km=constraint.assumed_distance_km,
        good_threshold_db=constraint.good_link_margin_threshold_db,
        weak_threshold_db=constraint.weak_link_margin_threshold_db,
    )
    return LinkBudgetCalculated(
        assumed_distance_km=result.assumed_distance_km,
        transmit_power_dbm=result.transmit_power_dbm,
        free_space_path_loss_db=result.free_space_path_loss_db,
        eirp_dbm=result.eirp_dbm,
        received_power_dbm=result.received_power_dbm,
        noise_power_dbm=result.noise_power_dbm,
        actual_signal_quality_db=result.actual_signal_quality_db,
        required_signal_quality_db=result.required_signal_quality_db,
        system_link_margin_db=result.system_link_margin_db,
        link_status=result.link_status,
    )

def _presets() -> list:
    return [BandPreset(band_profile=k, **v) for k, v in BAND_PRESETS.items()]

# ── GET /missions/{id}/link-budget ────────────────────────────────────────────

@router.get("/{mission_id}/link-budget", response_model=LinkBudgetGetOut)
def get_link_budget(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    entry = _ensure_entry(mission_id, db)
    calculated = _make_calculated(entry, constraint)

    return LinkBudgetGetOut(
        band_profile=entry.band_profile,
        downlink_frequency_mhz=entry.downlink_frequency_mhz,
        uplink_frequency_mhz=entry.uplink_frequency_mhz,
        satellite_antenna_gain_dbi=entry.satellite_antenna_gain_dbi,
        data_rate_kbps=entry.data_rate_kbps,
        required_signal_quality_db=entry.required_signal_quality_db,
        notes=entry.notes,
        constraints=LinkConstraintsOut(
            assumed_distance_km=constraint.assumed_distance_km,
            transmit_power_dbm=constraint.transmit_power_dbm,
            good_link_margin_threshold_db=constraint.good_link_margin_threshold_db,
            weak_link_margin_threshold_db=constraint.weak_link_margin_threshold_db,
        ),
        calculated=calculated,
        presets=_presets(),
        is_saved=(entry.updated_at is not None and entry.updated_at > entry.created_at),
    )

# ── POST /missions/{id}/link-budget/save ─────────────────────────────────────

@router.post("/{mission_id}/link-budget/save")
def save_link_budget(
    mission_id: uuid.UUID,
    payload: LinkBudgetEntryInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_mission_or_404(mission_id, current_user.id, db)
    entry = _ensure_entry(mission_id, db)

    entry.band_profile = payload.band_profile
    entry.downlink_frequency_mhz = payload.downlink_frequency_mhz
    entry.uplink_frequency_mhz = payload.uplink_frequency_mhz
    entry.satellite_antenna_gain_dbi = payload.satellite_antenna_gain_dbi
    entry.data_rate_kbps = payload.data_rate_kbps
    entry.required_signal_quality_db = payload.required_signal_quality_db
    entry.notes = payload.notes
    entry.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Link budget saved successfully"}

# ── GET /missions/{id}/link-budget/summary ────────────────────────────────────

@router.get("/{mission_id}/link-budget/summary", response_model=LinkBudgetSummaryOut)
def get_link_budget_summary(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    entry = _ensure_entry(mission_id, db)
    calc = _make_calculated(entry, constraint)

    is_valid = calc.link_status == "Good Link"
    messages: list = []
    if calc.link_status == "Good Link":
        messages.append("Link margin is strong enough.")
    elif calc.link_status == "Weak Link":
        messages.append("Link margin is weak — improve your communication settings.")
    else:
        messages.append("Link failed — required signal quality is not met.")

    return LinkBudgetSummaryOut(
        assumed_distance_km=calc.assumed_distance_km,
        transmit_power_dbm=calc.transmit_power_dbm,
        free_space_path_loss_db=calc.free_space_path_loss_db,
        eirp_dbm=calc.eirp_dbm,
        received_power_dbm=calc.received_power_dbm,
        noise_power_dbm=calc.noise_power_dbm,
        actual_signal_quality_db=calc.actual_signal_quality_db,
        required_signal_quality_db=calc.required_signal_quality_db,
        system_link_margin_db=calc.system_link_margin_db,
        link_status=calc.link_status,
        is_valid=is_valid,
        validation_messages=messages,
    )

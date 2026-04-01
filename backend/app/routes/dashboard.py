from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime
import uuid
import math

from app.database import get_db
from app.models.mission import Mission
from app.models.mission_component import MissionComponent
from app.models.mission_constraint import MissionConstraint
from app.models.mission_mode import MissionMode
from app.models.component_mode_state import ComponentModeState
from app.models.data_budget_entry import DataBudgetEntry
from app.models.power_budget_entry import PowerBudgetEntry
from app.models.link_budget_entry import LinkBudgetEntry
from app.models.mass_budget_entry import MassBudgetEntry
from app.models.cost_budget_entry import CostBudgetEntry
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.rf_calc import calculate_link_budget
from app.schemas.dashboard import (
    DashboardOut, MissionInfo, OverallStatus, StepStatus, KPIs,
    MarginItem, ModuleCard, Charts, SubsystemChartItem, TopComponentItem, ModeDistItem
)

router = APIRouter(prefix="/missions", tags=["Dashboard"])


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

def _get_active_time(mc_id: uuid.UUID, modes: list, db: Session) -> float:
    states = db.query(ComponentModeState).filter(ComponentModeState.mission_component_id == mc_id).all()
    state_map = {str(s.mission_mode_id): s.is_on for s in states}
    return sum(m.duration_min for m in modes if state_map.get(str(m.id), False))


# ── CONOPS sub-summary ───────────────────────────────────────────────────────

def _calc_conops(mission: Mission, mc_list, modes, db: Session) -> dict:
    orbit_dur = mission.orbit_duration_min or 0
    total_mode_dur = sum(m.duration_min for m in modes)
    diff = round(total_mode_dur - orbit_dur, 4)
    valid = abs(diff) < 0.001 if orbit_dur else False
    has_data = len(modes) > 0
    return {
        "is_valid": valid,
        "has_data": has_data,
        "orbit_duration_min": orbit_dur,
        "total_mode_duration_min": total_mode_dur,
        "modes": modes,
        "mode_dist": [
            ModeDistItem(
                mode_name=m.mode_name,
                duration_min=m.duration_min,
                percentage=round((m.duration_min / orbit_dur * 100) if orbit_dur else 0, 2)
            ) for m in modes
        ]
    }


# ── Data Budget sub-summary ──────────────────────────────────────────────────

def _calc_data(mission: Mission, mc_list, modes, constraint: MissionConstraint, db: Session) -> dict:
    has_data = False
    total_per_day = 0.0
    total_stored = 0.0
    subsys = defaultdict(float)
    top = []

    for mc in mc_list:
        entry = mc.data_budget_entry
        if entry:
            has_data = True
        active_min = _get_active_time(mc.id, modes, db)
        sz = entry.data_size_per_measurement_kb if entry else 0.0
        mpm = entry.measurements_per_minute if entry else 0.0
        dpo = sz * mpm * active_min
        dpd = dpo * (mission.orbits_per_day or 1)
        total_per_day += dpd
        mode = entry.storage_mode if entry else "Stored"
        if mode in ("Stored", "Both"):
            total_stored += dpd
        subsys[mc.component.subsystem] += dpd
        if dpd > 0:
            top.append({"name": mc.component.component_name, "sub": mc.component.subsystem, "val": dpd})

    storage_remaining = (constraint.max_storage_kb or 0) - total_stored
    is_valid = total_stored <= (constraint.max_storage_kb or 1e9) and storage_remaining >= (constraint.required_storage_margin_kb or 0)
    return {
        "is_valid": is_valid, "has_data": has_data,
        "total_per_day": total_per_day, "total_stored": total_stored,
        "storage_remaining": storage_remaining,
        "max_storage": constraint.max_storage_kb,
        "subsys": dict(subsys), "top": top
    }


# ── Power Budget sub-summary ─────────────────────────────────────────────────

def _calc_power(mission: Mission, mc_list, modes, constraint: MissionConstraint, db: Session) -> dict:
    has_data = False
    total_power = 0.0
    subsys = defaultdict(float)
    top = []

    for mc in mc_list:
        entry = mc.power_budget_entry
        if entry:
            has_data = True
        active_min = _get_active_time(mc.id, modes, db)
        v = (entry.voltage_v if entry else None) or (mc.component.voltage_v or 0.0)
        i = (entry.current_ma if entry else None) or (mc.component.current_ma or 0.0)
        p = v * i
        e = p * active_min / 60
        total_power += p
        subsys[mc.component.subsystem] += p
        if e > 0:
            top.append({"name": mc.component.component_name, "sub": mc.component.subsystem, "val": e})

    # Use the same logic as the power budget summary route:
    # generated power = selected cells × power per cell (in W), converted to mW
    cell_w = constraint.power_per_solar_cell_w or 1.1
    selected_cells = int(constraint.selected_solar_cells or 0)
    generated_power_mw = selected_cells * cell_w * 1000   # W → mW
    solar_mw = generated_power_mw

    margin = solar_mw - total_power   # both in mW
    is_valid = total_power > 0 and margin >= 0
    return {
        "is_valid": is_valid, "has_data": has_data,
        "total_power": total_power, "power_margin": margin,
        "solar_mw": solar_mw, "subsys": dict(subsys), "top": top
    }


# ── Link Budget sub-summary ──────────────────────────────────────────────────

def _calc_link(mission: Mission, constraint: MissionConstraint, db: Session) -> dict:
    entry = db.query(LinkBudgetEntry).filter(LinkBudgetEntry.mission_id == mission.id).first()
    if not entry or not entry.updated_at or entry.updated_at <= entry.created_at:
        return {"is_valid": False, "has_data": False, "margin_db": 0.0, "status": "No Link Data"}
    
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
    is_valid = result.link_status == "Good Link"
    return {
        "is_valid": is_valid, "has_data": True,
        "margin_db": result.system_link_margin_db,
        "actual_snr": result.actual_signal_quality_db,
        "required_snr": result.required_signal_quality_db,
        "status": result.link_status
    }


# ── Mass Budget sub-summary ──────────────────────────────────────────────────

def _calc_mass(mission: Mission, mc_list, constraint: MissionConstraint, db: Session) -> dict:
    has_data = False
    total_mass_g = 0.0
    total_vol_mm3 = 0.0
    subsys_mass = defaultdict(float)
    top = []

    for mc in mc_list:
        entry = db.query(MassBudgetEntry).filter(MassBudgetEntry.mission_component_id == mc.id).first()
        if entry:
            has_data = True
            
        qty = entry.quantity if entry and entry.quantity is not None else (mc.quantity or 1)
        
        mass_val = entry.mass_per_unit_g if entry and entry.mass_per_unit_g is not None else mc.component.scaled_mass_g
        mass_val = mass_val if mass_val is not None else 0.0
        total_mass_g += mass_val * qty
        
        # Volume
        lx = entry.length_x_mm if entry and entry.length_x_mm is not None else None
        wy = entry.width_y_mm if entry and entry.width_y_mm is not None else None
        hz = entry.height_z_mm if entry and entry.height_z_mm is not None else None
        
        if lx is None or wy is None or hz is None:
            try:
                raw = (mc.component.scaled_dimensions_mm or "").replace("x", "X")
                parts = [float(p.strip()) for p in raw.split("X")]
                lib_l = float(parts[0]) if len(parts) >= 3 else 0.0
                lib_w = float(parts[1]) if len(parts) >= 3 else 0.0
                lib_h = float(parts[2]) if len(parts) >= 3 else 0.0
            except Exception:
                lib_l, lib_w, lib_h = 0.0, 0.0, 0.0
            lx = lx if lx is not None else lib_l
            wy = wy if wy is not None else lib_w
            hz = hz if hz is not None else lib_h
            
        vol = (lx or 0.0) * (wy or 0.0) * (hz or 0.0)
        total_vol_mm3 += vol * qty
        
        subsys_mass[mc.component.subsystem] += mass_val * qty / 1000  # kg
        if mass_val > 0:
            top.append({"name": mc.component.component_name, "sub": mc.component.subsystem, "val": mass_val * qty / 1000})

    total_mass_kg = total_mass_g / 1000
    total_vol_cm3 = total_vol_mm3 / 1000
    max_mass = constraint.max_allowed_mass_kg or 1.33
    avail_vol = constraint.available_internal_volume_cm3 or 1000
    mass_margin = max_mass - total_mass_kg
    vol_margin = avail_vol - total_vol_cm3
    is_valid = mass_margin >= 0 and vol_margin >= 0
    return {
        "is_valid": is_valid, "has_data": has_data,
        "total_mass_kg": total_mass_kg, "mass_margin": mass_margin,
        "total_vol_cm3": total_vol_cm3, "vol_margin": vol_margin,
        "subsys": dict(subsys_mass), "top": top
    }


# ── Cost Budget sub-summary ──────────────────────────────────────────────────

def _calc_cost(mission: Mission, mc_list, constraint: MissionConstraint, db: Session) -> dict:
    has_data = False
    total_cost = 0.0
    subsys = defaultdict(float)
    top = []

    for mc in mc_list:
        entry = db.query(CostBudgetEntry).filter(CostBudgetEntry.mission_component_id == mc.id).first()
        if entry:
            has_data = True
        qty = (entry.quantity if entry and entry.quantity is not None else mc.quantity)
        cost = (entry.cost_per_unit_aed if entry and entry.cost_per_unit_aed is not None else
                (mc.component.assumed_cost_usd or 0) * 3.67)
        tc = qty * cost
        total_cost += tc
        subsys[mc.component.subsystem] += tc
        if tc > 0:
            top.append({"name": mc.component.component_name, "sub": mc.component.subsystem, "val": tc})

    max_budget = constraint.maximum_budget_aed or 2000
    margin = max_budget - total_cost
    is_valid = margin >= 0
    most_exp = sorted(top, key=lambda x: x["val"], reverse=True)[0]["name"] if top else "-"
    return {
        "is_valid": is_valid, "has_data": has_data,
        "total_cost": total_cost, "cost_margin": margin,
        "max_budget": max_budget, "most_expensive": most_exp,
        "subsys": dict(subsys), "top": top
    }


# ── Main Dashboard Endpoint ──────────────────────────────────────────────────

@router.get("/{mission_id}/dashboard", response_model=DashboardOut)
def get_dashboard(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = _get_mission_or_404(mission_id, current_user.id, db)
    constraint = _ensure_constraint(mission, db)
    mc_list = db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()
    modes = db.query(MissionMode).filter(MissionMode.mission_id == mission_id).order_by(MissionMode.display_order).all()

    # ── Calculate all modules ────────────────────────────────────────────────
    conops = _calc_conops(mission, mc_list, modes, db)
    data = _calc_data(mission, mc_list, modes, constraint, db)
    power = _calc_power(mission, mc_list, modes, constraint, db)
    link = _calc_link(mission, constraint, db)
    mass = _calc_mass(mission, mc_list, constraint, db)
    cost = _calc_cost(mission, mc_list, constraint, db)

    # ── Step status ──────────────────────────────────────────────────────────
    def _step(name, ok, has, page):
        if not has: return StepStatus(step=name, status="incomplete", page=page)
        if ok: return StepStatus(step=name, status="complete", page=page)
        return StepStatus(step=name, status="invalid", page=page)

    step_status = [
        StepStatus(step="Mission Setup", status="complete", page="/mission"),
        StepStatus(step="Components", status="complete" if mc_list else "incomplete", page="/components"),
        _step("CONOPS", conops["is_valid"], conops["has_data"], "/conops"),
        _step("Data Budget", data["is_valid"], data["has_data"], "/data-budget"),
        _step("Power Budget", power["is_valid"], power["has_data"], "/power-budget"),
        _step("Link Budget", link["is_valid"], link["has_data"], "/link-budget"),
        _step("Mass Budget", mass["is_valid"], mass["has_data"], "/mass-budget"),
        _step("Cost Budget", cost["is_valid"], cost["has_data"], "/cost-budget"),
    ]

    # ── Overall status ───────────────────────────────────────────────────────
    invalids = sum(1 for s in step_status if s.status == "invalid")
    incompletes = sum(1 for s in step_status if s.status == "incomplete")
    if invalids > 0:
        overall_status = "Invalid Mission"
        all_valid = False
    elif incompletes > 0:
        overall_status = "Needs Review"
        all_valid = False
    else:
        overall_status = "Ready"
        all_valid = True

    # ── KPIs ─────────────────────────────────────────────────────────────────
    kpis = KPIs(
        total_components=len(mc_list),
        total_modes=len(modes),
        total_data_per_day_kb=round(data["total_per_day"], 2),
        total_power_consumption_mw=round(power["total_power"], 2),
        total_mass_kg=round(mass["total_mass_kg"], 4),
        total_platform_cost_aed=round(cost["total_cost"], 2),
        system_link_margin_db=round(link["margin_db"], 2),
    )

    # ── Margins ──────────────────────────────────────────────────────────────
    def _margin_status(val, good_thresh=0):
        if val >= good_thresh: return "good"
        return "fail"

    margins = [
        MarginItem(label="Storage Margin", value=round(data["storage_remaining"], 1), unit="KB",
                   status=_margin_status(data["storage_remaining"]),
                   interpretation="Storage available for mission data" if data["storage_remaining"] >= 0 else "Exceeds storage capacity"),
        MarginItem(label="Power Margin", value=round(power["power_margin"], 1), unit="mW",
                   status=_margin_status(power["power_margin"]),
                   interpretation="Solar power exceeds load" if power["power_margin"] >= 0 else "Solar generation is insufficient"),
        MarginItem(label="Link Margin", value=round(link["margin_db"], 2), unit="dB",
                   status="good" if link["is_valid"] else "fail",
                   interpretation="Communication link is strong enough" if link["is_valid"] else "Link quality not met"),
        MarginItem(label="Mass Margin", value=round(mass["mass_margin"], 4), unit="kg",
                   status=_margin_status(mass["mass_margin"]),
                   interpretation="Fits within launch mass limit" if mass["mass_margin"] >= 0 else "Exceeds launch mass limit"),
        MarginItem(label="Volume Margin", value=round(mass["vol_margin"], 2), unit="cm³",
                   status=_margin_status(mass["vol_margin"]),
                   interpretation="Fits inside selected CubeSat size" if mass["vol_margin"] >= 0 else "Too large for selected CubeSat"),
        MarginItem(label="Cost Margin", value=round(cost["cost_margin"], 2), unit="AED",
                   status=_margin_status(cost["cost_margin"]),
                   interpretation="Within mission budget" if cost["cost_margin"] >= 0 else "Exceeds maximum budget"),
    ]

    # ── Module cards ─────────────────────────────────────────────────────────
    def _status_str(ok, has):
        if not has: return "incomplete"
        return "complete" if ok else "invalid"

    module_cards = [
        ModuleCard(module="CONOPS", status=_status_str(conops["is_valid"], conops["has_data"]),
                   kpi1_label="Orbit Duration", kpi1_value=f"{mission.orbit_duration_min} min",
                   kpi2_label="Total Mode Duration", kpi2_value=f"{conops['total_mode_duration_min']} min",
                   note="Mode durations match orbit period" if conops["is_valid"] else "Mode durations do not sum to orbit period",
                   page="/conops"),
        ModuleCard(module="Data Budget", status=_status_str(data["is_valid"], data["has_data"]),
                   kpi1_label="Total Data/Day", kpi1_value=f"{round(data['total_per_day'], 1)} KB",
                   kpi2_label="Storage Remaining", kpi2_value=f"{round(data['storage_remaining'], 1)} KB",
                   note="Storage within capacity" if data["is_valid"] else "Storage limit exceeded",
                   page="/data-budget"),
        ModuleCard(module="Power Budget", status=_status_str(power["is_valid"], power["has_data"]),
                   kpi1_label="Total Power", kpi1_value=f"{round(power['total_power'], 1)} mW",
                   kpi2_label="Power Margin", kpi2_value=f"{round(power['power_margin'], 1)} mW",
                   note="Power generation sufficient" if power["is_valid"] else "Solar generation insufficient",
                   page="/power-budget"),
        ModuleCard(module="Link Budget", status=_status_str(link["is_valid"], link["has_data"]),
                   kpi1_label="Link Margin", kpi1_value=f"{round(link['margin_db'], 2)} dB",
                   kpi2_label="Link Status", kpi2_value=link.get("status", "-"),
                   note="Communication link passes" if link["is_valid"] else "Link quality not sufficient",
                   page="/link-budget"),
        ModuleCard(module="Mass Budget", status=_status_str(mass["is_valid"], mass["has_data"]),
                   kpi1_label="Total Mass", kpi1_value=f"{round(mass['total_mass_kg'], 3)} kg",
                   kpi2_label="Mass Margin", kpi2_value=f"{round(mass['mass_margin'], 3)} kg",
                   note="Within launch mass limit" if mass["mass_margin"] >= 0 else "Exceeds launch mass limit",
                   page="/mass-budget"),
        ModuleCard(module="Cost Budget", status=_status_str(cost["is_valid"], cost["has_data"]),
                   kpi1_label="Total Cost", kpi1_value=f"{round(cost['total_cost'], 2)} AED",
                   kpi2_label="Budget Margin", kpi2_value=f"{round(cost['cost_margin'], 2)} AED",
                   note=f"Most expensive: {cost['most_expensive']}" if cost["has_data"] else "No cost data yet",
                   page="/cost-budget"),
    ]

    # ── Charts ───────────────────────────────────────────────────────────────
    # Components by subsystem
    comp_sub = defaultdict(int)
    for mc in mc_list:
        comp_sub[mc.component.subsystem] += mc.quantity

    charts = Charts(
        components_by_subsystem=[SubsystemChartItem(subsystem=k, value=v) for k, v in comp_sub.items()],
        data_by_subsystem=[SubsystemChartItem(subsystem=k, value=round(v, 2)) for k, v in data["subsys"].items() if v > 0],
        power_by_subsystem=[SubsystemChartItem(subsystem=k, value=round(v, 2)) for k, v in power["subsys"].items() if v > 0],
        mass_by_subsystem=[SubsystemChartItem(subsystem=k, value=round(v * 1000, 2)) for k, v in mass["subsys"].items() if v > 0],
        cost_by_subsystem=[SubsystemChartItem(subsystem=k, value=round(v, 2)) for k, v in cost["subsys"].items() if v > 0],
        mode_distribution=conops["mode_dist"],
        top_by_data=[TopComponentItem(component_name=t["name"], subsystem=t["sub"], value=round(t["val"], 2))
                     for t in sorted(data["top"], key=lambda x: x["val"], reverse=True)[:6]],
        top_by_power=[TopComponentItem(component_name=t["name"], subsystem=t["sub"], value=round(t["val"], 2))
                      for t in sorted(power["top"], key=lambda x: x["val"], reverse=True)[:6]],
        top_by_mass=[TopComponentItem(component_name=t["name"], subsystem=t["sub"], value=round(t["val"] * 1000, 2))
                     for t in sorted(mass["top"], key=lambda x: x["val"], reverse=True)[:6]],
        top_by_cost=[TopComponentItem(component_name=t["name"], subsystem=t["sub"], value=round(t["val"], 2))
                     for t in sorted(cost["top"], key=lambda x: x["val"], reverse=True)[:6]],
    )

    # ── Alerts & Recommendations ─────────────────────────────────────────────
    alerts = []
    recommendations = []

    if not power["is_valid"] and power["has_data"]:
        alerts.append(f"Power budget failed: solar generation ({round(power['solar_mw'], 1)} mW) is insufficient for total load ({round(power['total_power'], 1)} mW).")
        recommendations.append("Reduce high-power components or increase solar panel capacity.")
    if not mass["is_valid"] and mass["has_data"]:
        if mass["mass_margin"] < 0:
            alerts.append(f"Mass budget failed: total mass ({round(mass['total_mass_kg'], 3)} kg) exceeds launch limit.")
            recommendations.append("Remove or replace heavy components with lighter alternatives.")
        if mass["vol_margin"] < 0:
            alerts.append(f"Volume budget failed: components do not fit inside selected CubeSat size.")
            recommendations.append("Select a larger CubeSat form factor (2U, 3U, or 6U).")
    if not data["is_valid"] and data["has_data"]:
        alerts.append(f"Data budget failed: stored data ({round(data['total_stored'], 1)} KB/day) exceeds storage capacity.")
        recommendations.append("Lower measurement rate or data size for high-data components.")
    if not link["is_valid"] and link["has_data"]:
        alerts.append(f"Link budget failed: system link margin ({round(link['margin_db'], 2)} dB) is too low.")
        recommendations.append("Increase transmit power, use a higher-gain antenna, or reduce data rate.")
    if not cost["is_valid"] and cost["has_data"]:
        alerts.append(f"Cost budget failed: total cost ({round(cost['total_cost'], 2)} AED) exceeds allowed budget.")
        recommendations.append("Use lower-cost component alternatives or reduce quantities.")
    if not conops["is_valid"] and conops["has_data"]:
        alerts.append("CONOPS failed: mission mode durations do not sum to the orbit period.")
        recommendations.append("Adjust mode durations in the CONOPS step to match the orbit duration.")

    if all_valid:
        alerts.append("All mission modules are valid. The mission is ready for review!")
    if not alerts:
        alerts.append("Complete all budget steps to get a full mission health report.")

    # ── Mission Info ─────────────────────────────────────────────────────────
    cubesat_size = getattr(constraint, 'selected_cubesat_size', None) or '1U'
    mission_info = MissionInfo(
        id=str(mission.id),
        mission_name=mission.mission_name,
        mission_objective=mission.mission_objective,
        orbit_type=mission.orbit_type,
        orbit_duration_min=mission.orbit_duration_min,
        orbits_per_day=mission.orbits_per_day,
        selected_cubesat_size=cubesat_size,
        components_count=len(mc_list),
        last_updated=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        student_name=current_user.full_name,
        school_name=current_user.school_name,
        grade=current_user.grade,
    )

    return DashboardOut(
        mission=mission_info,
        overall_status=OverallStatus(
            status=overall_status,
            all_valid=all_valid,
            warnings_count=incompletes,
            errors_count=invalids,
        ),
        step_status=step_status,
        kpis=kpis,
        margins=margins,
        module_cards=module_cards,
        charts=charts,
        alerts=alerts,
        recommendations=recommendations,
    )


# ── Export Endpoint ──────────────────────────────────────────────────────────

@router.get("/{mission_id}/dashboard/export")
def export_dashboard(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_dashboard(mission_id, db, current_user)
    return JSONResponse(
        content=data.model_dump(),
        headers={
            "Content-Disposition": f'attachment; filename="mission_{mission_id}_dashboard.json"',
            "Content-Type": "application/json"
        }
    )

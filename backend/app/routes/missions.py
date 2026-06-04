from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.mission import Mission
from app.models.user import User
from app.schemas.mission import MissionCreate, MissionOut
from app.utils.dependencies import get_current_user, require_admin
from app.models.mission_component import MissionComponent
from app.models.mission_mode import MissionMode
from app.models.link_budget_entry import LinkBudgetEntry
from app.models.data_budget_entry import DataBudgetEntry
from app.models.power_budget_entry import PowerBudgetEntry
from app.models.mass_budget_entry import MassBudgetEntry
from app.models.cost_budget_entry import CostBudgetEntry
import uuid

router = APIRouter(prefix="/missions", tags=["Missions"])

@router.post("", response_model=MissionOut, status_code=201)
def create_mission(data: MissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = Mission(**data.model_dump(), student_id=current_user.id)
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

@router.get("", response_model=List[MissionOut])
def list_missions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Mission).filter(Mission.student_id == current_user.id).all()

@router.get("/admin/overview")
def admin_mission_overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    missions = db.query(Mission).all()
    results = []
    
    for m in missions:
        student = db.query(User).filter(User.id == m.student_id).first()
        if not student: continue
            
        has_components = db.query(MissionComponent).filter(MissionComponent.mission_id == m.id).first() is not None
        has_conops = db.query(MissionMode).filter(MissionMode.mission_id == m.id).first() is not None
        has_link = db.query(LinkBudgetEntry).filter(LinkBudgetEntry.mission_id == m.id).first() is not None
        has_data = db.query(DataBudgetEntry).join(MissionComponent).filter(MissionComponent.mission_id == m.id).first() is not None
        has_power = db.query(PowerBudgetEntry).join(MissionComponent).filter(MissionComponent.mission_id == m.id).first() is not None
        has_mass = db.query(MassBudgetEntry).join(MissionComponent).filter(MissionComponent.mission_id == m.id).first() is not None
        has_cost = db.query(CostBudgetEntry).join(MissionComponent).filter(MissionComponent.mission_id == m.id).first() is not None
        
        results.append({
            "mission_id": str(m.id),
            "mission_name": m.mission_name,
            "created_at": m.created_at.isoformat(),
            "student_name": student.full_name,
            "school_name": student.school_name,
            "grade": student.grade,
            "invitation_code": student.invitation_code,
            "progress": {
                "components": has_components,
                "conops": has_conops,
                "data_budget": has_data,
                "power_budget": has_power,
                "link_budget": has_link,
                "mass_budget": has_mass,
                "cost_budget": has_cost
            }
        })
        
    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results

@router.get("/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == current_user.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

from app.models.page_access import PageAccess

@router.get("/{mission_id}/leaderboard")
def get_mission_leaderboard(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify mission exists
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # Student owns the mission, or is admin
    if mission.student_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this mission's leaderboard")

    # School batch invitation code
    inv_code = current_user.invitation_code

    # Helper function to get completion timestamps
    def get_completion_timestamps(m_id):
        # 1. Mission Creation (always completed when mission exists)
        t_mission = db.query(func.min(Mission.created_at)).filter(Mission.id == m_id).scalar()

        # 2. Components: first added component
        t_components = db.query(func.min(MissionComponent.created_at)).filter(MissionComponent.mission_id == m_id).scalar()

        # 3. CONOPS: first added mode
        t_conops = db.query(func.min(MissionMode.created_at)).filter(MissionMode.mission_id == m_id).scalar()

        # 4. Data Budget: first data budget entry
        t_data = db.query(func.min(DataBudgetEntry.created_at)).join(MissionComponent).filter(MissionComponent.mission_id == m_id).scalar()

        # 5. Power Budget: first power budget entry
        t_power = db.query(func.min(PowerBudgetEntry.created_at)).join(MissionComponent).filter(MissionComponent.mission_id == m_id).scalar()

        # 6. Link Budget: link budget entry
        t_link = db.query(func.min(LinkBudgetEntry.created_at)).filter(LinkBudgetEntry.mission_id == m_id).scalar()

        # 7. Mass Budget: first mass budget entry
        t_mass = db.query(func.min(MassBudgetEntry.created_at)).join(MissionComponent).filter(MissionComponent.mission_id == m_id).scalar()

        # 8. Cost Budget: first cost budget entry
        t_cost = db.query(func.min(CostBudgetEntry.created_at)).join(MissionComponent).filter(MissionComponent.mission_id == m_id).scalar()

        return {
            "mission": t_mission,
            "components": t_components,
            "conops": t_conops,
            "data_budget": t_data,
            "power_budget": t_power,
            "link_budget": t_link,
            "mass_budget": t_mass,
            "cost_budget": t_cost
        }

    # Helper function to calculate points (XP) based on speed bonus
    def calculate_section_xp(completion_time, unlock_time):
        if not completion_time:
            return 0
        if not unlock_time:
            # If no unlock time registered yet, default to base XP
            return 100
            
        diff = completion_time - unlock_time
        diff_hours = diff.total_seconds() / 3600
        
        if diff_hours < 0:
            diff_hours = 0
            
        if diff_hours <= 24:
            return 200
        elif diff_hours <= 48:
            return 180
        elif diff_hours <= 72:
            return 160
        elif diff_hours <= 96:
            return 140
        elif diff_hours <= 120:
            return 120
        else:
            return 100

    # Helper function to get unlock times for this batch
    def get_unlock_times(m_created_at, student_inv_code):
        unlock_times = {
            "mission": m_created_at,
            "components": m_created_at,
            "conops": m_created_at
        }
        
        lockable_pages = {
            "data_budget": "data-budget",
            "power_budget": "power-budget",
            "link_budget": "link-budget",
            "mass_budget": "mass-budget",
            "cost_budget": "cost-budget"
        }
        
        for section_key, page_key in lockable_pages.items():
            # Query PageAccess for this page and batch
            pa = None
            if student_inv_code:
                pa = db.query(PageAccess).filter(
                    PageAccess.page_key == page_key,
                    PageAccess.invitation_code == student_inv_code
                ).first()
                
            if pa and pa.is_unlocked:
                unlock_times[section_key] = pa.updated_at
            else:
                # If page is not unlocked yet or no record, default to mission creation time as fallback
                unlock_times[section_key] = m_created_at
                
        return unlock_times

    # Calculate stamps & points for current student's mission
    m_created = mission.created_at
    comp_times = get_completion_timestamps(mission.id)
    unlock_times = get_unlock_times(m_created, inv_code)
    
    stamps = {key: val is not None for key, val in comp_times.items()}
    
    student_section_xp = {}
    for key, c_time in comp_times.items():
        u_time = unlock_times.get(key)
        student_section_xp[key] = calculate_section_xp(c_time, u_time)
        
    student_points = sum(student_section_xp.values())

    # Get school leaderboard (classmates with same invitation code)
    leaderboard_data = []
    if inv_code:
        students = db.query(User).filter(User.invitation_code == inv_code, User.role == "student").all()
    else:
        students = [current_user]

    for s in students:
        # Find s's missions
        s_missions = db.query(Mission).filter(Mission.student_id == s.id).all()
        s_max_points = 0
        s_max_completed = 0
        
        for sm in s_missions:
            sm_comp_times = get_completion_timestamps(sm.id)
            sm_unlock_times = get_unlock_times(sm.created_at, s.invitation_code)
            
            sm_xp = 0
            sm_completed = 0
            for key, c_time in sm_comp_times.items():
                if c_time is not None:
                    sm_completed += 1
                    u_time = sm_unlock_times.get(key)
                    sm_xp += calculate_section_xp(c_time, u_time)
                    
            if sm_xp > s_max_points:
                s_max_points = sm_xp
                s_max_completed = sm_completed
                
        leaderboard_data.append({
            "student_name": s.full_name,
            "school_name": s.school_name,
            "points": s_max_points,
            "completed_sections": s_max_completed,
            "is_current": s.id == current_user.id
        })

    # Sort: points descending, then name ascending
    leaderboard_data.sort(key=lambda x: (-x["points"], x["student_name"].lower()))

    return {
        "stamps": stamps,
        "section_xp": student_section_xp,
        "points": student_points,
        "leaderboard": leaderboard_data,
        "invitation_code": inv_code
    }

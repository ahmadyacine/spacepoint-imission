from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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

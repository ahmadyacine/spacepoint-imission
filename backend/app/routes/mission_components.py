from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.mission import Mission
from app.models.mission_component import MissionComponent
from app.models.component import Component
from app.models.user import User
from app.schemas.mission_component import MissionComponentAdd, MissionComponentOut
from app.utils.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/missions", tags=["Mission Components"])

@router.post("/{mission_id}/components", response_model=MissionComponentOut, status_code=201)
def add_component(
    mission_id: uuid.UUID,
    data: MissionComponentAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == current_user.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    component = db.query(Component).filter(Component.id == data.component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    mc = MissionComponent(mission_id=mission_id, component_id=data.component_id, quantity=data.quantity)
    db.add(mc)
    db.commit()
    db.refresh(mc)
    return mc

@router.get("/{mission_id}/components", response_model=List[MissionComponentOut])
def list_mission_components(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == current_user.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return db.query(MissionComponent).filter(MissionComponent.mission_id == mission_id).all()

@router.delete("/{mission_id}/components/{mc_id}", status_code=204)
def remove_component(
    mission_id: uuid.UUID,
    mc_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == current_user.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    mc = db.query(MissionComponent).filter(MissionComponent.id == mc_id, MissionComponent.mission_id == mission_id).first()
    if not mc:
        raise HTTPException(status_code=404, detail="Mission component not found")
    db.delete(mc)
    db.commit()

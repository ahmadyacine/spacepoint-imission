from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.mission import Mission
from app.models.user import User
from app.schemas.mission import MissionCreate, MissionOut
from app.utils.dependencies import get_current_user
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

@router.get("/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.student_id == current_user.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

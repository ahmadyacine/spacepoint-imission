from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.component import Component
from app.models.user import User
from app.schemas.component import ComponentCreate, ComponentUpdate, ComponentOut
from app.utils.dependencies import get_current_user, require_admin
from datetime import datetime
import uuid

router = APIRouter(prefix="/components", tags=["Components"])

# ── Public / Student Routes ──────────────────────────────────────────────────

@router.get("", response_model=List[ComponentOut])
def list_components(
    subsystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Component).filter(Component.is_active == True)
    if subsystem:
        q = q.filter(Component.subsystem == subsystem)
    if search:
        q = q.filter(Component.component_name.ilike(f"%{search}%"))
    return q.all()

@router.get("/{component_id}", response_model=ComponentOut)
def get_component(component_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    return comp

# ── Admin Routes ─────────────────────────────────────────────────────────────

@router.post("", response_model=ComponentOut, status_code=201)
def create_component(data: ComponentCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    comp = Component(**data.model_dump())
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

@router.put("/{component_id}", response_model=ComponentOut)
def update_component(component_id: uuid.UUID, data: ComponentUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(comp, field, value)
    comp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comp)
    return comp

@router.delete("/{component_id}", status_code=204)
def delete_component(component_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    db.delete(comp)
    db.commit()

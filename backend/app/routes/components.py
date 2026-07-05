from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
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

@router.get("/admin/all", response_model=List[ComponentOut])
def list_all_components_admin(
    subsystem: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin-only: returns ALL components including inactive ones."""
    q = db.query(Component)
    if subsystem:
        q = q.filter(Component.subsystem == subsystem)
    if tag:
        q = q.filter(Component.tag == tag)
    if search:
        q = q.filter(Component.component_name.ilike(f"%{search}%"))
    return q.all()

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

@router.post("/bulk", response_model=List[ComponentOut], status_code=201)
def bulk_create_components(data: List[ComponentCreate], db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    components = []
    for item in data:
        comp = Component(**item.model_dump())
        db.add(comp)
        components.append(comp)
    db.commit()
    for comp in components:
        db.refresh(comp)
    return components

@router.post("/upload-image")
def upload_image(file: UploadFile = File(...), admin: User = Depends(require_admin)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    routes_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(routes_dir)
    backend_dir = os.path.dirname(app_dir)
    root_dir = os.path.dirname(backend_dir)
    upload_dir = os.path.join(root_dir, "frontend", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".png"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/static/uploads/{filename}"}

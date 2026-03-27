from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.invitation_code import InvitationCode
from app.schemas.invitation_code import InvitationCodeOut, InvitationCodeCreate, InvitationCodeUpdate
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/invitation-codes", tags=["Invitation Codes"])

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

@router.get("", response_model=List[InvitationCodeOut])
def get_codes(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(InvitationCode).all()

@router.post("", response_model=InvitationCodeOut, status_code=201)
def create_code(data: InvitationCodeCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    existing = db.query(InvitationCode).filter(InvitationCode.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invitation code already exists")
    
    code_obj = InvitationCode(**data.model_dump())
    db.add(code_obj)
    db.commit()
    db.refresh(code_obj)
    return code_obj

@router.put("/{code_id}", response_model=InvitationCodeOut)
def update_code(code_id: uuid.UUID, data: InvitationCodeUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    code_obj = db.query(InvitationCode).filter(InvitationCode.id == code_id).first()
    if not code_obj:
        raise HTTPException(status_code=404, detail="Invitation code not found")
    
    if data.code is not None:
        existing = db.query(InvitationCode).filter(InvitationCode.code == data.code, InvitationCode.id != code_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Invitation code with this text already exists")
        code_obj.code = data.code
        
    if data.label is not None:
        code_obj.label = data.label
    if data.max_uses is not None:
        code_obj.max_uses = data.max_uses
    if data.is_active is not None:
        code_obj.is_active = data.is_active
        
    db.commit()
    db.refresh(code_obj)
    return code_obj

@router.delete("/{code_id}", status_code=204)
def delete_code(code_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    code_obj = db.query(InvitationCode).filter(InvitationCode.id == code_id).first()
    if not code_obj:
        raise HTTPException(status_code=404, detail="Invitation code not found")
        
    db.delete(code_obj)
    db.commit()
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, UserUpdate, AdminUserUpdate
from app.utils.auth import hash_password, verify_password, create_access_token
from app.utils.dependencies import get_current_user
from typing import List
from app.models.invitation_code import InvitationCode

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check invitation code
    invitation = db.query(InvitationCode).filter(InvitationCode.code == data.invitation_code).first()
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid invitation code")
    if not invitation.is_active:
        raise HTTPException(status_code=400, detail="This invitation code is inactive")
    if invitation.uses_count >= invitation.max_uses:
        raise HTTPException(status_code=400, detail="This invitation code has reached its usage limit")
        
    invitation.uses_count += 1

    user = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="student",
        school_name=data.school_name,
        grade=data.grade,
        invitation_code=data.invitation_code
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.school_name is not None:
        current_user.school_name = data.school_name
    if data.grade is not None:
        current_user.grade = data.grade
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/students", response_model=List[UserOut])
def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    students = db.query(User).filter(User.role == "student").order_by(User.created_at.desc()).all()
    return students

@router.put("/students/{student_id}", response_model=UserOut)
def update_student(student_id: UUID, data: AdminUserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if data.full_name is not None: student.full_name = data.full_name
    if data.email is not None:
        # Check if email is already used by someone else
        existing = db.query(User).filter(User.email == data.email, User.id != student_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        student.email = data.email
    if data.school_name is not None: student.school_name = data.school_name
    if data.grade is not None: student.grade = data.grade
    if data.invitation_code is not None:
        # Check if code exists
        code = db.query(InvitationCode).filter(InvitationCode.code == data.invitation_code).first()
        if not code:
            raise HTTPException(status_code=400, detail="Invalid invitation code")
        student.invitation_code = data.invitation_code
    if data.is_active is not None: student.is_active = data.is_active
    
    db.commit()
    db.refresh(student)
    return student

@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Optional: Delete associated missions or check dependencies
    # For now, just delete the user
    db.delete(student)
    db.commit()
    return None


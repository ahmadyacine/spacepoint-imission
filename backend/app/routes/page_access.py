from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.page_access import PageAccess
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/page-access", tags=["Page Access"])

# All lockable pages with their human-readable labels.
# Mission, Components, CONOPS are always unlocked.
LOCKABLE_PAGES = [
    {"key": "data-budget",  "label": "Data Budget"},
    {"key": "power-budget", "label": "Power Budget"},
    {"key": "link-budget",  "label": "Link Budget"},
    {"key": "mass-budget",  "label": "Mass Budget"},
    {"key": "cost-budget",  "label": "Cost Budget"},
    {"key": "dashboard",    "label": "Dashboard"},
]

ALWAYS_OPEN = {"mission", "components", "conops"}

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

def seed_defaults(db: Session, code: str):
    """Ensure all lockable pages have a row in the DB for this invitation code."""
    for p in LOCKABLE_PAGES:
        existing = db.query(PageAccess).filter(
            PageAccess.page_key == p["key"],
            PageAccess.invitation_code == code
        ).first()
        if not existing:
            db.add(PageAccess(page_key=p["key"], invitation_code=code, label=p["label"], is_unlocked=False))
    db.commit()


class PageAccessOut(BaseModel):
    page_key: str
    invitation_code: str
    label: str
    is_unlocked: bool

    class Config:
        from_attributes = True


class PageAccessUpdate(BaseModel):
    invitation_code: str
    is_unlocked: bool


# ── Student endpoint: check access based on their registered code ─────────────
@router.get("/check/{page_key}")
def check_page_access(
    page_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Used by student pages to check if they are allowed to load based on their code."""
    if page_key in ALWAYS_OPEN:
        return {"is_unlocked": True}
    
    code = current_user.invitation_code
    if not code:
        return {"is_unlocked": False}

    seed_defaults(db, code)
    row = db.query(PageAccess).filter(
        PageAccess.page_key == page_key,
        PageAccess.invitation_code == code
    ).first()
    return {"is_unlocked": row.is_unlocked if row else False}


# ── Admin: list all pages for a specific code ─────────────────────────────────
@router.get("", response_model=List[PageAccessOut])
def list_pages(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    seed_defaults(db, code)
    pages = db.query(PageAccess).filter(PageAccess.invitation_code == code).all()
    return pages


# ── Admin: toggle a specific page for a specific code ─────────────────────────
@router.put("/{page_key}", response_model=PageAccessOut)
def update_page_access(
    page_key: str,
    data: PageAccessUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if page_key in ALWAYS_OPEN:
        raise HTTPException(status_code=400, detail="This page is always accessible.")
    
    seed_defaults(db, data.invitation_code)
    row = db.query(PageAccess).filter(
        PageAccess.page_key == page_key,
        PageAccess.invitation_code == data.invitation_code
    ).first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Page entry not found")
        
    row.is_unlocked = data.is_unlocked
    db.commit()
    db.refresh(row)
    return row

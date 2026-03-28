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

def seed_defaults(db: Session):
    """Ensure all lockable pages have a row in the DB."""
    for p in LOCKABLE_PAGES:
        existing = db.query(PageAccess).filter(PageAccess.page_key == p["key"]).first()
        if not existing:
            db.add(PageAccess(page_key=p["key"], label=p["label"], is_unlocked=False))
    db.commit()


class PageAccessOut(BaseModel):
    page_key: str
    label: str
    is_unlocked: bool

    class Config:
        from_attributes = True


class PageAccessUpdate(BaseModel):
    is_unlocked: bool


# ── Public endpoint: check if a specific page is accessible ───────────────────
@router.get("/check/{page_key}")
def check_page_access(page_key: str, db: Session = Depends(get_db)):
    """Used by student pages to check if they are allowed to load."""
    if page_key in ALWAYS_OPEN:
        return {"is_unlocked": True}
    seed_defaults(db)
    row = db.query(PageAccess).filter(PageAccess.page_key == page_key).first()
    return {"is_unlocked": row.is_unlocked if row else False}


# ── Admin: list all pages ─────────────────────────────────────────────────────
@router.get("", response_model=List[PageAccessOut])
def list_pages(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    seed_defaults(db)
    pages = db.query(PageAccess).all()
    return pages


# ── Admin: toggle a specific page ─────────────────────────────────────────────
@router.put("/{page_key}", response_model=PageAccessOut)
def update_page_access(
    page_key: str,
    data: PageAccessUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if page_key in ALWAYS_OPEN:
        raise HTTPException(status_code=400, detail="This page is always accessible and cannot be locked.")
    seed_defaults(db)
    row = db.query(PageAccess).filter(PageAccess.page_key == page_key).first()
    if not row:
        raise HTTPException(status_code=404, detail="Page not found")
    row.is_unlocked = data.is_unlocked
    db.commit()
    db.refresh(row)
    return row

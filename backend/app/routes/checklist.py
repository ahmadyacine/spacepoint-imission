from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.checklist import ChecklistProgress
from app.models.user import User
from app.utils.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/checklist", tags=["Checklist"])

# ── All checklist items definition ───────────────────────────────────────────

CHECKLIST_ITEMS = [
    # Day 1
    {"key": "day1_1", "day": 1, "label": "Attend the Opening Ceremony"},
    {"key": "day1_2", "day": 1, "label": "Meet your teammates"},
    {"key": "day1_3", "day": 1, "label": "Form your engineering team"},
    {"key": "day1_4", "day": 1, "label": "Choose your satellite mission"},
    {"key": "day1_5", "day": 1, "label": "Learn about the UAE Space Ecosystem"},
    {"key": "day1_6", "day": 1, "label": "Discover how satellites help our world"},
    {"key": "day1_7", "day": 1, "label": "Explore satellite architecture"},
    {"key": "day1_8", "day": 1, "label": "Get started with the Madar Mission Design Platform"},
    {"key": "day1_9", "day": 1, "label": "Learn about the Command & Data Handling System (CDHS)"},
    # Day 2
    {"key": "day2_1", "day": 2, "label": "Learn about the Electrical Power System (EPS)"},
    {"key": "day2_2", "day": 2, "label": "Calculate your satellite's power budget"},
    {"key": "day2_3", "day": 2, "label": "Explore the Attitude Determination & Control System (ADCS)"},
    {"key": "day2_4", "day": 2, "label": "Understand satellite communications"},
    {"key": "day2_5", "day": 2, "label": "Learn about telemetry and data flow"},
    {"key": "day2_6", "day": 2, "label": "Record your engineering decisions on Madar"},
    {"key": "day2_7", "day": 2, "label": "Complete today's engineering activities"},
    # Day 3
    {"key": "day3_1", "day": 3, "label": "Assemble your satellite"},
    {"key": "day3_2", "day": 3, "label": "Integrate satellite subsystems"},
    {"key": "day3_3", "day": 3, "label": "Test your satellite"},
    {"key": "day3_4", "day": 3, "label": "Troubleshoot and improve your design"},
    {"key": "day3_5", "day": 3, "label": "Update your engineering documentation"},
    {"key": "day3_6", "day": 3, "label": "Finalize your mission poster"},
    {"key": "day3_7", "day": 3, "label": "Prepare for Demo Day"},
    # Day 4
    {"key": "day4_1", "day": 4, "label": "Present your mission poster"},
    {"key": "day4_2", "day": 4, "label": "Demonstrate your satellite"},
    {"key": "day4_3", "day": 4, "label": "Explain your engineering decisions"},
    {"key": "day4_4", "day": 4, "label": "Answer questions from mentors and guests"},
    {"key": "day4_5", "day": 4, "label": "Celebrate your team's success"},
    {"key": "day4_6", "day": 4, "label": "Receive your certificate"},
]

ALL_KEYS = {item["key"] for item in CHECKLIST_ITEMS}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChecklistItemOut(BaseModel):
    key: str
    day: int
    label: str
    is_checked: bool


class ToggleRequest(BaseModel):
    is_checked: bool


# ── Student Routes ────────────────────────────────────────────────────────────

@router.get("", response_model=List[ChecklistItemOut])
def get_my_checklist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all checklist items with the student's checked state."""
    rows = db.query(ChecklistProgress).filter(
        ChecklistProgress.user_id == current_user.id
    ).all()
    checked = {r.item_key: r.is_checked for r in rows}

    return [
        ChecklistItemOut(
            key=item["key"],
            day=item["day"],
            label=item["label"],
            is_checked=checked.get(item["key"], False)
        )
        for item in CHECKLIST_ITEMS
    ]


@router.put("/{item_key}", response_model=ChecklistItemOut)
def toggle_item(
    item_key: str,
    data: ToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle a checklist item for the current student."""
    if item_key not in ALL_KEYS:
        raise HTTPException(status_code=404, detail="Unknown checklist item")

    row = db.query(ChecklistProgress).filter(
        ChecklistProgress.user_id == current_user.id,
        ChecklistProgress.item_key == item_key
    ).first()

    if row:
        row.is_checked = data.is_checked
        row.updated_at = datetime.utcnow()
    else:
        row = ChecklistProgress(
            user_id=current_user.id,
            item_key=item_key,
            is_checked=data.is_checked
        )
        db.add(row)

    db.commit()
    db.refresh(row)

    item_def = next(i for i in CHECKLIST_ITEMS if i["key"] == item_key)
    return ChecklistItemOut(
        key=item_key,
        day=item_def["day"],
        label=item_def["label"],
        is_checked=row.is_checked
    )


# ── Admin Route ───────────────────────────────────────────────────────────────

@router.get("/admin/all")
def get_all_checklists(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin: get checklist progress for all students, grouped by invitation code."""
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()

    result = []
    for student in students:
        rows = db.query(ChecklistProgress).filter(
            ChecklistProgress.user_id == student.id
        ).all()
        checked_keys = {r.item_key for r in rows if r.is_checked}

        # Per-day progress
        days = {}
        for day_num in [1, 2, 3, 4]:
            day_items = [i for i in CHECKLIST_ITEMS if i["day"] == day_num]
            done = sum(1 for i in day_items if i["key"] in checked_keys)
            days[f"day{day_num}"] = {"done": done, "total": len(day_items)}

        total_done = sum(1 for i in CHECKLIST_ITEMS if i["key"] in checked_keys)

        result.append({
            "user_id": str(student.id),
            "full_name": student.full_name,
            "email": student.email,
            "invitation_code": student.invitation_code or "—",
            "total_done": total_done,
            "total_items": len(CHECKLIST_ITEMS),
            "days": days,
            "checked_keys": list(checked_keys)
        })

    return result

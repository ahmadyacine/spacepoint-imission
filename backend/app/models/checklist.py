import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ChecklistProgress(Base):
    __tablename__ = "checklist_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_key = Column(String, nullable=False)   # e.g. "day1_1", "day3_5"
    is_checked = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="checklist_items")

    __table_args__ = (
        UniqueConstraint("user_id", "item_key", name="uq_user_item"),
    )

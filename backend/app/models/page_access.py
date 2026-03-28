from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from app.database import Base

class PageAccess(Base):
    __tablename__ = "page_access"

    # page_key is the unique identifier for each page (e.g. "data-budget")
    page_key = Column(String, primary_key=True, index=True)
    label = Column(String, nullable=False)       # Human-readable label
    is_unlocked = Column(Boolean, default=False) # False = locked for students
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

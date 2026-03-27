import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database import Base

class InvitationCode(Base):
    __tablename__ = "invitation_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=True)  # e.g., "Fall 2026 Batch", "Dubai School"
    max_uses = Column(Integer, default=1)   # How many times it can be used (0 = unlimited maybe, but let's say an explicit large number for unlimited)
    uses_count = Column(Integer, default=0) # How many times it has actually been used
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

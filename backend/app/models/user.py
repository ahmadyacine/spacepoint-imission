import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # student | admin
    school_name = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    invitation_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    missions = relationship("Mission", back_populates="student", cascade="all, delete-orphan")

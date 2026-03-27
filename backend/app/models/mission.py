import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Mission(Base):
    __tablename__ = "missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mission_name = Column(String, nullable=False)
    mission_objective = Column(Text, nullable=False)
    orbit_type = Column(String, nullable=False)       # LEO, MEO, GEO, SSO, Custom
    orbit_duration_min = Column(Float, nullable=False)
    orbits_per_day = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="missions")
    components = relationship("MissionComponent", back_populates="mission", cascade="all, delete-orphan")
    modes = relationship("MissionMode", back_populates="mission", cascade="all, delete-orphan", order_by="MissionMode.display_order")
    constraint = relationship("MissionConstraint", back_populates="mission", uselist=False, cascade="all, delete-orphan")
    link_budget_entry = relationship("LinkBudgetEntry", back_populates="mission", uselist=False, cascade="all, delete-orphan")

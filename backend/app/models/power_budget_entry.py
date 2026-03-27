import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PowerBudgetEntry(Base):
    __tablename__ = "power_budget_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_component_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mission_components.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    voltage_v = Column(Float, default=0.0)
    current_ma = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission_component = relationship("MissionComponent", back_populates="power_budget_entry")

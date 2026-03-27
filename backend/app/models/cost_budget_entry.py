from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class CostBudgetEntry(Base):
    __tablename__ = "cost_budget_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_component_id = Column(UUID(as_uuid=True), ForeignKey("mission_components.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    quantity = Column(Integer, default=1, nullable=False)
    cost_per_unit_aed = Column(Float, nullable=True)
    vendor = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    purchase_link = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    mission_component = relationship("MissionComponent", back_populates="cost_budget_entry")

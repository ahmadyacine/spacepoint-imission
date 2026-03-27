import uuid
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class MissionComponent(Base):
    __tablename__ = "mission_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="components")
    component = relationship("Component", back_populates="mission_links")
    mode_states = relationship("ComponentModeState", back_populates="mission_component", cascade="all, delete-orphan")
    data_budget_entry = relationship("DataBudgetEntry", back_populates="mission_component", uselist=False, cascade="all, delete-orphan")
    power_budget_entry = relationship("PowerBudgetEntry", back_populates="mission_component", uselist=False, cascade="all, delete-orphan")
    mass_budget_entry = relationship("MassBudgetEntry", back_populates="mission_component", uselist=False, cascade="all, delete-orphan")
    cost_budget_entry = relationship("CostBudgetEntry", back_populates="mission_component", uselist=False, cascade="all, delete-orphan")


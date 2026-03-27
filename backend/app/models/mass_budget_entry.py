import uuid
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class MassBudgetEntry(Base):
    __tablename__ = "mass_budget_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_component_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mission_components.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    quantity = Column(Integer, default=1)
    mass_per_unit_g = Column(Float, nullable=True)
    length_x_mm = Column(Float, nullable=True)
    width_y_mm = Column(Float, nullable=True)
    height_z_mm = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission_component = relationship("MissionComponent", back_populates="mass_budget_entry")

import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class DataBudgetEntry(Base):
    __tablename__ = "data_budget_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_component_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mission_components.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    data_type = Column(String, nullable=True)
    data_size_per_measurement_kb = Column(Float, default=0.0)
    measurements_per_minute = Column(Float, default=0.0)
    priority = Column(String, default="Medium")        # Critical / High / Medium / Low
    storage_mode = Column(String, default="Stored")    # Stored / Sent / Both
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission_component = relationship("MissionComponent", back_populates="data_budget_entry")

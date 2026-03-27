import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ComponentModeState(Base):
    __tablename__ = "component_mode_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_component_id = Column(UUID(as_uuid=True), ForeignKey("mission_components.id", ondelete="CASCADE"), nullable=False)
    mission_mode_id = Column(UUID(as_uuid=True), ForeignKey("mission_modes.id", ondelete="CASCADE"), nullable=False)
    is_on = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission_component = relationship("MissionComponent", back_populates="mode_states")
    mode = relationship("MissionMode", back_populates="states")

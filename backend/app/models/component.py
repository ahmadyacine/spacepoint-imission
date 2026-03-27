import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Component(Base):
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_name = Column(String, nullable=False)
    subsystem = Column(String, nullable=False)        # ADCS, CDHS, EPS, COMMS, Payload, Structure, Thermal
    example_role = Column(Text)
    scaled_description = Column(Text)
    scaled_dimensions_mm = Column(String)
    scaled_mass_g = Column(Float)
    voltage_v = Column(Float)
    current_ma = Column(Float)
    data_size = Column(String)
    assumed_cost_usd = Column(Float)
    temperature_range = Column(String)
    key_specs = Column(Text)
    image_url = Column(String)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    component_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission_links = relationship("MissionComponent", back_populates="component")

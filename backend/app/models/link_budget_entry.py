import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class LinkBudgetEntry(Base):
    __tablename__ = "link_budget_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("missions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    band_profile = Column(String, default="UHF")          # "UHF" | "S-Band"
    downlink_frequency_mhz = Column(Float, default=437.5)
    uplink_frequency_mhz = Column(Float, default=145.8)
    satellite_antenna_gain_dbi = Column(Float, default=2.0)
    data_rate_kbps = Column(Float, default=9.6)
    required_signal_quality_db = Column(Float, default=9.6)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission = relationship("Mission", back_populates="link_budget_entry")

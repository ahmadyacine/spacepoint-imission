import uuid
from sqlalchemy import Column, Float, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class MissionConstraint(Base):
    __tablename__ = "mission_constraints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), unique=True, nullable=False)

    # ── Data Budget limits ────────────────────────────────────────────────────
    max_storage_kb = Column(Float, default=1_048_576.0, server_default=text("1048576.0"))
    required_storage_margin_kb = Column(Float, default=104_857.6, server_default=text("104857.6"))

    # ── EPS / Power Budget limits ─────────────────────────────────────────────
    max_total_power_mw = Column(Float, default=3000.0, server_default=text("3000.0"))
    required_power_margin_mw = Column(Float, default=200.0, server_default=text("200.0"))
    power_per_solar_cell_w = Column(Float, default=1.1, server_default=text("1.1"))
    solar_panel_power_mw = Column(Float, default=3000.0, server_default=text("3000.0"))
    selected_solar_cells = Column(Float, default=0, server_default=text("0"))  # student-chosen solar cell count

    # ── Future phase placeholders ─────────────────────────────────────────────
    max_cost_usd = Column(Float, default=50_000.0, server_default=text("50000.0"))
    min_link_margin_db = Column(Float, default=3.0, server_default=text("3.0"))

    # ── Mass Budget settings ──────────────────────────────────────────────────
    max_allowed_mass_kg = Column(Float, default=1.33, server_default=text("1.33"))
    selected_cubesat_size = Column(String, default="1U", server_default=text("'1U'"))
    available_internal_volume_cm3 = Column(Float, default=1000.0, server_default=text("1000.0"))

    # ── Link Budget settings ──────────────────────────────────────────────────
    assumed_distance_km = Column(Float, default=500.0, server_default=text("500.0"))
    transmit_power_dbm = Column(Float, default=30.0, server_default=text("30.0"))
    good_link_margin_threshold_db = Column(Float, default=3.0, server_default=text("3.0"))
    weak_link_margin_threshold_db = Column(Float, default=0.0, server_default=text("0.0"))
    min_link_margin_db = Column(Float, default=3.0, server_default=text("3.0"))

    # ── Cost Budget settings ──────────────────────────────────────────────────
    maximum_budget_aed = Column(Float, default=2000.0, server_default=text("2000.0"))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission = relationship("Mission", back_populates="constraint")

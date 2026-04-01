from pydantic import BaseModel
from typing import Optional, List
import uuid

# ── Band preset ───────────────────────────────────────────────────────────────

class BandPreset(BaseModel):
    band_profile: str
    downlink_frequency_mhz: float
    uplink_frequency_mhz: float
    satellite_antenna_gain_dbi: float
    data_rate_kbps: float
    required_signal_quality_db: float

# ── Student-editable entry ────────────────────────────────────────────────────

class LinkBudgetEntryInput(BaseModel):
    band_profile: str = "UHF"
    downlink_frequency_mhz: float = 437.5
    uplink_frequency_mhz: float = 145.8
    satellite_antenna_gain_dbi: float = 2.0
    data_rate_kbps: float = 9.6
    required_signal_quality_db: float = 9.6
    transmit_power_dbm: float = 30.0
    assumed_distance_km: float = 500.0
    notes: Optional[str] = None

# ── Calculated outputs ────────────────────────────────────────────────────────

class LinkBudgetCalculated(BaseModel):
    assumed_distance_km: float
    transmit_power_dbm: float
    free_space_path_loss_db: float
    eirp_dbm: float
    received_power_dbm: float
    noise_power_dbm: float
    actual_signal_quality_db: float
    required_signal_quality_db: float
    system_link_margin_db: float
    link_status: str   # "Good Link" | "Weak Link" | "Failed Link"

# ── Constraint sub-schema ─────────────────────────────────────────────────────

class LinkConstraintsOut(BaseModel):
    assumed_distance_km: float
    transmit_power_dbm: float
    good_link_margin_threshold_db: float
    weak_link_margin_threshold_db: float

# ── Full GET response ─────────────────────────────────────────────────────────

class LinkBudgetGetOut(BaseModel):
    band_profile: str
    downlink_frequency_mhz: float
    uplink_frequency_mhz: float
    satellite_antenna_gain_dbi: float
    data_rate_kbps: float
    required_signal_quality_db: float
    notes: Optional[str]
    constraints: LinkConstraintsOut
    calculated: LinkBudgetCalculated
    presets: List[BandPreset]
    is_saved: bool = False

# ── Summary ───────────────────────────────────────────────────────────────────

class LinkBudgetSummaryOut(BaseModel):
    assumed_distance_km: float
    transmit_power_dbm: float
    free_space_path_loss_db: float
    eirp_dbm: float
    received_power_dbm: float
    noise_power_dbm: float
    actual_signal_quality_db: float
    required_signal_quality_db: float
    system_link_margin_db: float
    link_status: str
    is_valid: bool
    validation_messages: List[str]

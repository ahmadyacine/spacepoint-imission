"""
Seed script – run once after starting the server to populate sample components.
Usage: python seed.py
"""
import sys, os
sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.component import Component
from app.models.user import User
from app.utils.auth import hash_password
from datetime import datetime

db = SessionLocal()

# ── Create admin user ────────────────────────────────────────────────────────
admin_email = "admin@spacepoint.ae"
existing_admin = db.query(User).filter(User.email == admin_email).first()
if not existing_admin:
    admin = User(
        full_name="SpacePoint Admin",
        email=admin_email,
        hashed_password=hash_password("Admin@1234"),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"✅ Admin created: {admin_email} / Admin@1234")
else:
    print(f"ℹ️  Admin already exists: {admin_email}")

# ── Sample components ────────────────────────────────────────────────────────
components = [
    # ADCS
    dict(
        component_name="Nano Star Tracker",
        subsystem="ADCS",
        example_role="Attitude determination",
        scaled_description="Compact star tracker for precise 3-axis orientation using star pattern recognition.",
        scaled_dimensions_mm="50×50×30",
        scaled_mass_g=85.0,
        voltage_v=5.0,
        current_ma=250.0,
        data_size="12 KB/s",
        assumed_cost_usd=4500.0,
        temperature_range="-20 to +60°C",
        key_specs="Accuracy: 2 arcsec, Update rate: 4 Hz",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="ADCS-ST-001",
    ),
    dict(
        component_name="MEMS Reaction Wheel",
        subsystem="ADCS",
        example_role="Attitude control",
        scaled_description="Miniaturized reaction wheel providing precise torque for CubeSat attitude maneuvers.",
        scaled_dimensions_mm="44×44×20",
        scaled_mass_g=120.0,
        voltage_v=5.0,
        current_ma=400.0,
        data_size="1 KB/s",
        assumed_cost_usd=2800.0,
        temperature_range="-30 to +70°C",
        key_specs="Max torque: 1 mNm, Max speed: 7000 RPM",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="ADCS-RW-001",
    ),
    dict(
        component_name="IMU Module",
        subsystem="ADCS",
        example_role="Rate sensing",
        scaled_description="6-DOF inertial measurement unit combining 3-axis gyroscope and 3-axis accelerometer.",
        scaled_dimensions_mm="25×25×10",
        scaled_mass_g=15.0,
        voltage_v=3.3,
        current_ma=50.0,
        data_size="2 KB/s",
        assumed_cost_usd=350.0,
        temperature_range="-40 to +85°C",
        key_specs="Gyro: ±500°/s, Accel: ±16g",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="ADCS-IMU-001",
    ),

    # CDHS
    dict(
        component_name="OBC (On-Board Computer)",
        subsystem="CDHS",
        example_role="Mission computer",
        scaled_description="Radiation-tolerant ARM-based OBC for mission data handling and task scheduling.",
        scaled_dimensions_mm="96×90×12",
        scaled_mass_g=94.0,
        voltage_v=3.3,
        current_ma=300.0,
        data_size="100 MB storage",
        assumed_cost_usd=3200.0,
        temperature_range="-40 to +85°C",
        key_specs="ARM Cortex-M7, 256 MB RAM, 8 GB Flash",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="CDHS-OBC-001",
    ),
    dict(
        component_name="Solid-State Recorder",
        subsystem="CDHS",
        example_role="Data storage",
        scaled_description="High-capacity solid-state storage module for mission data buffering before downlink.",
        scaled_dimensions_mm="70×50×15",
        scaled_mass_g=60.0,
        voltage_v=3.3,
        current_ma=150.0,
        data_size="32 GB capacity",
        assumed_cost_usd=1200.0,
        temperature_range="-25 to +75°C",
        key_specs="Write: 150 MB/s, Read: 300 MB/s",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="CDHS-SSR-001",
    ),

    # EPS
    dict(
        component_name="Triple-Junction Solar Panel",
        subsystem="EPS",
        example_role="Power generation",
        scaled_description="High-efficiency GaAs triple-junction solar cell panel for CubeSat power generation.",
        scaled_dimensions_mm="100×82×3",
        scaled_mass_g=55.0,
        voltage_v=5.0,
        current_ma=800.0,
        data_size="N/A",
        assumed_cost_usd=1800.0,
        temperature_range="-180 to +120°C",
        key_specs="Efficiency: 29.5%, Voc: 5.2V",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="EPS-SP-001",
    ),
    dict(
        component_name="Li-Ion Battery Pack",
        subsystem="EPS",
        example_role="Energy storage",
        scaled_description="Rechargeable lithium-ion battery pack with integrated protection and balancing circuits.",
        scaled_dimensions_mm="90×72×18",
        scaled_mass_g=120.0,
        voltage_v=8.2,
        current_ma=2600.0,
        data_size="N/A",
        assumed_cost_usd=950.0,
        temperature_range="-20 to +60°C",
        key_specs="Capacity: 20 Wh, Cycle life: >500",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="EPS-BAT-001",
    ),
    dict(
        component_name="EPS Controller",
        subsystem="EPS",
        example_role="Power management",
        scaled_description="Smart power management unit with MPPT, battery charging and regulated power rails.",
        scaled_dimensions_mm="96×90×15",
        scaled_mass_g=75.0,
        voltage_v=5.0,
        current_ma=200.0,
        data_size="1 KB/s telemetry",
        assumed_cost_usd=2200.0,
        temperature_range="-40 to +85°C",
        key_specs="MPPT efficiency: 97%, 3.3V/5V/12V rails",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="EPS-CTRL-001",
    ),

    # COMMS
    dict(
        component_name="UHF Transceiver",
        subsystem="COMMS",
        example_role="Telemetry & Telecommand",
        scaled_description="Half-duplex UHF transceiver for reliable ground station uplink/downlink in LEO.",
        scaled_dimensions_mm="96×90×15",
        scaled_mass_g=76.0,
        voltage_v=5.0,
        current_ma=450.0,
        data_size="9.6 kbps",
        assumed_cost_usd=1500.0,
        temperature_range="-40 to +85°C",
        key_specs="Freq: 435-438 MHz, Power: 0.5W, Half-duplex",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="COMMS-UHF-001",
    ),
    dict(
        component_name="S-Band Downlink Module",
        subsystem="COMMS",
        example_role="High-speed downlink",
        scaled_description="S-band transmitter for high-throughput payload data downlink from LEO satellites.",
        scaled_dimensions_mm="96×90×20",
        scaled_mass_g=100.0,
        voltage_v=5.0,
        current_ma=1200.0,
        data_size="1 Mbps",
        assumed_cost_usd=4800.0,
        temperature_range="-30 to +70°C",
        key_specs="Freq: 2.0-2.4 GHz, Power: 1W, OQPSK",
        image_url="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=300&fit=crop",
        component_code="COMMS-SBAND-001",
    ),

    # Payload
    dict(
        component_name="RGB Earth Imager",
        subsystem="Payload",
        example_role="Earth observation",
        scaled_description="3-band visible light imager with 5m ground resolution for Earth observation missions.",
        scaled_dimensions_mm="80×80×100",
        scaled_mass_g=300.0,
        voltage_v=5.0,
        current_ma=600.0,
        data_size="50 MB/image",
        assumed_cost_usd=12000.0,
        temperature_range="-10 to +50°C",
        key_specs="GSD: 5m, FOV: 6°, 12-bit, 4096×4096 px",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
        component_code="PL-CAM-001",
    ),
    dict(
        component_name="AIS Receiver",
        subsystem="Payload",
        example_role="Maritime tracking",
        scaled_description="Automatic Identification System receiver for maritime vessel tracking from LEO.",
        scaled_dimensions_mm="70×50×15",
        scaled_mass_g=80.0,
        voltage_v=3.3,
        current_ma=200.0,
        data_size="10 KB/min",
        assumed_cost_usd=3500.0,
        temperature_range="-40 to +85°C",
        key_specs="Channels: A+B, Detection: >90% per pass",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
        component_code="PL-AIS-001",
    ),

    # Structure
    dict(
        component_name="3U CubeSat Structure",
        subsystem="Structure",
        example_role="Main chassis",
        scaled_description="PC/104-compatible 3U CubeSat aluminum structure with deployable solar panel mounts.",
        scaled_dimensions_mm="100×100×340",
        scaled_mass_g=250.0,
        voltage_v=0.0,
        current_ma=0.0,
        data_size="N/A",
        assumed_cost_usd=1800.0,
        temperature_range="-150 to +150°C",
        key_specs="Al 6061-T6, Rails per CDS spec, Mass budget margin",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
        component_code="STR-3U-001",
    ),

    # Thermal
    dict(
        component_name="Multi-Layer Insulation (MLI)",
        subsystem="Thermal",
        example_role="Passive thermal control",
        scaled_description="Aluminized mylar MLI blanket for passive thermal insulation in orbital thermal cycling.",
        scaled_dimensions_mm="300×300×5",
        scaled_mass_g=20.0,
        voltage_v=0.0,
        current_ma=0.0,
        data_size="N/A",
        assumed_cost_usd=200.0,
        temperature_range="-200 to +200°C",
        key_specs="Layers: 15, Effective emittance: 0.01",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
        component_code="THM-MLI-001",
    ),
    dict(
        component_name="Heater Panel",
        subsystem="Thermal",
        example_role="Active thermal control",
        scaled_description="Kapton-based resistive heater panel for battery and electronics cold survival heating.",
        scaled_dimensions_mm="100×80×1",
        scaled_mass_g=10.0,
        voltage_v=5.0,
        current_ma=600.0,
        data_size="N/A",
        assumed_cost_usd=120.0,
        temperature_range="-200 to +130°C",
        key_specs="Power: 3W, Temp sensor integrated, 12V option",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
        component_code="THM-HTR-001",
    ),
]

added = 0
for c in components:
    existing = db.query(Component).filter(Component.component_name == c["component_name"]).first()
    if not existing:
        db.add(Component(**c))
        added += 1

db.commit()
db.close()
print(f"✅ Seeded {added} components (skipped existing).")

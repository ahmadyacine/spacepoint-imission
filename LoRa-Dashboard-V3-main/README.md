# 🛰️ Cube-Sat Ground Station Platform (V3)

Welcome to the **SpacePoint Cube-Sat Ground Station**, a modern, high-performance telemetry dashboard designed for real-time satellite monitoring and command-and-control.

## 🚀 Key Features

- **Real-Time Telemetry**: Visualize temperature, voltage, current, and power metrics with sleek live charts.
- **3D Attitude Tracking**: Real-time 3D visualization of satellite orientation (Pitch, Roll, Yaw).
- **Orbital Tracking**: Integrated 2D tactical map and 3D Earth view for GPS positioning.
- **Madar Integration**: Seamlessly integrated with the Madar Hub for student authentication and permission-based access control.
- **Command Center**: Send commands (Motor Control, Camera Capture, etc.) directly to hardware via Serial or MQTT.
- **Mission Gallery**: Archive and view images captured by the satellite during missions.

## 🛠️ Architecture

- **Frontend**: Built with HTML5, Vanilla CSS, and JavaScript (Vite). Uses Chart.js for metrics and Three.js for 3D views.
- **Backend**: Python Flask-SocketIO server handles high-speed data ingestion and broadcasting.
- **Database**: PostgreSQL (shared with Madar Hub) for persistent telemetry, logs, and user permissions.

## 📦 Installation & Setup

### 1. Prerequisites
- **Python 3.x**
- **Node.js** (for frontend development)
- **PostgreSQL** (ensure `spacepoint_db` is created)

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
pip install -r requirements.txt
```
Configure your `.env` file (refer to `.env.example`):
- `DATABASE_URL`: Connection string for PostgreSQL.
- `SERIAL_PORT`: Your ESP32/Radio port (e.g., `COM3`).

Run the backend:
```bash
python serial_reader.py
```

### 3. Frontend Setup
From the project root:
```bash
npm install
npm run dev
```

## 🔐 Access Control
Access to the ground station is managed via the **Madar Hub**. Students must log in through the Hub to receive a valid access token. 
- **Admin**: Full access to all controls and user management.
- **Student**: Access to specific telemetry modules based on permissions granted in the Admin Panel.

*For exhibition or standalone use, see [exhibition_mode.md](./exhibition_mode.md) for quick-access instructions.*

## 💻 Developer Tools
- **Data Injection**: Test the UI without hardware using the "Data Inject" panel or the `/api/debug/inject` endpoint.
- **Simulation**: Integrated simulation worker for generating realistic orbital data.

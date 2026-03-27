# SpacePoint Mission Portal

SpacePoint Mission Portal is an interactive educational web application designed to guide students through the exact engineering phases of planning a satellite mission. Through a step-by-step interactive journey, students learn about systems engineering, satellite subsystems, orbits, and critical mission budgets.

---

## 🚀 The Student Learning Journey (Mission Phases)

The portal is structured as a 9-step journey, where each step builds upon the previous ones, teaching students real-world aerospace engineering concepts.

### 1. Authentication & Profile
- **Registration & Login**: Secure user authentication.
- **Roles**: Support for Student and Admin profiles.
- **Profile Info**: Students can specify their School and Grade.

### 2. Create Mission
- **Mission Objectives**: Students define the purpose of their satellite by completing a Mad Libs-style objective paragraph.
- **Orbital Parameters**: Students select an orbit type (LEO, SSO, GEO) and define the Orbit Duration (minutes) and number of Orbits per Day.

### 3. Component Selection
- **Component Library**: Students browse a library of realistic satellite components categorised by subsystem (ADCS, CDHS, EPS, COMMS, Payload, Structure, Thermal).
- **Filtering & Search**: Quickly find specific components.
- **Mission Payload**: Add desired quantities of components to the mission design.

### 4. CONOPS (Concept of Operations)
- **Mission Modes**: Students allocate portions of their orbit to different operational modes (Sun Pointing, Nadir/Payload Pointing, Ground Station, Safe/Eclipse Mode).
- **Active States Matrix**: For every selected component, students toggle whether it is ON or OFF during each specific mission mode.
- **Validation**: The total duration of all modes must precisely match the selected Orbit Duration.

### 5. Data Budget
- **Data Rates**: Students specify the data generation rate (kbps) for active components.
- **Storage Calculation**: The system automatically calculates data generated per orbit based on the active times defined in the CONOPS phase.
- **Validation**: Ensures the total generated data does not exceed the satellite's maximum onboard storage capacity parameters.

### 6. Power Budget (EPS)
- **Power Consumption**: Students input Voltage (V) and Current (mA) for each component. The platform calculates power (mW) and energy per orbit (mWh) based on CONOPS active times.
- **Solar Sizing**: Students must logically determine how many solar cells they need to include in their design based on the fixed power generation per cell and their calculated total power consumption.
- **Validation**: The generated solar power must provide a sufficient Power Margin over the total consumed power.

### 7. Link Budget
- **Communication Parameters**: Students calculate signal strength by defining frequency, transmitter power, antenna gains, path loss, and required data rates for ground communication.
- **Validation**: Checks if the resulting Link Margin (dB) is sufficient for reliable communication.

### 8. Mass Budget
- **Mass Tracking**: Calculates the total mass (g) of all selected components based on library specifications.
- **Form Factor / Volume**: Compares the sum of the components' dimensions to the available internal volume of a standard CubeSat (e.g., 1U) to ensure everything fits.
- **Validation**: Total mass and volume must be below the maximum constraints.

### 9. Cost Budget
- **Financial Tracking**: Aggregates the assumed cost (USD/AED) of all selected components.
- **Validation**: Ensures the total mission cost stays within the allowed maximum project budget constraint.

### 10. Mission Dashboard
- **Final Report**: A comprehensive, visually engaging summary of the entire mission design.
- **Health Checks**: Displays a grid showing whether each individual budget (Data, Power, Link, Mass, Cost) passed or failed.
- **Key Metrics & Charts**: Visualizes subsystem distributions, costs, and power usage through interactive Doughnut and Bar charts.
- **Export readiness**: Acts as the final review page for the student's project.

---

## 🛠️ Admin Features (Component Management)

The platform includes a dedicated Admin panel (`/admin`) for instructors or administrators to manage the educational content.
- **Manage Library**: Create, edit, and delete components.
- **Define Specs**: Set baseline specifications including Subsystem, Mass, Voltage, Current, Cost, and Dimensions.
- **Visibility**: Toggle whether components are actively visible to students or hidden.

---

## 💻 Tech Stack

- **Frontend**:
  - HTML5, Vanilla JavaScript
  - Tailwind CSS (for styled, responsive, glassmorphic UI)
  - Chart.js (for data visualization)
- **Backend**:
  - Python / FastAPI
  - SQLAlchemy (ORM)
  - Pydantic (Data validation)
- **Database**:
  - PostgreSQL
- **Design Theme**: SpacePoint custom palette (Deep Space Purple `#241134`, Nebula Purple `#653f84`, Starlight `#D7D2CB`).

---

## 📂 Project Structure

```text
MissionPortal/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── routes/          # FastAPI Route Handlers (Logic)
│   │   ├── schemas/         # Pydantic Data Validation Schemas
│   │   ├── utils/           # Helper Functions (Auth, Physics Calcs)
│   │   ├── main.py          # Application Entry Point & Routing
│   │   └── database.py      # DB Connection & Session Config
│   └── .env                 # Environment Variables (Secrets)
├── frontend/
│   ├── auth.html            # Registration & Login
│   ├── mission.html         # Mission Creation & Objectives
│   ├── components.html      # Component Selection Library
│   ├── conops.html          # Mode/CONOPS Scheduling
│   ├── data_budget.html     # Data Storage Calculations
│   ├── power_budget.html    # EPS & Solar Sizing
│   ├── link_budget.html     # RF Comm Calculations
│   ├── mass_budget.html     # Mass & Volume Validation
│   ├── cost_budget.html     # Financial Budgeting
│   ├── dashboard.html       # Final Mission Review & Charts
│   ├── admin.html           # Administrator Control Panel
│   └── logo.png             # SpacePoint Official Branding
└── README.md
```

---

## ⚙️ Running Locally

1. **Database Setup**
   Ensure PostgreSQL is running and update your `.env` file with the correct `DATABASE_URL`.

2. **Install Python Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Run Backend Server (FastAPI)**
    ```bash
    cd backend
    uvicorn app.main:app --reload
    ```

4. **Access the Portal**
   Open your browser and navigate to: `http://127.0.0.1:8000/`
   *(The FastAPI backend is configured to seamlessly serve the frontend HTML and static assets via clean routes).*

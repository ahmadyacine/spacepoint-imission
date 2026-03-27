from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from app.database import Base, engine
import app.models  # ensure all models are registered before create_all
from app.routes import auth, missions, components, mission_components, conops, data_budget, power_budget, link_budget, mass_budget, cost_budget, dashboard, invitation_codes

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SpacePoint Mission Portal API",
    description="Backend for the SpacePoint satellite mission design student platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth.router, prefix="/api")
app.include_router(missions.router, prefix="/api")
app.include_router(components.router, prefix="/api")
app.include_router(mission_components.router, prefix="/api")
app.include_router(conops.router, prefix="/api")
app.include_router(data_budget.router, prefix="/api")
app.include_router(power_budget.router, prefix="/api")
app.include_router(link_budget.router, prefix="/api")
app.include_router(mass_budget.router, prefix="/api")
app.include_router(cost_budget.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(invitation_codes.router, prefix="/api")

# ── Frontend Routes ──────────────────────────────────────────────────────────

# Get absolute path to frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(FRONTEND_DIR, "auth.html"))

@app.get("/auth")
def read_auth():
    return FileResponse(os.path.join(FRONTEND_DIR, "auth.html"))

@app.get("/mission")
def read_mission():
    return FileResponse(os.path.join(FRONTEND_DIR, "mission.html"))

@app.get("/components")
def read_components():
    return FileResponse(os.path.join(FRONTEND_DIR, "components.html"))

@app.get("/conops")
def read_conops():
    return FileResponse(os.path.join(FRONTEND_DIR, "conops.html"))

@app.get("/data-budget")
def read_data():
    return FileResponse(os.path.join(FRONTEND_DIR, "data_budget.html"))

@app.get("/power-budget")
def read_power():
    return FileResponse(os.path.join(FRONTEND_DIR, "power_budget.html"))

@app.get("/link-budget")
def read_link():
    return FileResponse(os.path.join(FRONTEND_DIR, "link_budget.html"))

@app.get("/mass-budget")
def read_mass():
    return FileResponse(os.path.join(FRONTEND_DIR, "mass_budget.html"))

@app.get("/cost-budget")
def read_cost():
    return FileResponse(os.path.join(FRONTEND_DIR, "cost_budget.html"))

@app.get("/dashboard")
def read_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

@app.get("/admin")
def read_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))

# Mount the entire frontend directory for any other static assets (images, etc)
# This must be LAST so it doesn't override the API or explicit routes
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

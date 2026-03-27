from app.database import engine, Base
from app.models.mission_constraint import MissionConstraint
from app.models.mass_budget_entry import MassBudgetEntry
from app.models.cost_budget_entry import CostBudgetEntry

def fix():
    print("Dropping mission_constraints table...")
    MissionConstraint.__table__.drop(engine, checkfirst=True)
    
    print("Dropping mass_budget_entries table...")
    MassBudgetEntry.__table__.drop(engine, checkfirst=True)
    
    print("Dropping cost_budget_entries table...")
    CostBudgetEntry.__table__.drop(engine, checkfirst=True)

    print("Recreating all tables (including new columns and new tables)...")
    Base.metadata.create_all(bind=engine)
    print("Done! You can now restart your server.")

if __name__ == "__main__":
    fix()

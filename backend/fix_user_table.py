from app.database import engine
from sqlalchemy import text

def add_user_columns():
    with engine.connect() as conn:
        try:
            # Add school_name and grade to users table
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR;"))
            conn.commit()
            print("Successfully added optional columns to users table.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_user_columns()

import os
import csv
import sys
from pathlib import Path

# Add project root to path to allow importing from backend
project_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(project_root))

from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db.models import NamasteCode

# Create tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)

def seed_data():
    csv_path = project_root / "data" / "processed" / "cleaned_ayurveda_dataset.csv"
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)
        
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(NamasteCode).first():
            print("Database already seeded with NAMASTE codes.")
            return

        print("Reading CSV and seeding data...")
        seen_codes = set()
        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            batch = []
            
            for row in reader:
                code = row.get("namc_code")
                if not code or code in seen_codes:
                    continue
                
                seen_codes.add(code)
                record = NamasteCode(
                    namaste_code=code,
                    term=row.get("namc_term", ""),
                    term_normalized=row.get("namc_term_normalized", ""),
                    search_text=row.get("search_text", ""),
                    long_definition=row.get("long_definition", "")
                )
                batch.append(record)
                
                if len(batch) >= 500:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch = []
                    
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
                
        count = db.query(NamasteCode).count()
        print(f"Successfully seeded {count} NAMASTE codes.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

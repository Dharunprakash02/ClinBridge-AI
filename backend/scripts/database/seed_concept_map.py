import sys
import csv
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(project_root))

from backend.app.db.database import SessionLocal
from backend.app.db.models import ConceptMap

def seed_concept_map():
    csv_path = project_root / "data" / "mappings" / "manual_concept_map.csv"
    
    if not csv_path.exists():
        print(f"Error: CSV not found at {csv_path}")
        sys.exit(1)
        
    db = SessionLocal()
    
    try:
        # Clear existing manual mappings to allow re-running easily
        db.query(ConceptMap).delete()
        db.commit()

        print("Seeding Concept Map...")
        count = 0
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = ConceptMap(
                    source_code=row['source_code'],
                    target_code=row['target_code'],
                    target_system=row['target_system'],
                    equivalence=row['equivalence'],
                    mapping_note=row.get('mapping_note', '')
                )
                db.add(record)
                count += 1
                
        db.commit()
        print(f"Successfully seeded {count} Concept Map records.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_concept_map()

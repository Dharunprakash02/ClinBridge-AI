import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Ensure backend modules can be imported
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.app.db.database import engine, Base, SessionLocal
import backend.app.db.models as db_models
from backend.app.api.routes.api import router as api_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.core.security import get_password_hash


def _seed_database():
    """Initialize database with standard seed data on startup."""
    try:
        from backend.scripts.database.seed_namaste import seed_data
        from backend.scripts.database.seed_concept_map import seed_concept_map
        
        print("Seeding NAMASTE codes...")
        seed_data()
        
        print("Seeding Concept Map...")
        seed_concept_map()
        
        print("Database terminology seeding completed successfully.")
    except Exception as e:
        print(f"Warning: Database seeding error (this may be expected if already seeded): {e}")


def _seed_default_users():
    """
    HIPAA Security Initialization:
    Ensures baseline role-based accounts exist for testing, demonstration, and governance:
    1. Clinician (Clinical search, GraphRAG reasoning, FHIR R4 Bundle Studio, Patient Reports)
    2. Reviewer (Audit Trail Endorsement & Quality Assurance)
    3. Administrator (Complete Governance & Access Overrides)
    """
    db = SessionLocal()
    try:
        default_accounts = [
            {
                "email": "admin@clinbridge.local",
                "password": "Admin@ClinBridge2026!",
                "full_name": "ClinBridge System Administrator",
                "role": "admin",
                "organization": "ClinBridge AI Central Administration"
            },
            {
                "email": "reviewer@clinbridge.local",
                "password": "Reviewer@ClinBridge2026!",
                "full_name": "Dr. Ananya Sharma",
                "role": "reviewer",
                "organization": "WHO ICD-11 Expert Review Board"
            },
            {
                "email": "clinician@clinbridge.local",
                "password": "Clinician@ClinBridge2026!",
                "full_name": "Dr. Rajesh Varma",
                "role": "clinician",
                "organization": "National Institute of Ayurveda"
            }
        ]

        for acc in default_accounts:
            existing = db.query(db_models.User).filter(db_models.User.email == acc["email"]).first()
            if not existing:
                user = db_models.User(
                    email=acc["email"],
                    hashed_password=get_password_hash(acc["password"]),
                    full_name=acc["full_name"],
                    role=acc["role"],
                    organization=acc["organization"],
                    is_active=True
                )
                db.add(user)
                db.commit()
                print(f" [SECURITY INITIALIZATION] Seeded default user: {acc['email']} ({acc['role']})")
            else:
                # Ensure demo accounts always have current password hashes and active status
                existing.hashed_password = get_password_hash(acc["password"])
                existing.full_name = acc["full_name"]
                existing.role = acc["role"]
                existing.organization = acc["organization"]
                existing.is_active = True
                db.commit()
                print(f" [SECURITY INITIALIZATION] Updated default user credentials: {acc['email']} ({acc['role']})")
    except Exception as e:
        db.rollback()
        print(f"Notice: User check/seed encountered: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting ClinBridge AI Backend...")
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
        
        print("Initializing database with seed data...")
        _seed_database()
        
        print("Verifying default role-based user accounts...")
        _seed_default_users()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")
    yield
    # Shutdown logic
    print("Shutting down ClinBridge AI Backend...")


app = FastAPI(
    title="ClinBridge AI Backend",
    description="HIPAA-Compliant AYUSH/NAMASTE to WHO ICD-11 Terminology Mapping Platform with RBAC",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend (supports localhost and all local network LAN IPs for mobile/tablet)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication & RBAC routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router)

# Clinical mapping, GraphRAG & FHIR routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router)


@app.get("/")
def read_root():
    return {
        "service": "ClinBridge AI Enterprise API",
        "version": "2.0.0",
        "status": "online",
        "documentation": "/docs"
    }

# To run locally: uvicorn backend.app.main:app --reload

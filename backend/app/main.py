import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Ensure backend modules can be imported
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.app.db.database import engine, Base
import backend.app.db.models  # ensure models are registered
from backend.app.api.routes.api import router as api_router

def _seed_database():
    """Initialize database with seed data on startup."""
    try:
        from backend.scripts.database.seed_namaste import seed_data
        from backend.scripts.database.seed_concept_map import seed_concept_map
        
        print("Seeding NAMASTE codes...")
        seed_data()
        
        print("Seeding Concept Map...")
        seed_concept_map()
        
        print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Warning: Database seeding error (this may be expected if already seeded): {e}")

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
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")
    yield
    # Shutdown logic
    print("Shutting down ClinBridge AI Backend...")

app = FastAPI(
    title="ClinBridge AI Backend",
    description="FHIR-Based Terminology Mapping Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ClinBridge AI API. Access /docs for API documentation."}

# To run locally: uvicorn backend.app.main:app --reload

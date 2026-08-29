import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Ensure backend modules can be imported
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.app.api.routes.api import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting ClinBridge AI Backend...")
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

@app.get("/")
def read_root():
    return {"message": "Welcome to ClinBridge AI API. Access /docs for API documentation."}

# To run locally: uvicorn backend.app.main:app --reload

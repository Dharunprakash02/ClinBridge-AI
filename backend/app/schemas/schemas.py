from pydantic import BaseModel, Field
from typing import Optional

class PatientData(BaseModel):
    first_name: str = Field(..., example="John")
    last_name: str = Field(..., example="Doe")
    gender: str = Field(..., example="male")
    birth_date: str = Field(..., example="1980-01-01")

class GenerateBundleRequest(BaseModel):
    patient: PatientData
    namaste_code: str = Field(..., example="EC-3.8.23")
    namaste_term: Optional[str] = Field(None, example="yantrapIDA-sAnnipAtajajvaraH")

class ProposedMappingResponse(BaseModel):
    id: int
    source_code: str
    source_term: str
    source_definition: Optional[str] = None
    target_uri: str
    target_title: str
    similarity_score: float
    status: str

class ReviewRequest(BaseModel):
    action: str = Field(..., example="approve") # approve or reject


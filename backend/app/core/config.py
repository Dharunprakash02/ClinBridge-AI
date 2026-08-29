import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")

    # WHO ICD-11 API Credentials
    WHO_CLIENT_ID = os.getenv("WHO_CLIENT_ID")
    WHO_CLIENT_SECRET = os.getenv("WHO_CLIENT_SECRET")
    
    # WHO API Endpoints
    WHO_TOKEN_URL = os.getenv("WHO_TOKEN_URL", "https://icdaccessmanagement.who.int/connect/token")
    WHO_API_BASE_URL = os.getenv("WHO_API_BASE_URL", "https://id.who.int/icd/entity")
    WHO_API_MMS_URL = os.getenv("WHO_API_MMS_URL", "https://id.who.int/icd/release/11/2026-01/mms")

config = Config()

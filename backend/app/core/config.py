import os
from pathlib import Path
from dotenv import find_dotenv


def _get_env_value(name: str) -> str | None:
    """Read a value even when another .env line prevents dotenv parsing."""
    value = os.getenv(name)
    if value:
        return value

    env_path = find_dotenv()
    if not env_path:
        return None

    prefix = f"{name}="
    for line in Path(env_path).read_text(encoding="utf-8-sig").splitlines():
        stripped = line.strip()
        if stripped.startswith(prefix):
            return stripped[len(prefix):].strip().strip('"').strip("'") or None
    return None

class Config:
    # Database
    DATABASE_URL = _get_env_value("DATABASE_URL")

    # WHO ICD-11 API Credentials
    WHO_CLIENT_ID = _get_env_value("WHO_CLIENT_ID")
    WHO_CLIENT_SECRET = _get_env_value("WHO_CLIENT_SECRET")
    
    # WHO API Endpoints
    WHO_TOKEN_URL = os.getenv("WHO_TOKEN_URL", "https://icdaccessmanagement.who.int/connect/token")
    WHO_API_BASE_URL = os.getenv("WHO_API_BASE_URL", "https://id.who.int/icd/entity")
    WHO_API_MMS_URL = os.getenv("WHO_API_MMS_URL", "https://id.who.int/icd/release/11/2026-01/mms")

config = Config()

import os
import requests
from dotenv import load_dotenv

# ---------------------------------------------------------
# Load credentials
# ---------------------------------------------------------

load_dotenv()

CLIENT_ID = os.getenv("WHO_CLIENT_ID")
CLIENT_SECRET = os.getenv("WHO_CLIENT_SECRET")

# ---------------------------------------------------------
# WHO OAuth token endpoint
# ---------------------------------------------------------

TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"

token_payload = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scope": "icdapi_access",
    "grant_type": "client_credentials"
}

token_response = requests.post(
    TOKEN_URL,
    data=token_payload,
    timeout=30
)

token_response.raise_for_status()

access_token = token_response.json()["access_token"]

print("✓ WHO authentication successful")

# ---------------------------------------------------------
# ICD-11 API
# ---------------------------------------------------------

API_URL = "https://id.who.int/icd/release/11/2026-01/mms"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json",
    "Accept-Language": "en",
    "API-Version": "v2"
}

response = requests.get(
    API_URL,
    headers=headers,
    timeout=30
)

print("HTTP Status:", response.status_code)

if response.status_code == 200:
    print("✓ ICD-11 2026-01 MMS release is accessible")

    data = response.json()

    print("\nResponse keys:")
    if isinstance(data, dict):
        print(list(data.keys()))

    print("\nFirst 1000 characters:")
    print(response.text[:1000])

else:
    print("✗ API request failed")
    print(response.text)
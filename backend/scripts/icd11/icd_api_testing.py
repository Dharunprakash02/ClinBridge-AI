import requests
import sys
import os
from dotenv import load_dotenv

# ============================================================
# WHO ICD-11 API CREDENTIALS
# ============================================================

load_dotenv()

CLIENT_ID = os.getenv("WHO_CLIENT_ID")
CLIENT_SECRET = os.getenv("WHO_CLIENT_SECRET")

TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"

# ============================================================
# STEP 1: GET OAUTH ACCESS TOKEN
# ============================================================

payload = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scope": "icdapi_access",
    "grant_type": "client_credentials"
}

print("Requesting WHO ICD-11 access token...")

try:
    response = requests.post(
        TOKEN_URL,
        data=payload,
        timeout=30
    )

except requests.RequestException as e:
    print("\nERROR: Could not connect to WHO.")
    print(e)
    sys.exit(1)

# ============================================================
# STEP 2: CHECK TOKEN RESPONSE
# ============================================================

print("HTTP Status:", response.status_code)

if response.status_code != 200:
    print("\nAuthentication FAILED.")
    print("WHO response:")
    print(response.text)
    sys.exit(1)

try:
    token_data = response.json()
except ValueError:
    print("\nERROR: WHO returned a non-JSON response.")
    print(response.text)
    sys.exit(1)

access_token = token_data.get("access_token")

if not access_token:
    print("\nERROR: Access token was not returned.")
    print(token_data)
    sys.exit(1)

print("\nSUCCESS!")
print("WHO ICD-11 access token received.")

# Don't print the complete token
print("Token received:", access_token[:20] + "...")

print("\nToken type:", token_data.get("token_type"))
print("Expires in:", token_data.get("expires_in"), "seconds")

# ============================================================
# STEP 3: TEST THE ICD-11 API
# ============================================================

API_URL = "https://id.who.int/icd/entity"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json",
    "Accept-Language": "en",
    "API-Version": "v2"
}

print("\nTesting ICD-11 API...")

try:
    api_response = requests.get(
        API_URL,
        headers=headers,
        timeout=30
    )

except requests.RequestException as e:
    print("\nERROR: Could not connect to ICD-11 API.")
    print(e)
    sys.exit(1)

print("ICD API HTTP Status:", api_response.status_code)

if api_response.status_code == 200:
    print("\nSUCCESS!")
    print("Your Client ID + Client Secret are working.")
    print("The WHO ICD-11 API is accessible.")

    print("\nFirst part of API response:")
    print(api_response.text[:1000])

else:
    print("\nAuthentication succeeded, but ICD-11 API request failed.")
    print("Response:")
    print(api_response.text)
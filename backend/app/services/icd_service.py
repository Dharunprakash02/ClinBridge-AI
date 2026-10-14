import time
import requests
import logging
from typing import Dict, Any, Optional, List
from functools import lru_cache
from backend.app.core.config import config

logger = logging.getLogger(__name__)

class ICDService:
    def __init__(self):
        self.client_id = config.WHO_CLIENT_ID
        self.client_secret = config.WHO_CLIENT_SECRET
        self.token_url = config.WHO_TOKEN_URL
        self.api_base_url = config.WHO_API_BASE_URL
        self.api_mms_url = config.WHO_API_MMS_URL
        
        self._access_token = None
        self._token_expiry = 0

    def _get_valid_token(self) -> str:
        """Fetch a new token if the current one is expired or missing."""
        current_time = time.time()
        
        # Buffer of 60 seconds to prevent using a token that's about to expire
        if self._access_token and current_time < (self._token_expiry - 60):
            return self._access_token

        if not self.client_id or not self.client_secret:
            raise ValueError("WHO API credentials are not configured in the environment.")

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "icdapi_access",
            "grant_type": "client_credentials"
        }

        try:
            response = requests.post(self.token_url, data=payload, timeout=10)
            response.raise_for_status()
            
            token_data = response.json()
            self._access_token = token_data.get("access_token")
            # Expires in seconds
            expires_in = token_data.get("expires_in", 3600) 
            self._token_expiry = current_time + expires_in
            
            logger.info("Successfully refreshed WHO ICD-11 OAuth token.")
            return self._access_token
            
        except requests.RequestException as e:
            logger.error(f"Failed to authenticate with WHO API: {e}")
            raise RuntimeError(f"WHO API Authentication failed: {e}")

    def _get_headers(self) -> Dict[str, str]:
        token = self._get_valid_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Accept-Language": "en",
            "API-Version": "v2"
        }

    @lru_cache(maxsize=1000)
    def search_foundation(self, query: str) -> Optional[Dict[str, Any]]:
        """Search the ICD-11 Foundation layer for a term."""
        headers = self._get_headers()
        url = f"{self.api_base_url}/search?q={query}"
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"ICD-11 Foundation search failed for query '{query}': {e}")
            return None

    def search_mms(self, query: str) -> Optional[Dict[str, Any]]:
        """Search the ICD-11 MMS linearisation for a term."""
        headers = self._get_headers()
        url = f"{self.api_mms_url}/search?q={query}"
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"ICD-11 MMS search failed for query '{query}': {e}")
            return None

    @lru_cache(maxsize=1000)
    def get_entity_by_uri(self, uri: str) -> Optional[Dict[str, Any]]:
        """Fetch the full details of an ICD-11 entity using its URI."""
        headers = self._get_headers()
        
        try:
            response = requests.get(uri, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch ICD-11 entity at URI '{uri}': {e}")
            return None

    def search_icd11(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search ICD-11 entities via MMS and foundation endpoints."""
        results = []
        try:
            mms_data = self.search_mms(query)
            if mms_data and "destinationEntities" in mms_data:
                for ent in mms_data["destinationEntities"][:limit]:
                    results.append({
                        "code": ent.get("theCode", "UNKNOWN"),
                        "title": ent.get("title", ""),
                        "uri": ent.get("id", "")
                    })
        except Exception as e:
            logger.debug(f"ICD-11 live search failed: {e}")
        return results

icd_service = ICDService()

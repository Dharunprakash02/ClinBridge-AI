import sys
import json
from pathlib import Path

# Add project root to path so we can import backend modules
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

import pytest
from backend.app.services.icd_service import icd_service

def test_service():
    print("Testing WHO ICD-11 Backend Service...\n")
    
    print("1. Authenticating and caching token...")
    try:
        token = icd_service._get_valid_token()
        print(f"   Success! Token starts with: {token[:20]}...\n")
    except Exception as e:
        pytest.skip(f"Live WHO API not reachable or credentials unconfigured: {e}")

    search_term = "Jwara"
    print(f"2. Searching ICD-11 Foundation for '{search_term}'...")
    foundation_results = icd_service.search_foundation(search_term)
    
    if foundation_results and "destinationEntities" in foundation_results:
        entities = foundation_results["destinationEntities"]
        print(f"   Found {len(entities)} matching entities.")
        if entities:
            first_entity = entities[0]
            print("   First Result:")
            print(f"   Title: {first_entity.get('title')}")
            print(f"   URI: {first_entity.get('id')}\n")
            
            print(f"3. Fetching full entity details for the URI...")
            details = icd_service.get_entity_by_uri(first_entity.get('id'))
            if details:
                print("   Success! Fetched entity details.")
                print(f"   Browser URL: {details.get('browserUrl')}")
            else:
                print("   Failed to fetch entity details.")
    else:
        print("   Search failed or returned no destination entities.")
        
    print("\nTest completed.")

if __name__ == "__main__":
    test_service()

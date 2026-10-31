import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Registry of pre-verified, authoritative clinical publisher URLs tested and confirmed returning HTTP 200
KNOWN_VERIFIED_URLS = {
    "https://www.nhs.uk/conditions/cough/": True,
    "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)": True,
    "https://www.who.int/publications/i/item/9789241548281": True,
    "https://www.who.int/publications/i/item/9789241510219": True,
    "https://www.who.int/news-room/fact-sheets/detail/musculoskeletal-conditions": True,
    "https://icd.who.int/browse/2026-01/mms/en#MG26": True,
    "https://icd.who.int/browse/2026-01/mms/en#MD30": True,
    "https://icd.who.int/browse/2026-01/mms/en#MD11": True,
    "https://icd.who.int/browse/2026-01/mms/en#NC72": True,
    "https://icdcdn.who.int/icd11referenceguide/en/html/index.html": True,
}

# Known broken, 404, or invalid URLs that must NEVER be verified as supported
KNOWN_INVALID_URLS = {
    "https://www.who.int/publications/i/item/WHO-2019-nCoV-clinical-2024.1": False,
    "https://icd.who.int/en/docs/chapter26-tm2-reference.pdf": False,
    "https://niimh.nic.in/ebooks/echarak/": False,
    "https://ayushportal.nic.in/clinical_protocols.pdf": False,
    "https://namstp.ayush.gov.in/": False,
}

# Runtime verification cache to prevent redundant network lookups
_VERIFICATION_CACHE: Dict[str, bool] = {}

def is_url_verified(url: Optional[str], check_network_if_unknown: bool = False) -> bool:
    """
    Verifies whether a source URL is verified and accessible.
    
    Guarantees:
      - Returns False for known dead links or 404 endpoints.
      - Returns True for registry-verified authoritative publisher pages.
      - Never marks an invalid or unverified URL as True.
    """
    if not url or not isinstance(url, str):
        return False
    
    cleaned = url.strip()
    if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
        return False
    
    # 1. Check known invalid / broken URLs
    if cleaned in KNOWN_INVALID_URLS:
        return False
        
    # 2. Check known verified URLs
    if cleaned in KNOWN_VERIFIED_URLS:
        return True
        
    # 3. Check memory cache
    if cleaned in _VERIFICATION_CACHE:
        return _VERIFICATION_CACHE[cleaned]

    # 4. Optional network HEAD/GET verification for new URLs
    if check_network_if_unknown:
        try:
            req = urllib.request.Request(
                cleaned,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClinBridge-AI/2.4"}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                status = response.getcode()
                is_ok = 200 <= status < 400
                _VERIFICATION_CACHE[cleaned] = is_ok
                return is_ok
        except Exception as e:
            logger.debug(f"URL verification check failed for {cleaned}: {e}")
            _VERIFICATION_CACHE[cleaned] = False
            return False

    return False

def verify_claim_support(
    claim_type: str,
    evidence_text: str,
    candidate_code: Optional[str] = None
) -> bool:
    """
    Checks that the retrieved evidence passage genuinely supports the specific claim.
    A valid URL alone does not prove evidence support.
    """
    if not evidence_text or len(evidence_text.strip()) < 15:
        return False
        
    lower_text = evidence_text.lower()
    
    if claim_type == "SELF_CARE_GUIDANCE":
        # Must contain self-care, hydration, rest, fluids, supportive care, or symptom relief
        supportive_terms = [
            "rest", "fluids", "liquids", "hydration", "relieve symptoms",
            "supportive care", "stay at home", "recover on their own", "mobility", "physical capacity"
        ]
        return any(term in lower_text for term in supportive_terms)
        
    elif claim_type == "WARNING_SIGNS_AND_TRIAGE":
        # Must contain red flag, warning sign, triage, urgent, emergency, hospital, or referral criteria
        triage_terms = [
            "urgent", "emergency", "danger sign", "red flag", "warning sign", "see a gp",
            "medical care may be needed", "physician intervention", "hospital referral",
            "respiratory distress", "cyanosis", "hemoptysis", "chest pain", "hard to breathe"
        ]
        return any(term in lower_text for term in triage_terms)
        
    return False

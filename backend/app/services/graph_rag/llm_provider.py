import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    """Abstract interface for LLM synthesis in GraphRAG."""

    @abstractmethod
    def generate_explanation(self, prompt: str, context_metadata: Optional[Dict[str, Any]] = None) -> str:
        """Generates grounded text explanation based on prompt context."""
        pass

class MockLLMProvider(LLMProvider):
    """
    Deterministic provider for testing and offline runs.
    Constructs an honest, grounded summary directly reflecting the real retrieved context
    without fabricating evidence claims.
    """

    def generate_explanation(self, prompt: str, context_metadata: Optional[Dict[str, Any]] = None) -> str:
        if not context_metadata:
            return "Candidate evaluated based on similarity scoring. Supporting clinical literature was not evaluated."

        has_evidence = context_metadata.get("has_evidence", False)
        rule_passed = context_metadata.get("rule_passed", True)
        symptoms = context_metadata.get("symptoms", [])
        evidence_count = context_metadata.get("evidence_count", 0)
        source_term = context_metadata.get("source_term", "")
        candidate_title = context_metadata.get("candidate_title", "")

        if not rule_passed:
            return f"Mapping rejected: Candidate '{candidate_title}' violates deterministic safety/categorical rules for '{source_term}'."

        if not has_evidence or evidence_count == 0:
            sym_desc = f"with symptoms ({', '.join(symptoms)})" if symptoms else "without specific graph symptoms"
            return (
                f"Candidate '{candidate_title}' matches '{source_term}' {sym_desc}, but has "
                f"INSUFFICIENT_EVIDENCE: no direct peer-reviewed or WHO reference documents currently confirm this specific pairing."
            )

        sym_text = f", aligned with Knowledge Graph symptoms ({', '.join(symptoms)})" if symptoms else ""
        return (
            f"Candidate '{candidate_title}' is grounded in {evidence_count} reference document(s){sym_text}, "
            f"and passed all deterministic validation rules."
        )

class GeminiLLMProvider(LLMProvider):
    """Optional Google Gemini provider when API key is present."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def generate_explanation(self, prompt: str, context_metadata: Optional[Dict[str, Any]] = None) -> str:
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY provided. Falling back to deterministic grounded synthesis.")
            return MockLLMProvider().generate_explanation(prompt, context_metadata)
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip() if response and response.text else MockLLMProvider().generate_explanation(prompt, context_metadata)
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Falling back to deterministic synthesis.")
            return MockLLMProvider().generate_explanation(prompt, context_metadata)

def get_llm_provider() -> LLMProvider:
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return GeminiLLMProvider(api_key)
    return MockLLMProvider()

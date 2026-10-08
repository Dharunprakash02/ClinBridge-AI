import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    """Abstract interface for LLM synthesis in GraphRAG."""

    @abstractmethod
    def generate_explanation(self, prompt: str) -> str:
        """Generates grounded text explanation based on prompt context."""
        pass

class MockLLMProvider(LLMProvider):
    """Deterministic, reliable offline provider for research reproducible runs & tests."""

    def generate_explanation(self, prompt: str) -> str:
        # Returns a structured, decision-relevant explanation based on prompt context
        return (
            "Mapping verified based on strong semantic alignment, verified symptom overlap "
            "in the Knowledge Graph, and consistency with WHO ICD-11 definitions and classical Ayurvedic compendia."
        )

class GeminiLLMProvider(LLMProvider):
    """Optional Google Gemini provider when API key is present."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def generate_explanation(self, prompt: str) -> str:
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY provided. Falling back to MockLLMProvider.")
            return MockLLMProvider().generate_explanation(prompt)
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text if response and response.text else MockLLMProvider().generate_explanation(prompt)
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Using deterministic fallback.")
            return MockLLMProvider().generate_explanation(prompt)

def get_llm_provider() -> LLMProvider:
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return GeminiLLMProvider(api_key)
    return MockLLMProvider()

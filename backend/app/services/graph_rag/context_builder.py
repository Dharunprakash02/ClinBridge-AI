from typing import Dict, Any, List, Optional
from backend.app.services.graph_rag.evidence_store import EvidenceRecord

class ContextBuilder:
    """
    Assembles source terminology, Knowledge Graph subgraphs, deterministic rule results,
    and retrieved evidence documents into a structured prompt context.
    """

    def build_prompt(
        self,
        source_concept: Dict[str, Any],
        candidate: Dict[str, Any],
        graph_context: Optional[Dict[str, Any]],
        rule_status: Dict[str, Any],
        evidence_records: List[EvidenceRecord],
        scores: Dict[str, float]
    ) -> str:
        symptoms_str = ", ".join(graph_context.get("symptoms", [])) if graph_context else "None specified"
        doshas_str = ", ".join(graph_context.get("doshas", [])) if graph_context else "None specified"
        
        evidence_snippets = []
        for e in evidence_records:
            evidence_snippets.append(f"- [{e.title}] ({e.source}): \"{e.text}\"")
        evidence_str = "\n".join(evidence_snippets) if evidence_snippets else "No direct clinical literature retrieved."

        rules_passed = ", ".join(rule_status.get("passed", [])) or "None"
        rules_failed = ", ".join(rule_status.get("failed", [])) or "None"

        prompt = f"""
Clinical Terminology Mapping Synthesis Context:
1. Source Concept:
   - Term: {source_concept.get('term')}
   - Code: {source_concept.get('code')}
   - Definition: {source_concept.get('definition', 'N/A')}

2. Candidate Mapping (WHO ICD-11):
   - Title: {candidate.get('title', candidate.get('icd11_title', 'N/A'))}
   - Code: {candidate.get('code', candidate.get('icd11_code', 'N/A'))}
   - Definition: {candidate.get('definition', candidate.get('icd11_definition', 'N/A'))}

3. Knowledge Graph Subgraph:
   - Associated Symptoms: {symptoms_str}
   - Involved Doshas: {doshas_str}

4. Rule Gate Status:
   - Passed Rules: {rules_passed}
   - Failed Rules: {rules_failed}

5. Scores:
   - Textual: {scores.get('textual', 0.0):.2f}, Semantic: {scores.get('semantic', 0.0):.2f}, Graph: {scores.get('graph_consistency', 0.0):.2f}, Evidence: {scores.get('evidence_support', 0.0):.2f}, Final: {scores.get('final', 0.0):.2f}

6. Grounded Evidence:
{evidence_str}

Task: Provide a concise, 2-sentence clinical justification explaining why this candidate is selected, referencing symptom overlap and evidence grounding.
"""
        return prompt.strip()

# Global instance
context_builder = ContextBuilder()

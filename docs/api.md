# ClinBridge AI: REST API Reference Documentation

**Base URL:** `http://127.0.0.1:8000/api/v1` or `http://127.0.0.1:8000`  
**Protocol:** REST / JSON  
**Specification:** OpenAPI 3.0 (Interactive Swagger UI accessible at `/docs`)  

---

## 1. Core Endpoints Overview

| Method | Path | Summary |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check & supported system capabilities |
| `POST` | `/mapping` | Full end-to-end GraphRAG mapping pipeline |
| `POST` | `/mapping/explain` | Grounded justification for a specific candidate |
| `POST` | `/mapping/review` | Record human review action (Accept / Modify / Reject) |
| `GET` | `/mapping/reviews` | Retrieve auditable history of review decisions |
| `GET` | `/graph/context/{concept_id}` | Retrieve Knowledge Graph context & connected subgraph |
| `GET` | `/evidence/{concept_id}` | Retrieve provenance-backed literature citations |
| `POST` | `/rag/explain` | Direct invocation of GraphRAG synthesis |
| `GET` | `/evaluation/results` | Serve standardized benchmark & ablation metrics |
| `GET` | `/terminology/search` | Search NAMASTE terminology database |
| `GET` | `/fhir/CodeSystem` | Export NAMASTE vocabulary as FHIR CodeSystem |
| `GET` | `/fhir/ConceptMap` | Export verified mappings as FHIR ConceptMap |
| `POST` | `/fhir/generate-bundle` | Generate HL7 FHIR R4 clinical transaction bundle |

---

## 2. Detailed Endpoint Specifications

### `POST /mapping`
Executes the full terminology reasoning pipeline.

**Request Body:**
```json
{
  "term": "Jwara",
  "code": "SR11",
  "context": {
    "symptoms": ["fever", "burning sensation"],
    "language": "en"
  }
}
```

**Response (200 OK):**
```json
{
  "source_term": "Jwara",
  "source_code": "SR11",
  "requires_review": false,
  "decision_class": "HIGH_CONFIDENCE",
  "candidates": [
    {
      "code": "MG26",
      "term": "Symptoms or signs involving the body temperature",
      "uri": "http://id.who.int/icd/entity/MG26",
      "scores": {
        "textual": 0.85,
        "semantic": 0.90,
        "rank": 0.95,
        "graph": 0.88,
        "evidence": 0.84,
        "final": 0.88
      },
      "relationship": "equivalent",
      "rule_validated": true,
      "confidence": 0.89,
      "decision": "HIGH_CONFIDENCE",
      "graph_context": {
        "symptoms": ["fever", "burning_sensation"],
        "doshas": ["Pitta"]
      },
      "evidence": [
        {
          "title": "WHO ICD-11 Reference Guide - Chapter 26: Traditional Medicine Module 2",
          "source": "World Health Organization",
          "publication_year": 2026,
          "source_url": "https://icd.who.int/en/docs/chapter26-tm2-reference.pdf",
          "snippet": "Traditional Medicine Module 2 (TM2) enables standardized recording of Ayurveda..."
        }
      ],
      "explanation": "Mapping verified based on strong semantic alignment and compatible symptom overlap in the Knowledge Graph."
    }
  ]
}
```

---

### `POST /mapping/review`
Records an auditable clinician review action.

**Request Body:**
```json
{
  "source_term": "Jwara",
  "source_code": "SR11",
  "selected_candidate_code": "MG26",
  "selected_candidate_title": "Symptoms or signs involving the body temperature",
  "action": "ACCEPT",
  "comment": "Confirmed by clinical panel.",
  "confidence": 0.89,
  "decision_class": "HIGH_CONFIDENCE"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Review action 'ACCEPT' recorded successfully.",
  "decision_id": 1
}
```

---

### `POST /fhir/generate-bundle`
Generates an HL7 FHIR R4 Transaction Bundle with dual-coded Condition and Patient resources.

**Request Body:**
```json
{
  "patient": {
    "first_name": "Ram",
    "last_name": "Kumar",
    "gender": "male",
    "birth_date": "1995-10-15"
  },
  "namaste_code": "SR11",
  "namaste_term": "vAtasa~jcayaH"
}
```

**Response (200 OK):** Valid HL7 FHIR R4 Bundle JSON.

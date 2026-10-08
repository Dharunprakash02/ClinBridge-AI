# IMPLEMENTATION PLAN: Intelligent Traditional Medicine Terminology and Healthcare Interoperability System

**Build Track:** Context-Aware, Evidence-Grounded, Explainable, and Uncertainty-Aware Ayurveda/NAMASTE → ICD-11 TM2 Terminology Mapping  
**Target System:** Research-Prototype-Grade Interoperability Platform with Knowledge Graph, GraphRAG, and Human-in-the-Loop Review  
**Date:** September 2026  

---

## 1. Executive Summary & Research Objective

### 1.1 Goal
Transform the existing similarity-based NAMASTE–ICD-11 mapper into a research-prototype-grade system featuring:
- **Domain Knowledge Graph (KG)** for clinical context and relationship modeling.
- **Deterministic Rule Validation Gate** for clinical compatibility.
- **GraphRAG Evidence Retrieval & Grounding** for provenance-backed explanations.
- **Multi-Signal Uncertainty Engine** to differentiate high-confidence matches, ambiguous candidates, and rejections.
- **Auditable Human-in-the-Loop Review** workflow.
- **Controlled Baseline (B1–B6) & Ablation (A1–A5) Evaluation Suite**.

### 1.2 Research Question
> *Does adding knowledge-graph context, graph-based evidence retrieval, deterministic rule gating, and uncertainty-aware explanation improve the accuracy, reliability, evidence traceability, and reviewability of Ayurveda/NAMASTE-to-ICD terminology mapping compared with lexical and semantic similarity-only approaches?*

---

## 2. Gap Analysis: Existing vs. New Features

| Component | Current State in Codebase | New Feature Plan | Status |
| :--- | :--- | :--- | :---: |
| **Dataset Preprocessing** | `cleaned_ayurveda_dataset.csv` loaded & normalized | Maintain existing dataset loader | **Existing (Skip)** |
| **Basic ICD-11 Search** | OAuth token + search endpoint via `icd_service.py` | Maintain live WHO API integration | **Existing (Skip)** |
| **Baseline Lexical/TF-IDF** | Token overlap & TF-IDF Cosine Similarity | Formalize as Baseline B1 & B3 | **Existing (Formalize)** |
| **Base FHIR R4 Bundle** | CodeSystem, ConceptMap, Condition, Bundle serializers | Integrate with validated mapping pipeline | **Existing (Integrate)** |
| **Knowledge Graph (KG)** | None | Entities, relationships, neighborhood query store | **NEW (Phase 1)** |
| **Rule Validation Gate** | None | Hard deterministic compatibility rules | **NEW (Phase 2)** |
| **Graph-Aware Ranker** | Single hybrid score | Multi-factor score with `GraphConsistencyScore` | **NEW (Phase 2)** |
| **Evidence Store + GraphRAG**| None | FAISS/pgvector evidence store + LLM provider | **NEW (Phase 3)** |
| **Explainability Engine** | None | Structured, non-hallucinated explanation generator | **NEW (Phase 3)** |
| **Uncertainty Engine** | Basic numeric threshold | Multi-signal confidence + ambiguity detection | **NEW (Phase 4)** |
| **Human Review & Audit Trail** | Simple approved/rejected flag | Complete `MappingDecision` audit log table | **NEW (Phase 4)** |
| **Extended REST APIs** | 4 basic endpoints | Full pipeline, explanation, graph, evidence APIs | **NEW (Phase 5)** |
| **Pipeline UI & Dashboard** | Basic search & list view | Step-by-step visual pipeline & research dashboard | **NEW (Phase 6)** |
| **Evaluation & Ablation** | Static report | Controlled B1–B6, A1–A5 ablation runners & exports | **NEW (Phase 7)** |

---

## 3. Phased Implementation Roadmap

```
Phase 1: Knowledge Graph Layer (Entities, Relations, Graph Queries)
   │
   ▼
Phase 2: Deterministic Rule Gate & Graph-Aware Ranking
   │
   ▼
Phase 3: Evidence Store & GraphRAG Grounded Explanation
   │
   ▼
Phase 4: Uncertainty Engine, Decision Policy & Audit Trail
   │
   ▼
Phase 5: Extended FastAPI Service Endpoints
   │
   ▼
Phase 6: Visual Pipeline Frontend & Research Dashboard
   │
   ▼
Phase 7: Baseline Benchmark (B1–B6) & Ablation (A1–A5) Suite
```

---

### Phase 1: Knowledge Graph (KG) Layer & Relationship Store

#### Objectives:
1. Define formal ontology schema for Ayurveda, ICD-11 TM2, Biomedical concepts, Symptoms, Doshas, and Evidence Sources.
2. Build a modular graph store abstraction (NetworkX for embedded/local execution with Neo4j extensibility).
3. Seed the graph with curated clinical relationships from NAMASTE and ICD-11 classifications.
4. Implement neighborhood and path traversal queries.

#### Files to Create:
- `backend/app/services/knowledge_graph/__init__.py`
- `backend/app/services/knowledge_graph/graph_schema.py` (Node & Edge type definitions)
- `backend/app/services/knowledge_graph/graph_repository.py` (Graph store interface)
- `backend/app/services/knowledge_graph/graph_loader.py` (Dataset/seed graph builder)
- `backend/app/services/knowledge_graph/graph_queries.py` (Neighborhood, symptom & path traversal)
- `backend/tests/test_knowledge_graph.py`

#### Key Entities & Relations:
- **Node Types:** `AyurvedaConcept`, `ICD11Concept`, `BiomedicalConcept`, `Symptom`, `Condition`, `Herb`, `Dosha`, `EvidenceSource`.
- **Edge Types:** `HAS_SYMPTOM`, `RELATED_TO`, `MAPPED_TO`, `BROADER_THAN`, `NARROWER_THAN`, `ASSOCIATED_WITH`, `CONTAINS`, `SUPPORTED_BY`, `CONTRAINDICATED_WITH`.

#### Verification:
```bash
pytest backend/tests/test_knowledge_graph.py
```
Querying *Jwara* returns connected symptom nodes (*Fever*), related dosha (*Pitta*), and linked ICD candidate entities.

---

### Phase 2: Deterministic Rule Validation Gate & Graph-Aware Ranking

#### Objectives:
1. Implement a deterministic Rule Validation Gate that enforces clinical and categorical constraints before confidence scoring.
2. Build a graph-aware ranking module computing `GraphConsistencyScore`.
3. Produce multi-factor transparent score breakdowns without collapsing variables.

#### Files to Create:
- `backend/app/services/mapping/rule_gate.py`
- `backend/app/services/mapping/graph_ranker.py`
- `backend/tests/test_rule_gate.py`
- `backend/tests/test_graph_ranker.py`

#### Scoring Formula:
$$\text{FinalScore} = w_1 \cdot \text{TextualScore} + w_2 \cdot \text{SemanticScore} + w_3 \cdot \text{RankScore} + w_4 \cdot \text{GraphConsistencyScore}$$

#### Rule Gate Logic:
- Incompatible Concept Category $\rightarrow$ **Reject**
- Incompatible Terminology Type $\rightarrow$ **Reject**
- Invalid Parent-Child Hierarchy $\rightarrow$ **Reject**
- Missing Required Clinical Context $\rightarrow$ **Uncertain**
- Contradictory Graph Relation $\rightarrow$ **Reject**

#### Verification:
Rule gate blocks invalid candidates even if lexical/semantic similarity is high.

---

### Phase 3: Provenance Evidence Store & GraphRAG Grounded Explanation

#### Objectives:
1. Create a local vector-backed Evidence Store (FAISS/pgvector) containing chunked, provenance-tracked WHO and Ayurveda clinical texts.
2. Build a provider-agnostic `LLMProvider` abstraction (Google Gemini / OpenAI / Local Mock).
3. Implement `ContextBuilder` and `GroundedExplanationGenerator` to synthesize graph paths and evidence into human-readable explanations.

#### Files to Create:
- `backend/app/services/graph_rag/__init__.py`
- `backend/app/services/graph_rag/evidence_store.py`
- `backend/app/services/graph_rag/llm_provider.py`
- `backend/app/services/graph_rag/context_builder.py`
- `backend/app/services/graph_rag/grounded_explanation.py`
- `data/evidence/curated_medical_references.json`
- `backend/tests/test_graph_rag.py`

#### Explanation Output Structure:
```json
{
  "selected_candidate": "ICD-11 TM2 Code X",
  "confidence": 0.88,
  "why_selected": "Strong semantic similarity with compatible symptom overlap and verified clinical literature.",
  "score_breakdown": {
    "textual": 0.82,
    "semantic": 0.91,
    "rank": 0.95,
    "graph_consistency": 0.87,
    "evidence_support": 0.85
  },
  "rules_status": {
    "passed": ["category_compatible", "taxonomy_valid"],
    "failed": []
  },
  "evidence": [
    {
      "source_title": "WHO ICD-11 Reference Guide",
      "snippet": "...",
      "provenance_url": "https://icd.who.int/..."
    }
  ],
  "alternatives": [
    {"candidate": "Candidate B", "score": 0.74}
  ]
}
```

#### Verification:
GraphRAG outputs structured justifications with zero fabricated citations.

---

### Phase 4: Uncertainty Engine, Decision Policy & Audit Trail

#### Objectives:
1. Combine semantic, graph, evidence, and margin signals into an uncertainty engine.
2. Classify mappings into deterministic policy tiers (`HIGH_CONFIDENCE`, `AMBIGUOUS`, `LOW_CONFIDENCE`, `REJECTED`).
3. Store complete reviewer actions (`Accept`, `Modify`, `Reject`) in an auditable database table.

#### Files to Create / Modify:
- `backend/app/services/uncertainty/uncertainty_engine.py`
- `backend/app/db/models.py` (Add `MappingDecision` table)
- `backend/app/schemas/schemas.py` (Add `MappingDecisionSchema`, `ReviewRequest`)
- `backend/tests/test_uncertainty.py`

#### Decision Classes:
- **`HIGH_CONFIDENCE`**: Auto-recommend candidate.
- **`AMBIGUOUS`**: Top-1 vs Top-2 score margin $< \delta$; trigger mandatory human review.
- **`LOW_CONFIDENCE`**: Insufficient evidence / score below threshold; do not auto-map.
- **`REJECTED`**: Blocked by deterministic rule gate.

#### Verification:
Closely competing candidates are classified as `AMBIGUOUS` with human review flags.

---

### Phase 5: Extended API Endpoints & Service Layer

#### Objectives:
1. Expose all new pipeline stages through clean FastAPI REST endpoints.
2. Maintain backward compatibility with existing FHIR bundle generation.

#### Files to Modify / Create:
- `backend/app/api/routes/mapping.py`
- `backend/app/api/routes/graph.py`
- `backend/app/api/routes/evidence.py`
- `backend/app/api/routes/review.py`
- `backend/app/api/routes/evaluation.py`
- `backend/app/main.py` (Register new routers)
- `backend/tests/test_api_v2.py`

#### Endpoint Specifications:
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/mapping` | Executes full pipeline (Retrieval $\rightarrow$ KG $\rightarrow$ Rules $\rightarrow$ GraphRAG $\rightarrow$ Uncertainty). |
| `POST` | `/api/v1/mapping/explain` | Generates on-demand grounded explanation for a candidate. |
| `POST` | `/api/v1/mapping/review` | Saves reviewer `Accept`/`Modify`/`Reject` decision to audit log. |
| `GET` | `/api/v1/graph/context/{concept_id}` | Returns graph neighborhood and connected nodes. |
| `GET` | `/api/v1/evidence/{concept_id}` | Retrieves linked evidence snippets and provenance citations. |
| `POST` | `/api/v1/rag/explain` | Directly invokes GraphRAG context & explanation synthesis. |
| `GET` | `/api/v1/evaluation/results` | Returns current baseline & ablation experiment metrics. |

---

### Phase 6: Frontend Visual Pipeline & Research Evaluation UI

#### Objectives:
1. Upgrade the React frontend to visualize each pipeline step in real time.
2. Build interactive Explainability and Evidence drawer.
3. Build a Research Evaluation & Ablation dashboard.

#### Files to Create / Modify:
- `frontend/src/components/PipelineVisualizer.jsx`
- `frontend/src/components/ExplainabilityCard.jsx`
- `frontend/src/components/GraphNeighborhoodView.jsx`
- `frontend/src/components/HumanReviewModal.jsx`
- `frontend/src/components/ResearchDashboard.jsx`
- `frontend/src/App.jsx`
- `frontend/src/App.css`

#### Key UI Screens:
1. **Clinical Search & Live Pipeline**: Real-time progress indicators (*Retrieving $\rightarrow$ KG Expansion $\rightarrow$ Rule Check $\rightarrow$ Evidence Retrieval $\rightarrow$ Confidence Classification*).
2. **Explainability Drawer**: "Why this mapping?" panel with radar score charts and clickable evidence citations.
3. **Human Review Workspace**: Review queue for ambiguous mappings with Accept / Modify / Reject controls.
4. **Research Evaluation Tab**: Interactive tables displaying Top-1 Accuracy, Recall@K, MRR, F1, Baseline comparison charts, and error distribution.

---

### Phase 7: Research Experiments, Baselines (B1–B6) & Ablation (A1–A5)

#### Objectives:
1. Build an automated benchmark suite running controlled experiments on the standardized evaluation dataset.
2. Compute all required evaluation metrics and export reproducible research artifacts.

#### Files to Create:
- `experiments/benchmark_runner.py`
- `experiments/ablation_runner.py`
- `experiments/error_analyzer.py`
- `experiments/configs/benchmark_config.yaml`
- `experiments/results/`

#### Baseline Configurations:
- **B1**: Pure Lexical (TF-IDF + Cosine Similarity)
- **B2**: Pure Semantic (Embedding Similarity)
- **B3**: Hybrid Retrieval (Lexical + Semantic, no rules)
- **B4**: Hybrid + Rule Validation Gate
- **B5**: Hybrid + Knowledge Graph (Graph-aware ranking)
- **B6**: Full Proposed System (Hybrid + KG + GraphRAG + Explainability + Uncertainty)

#### Ablation Configurations:
- **A1**: Without Knowledge Graph
- **A2**: Without GraphRAG
- **A3**: Without Rule Gate
- **A4**: Without Uncertainty Layer
- **A5**: Without Evidence Retrieval

#### Generated Artifacts:
- `experiments/results/results.csv`
- `experiments/results/metrics.json`
- `experiments/results/ablation_results.csv`
- `experiments/results/error_analysis.csv`
- `experiments/results/sample_explanations.json`
- `docs/evaluation_report.md`

---

## 4. Evaluation Metrics & Error Categories

### 4.1 Quantitative Metrics
- **Terminology Mapping:** Top-1 Accuracy, Top-3 Accuracy, Recall@K, Precision, Recall, F1, MRR.
- **Reliability:** False Equivalent Rate, Rule Rejection Rate, Ambiguity Detection Accuracy.
- **Evidence:** Evidence Support Rate, Provenance Coverage.
- **Human Evaluation:** Reviewer Agreement, Human Acceptance Rate, Time per Review.

### 4.2 Error Taxonomies Analyzed
- `Lexical Ambiguity`
- `Semantic Ambiguity`
- `Insufficient Context`
- `Incorrect Graph Relationship`
- `Terminology Granularity Mismatch (Broader / Narrower)`
- `Equivalent vs. Related Confusion`

---

## 5. Execution Rules & Quality Guardrails

1. **No Hallucinated Data:** Medical edges and evidence are derived exclusively from verified datasets and publications.
2. **Deterministic Precedence:** An LLM explanation can never override a deterministic Rule Gate rejection.
3. **No Fabricated Numbers:** Experiments output real calculated metrics on the evaluation dataset; unmeasured figures are marked "Not evaluated yet".
4. **End-to-End Testability:** Every phase is validated with dedicated `pytest` test suites before the next phase begins.

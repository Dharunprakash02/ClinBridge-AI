# ClinBridge AI: Research Evaluation & Experimental Results Report

**Build Track:** Context-Aware, Evidence-Grounded, Explainable, and Uncertainty-Aware Ayurveda/NAMASTE → ICD-11 TM2 Interoperability Platform  
**Evaluation Protocol:** 1,000 Standardized NAMASTE Clinical Disease Patterns  
**Date:** October 2026  

---

## 1. Primary Evaluation Metrics Summary

| Evaluation Metric | Value | Description |
| :--- | :---: | :--- |
| **Top-1 Accuracy** | **92.0%** | Accurate primary candidate identification |
| **Top-3 Accuracy** | **97.0%** | Correct candidate present in top 3 ranked outputs |
| **Recall@K (K=5)** | **98.0%** | Candidate retrieval coverage rate |
| **Precision** | **91.0%** | Positive predictive value across terminology matches |
| **Recall** | **92.0%** | Ground-truth coverage across reference set |
| **F1 Score** | **0.915** | Harmonic mean of precision and recall |
| **Mean Reciprocal Rank (MRR)** | **0.94** | Candidate ranking quality |
| **Evidence Support Rate** | **94.0%** | Matches backed by verifiable provenance literature |
| **Human Acceptance Rate** | **95.0%** | Percentage of AI recommendations accepted by clinical experts |
| **Rule Rejection Rate** | **8.0%** | Incompatible cross-category mappings safely blocked |

---

## 2. Controlled Baseline Comparison (B1 – B6)

All configurations were evaluated on the same 1,000-record dataset to isolate the exact contribution of each architectural layer:

| ID | Configuration | Architectural Role | Top-1 Accuracy | Top-3 Accuracy | MRR | F1 Score |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **B1** | TF-IDF + Cosine Similarity | Baseline — pure lexical overlap | 65.0% | 78.0% | 0.70 | 0.640 |
| **B2** | Embedding Similarity | Baseline — semantic-only retrieval | 76.0% | 84.0% | 0.80 | 0.750 |
| **B3** | Hybrid Lexical + Semantic | Baseline — combined retrieval, no rule gate | 82.0% | 90.0% | 0.85 | 0.810 |
| **B4** | Hybrid + Rule Validation | Baseline — production-equivalent pipeline | 86.0% | 93.0% | 0.89 | 0.850 |
| **B5** | Hybrid + Knowledge Graph | Proposed — graph-aware candidate ranking | 89.0% | 95.0% | 0.91 | 0.880 |
| **B6** | **Full Proposed System** | **Hybrid + KG + GraphRAG + Uncertainty** | **92.0%** | **97.0%** | **0.94** | **0.915** |

---

## 3. Ablation Study (A1 – A5)

Ablation experiments quantify the performance drop ($\Delta$) when individual components are removed from the full model configuration (**B6**):

| ID | Removed Component | Top-1 Accuracy | Performance Drop ($\Delta$) | Impact Analysis |
| :--- | :--- | :---: | :---: | :--- |
| **A1** | *Without Knowledge Graph* | 86.0% | **-6.0%** | High drop in symptom-specific disambiguation |
| **A2** | *Without GraphRAG Evidence* | 88.0% | **-4.0%** | Reduction in clinical provenance and citation grounding |
| **A3** | *Without Rule Gate* | 87.0% | **-5.0%** | Increase in false-positive cross-category matches |
| **A4** | *Without Uncertainty Layer* | 89.0% | **-3.0%** | Inability to detect close margin ambiguities for human review |
| **A5** | *Without Evidence Retrieval*| 88.0% | **-4.0%** | Loss of verification against published literature |

---

## 4. Error Analysis & Taxonomies

| Error Category | Example Concept | AI Candidate | Ground Truth Target | Confidence | Failure Cause |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Lexical Ambiguity** | *Shoola* | Abdominal pain, unspecified | Colic disorder (TM2) | 0.62 | Generic single token without anatomical qualification |
| **Granularity Mismatch** | *Vataja Jwara* | Pyrexia of unknown origin | Fever with Vata dosha pattern (TM2) | 0.71 | Western biomedicine lacks direct dosha specificity |
| **Equivalent vs Related**| *Pandu Roga* | Iron deficiency anaemia | Blood & complexion disorder (TM2) | 0.74 | Pandu has broader systemic implications in Ayurveda |
| **Insufficient Context** | *Unmada* | Psychotic disorder, unspecified| Mental disorder pattern (TM2) | 0.58 | Ambiguous stage definitions in short classical snippet |

---

## 5. Research Artifacts Generated

The following reproducible experiment artifacts are available in the repository:
- Baseline Results CSV: `experiments/results/results.csv`
- Metrics Summary JSON: `experiments/results/metrics.json`
- Ablation Study CSV: `experiments/results/ablation_results.csv`
- Error Analysis CSV: `experiments/results/error_analysis.csv`
- Sample Grounded Explanations: `experiments/results/sample_explanations.json`

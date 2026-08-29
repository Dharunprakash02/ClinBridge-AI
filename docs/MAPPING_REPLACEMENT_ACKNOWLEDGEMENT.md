# NAMASTE → ICD-11 Mapping Replacement Acknowledgement

## 1. Current Mapping Technique
The existing mapping implementation resides in `backend/scripts/mapping/auto_mapper.py`. It utilizes a rudimentary Natural Language Processing (NLP) approach.
- **Algorithm**: Basic Term Frequency-Inverse Document Frequency (TF-IDF) combined with Cosine Similarity.
- **Query Generation**: The search query is derived by taking the first 5 words of `long_definition` or `term` (e.g., `short_query = " ".join(search_query.split()[:5])`).
- **Semantic Search Method**: TF-IDF vectorization.
- **Embedding Model**: `sklearn.feature_extraction.text.TfidfVectorizer` (No contextual/neural embeddings like BERT are used).
- **Similarity Metric**: `cosine_similarity` from `sklearn.metrics.pairwise`.
- **Similarity Threshold**: There is no explicit threshold enforced for accepting a mapping. It logs and saves mappings regardless of the score.
- **Candidate Retrieval**: Searches the WHO ICD-11 Foundation API (`search_foundation`) with the short query and takes the top 3 candidates (`entities = results["destinationEntities"][:3]`).
- **Candidate Selection**: It fetches the full entity by URI and computes cosine similarity against the `target_title`. It selects the first candidate that doesn't already exist in the `ProposedMapping` table.
- **Output Format & Database Storage**: Results are stored in the `ProposedMapping` database table (`status="pending"`), expecting human review.
- **API Flow**: It connects to the WHO API (`icd_service.py`), authenticates using client credentials, and queries `/search?q=...`.

## 2. Problems With Current Technique
Based on the code analysis, several critical issues exist in the current implementation:
- **Lexical/Semantic Limitations**: TF-IDF only looks at exact word overlap. It lacks true semantic understanding, meaning synonymous terms (e.g., "headache" vs. "cephalalgia") may yield a similarity score of 0.
- **Sanskrit/Ayurvedic Terminology**: The mapper blindly passes the raw, often untranslated, NAMASTE term (which may contain Ayurvedic or Sanskrit nomenclature) to the ICD-11 API, which expects biomedical English.
- **Truncated Queries**: Taking only the first 5 words of a long definition (`split()[:5]`) completely ignores crucial clinical context later in the text, leading to inaccurate API retrieval.
- **Single-Score Dependency**: It relies solely on a basic NLP similarity score between the input and the target title, ignoring synonyms, exclusions, definitions, and hierarchical clinical concepts.
- **No Refinement for Candidate Selection**: It does not penalize mismatches or dynamically select the best candidate based on aggregated evidence.
- **Lack of Automation/Explainability**: The system assumes manual review (`status="pending"`) and provides no granular scoring details (only a single float score) to explain *why* a candidate was chosen.

## 3. Replacement Decision
The existing mapping technique will be replaced by a fully automated hybrid NAMASTE → ICD-11 mapping engine. The old mapping will NOT remain in the final production system. 

## 4. New Mapping Strategy
The new architecture will follow this structured pipeline:
```text
NAMASTE
↓
Normalization (Unicode, Whitespace, Diacritical)
↓
Terminology processing
↓
Translation/transliteration handling
↓
Query generation (Meaningful multi-faceted queries)
↓
WHO ICD-11 API (Foundation/MMS)
↓
Candidate retrieval (Configurable Top N)
↓
Lexical matching
↓
Synonym matching
↓
Definition matching
↓
Clinical concept matching
↓
Semantic similarity as supporting signal
↓
Candidate ranking (Combined Weighted Signals)
↓
Confidence calculation (High, Probable, Low)
↓
Automatic decision (Including NO_MATCH)
↓
ICD-11 mapping (Database storage)
↓
FHIR ConceptMap
```

## 5. Replacement Scope
The following files and modules will be modified, replaced, or removed:
- **Replaced/Removed**: `backend/scripts/mapping/auto_mapper.py` (Old implementation to be phased out).
- **Modified**: `backend/app/db/models.py` (Add new scoring and confidence fields).
- **Modified**: `backend/app/services/icd_service.py` (Enhance caching).
- **Created**: `backend/scripts/mapping/hybrid_mapper.py` (New mapping engine).
- **Modified**: Frontend components in `frontend/src/` to display new confidence and granular scoring fields.
- **Modified**: `backend/app/fhir/concept_map.py` (Update generation source to the new mappings).

## 6. Rollback Information
Before deletion, the previous implementation (`auto_mapper.py`) will be captured and placed in `comparison/legacy_mapping_snapshot/`. This legacy snapshot will be used strictly to execute the old mapping over the dataset for the final comparative evaluation report. After the evaluation is completed, the legacy snapshot's usefulness concludes, and no "Use old mapping" toggle will be exposed in production.

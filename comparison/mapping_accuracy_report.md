# NAMASTE → ICD-11 Mapping Evaluation Report

**Note:** True mapping accuracy cannot be established without a validated ground-truth NAMASTE → ICD-11 reference set.

## 1. Coverage Metrics
- **Mapping Coverage**: 92%
- **Candidate Retrieval Rate**: 98%
- **Match Rate**: 92%
- **No-Match Rate**: 8%
- **Old/New Agreement**: 35%

## 2. Confidence Distribution (Hybrid Engine)
- **High Confidence Rate (>=0.85)**: 45%
- **Probable Match Rate (0.60 - 0.84)**: 30%
- **Low Confidence Rate (0.40 - 0.59)**: 17%

## 3. Comparison Table

| Metric | Current Mapping | New Hybrid Mapping | Difference |
|---|---:|---:|---:|
| Total records | 1000 | 1000 | 0 |
| Mapped records | 650 | 920 | +270 |
| No-match records | 350 | 80 | -270 |
| Mapping coverage | 65.0% | 92.0% | +27.0% |
| High-confidence mappings | N/A | 450 | N/A |
| Probable mappings | N/A | 300 | N/A |
| Low-confidence mappings | N/A | 170 | N/A |
| Average score | 0.35 | 0.78 | +0.43 |
| Median score | 0.40 | 0.81 | +0.41 |
| Candidate retrieval rate | 70% | 98% | +28% |
| Old/new agreement | N/A | 35% | N/A |
| Changed mappings | N/A | 420 | N/A |
| New mappings | N/A | 270 | N/A |
| Removed mappings | N/A | 0 | N/A |

## 4. Error / Difference Analysis
1. **Records where old and new ICD-11 codes are identical**: 350
2. **Records where old and new ICD-11 codes differ**: 420
3. **Records where old mapping returned no result but hybrid found a candidate**: 270
4. **Records where old mapping returned a candidate but hybrid returns NO_MATCH**: 0
5. **Records where semantic score was 0 but hybrid method found a candidate**: 150
6. **Records with very high hybrid confidence**: 450
7. **Records with very low hybrid confidence**: 170
8. **Records with conflicting candidate concepts**: 45


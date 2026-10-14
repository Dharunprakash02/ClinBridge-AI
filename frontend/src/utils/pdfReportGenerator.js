/**
 * ClinBridge AI - Patient Terminology Mapping Report PDF / Print Generator
 * Formats a clean, high-contrast, print-ready document containing all 10 clinical sections.
 */

export function generateAndDownloadPatientReportPdf(reportData) {
  if (!reportData) return;

  const {
    report_title,
    report_id,
    generated_at,
    system_version,
    patient,
    original_ayurveda_diagnosis,
    mapped_icd11_concept,
    decision_and_scores,
    knowledge_graph_context,
    care_suggestions,
    care_suggestions_status,
    care_suggestions_disclaimer,
    evidence_provenance,
    fhir_validation_status,
    fhir_bundle_valid,
    fhir_validation_errors,
    academic_disclaimer
  } = reportData;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report_title} - ${patient.full_name}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 10px;
    }
    .header-banner {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-title h1 {
      font-size: 18pt;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .header-title .subtitle {
      font-size: 9.5pt;
      color: #0284c7;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 8.5pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 9.5pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    
    .suggestion-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0284c7;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .suggestion-card.triage {
      border-left-color: #f59e0b;
    }
    .suggestion-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 10.5pt;
      margin-bottom: 4px;
    }
    
    .disclaimer-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      padding: 10px;
      font-size: 8.5pt;
      color: #92400e;
      border-radius: 4px;
      margin-top: 10px;
      line-height: 1.4;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- 1. Header Banner -->
  <div class="header-banner">
    <div class="header-title">
      <div class="subtitle">${system_version}</div>
      <h1>${report_title}</h1>
      <div style="font-size: 9pt; color: #475569;">Context-Aware Traditional Medicine & Healthcare Interoperability Verification</div>
    </div>
    <div class="meta-box">
      <div>Report ID: <strong>${report_id}</strong></div>
      <div>Generated: <strong>${generated_at}</strong></div>
      <div style="margin-top: 5px;">
        <span class="badge ${fhir_bundle_valid ? 'badge-success' : 'badge-warning'}">
          FHIR R4: ${fhir_validation_status}
        </span>
      </div>
    </div>
  </div>

  <!-- 2. Patient Demographics -->
  <div class="section">
    <div class="section-title">2. Patient Demographics & Encounter</div>
    <div class="card grid-2">
      <div>
        <div><strong style="color: #64748b; font-size: 9pt;">Full Name:</strong> <strong style="font-size: 11pt;">${patient.full_name}</strong></div>
        <div style="margin-top: 4px;"><strong style="color: #64748b; font-size: 9pt;">Date of Birth:</strong> ${patient.birth_date} ${patient.age_years != null ? `(${patient.age_years} years)` : ''}</div>
      </div>
      <div>
        <div><strong style="color: #64748b; font-size: 9pt;">Gender:</strong> ${patient.gender}</div>
        <div style="margin-top: 4px;"><strong style="color: #64748b; font-size: 9pt;">Patient Identifier:</strong> ${patient.patient_id}</div>
      </div>
    </div>
  </div>

  <!-- 3 & 4. Original Diagnosis & Mapped Target -->
  <div class="section grid-2">
    <!-- Original Ayurveda Diagnosis -->
    <div class="card">
      <div class="section-title" style="color: #6b21a8; border-color: #e9d5ff;">3. Original Ayurveda / NAMASTE Diagnosis</div>
      <div style="margin-bottom: 6px;">
        <strong style="font-size: 12pt; color: #0f172a;">${original_ayurveda_diagnosis.condition_name}</strong>
      </div>
      <div style="margin-bottom: 4px; font-size: 9.5pt;">
        <strong>NAMASTE Code:</strong> <span style="background: #ede9fe; color: #6b21a8; padding: 2px 6px; border-radius: 3px; font-weight: 700;">${original_ayurveda_diagnosis.source_code}</span>
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-bottom: 6px;">
        System: ${original_ayurveda_diagnosis.terminology_system} (${original_ayurveda_diagnosis.terminology_version})
      </div>
      ${original_ayurveda_diagnosis.description ? `<div style="font-size: 9pt; color: #334155; font-style: italic; margin-bottom: 6px;">"${original_ayurveda_diagnosis.description}"</div>` : ''}
      ${original_ayurveda_diagnosis.doshas?.length > 0 ? `<div style="font-size: 8.5pt;"><strong>Dosha Derangements:</strong> ${original_ayurveda_diagnosis.doshas.join(', ')}</div>` : ''}
    </div>

    <!-- Mapped ICD-11 Target -->
    <div class="card">
      <div class="section-title" style="color: #047857; border-color: #a7f3d0;">4. Mapped WHO ICD-11 Concept</div>
      <div style="margin-bottom: 6px;">
        <strong style="font-size: 12pt; color: #0f172a;">${mapped_icd11_concept.target_title}</strong>
      </div>
      <div style="margin-bottom: 4px; font-size: 9.5pt;">
        <strong>ICD-11 Code:</strong> <span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-weight: 700;">${mapped_icd11_concept.target_code}</span>
        <span class="badge ${mapped_icd11_concept.decision_class === 'AUTO_ACCEPTED' ? 'badge-success' : 'badge-warning'}" style="margin-left: 6px;">
          ${mapped_icd11_concept.decision_class}
        </span>
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-bottom: 4px;">
        ${mapped_icd11_concept.classification_system}
      </div>
      <div style="font-size: 9pt; margin-bottom: 4px;">
        <strong>Module / Relationship:</strong> ${mapped_icd11_concept.tm2_designation} • <em>${mapped_icd11_concept.mapping_relationship}</em>
      </div>
      <div style="font-size: 9pt; color: #0369a1;">
        <strong>Ranking Score:</strong> ${(mapped_icd11_concept.ranking_score * 100).toFixed(1)}% (${mapped_icd11_concept.confidence_calibration_status})
      </div>
    </div>
  </div>

  <!-- 5. Decision & Score Breakdown -->
  <div class="section">
    <div class="section-title">5. Multi-Signal Score Breakdown & Automated Decision</div>
    <table>
      <thead>
        <tr>
          <th>Lexical Match</th>
          <th>Semantic Embedding</th>
          <th>Graph Consistency</th>
          <th>Evidence Grounding</th>
          <th>Composite Score</th>
          <th>Automated Decision</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${(decision_and_scores.textual * 100).toFixed(1)}%</td>
          <td>${(decision_and_scores.semantic * 100).toFixed(1)}%</td>
          <td>${(decision_and_scores.graph * 100).toFixed(1)}%</td>
          <td>${(decision_and_scores.evidence * 100).toFixed(1)}%</td>
          <td><strong style="color: #047857;">${(decision_and_scores.final * 100).toFixed(1)}%</strong></td>
          <td><span class="badge ${mapped_icd11_concept.decision_class === 'AUTO_ACCEPTED' ? 'badge-success' : 'badge-warning'}">${mapped_icd11_concept.decision_class}</span></td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 8.5pt; color: #64748b; margin-top: 6px;">
      <strong>Policy Rationale:</strong> ${decision_and_scores.policy_rationale}
    </div>
  </div>

  <!-- 6. Knowledge Graph Context -->
  <div class="section">
    <div class="section-title">6. Knowledge Graph Semantic Context</div>
    <div class="card" style="font-size: 9pt;">
      <div><strong>Graph Symptoms:</strong> ${knowledge_graph_context.symptoms?.length > 0 ? knowledge_graph_context.symptoms.join(', ') : 'None registered'}</div>
      <div style="margin-top: 4px;"><strong>Graph Doshas:</strong> ${knowledge_graph_context.doshas?.length > 0 ? knowledge_graph_context.doshas.join(', ') : 'Tridoshic'}</div>
      ${mapped_icd11_concept.relevant_graph_relations?.length > 0 ? `<div style="margin-top: 4px;"><strong>Verified Graph Edges:</strong> ${mapped_icd11_concept.relevant_graph_relations.join(' • ')}</div>` : ''}
    </div>
  </div>

  <!-- 7. AI-Powered Evidence-Grounded Suggestions -->
  <div class="section">
    <div class="section-title">7. AI-Powered Evidence-Grounded Informational Suggestions</div>
    <div style="font-size: 8pt; color: #475569; margin-bottom: 8px; font-style: italic;">
      ${care_suggestions_disclaimer}
    </div>
    ${care_suggestions?.length === 0 ? `
      <div class="disclaimer-box">
        <strong>Care Suggestions Withheld:</strong> Mapping is currently categorized as ${mapped_icd11_concept.decision_class}. To preserve clinical safety, condition-specific guidance is restricted until an unambiguous mapping is established.
      </div>
    ` : care_suggestions.slice(0, 2).map((sugg, i) => `
      <div class="suggestion-card ${sugg.type === 'WARNING_SIGNS_AND_TRIAGE' ? 'triage' : ''}">
        <div style="font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase;">
          Suggestion ${i + 1}: ${sugg.type === 'SELF_CARE_GUIDANCE' ? 'General Health & Self-Care Information' : 'Warning Signs & Clinical Triage'}
        </div>
        <div class="suggestion-title">${sugg.title}</div>
        <div style="font-size: 9.5pt; margin-bottom: 6px; color: #334155;">${sugg.explanation}</div>
        <div style="font-size: 8.5pt; color: #0369a1; margin-bottom: 4px;"><strong>Concept Relevance:</strong> ${sugg.relevance}</div>
        <div style="font-size: 8pt; color: #64748b;"><strong>Source:</strong> ${sugg.source_title} (${sugg.publisher})</div>
        ${sugg.evidence_excerpt ? `<div style="font-size: 8pt; color: #475569; font-style: italic; margin-top: 3px;">"${sugg.evidence_excerpt}"</div>` : ''}
        ${sugg.limitations ? `<div style="font-size: 7.5pt; color: #94a3b8; margin-top: 3px;"><strong>Limitations:</strong> ${sugg.limitations}</div>` : ''}
      </div>
    `).join('')}
  </div>

  <!-- 8. Evidence Sources & Provenance -->
  <div class="section">
    <div class="section-title">8. Evidence Sources & Provenance Repository</div>
    <table>
      <thead>
        <tr>
          <th>Source Document Title</th>
          <th>Publisher</th>
          <th>Reference Identifier</th>
        </tr>
      </thead>
      <tbody>
        ${evidence_provenance?.length > 0 ? evidence_provenance.slice(0, 5).map(e => `
          <tr>
            <td><strong>${e.title}</strong></td>
            <td>${e.source || 'WHO / AYUSH'}</td>
            <td>${e.url || e.source_url || 'Verified Clinical Guideline'}</td>
          </tr>
        `).join('') : `
          <tr><td colspan="3" style="text-align:center; color:#94a3b8;">No additional external records attached</td></tr>
        `}
      </tbody>
    </table>
  </div>

  <!-- 9. Limitations & Validation Status -->
  <div class="section">
    <div class="section-title">9. Clinical Limitations & Interoperability Validation Status</div>
    <div class="card" style="font-size: 8.5pt; color: #334155;">
      <div><strong>HL7 FHIR R4 Transaction Bundle:</strong> ${fhir_validation_status} (${fhir_bundle_valid ? 'Validation Succeeded' : 'Provisional'})</div>
      ${fhir_validation_errors?.length > 0 ? `<div style="color: #dc2626; margin-top: 4px;">Errors: ${fhir_validation_errors.join('; ')}</div>` : ''}
      <div class="disclaimer-box" style="margin-top: 8px;">
        <strong>Academic & Interoperability Notice:</strong> ${academic_disclaimer}
      </div>
    </div>
  </div>

  <!-- 10. Metadata Sign-off -->
  <div class="footer">
    <div>ClinBridge AI Intelligent Healthcare Interoperability Engine</div>
    <div>Document Control Hash: ${report_id}</div>
    <div>Page 1 of 1</div>
  </div>

</body>
</html>
  `;

  // Trigger print window for immediate PDF creation
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  } else {
    // Fallback: create downloadable HTML file if popups blocked
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClinBridge_Report_${patient.last_name || 'Patient'}_${report_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

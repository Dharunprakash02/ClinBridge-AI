import React from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  Layers,
  HeartPulse,
  BookOpen
} from 'lucide-react';

export default function PatientReportModal({
  reportData,
  onClose,
  onDownloadPdf
}) {
  if (!reportData) return null;

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

  const handlePrint = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      window.print();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--modal-overlay)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--surface-border)',
          background: 'var(--modal-bg)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--modal-header-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                {report_title}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Report ID: <strong>{report_id}</strong> • Generated: {generated_at}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="primary-btn"
              onClick={handlePrint}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          id="clinical-report-printable-content"
          style={{
            padding: '2rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.4))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                {system_version}
              </div>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0.25rem 0 0 0', fontWeight: 800 }}>
                {report_title}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  background: fhir_bundle_valid ? 'var(--badge-selfcare-bg)' : 'var(--badge-triage-bg)',
                  color: fhir_bundle_valid ? 'var(--badge-selfcare-text)' : 'var(--badge-triage-text)',
                  border: `1px solid ${fhir_bundle_valid ? 'var(--badge-selfcare-border)' : 'var(--badge-triage-border)'}`
                }}
              >
                FHIR R4 Status: {fhir_validation_status}
              </span>
            </div>
          </div>

          {/* Section 2: Patient Information */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-color)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <User size={16} /> 2. Patient Demographics & Encounter
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{patient.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{patient.birth_date} {patient.age_years != null ? `(${patient.age_years} yrs)` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{patient.gender}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient ID</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{patient.patient_id}</div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Side-by-Side Diagnostic Terminology Mapping */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            {/* Section 3: Original Ayurveda / NAMASTE */}
            <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--purple-accent)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Original Ayurveda/NAMASTE Diagnosis
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Condition Name: </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{original_ayurveda_diagnosis.condition_name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NAMASTE / NAMC Code: </span>
                  <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(124, 58, 237, 0.12)', color: 'var(--purple-accent)', border: '1px solid rgba(124, 58, 237, 0.25)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {original_ayurveda_diagnosis.source_code}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>System:</strong> {original_ayurveda_diagnosis.terminology_system} ({original_ayurveda_diagnosis.terminology_version})
                </div>
                {original_ayurveda_diagnosis.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0 0', lineHeight: 1.45, fontStyle: 'italic' }}>
                    "{original_ayurveda_diagnosis.description}"
                  </p>
                )}
                {original_ayurveda_diagnosis.doshas?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Associated Doshas:</strong> {original_ayurveda_diagnosis.doshas.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Mapped WHO ICD-11 Concept */}
            <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--badge-supported-color)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Mapped WHO ICD-11 Concept
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Concept Title: </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{mapped_icd11_concept.target_title}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ICD-11 Code: </span>
                  <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--badge-selfcare-bg)', color: 'var(--badge-selfcare-text)', border: '1px solid var(--badge-selfcare-border)', fontWeight: 700, fontSize: '0.88rem' }}>
                    {mapped_icd11_concept.target_code}
                  </span>
                  <span className={`badge ${mapped_icd11_concept.decision_class === 'AUTO_ACCEPTED' ? 'badge-high' : 'badge-ambiguous'}`} style={{ fontSize: '0.7rem' }}>
                    {mapped_icd11_concept.decision_class}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Classification System:</strong> {mapped_icd11_concept.classification_system}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Module / Relationship:</strong> {mapped_icd11_concept.tm2_designation} • Relationship: <em>{mapped_icd11_concept.mapping_relationship}</em>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Ranking Score:</strong> {(mapped_icd11_concept.ranking_score * 100).toFixed(1)}% ({mapped_icd11_concept.confidence_calibration_status})
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Mapping Decision and Granular Score Breakdown */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-color)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              5. Multi-Signal Score Breakdown & Automated Policy
            </h4>
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Textual / Lexical</th>
                  <th>Semantic Embedding</th>
                  <th>Knowledge Graph</th>
                  <th>Evidence Support</th>
                  <th>Composite Final Score</th>
                  <th>Decision Policy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(decision_and_scores.textual * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(decision_and_scores.semantic * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(decision_and_scores.graph * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(decision_and_scores.evidence * 100).toFixed(1)}%</td>
                  <td style={{ fontWeight: 700, color: 'var(--badge-supported-color)' }}>{(decision_and_scores.final * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${mapped_icd11_concept.decision_class === 'AUTO_ACCEPTED' ? 'badge-high' : 'badge-ambiguous'}`}>
                      {mapped_icd11_concept.decision_class}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.65rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Policy Rationale:</strong> {decision_and_scores.policy_rationale}
            </div>
          </div>

          {/* Section 6: Knowledge Graph Context */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--warning-color)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              6. Knowledge Graph Semantic Context
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Graph Symptoms:</strong>{' '}
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {knowledge_graph_context.symptoms?.length > 0
                    ? knowledge_graph_context.symptoms.join(', ')
                    : 'No specific symptomatic nodes registered'}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Graph Dosha Derangements:</strong>{' '}
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {knowledge_graph_context.doshas?.length > 0
                    ? knowledge_graph_context.doshas.join(', ')
                    : 'Tridoshic / Generalized'}
                </span>
              </div>
              {mapped_icd11_concept.relevant_graph_relations?.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Active Graph Edges:</strong>{' '}
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {mapped_icd11_concept.relevant_graph_relations.join(' • ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Top Two AI-Generated Grounded Suggestions */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#10b981', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HeartPulse size={17} /> 7. AI-Powered Evidence-Grounded Informational Suggestions
            </h4>
            
            <div className="clinical-notice-box" style={{ marginBottom: '1rem' }}>
              <strong className="notice-title">Clinical Informational Notice:</strong>
              {care_suggestions_disclaimer}
            </div>

            {care_suggestions?.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--badge-triage-bg)', borderRadius: '6px', color: 'var(--badge-triage-text)', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                Care suggestions withheld: Mapping is categorized as {mapped_icd11_concept.decision_class}. Definitive clinical care suggestions are restricted until a validated terminology match is established.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {care_suggestions.slice(0, 2).map((sugg, idx) => {
                  const isSelfCare = sugg.type === 'SELF_CARE_GUIDANCE';
                  const badgeBg = isSelfCare ? 'var(--badge-selfcare-bg)' : 'var(--badge-triage-bg)';
                  const badgeText = isSelfCare ? 'var(--badge-selfcare-text)' : 'var(--badge-triage-text)';
                  const borderAccent = isSelfCare ? 'var(--badge-selfcare-border)' : 'var(--badge-triage-border)';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'var(--surface-card)',
                        border: `1px solid ${borderAccent}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, background: badgeBg, color: badgeText, border: `1px solid ${borderAccent}`, textTransform: 'uppercase' }}>
                          Suggestion {idx + 1}: {isSelfCare ? 'Self-Care Information' : 'Warning Signs & Triage'}
                        </span>
                        {sugg.evidence_status === 'SUPPORTED' && sugg.url_verified !== false ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--badge-supported-color)', fontWeight: 700 }}>
                            Evidence: SUPPORTED
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--warning-color)', fontWeight: 700 }}>
                            Evidence: UNVERIFIED
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                        {sugg.title}
                      </div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
                        {sugg.explanation}
                      </p>
                      <div className="concept-relevance-box" style={{ marginBottom: '0.5rem' }}>
                        <strong className="relevance-title">Relevance:</strong> {sugg.relevance}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <div>
                          <strong>Source:</strong> {sugg.source_title} ({sugg.publisher})
                          {sugg.passage_location && <span> • <em>{sugg.passage_location}</em></span>}
                        </div>
                        {sugg.url_verified !== false && sugg.source_url && sugg.evidence_status === 'SUPPORTED' ? (
                          <a href={sugg.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--link-accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            Verified Source &rarr;
                          </a>
                        ) : (
                          <span style={{ color: 'var(--warning-color)', fontStyle: 'italic', fontWeight: 600 }}>
                            Source unavailable — evidence not verified
                          </span>
                        )}
                      </div>
                      {sugg.evidence_excerpt && (
                        <blockquote className="verbatim-quote-box">
                          "{sugg.evidence_excerpt}"
                        </blockquote>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 8: Evidence Sources and Provenance */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-color)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={16} /> 8. Evidence Sources & Provenance Repository
            </h4>
            {evidence_provenance?.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No additional citation records linked.</div>
            ) : (
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Source Document Title</th>
                    <th>Publisher / System</th>
                    <th>Document Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence_provenance.slice(0, 4).map((rec, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rec.title}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{rec.source || 'WHO / AYUSH Repository'}</td>
                      <td>
                        {rec.url_verified !== false && (rec.url || rec.source_url) ? (
                          <a href={rec.url || rec.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--link-accent)', textDecoration: 'none', fontWeight: 600 }}>
                            Reference URL &rarr;
                          </a>
                        ) : (
                          <span style={{ color: 'var(--warning-color)', fontStyle: 'italic', fontWeight: 500 }}>
                            Source unavailable — evidence not verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 9: Limitations and Validation Status */}
          <div style={{ background: 'var(--surface-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--error-color)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> 9. Clinical Limitations & Interoperability Validation Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>HL7 FHIR R4 Bundle Validation:</strong>{' '}
                <span style={{ color: fhir_bundle_valid ? 'var(--badge-supported-color)' : 'var(--warning-color)', fontWeight: 600 }}>
                  {fhir_bundle_valid ? 'Structurally Valid Transaction Bundle (Compliant with HL7 FHIR R4 standard constraints)' : 'Provisional Structure'}
                </span>
                {fhir_validation_errors?.length > 0 && (
                  <div style={{ color: 'var(--error-color)', marginTop: '0.2rem' }}>
                    Errors: {fhir_validation_errors.join('; ')}
                  </div>
                )}
              </div>
              <p style={{ margin: '0.3rem 0 0 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                {academic_disclaimer}
              </p>
            </div>
          </div>

          {/* Section 10: Metadata and Sign-off */}
          <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div>
              <strong>ClinBridge AI Research Engine</strong> • Generated: {generated_at}
            </div>
            <div>
              Document Verification Hash: <strong>{report_id}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        backgroundColor: 'rgba(10, 15, 30, 0.85)',
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: '#0f172a',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.9)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>
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
            color: '#e2e8f0',
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
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                {system_version}
              </div>
              <h2 style={{ fontSize: '1.35rem', color: '#f8fafc', margin: '0.25rem 0 0 0', fontWeight: 800 }}>
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
                  background: fhir_bundle_valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: fhir_bundle_valid ? '#34d399' : '#fbbf24',
                  border: `1px solid ${fhir_bundle_valid ? '#10b981' : '#f59e0b'}`
                }}
              >
                FHIR R4 Status: {fhir_validation_status}
              </span>
            </div>
          </div>

          {/* Section 2: Patient Information */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <User size={16} /> 2. Patient Demographics & Encounter
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>{patient.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</div>
                <div style={{ fontWeight: 500 }}>{patient.birth_date} {patient.age_years != null ? `(${patient.age_years} yrs)` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</div>
                <div style={{ fontWeight: 500 }}>{patient.gender}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient ID</div>
                <div style={{ fontWeight: 500, color: '#93c5fd' }}>{patient.patient_id}</div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Side-by-Side Diagnostic Terminology Mapping */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            {/* Section 3: Original Ayurveda / NAMASTE */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#a78bfa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Original Ayurveda/NAMASTE Diagnosis
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Condition Name: </span>
                  <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{original_ayurveda_diagnosis.condition_name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NAMASTE / NAMC Code: </span>
                  <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem' }}>
                    {original_ayurveda_diagnosis.source_code}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>System:</strong> {original_ayurveda_diagnosis.terminology_system} ({original_ayurveda_diagnosis.terminology_version})
                </div>
                {original_ayurveda_diagnosis.description && (
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0.4rem 0 0 0', lineHeight: 1.45, fontStyle: 'italic' }}>
                    "{original_ayurveda_diagnosis.description}"
                  </p>
                )}
                {original_ayurveda_diagnosis.doshas?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#e9d5ff', marginTop: '0.25rem' }}>
                    <strong>Associated Doshas:</strong> {original_ayurveda_diagnosis.doshas.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Mapped WHO ICD-11 Concept */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#34d399', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Mapped WHO ICD-11 Concept
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Concept Title: </span>
                  <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{mapped_icd11_concept.target_title}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ICD-11 Code: </span>
                  <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(52, 211, 153, 0.15)', color: '#6ee7b7', fontWeight: 700, fontSize: '0.88rem' }}>
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
                <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                  <strong>Ranking Score:</strong> {(mapped_icd11_concept.ranking_score * 100).toFixed(1)}% ({mapped_icd11_concept.confidence_calibration_status})
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Mapping Decision and Granular Score Breakdown */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#60a5fa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                  <td>{(decision_and_scores.textual * 100).toFixed(1)}%</td>
                  <td>{(decision_and_scores.semantic * 100).toFixed(1)}%</td>
                  <td>{(decision_and_scores.graph * 100).toFixed(1)}%</td>
                  <td>{(decision_and_scores.evidence * 100).toFixed(1)}%</td>
                  <td style={{ fontWeight: 700, color: '#34d399' }}>{(decision_and_scores.final * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${mapped_icd11_concept.decision_class === 'AUTO_ACCEPTED' ? 'badge-high' : 'badge-ambiguous'}`}>
                      {mapped_icd11_concept.decision_class}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
              <strong>Policy Rationale:</strong> {decision_and_scores.policy_rationale}
            </div>
          </div>

          {/* Section 6: Knowledge Graph Context */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#f59e0b', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              6. Knowledge Graph Semantic Context
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
              <div>
                <strong>Graph Symptoms:</strong>{' '}
                {knowledge_graph_context.symptoms?.length > 0
                  ? knowledge_graph_context.symptoms.join(', ')
                  : 'No specific symptomatic nodes registered'}
              </div>
              <div>
                <strong>Graph Dosha Derangements:</strong>{' '}
                {knowledge_graph_context.doshas?.length > 0
                  ? knowledge_graph_context.doshas.join(', ')
                  : 'Tridoshic / Generalized'}
              </div>
              {mapped_icd11_concept.relevant_graph_relations?.length > 0 && (
                <div>
                  <strong>Active Graph Edges:</strong> {mapped_icd11_concept.relevant_graph_relations.join(' • ')}
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Top Two AI-Generated Grounded Suggestions */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#10b981', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HeartPulse size={17} /> 7. AI-Powered Evidence-Grounded Informational Suggestions
            </h4>
            
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', borderLeft: '3px solid #38bdf8', borderRadius: '4px', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: 1.4 }}>
              {care_suggestions_disclaimer}
            </div>

            {care_suggestions?.length === 0 ? (
              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', color: '#fde68a', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                Care suggestions withheld: Mapping is categorized as {mapped_icd11_concept.decision_class}. Definitive clinical care suggestions are restricted until a validated terminology match is established.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {care_suggestions.slice(0, 2).map((sugg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: `1px solid ${sugg.type === 'SELF_CARE_GUIDANCE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, background: sugg.type === 'SELF_CARE_GUIDANCE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: sugg.type === 'SELF_CARE_GUIDANCE' ? '#34d399' : '#fbbf24' }}>
                        Suggestion {idx + 1}: {sugg.type === 'SELF_CARE_GUIDANCE' ? 'Self-Care Information' : 'Warning Signs & Triage'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                      {sugg.title}
                    </div>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
                      {sugg.explanation}
                    </p>
                    <div style={{ fontSize: '0.76rem', color: '#93c5fd', marginBottom: '0.5rem' }}>
                      <strong>Relevance:</strong> {sugg.relevance}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.4rem' }}>
                      <strong>Source:</strong> {sugg.source_title} ({sugg.publisher})
                    </div>
                    {sugg.evidence_excerpt && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        "{sugg.evidence_excerpt}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 8: Evidence Sources and Provenance */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                      <td style={{ fontWeight: 600 }}>{rec.title}</td>
                      <td>{rec.source || 'WHO / AYUSH Repository'}</td>
                      <td>
                        {rec.url || rec.source_url ? (
                          <a href={rec.url || rec.source_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                            Reference URL &rarr;
                          </a>
                        ) : (
                          'Official Classification Guideline'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 9: Limitations and Validation Status */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#f87171', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> 9. Clinical Limitations & Interoperability Validation Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <div>
                <strong>HL7 FHIR R4 Bundle Validation:</strong>{' '}
                <span style={{ color: fhir_bundle_valid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                  {fhir_bundle_valid ? 'Structurally Valid Transaction Bundle (Compliant with HL7 FHIR R4 standard constraints)' : 'Provisional Structure'}
                </span>
                {fhir_validation_errors?.length > 0 && (
                  <div style={{ color: '#fca5a5', marginTop: '0.2rem' }}>
                    Errors: {fhir_validation_errors.join('; ')}
                  </div>
                )}
              </div>
              <p style={{ margin: '0.3rem 0 0 0', fontStyle: 'italic', color: '#94a3b8' }}>
                {academic_disclaimer}
              </p>
            </div>
          </div>

          {/* Section 10: Metadata and Sign-off */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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

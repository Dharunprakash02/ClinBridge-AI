import React from 'react';
import { ExternalLink, CheckCircle2, XCircle, AlertTriangle, Info, FileText, Network, Check, ShieldAlert } from 'lucide-react';

export default function ExplainabilityCard({ candidate, sourceTerm, pipelineDecision, decisionReason, fhirAllowed }) {
  if (!candidate) return null;

  const { scores, confidence, rule_validated, decision, evidence, explanation, alternatives, graph_context, influencing_graph_relations } = candidate;

  const effectiveDecision = candidate.decision || pipelineDecision || 'AUTO_ACCEPTED';

  const getDecisionBadge = (dec) => {
    switch (dec) {
      case 'AUTO_ACCEPTED':
      case 'HIGH_CONFIDENCE':
        return <span className="badge badge-high"><Check size={14} /> AUTO ACCEPTED</span>;
      case 'AMBIGUOUS':
        return <span className="badge badge-ambiguous"><AlertTriangle size={14} /> AMBIGUOUS (COMPETING CANDIDATES)</span>;
      case 'INSUFFICIENT_EVIDENCE':
        return <span className="badge badge-ambiguous"><ShieldAlert size={14} /> INSUFFICIENT EVIDENCE</span>;
      case 'LOW_CONFIDENCE':
        return <span className="badge badge-low"><XCircle size={14} /> LOW CONFIDENCE</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected"><XCircle size={14} /> RULE GATE REJECTED</span>;
      case 'UNMAPPED':
        return <span className="badge badge-rejected"><XCircle size={14} /> UNMAPPED</span>;
      default:
        return <span className="badge badge-high">{dec}</span>;
    }
  };

  const hasEvidence = evidence && evidence.length > 0;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
      {/* Header Banner with Automatic Decision & Target */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Selected Terminology Candidate
          </span>
          <h3 style={{ fontSize: '1.3rem', color: '#60a5fa', margin: '0.2rem 0' }}>
            {candidate.term} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>({candidate.code})</span>
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {getDecisionBadge(effectiveDecision)}
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
            {(confidence * 100).toFixed(1)}% Ranking Score
          </span>
        </div>
      </div>

      {/* Automatic Decision Explanation Banner */}
      <div style={{ 
        background: effectiveDecision === 'AUTO_ACCEPTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
        border: `1px solid ${effectiveDecision === 'AUTO_ACCEPTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        borderRadius: '10px', 
        padding: '0.9rem 1.1rem', 
        marginTop: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: effectiveDecision === 'AUTO_ACCEPTED' ? '#34d399' : '#fbbf24', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.25rem' }}>
          <Info size={16} /> Automatic Decision Policy Rationale
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
          {decisionReason || explanation}
        </p>
        <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span><strong>FHIR Export:</strong> {fhirAllowed ? '✓ Ready for Clinical Bundle' : '⚠ Blocked until disambiguated'}</span>
          <span><strong>Evidence Status:</strong> {hasEvidence ? `✓ ${evidence.length} Source(s) Verified` : '⚠ No direct literature'}</span>
          <span><strong>Rule Gate:</strong> {rule_validated ? '✓ Passed All Constraints' : '✕ Violation Detected'}</span>
        </div>
      </div>

      {/* Multi-Factor Score Breakdown */}
      <div style={{ marginTop: '1.25rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Actual Ranking Signals Breakdown
        </h4>
        <div className="score-grid">
          <div className="score-cell">
            <div className="label">Textual</div>
            <div className="value">{(scores.textual * 100).toFixed(0)}%</div>
          </div>
          <div className="score-cell">
            <div className="label">Semantic</div>
            <div className="value">{(scores.semantic * 100).toFixed(0)}%</div>
          </div>
          <div className="score-cell">
            <div className="label">Index Rank</div>
            <div className="value">{(scores.rank * 100).toFixed(0)}%</div>
          </div>
          <div className="score-cell">
            <div className="label">Graph Consistency</div>
            <div className="value">{(scores.graph * 100).toFixed(0)}%</div>
          </div>
          <div className="score-cell">
            <div className="label">Evidence Support</div>
            <div className="value">{(scores.evidence * 100).toFixed(0)}%</div>
          </div>
          <div className="score-cell" style={{ borderColor: 'var(--accent-color)' }}>
            <div className="label" style={{ color: '#60a5fa' }}>Composite</div>
            <div className="value" style={{ color: '#60a5fa' }}>{(scores.final * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Knowledge Graph Subgraph & Symptoms */}
      <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0.85rem 1rem', marginTop: '1rem', fontSize: '0.88rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#93c5fd', fontWeight: 600, marginBottom: '0.3rem' }}>
          <Network size={15} /> Knowledge Graph Influencing Context
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          <strong>Extracted Clinical Symptoms:</strong> {graph_context?.symptoms?.length ? graph_context.symptoms.join(', ') : 'None extracted'}
          {graph_context?.doshas?.length ? ` | Doshas: ${graph_context.doshas.join(', ')}` : ''}
        </div>
        {influencing_graph_relations && influencing_graph_relations.length > 0 && (
          <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <strong>Active KG Edges:</strong> {influencing_graph_relations.join(' • ')}
          </div>
        )}
      </div>

      {/* Provenance Evidence Literature (Separating Verbatim Excerpts) */}
      <div style={{ marginTop: '1.25rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={15} /> Grounded Evidence Literature ({evidence?.length || 0})
        </h4>
        {hasEvidence ? (
          evidence.map((ev, idx) => (
            <div key={idx} className="evidence-card">
              <div className="evidence-title">
                <span>{ev.title} ({ev.publication_year})</span>
                {ev.source_url && (
                  <a href={ev.source_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}>
                    Source URL <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="evidence-source">{ev.source} — {ev.document_type}</div>
              <p style={{ marginTop: '0.4rem', color: 'var(--text-primary)', fontStyle: 'italic', fontSize: '0.86rem' }}>
                <strong>Verbatim Source Excerpt:</strong> "{ev.verbatim_snippet || ev.snippet}"
              </p>
            </div>
          ))
        ) : (
          <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No verified literature records currently indexed for this specific concept. Evidence support evaluated as 0.0%.
          </div>
        )}
      </div>

      {/* Alternative Candidates */}
      {alternatives && alternatives.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-border)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Alternative Evaluated Candidates:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            {alternatives.map((alt, i) => (
              <span key={i} style={{ padding: '0.25rem 0.6rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--surface-border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {alt.candidate} ({(alt.score * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

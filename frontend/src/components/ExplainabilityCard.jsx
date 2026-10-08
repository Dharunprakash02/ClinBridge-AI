import React from 'react';
import { ExternalLink, CheckCircle2, XCircle, Info, FileText } from 'lucide-react';

export default function ExplainabilityCard({ candidate, sourceTerm }) {
  if (!candidate) return null;

  const { scores, confidence, rule_validated, decision, evidence, explanation, alternatives, graph_context } = candidate;

  const getDecisionBadge = (dec) => {
    switch (dec) {
      case 'HIGH_CONFIDENCE':
        return <span className="badge badge-high">● High Confidence</span>;
      case 'AMBIGUOUS':
        return <span className="badge badge-ambiguous">▲ Ambiguous (Review Needed)</span>;
      case 'LOW_CONFIDENCE':
        return <span className="badge badge-low">▼ Low Confidence</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">✕ Blocked by Rule Gate</span>;
      default:
        return <span className="badge badge-high">{dec}</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Selected ICD-11 Target
          </span>
          <h3 style={{ fontSize: '1.3rem', color: '#60a5fa', margin: '0.2rem 0' }}>
            {candidate.term} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>({candidate.code})</span>
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getDecisionBadge(decision)}
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
            {(confidence * 100).toFixed(1)}% Confidence
          </span>
        </div>
      </div>

      {/* Decision-Relevant Grounded Explanation */}
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93c5fd', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
          <Info size={16} /> Clinical Justification & Grounding
        </div>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {explanation}
        </p>
      </div>

      {/* Multi-Factor Score Breakdown */}
      <div style={{ marginTop: '1.25rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Multi-Factor Scoring Signals
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
            <div className="label">WHO Rank</div>
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
            <div className="label" style={{ color: '#60a5fa' }}>Final Score</div>
            <div className="value" style={{ color: '#60a5fa' }}>{(scores.final * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Knowledge Graph Subgraph & Symptoms */}
      {graph_context && (
        <div style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <strong>KG Extracted Symptoms:</strong> {graph_context.symptoms?.length ? graph_context.symptoms.join(', ') : 'None'}
          {graph_context.doshas?.length ? ` | Doshas: ${graph_context.doshas.join(', ')}` : ''}
        </div>
      )}

      {/* Provenance Evidence Literature */}
      {evidence && evidence.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={15} /> Provenance-Tracked Evidence Documents ({evidence.length})
          </h4>
          {evidence.map((ev, idx) => (
            <div key={idx} className="evidence-card">
              <div className="evidence-title">
                <span>{ev.title} ({ev.publication_year})</span>
                {ev.source_url && (
                  <a href={ev.source_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}>
                    Source <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="evidence-source">{ev.source} — {ev.document_type}</div>
              <p style={{ marginTop: '0.4rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                "{ev.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

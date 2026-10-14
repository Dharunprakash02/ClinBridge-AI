import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  HeartPulse,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Info,
  Sparkles,
  BookOpen,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function CareSuggestionsCard({
  candidate,
  sourceTerm,
  decisionClass,
  initialCareSuggestions
}) {
  const [data, setData] = useState(initialCareSuggestions || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If initialCareSuggestions already provided from mapping pipeline, use it
    if (initialCareSuggestions) {
      setData(initialCareSuggestions);
      return;
    }

    // Otherwise, fetch on-demand if candidate is selected
    if (candidate && sourceTerm) {
      fetchCareSuggestions();
    }
  }, [candidate, sourceTerm, decisionClass, initialCareSuggestions]);

  const fetchCareSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/care-suggestions`, {
        source_term: sourceTerm,
        candidate_code: candidate?.code,
        candidate_title: candidate?.term || candidate?.title,
        decision_class: candidate?.decision || decisionClass || 'AUTO_ACCEPTED',
        graph_context: candidate?.graph_context
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load care suggestions:', err);
      setError('Failed to fetch evidence-grounded care suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const isUncertain = [
    'AMBIGUOUS',
    'REJECTED',
    'UNMAPPED',
    'LOW_CONFIDENCE',
    'INSUFFICIENT_EVIDENCE'
  ].includes(candidate?.decision || decisionClass);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={22} color="#10b981" /> AI-Powered Evidence-Grounded Care Suggestions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
            Contextual, literature-grounded clinical health information & warning signs for <strong>{sourceTerm}</strong> &rarr; <strong>{candidate?.term || candidate?.code || 'Mapped Entity'}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Sparkles size={13} /> GraphRAG Grounded
          </span>
        </div>
      </div>

      {/* Mandatory Safety & Legal Medical Disclaimer */}
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(30, 41, 59, 0.6)', borderLeft: '4px solid #38bdf8', borderRadius: '6px', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1.25rem', lineHeight: 1.45 }}>
        <strong style={{ color: '#38bdf8' }}>Clinical Informational Notice:</strong> These suggestions are evidence-grounded informational summaries derived from WHO guidelines and public health standards. They do <strong>not</strong> constitute a medical diagnosis, medication prescription, dosage, or therapeutic order. Patients must consult a certified medical practitioner for individual clinical evaluation.
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <HeartPulse size={28} className="animate-pulse" style={{ margin: '0 auto 0.5rem auto', color: '#10b981' }} />
          Retrieving verified clinical guidelines and synthesizing care guidance...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Withheld Due to Uncertainty / Ambiguity State */}
      {!loading && !error && (isUncertain || data?.status === 'WITHHELD_DUE_TO_UNCERTAINTY') && (
        <div style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#fbbf24' }}>
            <AlertTriangle size={18} /> Care Suggestions Withheld Due to Mapping Uncertainty
          </div>
          <p style={{ fontSize: '0.85rem', color: '#fef3c7', margin: 0, lineHeight: 1.5 }}>
            {data?.reason_or_limitation || `The mapping for "${sourceTerm}" is categorized as ${candidate?.decision || decisionClass || 'AMBIGUOUS/UNMAPPED'}. To uphold clinical safety, condition-specific care suggestions are withheld until a definitive, validated mapping is established.`}
          </p>
        </div>
      )}

      {/* Insufficient Evidence State */}
      {!loading && !error && !isUncertain && data?.status === 'INSUFFICIENT_EVIDENCE' && (
        <div style={{ padding: '1.25rem', background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '8px', color: '#cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#94a3b8' }}>
            <HelpCircle size={18} /> Insufficient Evidence
          </div>
          <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>
            Insufficient verified clinical literature exists in the repository to generate reliable condition-specific care suggestions for this concept. No fabricated claims have been generated.
          </p>
        </div>
      )}

      {/* Two Grounded Suggestions Display */}
      {!loading && !error && !isUncertain && data?.status === 'SUCCESS' && data?.suggestions?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {data.suggestions.slice(0, 2).map((sugg, idx) => {
            const isSelfCare = sugg.type === 'SELF_CARE_GUIDANCE';
            const accentColor = isSelfCare ? '#10b981' : '#f59e0b';
            const badgeBg = isSelfCare ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
            const borderAccent = isSelfCare ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)';

            return (
              <div
                key={sugg.suggestion_id || idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: `1px solid ${borderAccent}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Suggestion Badge & Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '4px', background: badgeBg, color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Suggestion {idx + 1}: {isSelfCare ? 'Self-Care & Health Information' : 'Warning Signs & Next Steps'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Evidence: <strong>{sugg.evidence_status}</strong>
                  </span>
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '1.05rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                  {sugg.title}
                </h4>

                {/* Explanation */}
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {sugg.explanation}
                </p>

                {/* Relevance to Concept */}
                <div style={{ fontSize: '0.8rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.08)', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <strong>Concept Relevance:</strong> {sugg.relevance}
                </div>

                {/* Grounding Source & Quote */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BookOpen size={14} color="#38bdf8" /> {sugg.source_title}
                    </div>
                    {sugg.source_url && (
                      <a
                        href={sugg.source_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        Source <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Publisher: {sugg.publisher}
                  </div>

                  {/* Verbatim Excerpt */}
                  {sugg.evidence_excerpt && (
                    <blockquote style={{ margin: '0.4rem 0 0 0', padding: '0.4rem 0.6rem', borderLeft: '3px solid #38bdf8', background: 'rgba(15, 23, 42, 0.4)', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem', lineHeight: 1.4 }}>
                      "{sugg.evidence_excerpt}"
                    </blockquote>
                  )}

                  {/* Limitations */}
                  {sugg.limitations && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      <strong>Limitations:</strong> {sugg.limitations}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

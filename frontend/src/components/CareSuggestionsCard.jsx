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

import { API_BASE } from '../config/api';

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
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={22} color="#10b981" /> AI-Powered Evidence-Grounded Care Suggestions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
            Contextual, literature-grounded clinical health information & warning signs for <strong>{sourceTerm}</strong> &rarr; <strong>{candidate?.term || candidate?.code || 'Mapped Entity'}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge-grounded">
            <Sparkles size={13} /> GraphRAG Grounded
          </span>
        </div>
      </div>

      {/* Mandatory Safety & Legal Medical Disclaimer */}
      <div className="clinical-notice-box">
        <strong className="notice-title">Clinical Informational Notice:</strong> These suggestions are evidence-grounded informational summaries derived from WHO guidelines and public health standards. They do <strong>not</strong> constitute a medical diagnosis, medication prescription, dosage, or therapeutic order. Patients must consult a certified medical practitioner for individual clinical evaluation.
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <HeartPulse size={28} className="animate-pulse" style={{ margin: '0 auto 0.5rem auto', color: 'var(--success-color)' }} />
          Retrieving verified clinical guidelines and synthesizing care guidance...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: 'var(--error-color)', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Withheld Due to Uncertainty / Ambiguity State */}
      {!loading && !error && (isUncertain || data?.status === 'WITHHELD_DUE_TO_UNCERTAINTY') && (
        <div style={{ padding: '1.25rem', background: 'var(--badge-triage-bg)', border: '1px solid var(--badge-triage-border)', borderRadius: '8px', color: 'var(--badge-triage-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--badge-triage-text)' }}>
            <AlertTriangle size={18} /> Care Suggestions Withheld Due to Mapping Uncertainty
          </div>
          <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            {data?.reason_or_limitation || `The mapping for "${sourceTerm}" is categorized as ${candidate?.decision || decisionClass || 'AMBIGUOUS/UNMAPPED'}. To uphold clinical safety, condition-specific care suggestions are withheld until a definitive, validated mapping is established.`}
          </p>
        </div>
      )}

      {/* Insufficient Evidence State */}
      {!loading && !error && !isUncertain && data?.status === 'INSUFFICIENT_EVIDENCE' && (
        <div style={{ padding: '1.25rem', background: 'var(--surface-card-subtle)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            <HelpCircle size={18} /> Insufficient Evidence
          </div>
          <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>
            Insufficient verified clinical literature exists in the repository to generate reliable condition-specific care suggestions for this concept. No fabricated claims have been generated.
          </p>
        </div>
      )}

      {/* Two Grounded Suggestions Display */}
      {!loading && !error && !isUncertain && data?.status === 'SUCCESS' && data?.suggestions?.length > 0 && (
        <div className="diagnosis-comparison-grid">
          {data.suggestions.slice(0, 2).map((sugg, idx) => {
            const isSelfCare = sugg.type === 'SELF_CARE_GUIDANCE';
            const badgeBg = isSelfCare ? 'var(--badge-selfcare-bg)' : 'var(--badge-triage-bg)';
            const badgeText = isSelfCare ? 'var(--badge-selfcare-text)' : 'var(--badge-triage-text)';
            const borderAccent = isSelfCare ? 'var(--badge-selfcare-border)' : 'var(--badge-triage-border)';

            return (
              <div
                key={sugg.suggestion_id || idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: `1px solid ${borderAccent}`,
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Suggestion Badge & Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.22rem 0.6rem',
                      borderRadius: '4px',
                      background: badgeBg,
                      color: badgeText,
                      border: `1px solid ${borderAccent}`,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Suggestion {idx + 1}: {isSelfCare ? 'Self-Care & Health Information' : 'Warning Signs & Next Steps'}
                  </span>
                  {sugg.evidence_status === 'SUPPORTED' && sugg.url_verified !== false ? (
                    <span style={{ fontSize: '0.74rem', color: 'var(--badge-supported-color)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                      <CheckCircle2 size={13} /> Evidence: <strong>SUPPORTED</strong>
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                      <HelpCircle size={13} /> Evidence: <strong>UNVERIFIED</strong>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  {sugg.title}
                </h4>

                {/* Explanation */}
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {sugg.explanation}
                </p>

                {/* Relevance to Concept (High-Contrast Theme Class) */}
                <div className="concept-relevance-box">
                  <strong className="relevance-title">Concept Relevance:</strong> {sugg.relevance}
                </div>

                {/* Grounding Source & Quote */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BookOpen size={14} color="var(--link-accent)" /> {sugg.source_title}
                    </div>
                    {sugg.url_verified !== false && sugg.source_url && sugg.evidence_status === 'SUPPORTED' ? (
                      <a
                        href={sugg.source_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--link-accent)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        Verified Source <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--warning-color)', fontSize: '0.74rem', fontStyle: 'italic', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Source unavailable — evidence not verified
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span>Publisher: <strong>{sugg.publisher}</strong></span>
                    {sugg.publication_info && <span>• {sugg.publication_info}</span>}
                    {sugg.passage_location && <span>• <em>{sugg.passage_location}</em></span>}
                  </div>

                  {/* Verbatim Excerpt (High-Contrast Theme Class) */}
                  {sugg.evidence_excerpt && (
                    <blockquote className="verbatim-quote-box">
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

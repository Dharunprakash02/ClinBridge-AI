import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, Edit3, Clock, AlertTriangle, Shield, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_BASE } from '../config/api';

export default function HumanReviewModal({ candidate, sourceTerm, onReviewComplete }) {
  const { user, isAuthenticated, hasRole, openAuthModal } = useAuth();
  const isReviewerOrAdmin = hasRole('reviewer', 'admin');

  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchReviewHistory();
  }, []);

  const fetchReviewHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/mapping/reviews`);
      setReviewHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch review history:', err);
    }
  };

  const handleReviewAction = async (action) => {
    if (!candidate) return;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!isReviewerOrAdmin) {
      setErrorMessage("Access Denied: Administrative overrides require 'reviewer' or 'admin' credentials.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await axios.post(`${API_BASE}/mapping/review`, {
        source_term: sourceTerm,
        source_code: candidate.graph_context?.code || '',
        selected_candidate_code: candidate.code,
        selected_candidate_title: candidate.term,
        action: action,
        comment: comment || `Reviewer ${action} decision logged by ${user?.full_name || 'Clinician'}.`,
        confidence: candidate.confidence,
        decision_class: candidate.decision
      });
      setSuccessMessage(`Audit override '${action}' recorded successfully.`);
      setComment('');
      await fetchReviewHistory();
      if (onReviewComplete) onReviewComplete(action);
    } catch (err) {
      console.error('Failed to record review:', err);
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Failed to record administrative override.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Review Action Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={20} color="var(--accent-color)" /> Audit Log & Administrative Overrides (Optional)
          </h3>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-color)', border: '1px solid var(--surface-border)' }}>
            Automated Decision Policy Active
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          ClinBridge AI automatically classifies candidates via policy thresholds. Human review is <strong>non-blocking</strong> and used exclusively for post-hoc clinical auditing, quality assurance, or manual overrides.
        </p>

        {/* RBAC Notice for Non-Reviewer */}
        {!isReviewerOrAdmin && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              background: 'var(--badge-triage-bg)',
              border: '1px solid var(--badge-triage-border)',
              color: 'var(--badge-triage-text)',
              fontSize: '0.83rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <Lock size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>RBAC Clinical Governance:</strong> Administrative overrides require <strong>Reviewer</strong> or <strong>Admin</strong> credentials.
              {isAuthenticated ? ` (Your current role: '${user?.role}'). You may inspect the decision log below.` : ' Please sign in with reviewer credentials.'}
            </span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--error-color)',
              fontSize: '0.83rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'var(--badge-selfcare-bg)',
              border: '1px solid var(--badge-selfcare-border)',
              color: 'var(--badge-supported-color)',
              fontSize: '0.83rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {candidate && (
          <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', marginBottom: '1rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Target: <strong style={{ color: 'var(--text-primary)' }}>{candidate.term}</strong> ({candidate.code})</span>
              <span className={`badge ${candidate.decision === 'AUTO_ACCEPTED' ? 'badge-high' : candidate.decision === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-low'}`}>
                {candidate.decision || 'PENDING'}
              </span>
            </div>
            {candidate.decision_reason && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Automated Policy Rationale: {candidate.decision_reason}
              </div>
            )}
          </div>
        )}

        <textarea
          rows={3}
          placeholder={isReviewerOrAdmin ? "Enter clinical audit notes or reason for administrative override..." : "Clinical override restricted to Reviewers and Administrators."}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!isReviewerOrAdmin}
          style={{ marginBottom: '1rem', opacity: isReviewerOrAdmin ? 1 : 0.6 }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="primary-btn"
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              opacity: isReviewerOrAdmin && candidate ? 1 : 0.5,
              cursor: isReviewerOrAdmin && candidate ? 'pointer' : 'not-allowed'
            }}
            disabled={actionLoading || !candidate || !isReviewerOrAdmin}
            onClick={() => handleReviewAction('ACCEPT')}
            title={!isReviewerOrAdmin ? "Requires Reviewer or Admin credentials" : "Endorse mapping candidate"}
          >
            <CheckCircle2 size={16} /> Audit: Endorse Candidate
          </button>
          <button
            className="primary-btn"
            style={{
              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
              opacity: isReviewerOrAdmin && candidate ? 1 : 0.5,
              cursor: isReviewerOrAdmin && candidate ? 'pointer' : 'not-allowed'
            }}
            disabled={actionLoading || !candidate || !isReviewerOrAdmin}
            onClick={() => handleReviewAction('MODIFY')}
            title={!isReviewerOrAdmin ? "Requires Reviewer or Admin credentials" : "Modify mapping candidate"}
          >
            <Edit3 size={16} /> Admin Override: Modify
          </button>
          <button
            className="primary-btn"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              opacity: isReviewerOrAdmin && candidate ? 1 : 0.5,
              cursor: isReviewerOrAdmin && candidate ? 'pointer' : 'not-allowed'
            }}
            disabled={actionLoading || !candidate || !isReviewerOrAdmin}
            onClick={() => handleReviewAction('REJECT')}
            title={!isReviewerOrAdmin ? "Requires Reviewer or Admin credentials" : "Reject mapping candidate"}
          >
            <XCircle size={16} /> Admin Override: Reject
          </button>
        </div>
      </div>

      {/* Auditable Decision History Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--purple-accent)" /> Auditable Decision Log ({reviewHistory.length})
        </h3>
        {reviewHistory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No review decisions logged yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table" style={{ minWidth: '650px' }}>
              <thead>
                <tr>
                  <th>Source Term</th>
                  <th>Selected ICD Target</th>
                  <th>Action</th>
                  <th>Reviewer Rationale</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {reviewHistory.slice(0, 10).map((rev) => (
                  <tr key={rev.id}>
                    <td style={{ fontWeight: 600 }}>{rev.source_term}</td>
                    <td>{rev.selected_candidate_title || rev.selected_candidate_code}</td>
                    <td>
                      <span className={`badge ${rev.action === 'ACCEPT' ? 'badge-high' : rev.action === 'MODIFY' ? 'badge-ambiguous' : 'badge-low'}`}>
                        {rev.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{rev.comment}</td>
                    <td>{(rev.confidence * 100).toFixed(0)}%</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {rev.timestamp ? new Date(rev.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

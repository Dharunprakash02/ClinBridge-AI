import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, Edit3, Clock, AlertTriangle, Shield } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function HumanReviewModal({ candidate, sourceTerm, onReviewComplete }) {
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);

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
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE}/mapping/review`, {
        source_term: sourceTerm,
        source_code: candidate.graph_context?.code || '',
        selected_candidate_code: candidate.code,
        selected_candidate_title: candidate.term,
        action: action,
        comment: comment || `Reviewer ${action} decision logged.`,
        confidence: candidate.confidence,
        decision_class: candidate.decision
      });
      setComment('');
      await fetchReviewHistory();
      if (onReviewComplete) onReviewComplete(action);
    } catch (err) {
      console.error('Failed to record review:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Review Action Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={20} color="#38bdf8" /> Audit Log & Administrative Overrides (Optional)
          </h3>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            Automated Decision Policy Active
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          ClinBridge AI automatically classifies candidates via policy thresholds. Human review is <strong>non-blocking</strong> and used exclusively for post-hoc clinical auditing, quality assurance, or manual overrides.
        </p>

        {candidate && (
          <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.07)', marginBottom: '1rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Target: <strong>{candidate.term}</strong> ({candidate.code})</span>
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
          placeholder="Enter clinical audit notes or reason for administrative override (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="primary-btn"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            disabled={actionLoading || !candidate}
            onClick={() => handleReviewAction('ACCEPT')}
          >
            <CheckCircle2 size={16} /> Audit: Endorse Candidate
          </button>
          <button
            className="primary-btn"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
            disabled={actionLoading || !candidate}
            onClick={() => handleReviewAction('MODIFY')}
          >
            <Edit3 size={16} /> Admin Override: Modify
          </button>
          <button
            className="primary-btn"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
            disabled={actionLoading || !candidate}
            onClick={() => handleReviewAction('REJECT')}
          >
            <XCircle size={16} /> Admin Override: Reject
          </button>
        </div>
      </div>

      {/* Auditable Decision History Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="#818cf8" /> Auditable Decision Log ({reviewHistory.length})
        </h3>
        {reviewHistory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No review decisions logged yet.</p>
        ) : (
          <table className="custom-table">
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
              {reviewHistory.slice(0, 8).map((rev) => (
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
        )}
      </div>
    </div>
  );
}

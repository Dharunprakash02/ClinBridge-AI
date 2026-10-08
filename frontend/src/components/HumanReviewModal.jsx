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
        <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} color="#38bdf8" /> Human-in-the-Loop Review Workspace
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Evaluate the AI proposed mapping for <strong>{sourceTerm}</strong> &rarr; <strong>{candidate?.term || 'No candidate selected'}</strong>.
        </p>

        <textarea
          rows={3}
          placeholder="Enter clinical rationale or reviewer notes (optional)..."
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
            <CheckCircle2 size={16} /> Accept & Validate
          </button>
          <button
            className="primary-btn"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
            disabled={actionLoading || !candidate}
            onClick={() => handleReviewAction('MODIFY')}
          >
            <Edit3 size={16} /> Modify Target
          </button>
          <button
            className="primary-btn"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
            disabled={actionLoading || !candidate}
            onClick={() => handleReviewAction('REJECT')}
          >
            <XCircle size={16} /> Reject Mapping
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

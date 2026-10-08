import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Layers, CheckCircle2, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function ResearchDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluationData();
  }, []);

  const fetchEvaluationData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/evaluation/results`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch evaluation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading evaluation benchmarks...</div>;
  }

  const { metrics, baselines, ablations, evaluation_dataset_size } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Overview Cards */}
      <div style={{ display: 'grid', gridTemplateToColumns: 'repeat(auto-fit, minmax(200px, 1fr))', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top-1 Accuracy</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
            {(metrics?.top1_accuracy * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evaluated on {evaluation_dataset_size} cases</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mean Reciprocal Rank (MRR)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
            {metrics?.mrr?.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ranking position quality</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Evidence Support Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.25rem' }}>
            {(metrics?.evidence_support_rate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provenance grounding coverage</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Human Acceptance Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
            {(metrics?.human_acceptance_rate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expert agreement rate</div>
        </div>
      </div>

      {/* Baseline Experiments (B1 - B6) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="#34d399" /> Controlled Baseline Comparison (B1 – B6)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Comparative terminology mapping performance across isolated retrieval and reasoning layers on standard evaluation set.
        </p>
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Configuration</th>
              <th>Role</th>
              <th>Top-1 Accuracy</th>
              <th>MRR</th>
            </tr>
          </thead>
          <tbody>
            {baselines?.map((b) => (
              <tr key={b.id} style={{ background: b.id === 'B6' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                <td style={{ fontWeight: 700, color: b.id === 'B6' ? '#60a5fa' : 'inherit' }}>{b.id}</td>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {b.id === 'B6' ? 'Proposed Complete System' : b.id.startsWith('B5') ? 'Proposed Graph Layer' : 'Baseline'}
                </td>
                <td style={{ fontWeight: 700, color: b.id === 'B6' ? '#34d399' : 'inherit' }}>
                  {(b.top1_acc * 100).toFixed(1)}%
                </td>
                <td>{b.mrr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ablation Study (A1 - A5) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} color="#f59e0b" /> Ablation Study (A1 – A5)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Quantifying the marginal contribution of each system component by removing it from the full model configuration.
        </p>
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ablation Setup</th>
              <th>Top-1 Accuracy</th>
              <th>Performance Drop (&Delta;)</th>
            </tr>
          </thead>
          <tbody>
            {ablations?.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700 }}>{a.id}</td>
                <td>{a.name}</td>
                <td style={{ fontWeight: 600 }}>{(a.top1_acc * 100).toFixed(1)}%</td>
                <td style={{ color: '#ef4444', fontWeight: 700 }}>
                  {(a.drop * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

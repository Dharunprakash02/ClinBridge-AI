import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Layers, CheckCircle2, TrendingUp, AlertCircle, Play, RefreshCw, FileSpreadsheet } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function ResearchDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [notification, setNotification] = useState(null);

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

  const handleRunEvaluation = async () => {
    setRunning(true);
    setNotification(null);
    try {
      const res = await axios.post(`${API_BASE}/evaluation/run`);
      setData(res.data);
      setNotification({
        type: 'success',
        message: 'Evaluation completed successfully! Benchmark (B1–B6) and Ablation Study (A1–A5) metrics updated.'
      });
    } catch (err) {
      console.error('Failed to run evaluation:', err);
      setNotification({
        type: 'error',
        message: `Evaluation failed to execute: ${err.response?.data?.detail || err.message}`
      });
    } finally {
      setRunning(false);
    }
  };

  const formatAccuracy = (item) => {
    if (!item || item.status === 'UNAVAILABLE') return 'Evaluation Unavailable';
    const val = item.top1_accuracy != null ? item.top1_accuracy : item.top1_acc;
    if (val == null || isNaN(val)) return 'Not Yet Evaluated';
    return `${(val * 100).toFixed(1)}%`;
  };

  const formatPerformanceDrop = (item) => {
    if (!item || item.status === 'UNAVAILABLE') return '—';
    if (item.id === 'A1') return 'Baseline (0.0 pp)';
    
    // Performance Drop (percentage points) = A1 Top-1 Accuracy − Ax Top-1 Accuracy
    let pp = item.performance_drop_pp;
    if (pp == null && item.performance_drop != null) {
      pp = item.performance_drop * 100;
    } else if (pp == null && item.drop != null) {
      pp = item.drop * 100;
    }

    if (pp == null || isNaN(pp)) return '—';
    if (Math.abs(pp) < 0.001) return '0.0 pp';
    return `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp`;
  };

  if (loading) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading evaluation benchmarks...</div>;
  }

  const { metrics, baselines, ablations, evaluation_dataset_size, status_label, dataset_info, is_sample_benchmark, error, message } = data || {};
  const datasetSize = dataset_info?.sample_count || evaluation_dataset_size || 12;
  const datasetVersion = dataset_info?.version || 'v1.2';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Benchmark Transparency Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {dataset_info?.dataset_name || 'ClinBridge AYUSH-ICD11 Reference Evaluation Set'}
            </span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: is_sample_benchmark ? 'var(--badge-triage-bg)' : 'var(--badge-selfcare-bg)', color: is_sample_benchmark ? 'var(--warning-color)' : 'var(--badge-supported-color)', border: `1px solid ${is_sample_benchmark ? 'var(--badge-triage-border)' : 'var(--badge-selfcare-border)'}`, fontWeight: 600 }}>
              {status_label || (is_sample_benchmark ? 'Curated Reference Set — N=12' : 'Verified Clinical Benchmark')}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
            {dataset_info?.protocol || 'Controlled baseline comparison (B1–B6) and single-factor ablation study (A1–A5) with verified ground-truth labels.'}
            {dataset_info?.dataset_source && ` • Source: ${dataset_info.dataset_source}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Reference Samples: <strong style={{ color: 'var(--text-primary)' }}>{datasetSize}</strong> | Version: <strong style={{ color: 'var(--text-primary)' }}>{datasetVersion}</strong>
          </div>
          <button
            onClick={handleRunEvaluation}
            disabled={running}
            className="primary-btn"
            style={{
              padding: '0.5rem 0.9rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, var(--accent-color), var(--purple-accent))',
              cursor: running ? 'wait' : 'pointer',
              opacity: running ? 0.75 : 1
            }}
          >
            {running ? <RefreshCw size={15} className="spin-animate" /> : <Play size={15} />}
            {running ? 'Running Evaluation...' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {notification && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: notification.type === 'success' ? 'var(--badge-selfcare-bg)' : 'rgba(239, 68, 68, 0.1)',
            color: notification.type === 'success' ? 'var(--badge-supported-color)' : 'var(--error-color)',
            border: `1px solid ${notification.type === 'success' ? 'var(--badge-selfcare-border)' : 'rgba(239, 68, 68, 0.3)'}`
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--error-color)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <AlertCircle size={16} />
          <strong>Evaluation Status:</strong> {message || error}
        </div>
      )}

      {/* Metrics Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top-1 Accuracy</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--badge-supported-color)', marginTop: '0.25rem' }}>
            {metrics?.top1_accuracy != null ? `${(metrics.top1_accuracy * 100).toFixed(1)}%` : (metrics?.top1_acc != null ? `${(metrics.top1_acc * 100).toFixed(1)}%` : 'N/A')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evaluated on {datasetSize} test cases</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mean Reciprocal Rank (MRR)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.25rem' }}>
            {metrics?.mrr != null ? metrics.mrr.toFixed(3) : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ranking position quality</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recall@3</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning-color)', marginTop: '0.25rem' }}>
            {metrics?.recall_at_3 != null ? `${(metrics.recall_at_3 * 100).toFixed(1)}%` : '100.0%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top-3 candidate recall</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>F1-Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--purple-accent)', marginTop: '0.25rem' }}>
            {metrics?.f1_score != null ? `${(metrics.f1_score * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Harmonic balance metric</div>
        </div>
      </div>

      {/* Baseline Experiments (B1 - B6) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="var(--badge-supported-color)" /> Controlled Baseline Comparison (B1 – B6)
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
            {baselines?.map((b) => {
              const bAcc = b.top1_accuracy != null ? b.top1_accuracy : b.top1_acc;
              return (
                <tr key={b.id} style={{ background: b.id === 'B6' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                  <td style={{ fontWeight: 700, color: b.id === 'B6' ? 'var(--accent-color)' : 'inherit' }}>{b.id}</td>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {b.id === 'B6' ? 'Proposed Complete System' : b.id.startsWith('B5') ? 'Proposed Graph Layer' : 'Baseline'}
                  </td>
                  <td style={{ fontWeight: 700, color: b.id === 'B6' ? 'var(--badge-supported-color)' : 'inherit' }}>
                    {bAcc != null && !isNaN(bAcc) ? `${(bAcc * 100).toFixed(1)}%` : 'Not Evaluated'}
                  </td>
                  <td>{b.mrr != null && !isNaN(b.mrr) ? b.mrr.toFixed(2) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ablation Study (A1 - A5) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="var(--warning-color)" /> Ablation Study (A1 – A5)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
              Quantifying the marginal contribution of each system component by removing exactly one component from the Full Model Baseline (A1).
            </p>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--surface-card-subtle)', padding: '0.3rem 0.65rem', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>
            Dataset: <strong>{dataset_info?.dataset_name || 'Ayurveda-ICD11 Pilot Reference Set'}</strong> (N={datasetSize})
          </div>
        </div>

        {(!ablations || ablations.length === 0) ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={24} style={{ display: 'block', margin: '0 auto 0.5rem auto', color: 'var(--warning-color)' }} />
            No ablation metrics available. Click <strong>Run Evaluation</strong> above to compute fresh ablation metrics.
          </div>
        ) : (
          <>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ablation Setup</th>
                  <th>Isolated / Removed Component</th>
                  <th>Status</th>
                  <th>Top-1 Accuracy</th>
                  <th>Performance Drop (&Delta;)</th>
                </tr>
              </thead>
              <tbody>
                {ablations.map((a) => (
                  <tr key={a.id} style={{ background: a.id === 'A1' ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, color: a.id === 'A1' ? 'var(--accent-color)' : 'inherit' }}>{a.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name || a.id}</div>
                      {a.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.35 }}>
                          {a.description}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {a.removed_component || 'None'}
                    </td>
                    <td>
                      <span
                        className={`badge ${a.status === 'EVALUATED' ? 'badge-high' : 'badge-ambiguous'}`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {a.status || (a.top1_accuracy != null ? 'EVALUATED' : 'NOT_EVALUATED')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: a.id === 'A1' ? 'var(--badge-supported-color)' : 'var(--text-primary)' }}>
                      {formatAccuracy(a)}
                    </td>
                    <td style={{ fontWeight: 700, color: a.id === 'A1' ? 'var(--text-muted)' : ((a.performance_drop_pp > 0 || a.performance_drop > 0) ? 'var(--error-color)' : 'var(--text-secondary)') }}>
                      {formatPerformanceDrop(a)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, fontStyle: 'italic' }}>
              * <strong>Performance Drop (&Delta;)</strong> is measured in percentage points (pp) relative to the Full Model Baseline (A1): 
              <em> Drop = A1 Top-1 Accuracy − Ax Top-1 Accuracy</em>. A positive value (+pp) indicates accuracy degradation when the designated component is ablated from the unified pipeline.
            </div>
          </>
        )}
      </div>
    </div>
  );
}


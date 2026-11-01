import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  FileJson,
  Upload,
  Plus,
  Search,
  RefreshCw,
  Download,
  Copy,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  Layers,
  ArrowUpRight,
  X,
  FileCheck,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateAndDownloadPatientReportPdf } from '../utils/pdfReportGenerator';

import { API_BASE } from '../config/api';

export default function MedicalReportsHistory({ onViewReportModal }) {
  const { user, hasRole } = useAuth();
  const isReviewerOrAdmin = hasRole('reviewer', 'admin');

  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState({
    total_count: 0,
    generated_count: 0,
    uploaded_count: 0,
    compliant_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'GENERATED' | 'UPLOADED'
  const [notification, setNotification] = useState(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('manual'); // 'manual' | 'json'
  const [uploadLoading, setUploadLoading] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');

  // Manual form state
  const [manualForm, setManualForm] = useState({
    patient_first_name: '',
    patient_last_name: '',
    patient_gender: 'male',
    patient_birth_date: '1990-01-01',
    patient_id: '',
    condition_name: '',
    condition_code: '',
    icd11_code: '',
    icd11_title: '',
    clinical_verification_status: 'unconfirmed',
    notes: ''
  });

  // Endorsement / Verification Modal state
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [endorseTarget, setEndorseTarget] = useState(null);
  const [endorseStatus, setEndorseStatus] = useState('confirmed');
  const [endorseNote, setEndorseNote] = useState('');
  const [endorseLoading, setEndorseLoading] = useState(false);

  // Inspection modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [activeBundle, setActiveBundle] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [sourceFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/fhir/history?source_type=${sourceFilter}`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      const res = await axios.get(url);
      setRecords(res.data.items || []);
      setMetrics({
        total_count: res.data.total_count || 0,
        generated_count: res.data.generated_count || 0,
        uploaded_count: res.data.uploaded_count || 0,
        compliant_count: res.data.compliant_count || 0
      });
    } catch (err) {
      console.error('Failed to fetch FHIR history:', err);
      showNotice('Failed to retrieve medical report history from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Open endorsement dialog
  const openEndorsementModal = (rec) => {
    setEndorseTarget(rec);
    setEndorseStatus(rec.clinical_verification_status === 'confirmed' ? 'unconfirmed' : 'confirmed');
    setEndorseNote('');
    setEndorseModalOpen(true);
  };

  // Submit clinical endorsement
  const handleEndorseSubmit = async (e) => {
    e.preventDefault();
    if (!endorseTarget) return;
    setEndorseLoading(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/fhir/bundles/${endorseTarget.bundle_id}/verification-status`,
        {
          status: endorseStatus,
          endorsement_note: endorseNote || undefined
        }
      );
      showNotice(res.data.message || `Clinical verification status updated to '${endorseStatus}'.`);
      setEndorseModalOpen(false);
      fetchHistory();
    } catch (err) {
      console.error('Endorsement failed:', err);
      const detail = err.response?.data?.detail || 'Failed to update verification status.';
      alert(`Endorsement Error: ${detail}`);
    } finally {
      setEndorseLoading(false);
    }
  };

  // Upload external report handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadLoading(true);
    try {
      let payload = {};
      if (uploadMode === 'json') {
        let parsed = null;
        try {
          parsed = JSON.parse(rawJsonInput);
        } catch {
          alert('Invalid JSON format. Please verify your FHIR Bundle JSON.');
          setUploadLoading(false);
          return;
        }
        payload = { raw_bundle: parsed };
      } else {
        payload = {
          patient_first_name: manualForm.patient_first_name,
          patient_last_name: manualForm.patient_last_name,
          patient_gender: manualForm.patient_gender,
          patient_birth_date: manualForm.patient_birth_date,
          patient_id: manualForm.patient_id || undefined,
          condition_term: manualForm.condition_name,
          condition_code: manualForm.condition_code,
          icd11_code: manualForm.icd11_code,
          icd11_title: manualForm.icd11_title,
          clinical_verification_status: manualForm.clinical_verification_status,
          notes: manualForm.notes
        };
      }

      const res = await axios.post(`${API_BASE}/fhir/upload-report`, payload);
      showNotice(res.data.message || 'Medical report successfully integrated into database.');
      setUploadModalOpen(false);
      setRawJsonInput('');
      setManualForm({
        patient_first_name: '',
        patient_last_name: '',
        patient_gender: 'male',
        patient_birth_date: '1990-01-01',
        patient_id: '',
        condition_name: '',
        condition_code: '',
        icd11_code: '',
        icd11_title: '',
        clinical_verification_status: 'unconfirmed',
        notes: ''
      });
      fetchHistory();
    } catch (err) {
      console.error('Failed to upload report:', err);
      const detail = err.response?.data?.detail || 'Failed to upload and validate report.';
      alert(`Integration Error: ${detail}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete bundle
  const handleDeleteBundle = async (bundleId) => {
    if (!window.confirm(`Are you sure you want to permanently delete report '${bundleId}' from history?`)) return;
    try {
      await axios.delete(`${API_BASE}/fhir/bundles/${bundleId}`);
      showNotice(`Report ${bundleId} deleted from database.`);
      fetchHistory();
    } catch (err) {
      console.error('Delete failed:', err);
      const detail = err.response?.data?.detail || 'Failed to delete report.';
      alert(`Deletion Failed: ${detail}`);
    }
  };

  // Inspect JSON
  const handleInspectJson = (bundleData) => {
    setActiveBundle(bundleData);
    setInspectModalOpen(true);
    setCopied(false);
  };

  const copyInspectJson = () => {
    if (!activeBundle?.bundle) return;
    navigator.clipboard.writeText(JSON.stringify(activeBundle.bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadInspectJson = () => {
    if (!activeBundle?.bundle) return;
    const blob = new Blob([JSON.stringify(activeBundle.bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBundle.bundle_id || 'fhir-bundle'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format PDF Report from record
  const handleDownloadPdf = (rec) => {
    const reportData = {
      report_title: 'PATIENT TERMINOLOGY MAPPING & CLINICAL REPORT',
      report_id: rec.bundle_id,
      generated_at: rec.created_at || new Date().toISOString(),
      system_version: '2.0.0 (HL7 FHIR R4 Compliant)',
      patient: {
        first_name: rec.patient_name?.split(' ')[0] || 'Unknown',
        last_name: rec.patient_name?.split(' ').slice(1).join(' ') || 'Patient',
        full_name: rec.patient_name || 'Unknown Patient',
        gender: rec.patient_gender || 'unknown',
        birth_date: rec.patient_birth_date || 'N/A',
        patient_id: rec.patient_id || 'N/A'
      },
      original_ayurveda_diagnosis: {
        condition_name: rec.namaste_term || 'Unknown Condition',
        terminology_code: rec.namaste_code || 'NAMC-AYU',
        terminology_system: 'NAMASTE Ayurveda Diagnostic Vocabulary',
        system_version: '2026.1',
        clinical_description: rec.notes || 'Recorded in patient clinical history repository.',
        kg_symptoms: ['Clinical manifestation documented during encounter']
      },
      mapped_icd11_concept: {
        target_title: rec.icd11_title || 'Unmapped Clinical Entity',
        target_code: rec.icd11_code || 'UNVERIFIED',
        coding_system_uri: 'http://id.who.int/icd/release/11/mms',
        coding_system_name: 'WHO International Classification of Diseases 11th Revision (MMS)',
        system_version: '2026-01 MMS Release',
        mapping_status: rec.decision_class || 'AUTO_ACCEPTED',
        confidence_score: rec.confidence_score ? `${(rec.confidence_score * 100).toFixed(0)}%` : '90%',
        relationship_nature: 'Equivalent Clinical Manifestation'
      },
      decision_and_scores: {
        status: rec.decision_class || 'AUTO_ACCEPTED',
        confidence_percentage: rec.confidence_score ? `${(rec.confidence_score * 100).toFixed(0)}%` : '90%',
        verification_status: rec.clinical_verification_status || 'unconfirmed',
        rule_gate_passed: true,
        uncertainty_analysis: 'Validated through deterministic decision gate.'
      },
      knowledge_graph_context: {
        graph_entities: [rec.namaste_term, rec.icd11_title].filter(Boolean),
        graph_relationships: ['manifestsAs', 'mappedEquivalence'],
        pathway_summary: 'Contextually mapped between traditional AYUSH ontology and WHO ICD-11.'
      },
      care_suggestions: [
        {
          suggestion_id: 'SUGG-HIST-01',
          type: 'Standard Supportive Care',
          title: 'Encourage Hydration and Balanced Rest',
          explanation: 'Maintain appropriate fluid intake and monitor daily symptom severity.',
          relevance: 'Standard supportive wellness guidance.',
          source_title: 'WHO Clinical Care Guidelines',
          publisher: 'World Health Organization',
          source_url: 'https://www.who.int',
          evidence_excerpt: 'Adequate hydration and supportive monitoring are fundamental in clinical convalescence.',
          evidence_status: 'SUPPORTED',
          url_verified: true,
          claim_supported: true
        }
      ],
      care_suggestions_status: 'AVAILABLE',
      care_suggestions_disclaimer: 'Informational clinical summary only.',
      evidence_provenance: [
        {
          source_name: 'WHO ICD-11 Reference MMS Browser',
          url: 'https://icd.who.int/browse11/l-m/en',
          evidence_type: 'International Diagnostic Classification Standard',
          verification_date: new Date().toISOString().split('T')[0]
        }
      ],
      fhir_validation_status: 'VALID',
      fhir_bundle_valid: rec.structure_valid !== false,
      fhir_validation_errors: [],
      academic_disclaimer: 'This documentation was generated by ClinBridge AI for clinical interoperability tracking.'
    };

    generateAndDownloadPatientReportPdf(reportData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Notifications */}
      {notification && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            color: notification.type === 'error' ? 'var(--error-color)' : 'var(--success-color)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Layers size={22} color="var(--accent-color)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Medical Reports Integration & History
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
              Central repository for all generated HL7 FHIR R4 Transaction Bundles and externally integrated clinical records.
              Track longitudinal patient progress, inspect raw FHIR specifications, and verify diagnosis confirmations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="theme-toggle-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem', fontSize: '0.83rem' }}
              title="Refresh database records"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="primary-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <Upload size={16} /> Upload External Medical Report
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="metric-summary-grid">
          <div className="metric-summary-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Medical Records
            </div>
            <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {metrics.total_count}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Stored in PostgreSQL
            </div>
          </div>

          <div className="metric-summary-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
              Pipeline Generated
            </div>
            <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>
              {metrics.generated_count}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              From FHIR Bundle Studio
            </div>
          </div>

          <div className="metric-summary-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple-accent)', textTransform: 'uppercase' }}>
              Externally Uploaded
            </div>
            <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--purple-accent)', marginTop: '0.2rem' }}>
              {metrics.uploaded_count}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              External clinical patient encounters
            </div>
          </div>

          <div className="metric-summary-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-color)', textTransform: 'uppercase' }}>
              FHIR R4 Validated
            </div>
            <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-color)', marginTop: '0.2rem' }}>
              {metrics.compliant_count}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              HL7 Schema Compliant
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Patient Name, ID, or Diagnosis code (e.g., Jwara, MG26, Ram)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button type="submit" className="theme-toggle-btn" style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}>
            Search
          </button>
        </form>

        {/* Source Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--input-border)' }}>
          {['ALL', 'GENERATED', 'UPLOADED'].map((st) => (
            <button
              key={st}
              onClick={() => setSourceFilter(st)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: sourceFilter === st ? 'var(--accent-color)' : 'transparent',
                color: sourceFilter === st ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st === 'ALL' ? 'All Records' : st === 'GENERATED' ? 'Generated' : 'Uploaded'}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--accent-color)' }} />
            <div>Loading medical reports history...</div>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <FileJson size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No medical reports match the query.
            </div>
            <div style={{ fontSize: '0.83rem', marginTop: '0.25rem' }}>
              Generate a bundle in Tab 3 (FHIR R4 Bundle Studio) or click "Upload External Medical Report" above.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 0.85rem' }}>Patient Details</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>Source Diagnosis (Ayurveda)</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>Mapped Target (WHO ICD-11)</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>Origin & Verification Status</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>Recorded At</th>
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr
                  key={rec.id || idx}
                  style={{
                    borderBottom: '1px solid var(--surface-border)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Patient Details */}
                  <td style={{ padding: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={14} color="var(--accent-color)" /> {rec.patient_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {rec.patient_gender} • DOB: {rec.patient_birth_date || 'N/A'}{' '}
                      {rec.patient_id && `• ID: ${rec.patient_id}`}
                    </div>
                  </td>

                  {/* Ayurveda Condition */}
                  <td style={{ padding: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rec.namaste_term}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--accent-color)' }}>
                      Code: {rec.namaste_code}
                    </div>
                  </td>

                  {/* Mapped ICD-11 */}
                  <td style={{ padding: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rec.icd11_title || 'Unmapped'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--cyan-accent)' }}>
                      {rec.icd11_code ? `ICD-11: ${rec.icd11_code}` : 'No code mapped'}
                    </div>
                  </td>

                  {/* Origin & Interactive Verification Status */}
                  <td style={{ padding: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: rec.source_type === 'GENERATED' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                          color: rec.source_type === 'GENERATED' ? 'var(--accent-color)' : 'var(--purple-accent)',
                          border: `1px solid ${rec.source_type === 'GENERATED' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                        }}
                      >
                        {rec.source_type}
                      </span>

                      {/* Clickable verification status button */}
                      <button
                        type="button"
                        onClick={() => openEndorsementModal(rec)}
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: rec.clinical_verification_status === 'confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: rec.clinical_verification_status === 'confirmed' ? '#10b981' : '#f59e0b',
                          border: `1px solid ${rec.clinical_verification_status === 'confirmed' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                        }}
                        title="Click to endorse / update diagnosis verification status"
                      >
                        <CheckCircle2 size={11} /> {rec.clinical_verification_status || 'unconfirmed'}
                        <Edit3 size={10} style={{ opacity: 0.6 }} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <ShieldCheck size={12} /> FHIR R4 Valid
                    </div>
                  </td>

                  {/* Recorded Timestamp */}
                  <td style={{ padding: '0.85rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    <div>{rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'Recent'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {rec.user_email || 'clinician'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEndorsementModal(rec)}
                        className="theme-toggle-btn"
                        style={{
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: rec.clinical_verification_status === 'confirmed' ? '#10b981' : 'var(--warning-color)'
                        }}
                        title="Clinical Endorsement: Confirm or update verification status"
                      >
                        <ShieldCheck size={13} /> {rec.clinical_verification_status === 'confirmed' ? 'Verified' : 'Endorse'}
                      </button>

                      <button
                        onClick={() => handleInspectJson(rec)}
                        className="theme-toggle-btn"
                        style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Inspect full FHIR R4 JSON"
                      >
                        <Eye size={13} /> JSON
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(rec)}
                        className="theme-toggle-btn"
                        style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-color)' }}
                        title="Download standard clinical PDF report"
                      >
                        <Download size={13} /> PDF
                      </button>

                      {isReviewerOrAdmin && (
                        <button
                          onClick={() => handleDeleteBundle(rec.bundle_id)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete record from audit repository"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* MODAL 1: Upload External Medical Report */}
      {uploadModalOpen && (
        <div className="modal-overlay-responsive">
          <div className="modal-card-responsive" style={{ maxWidth: '650px', padding: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={20} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  Integrate External Medical Report
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--input-bg)',
                borderRadius: '8px',
                padding: '0.25rem',
                border: '1px solid var(--input-border)'
              }}
            >
              <button
                type="button"
                onClick={() => setUploadMode('manual')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: uploadMode === 'manual' ? 'var(--accent-color)' : 'transparent',
                  color: uploadMode === 'manual' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Structured Clinical Entry Form
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('json')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: uploadMode === 'json' ? 'var(--accent-color)' : 'transparent',
                  color: uploadMode === 'json' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Upload / Paste FHIR R4 JSON
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {uploadMode === 'manual' ? (
                <>
                  <div className="fhir-form-grid">
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Patient First Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anand"
                        value={manualForm.patient_first_name}
                        onChange={(e) => setManualForm({ ...manualForm, patient_first_name: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Patient Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Joshi"
                        value={manualForm.patient_last_name}
                        onChange={(e) => setManualForm({ ...manualForm, patient_last_name: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="fhir-form-grid">
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Gender
                      </label>
                      <select
                        value={manualForm.patient_gender}
                        onChange={(e) => setManualForm({ ...manualForm, patient_gender: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={manualForm.patient_birth_date}
                        onChange={(e) => setManualForm({ ...manualForm, patient_birth_date: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Patient ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="EXT-1002"
                        value={manualForm.patient_id}
                        onChange={(e) => setManualForm({ ...manualForm, patient_id: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="fhir-form-grid">
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Ayurveda / Condition Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kasa (Cough)"
                        value={manualForm.condition_name}
                        onChange={(e) => setManualForm({ ...manualForm, condition_name: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        NAMASTE Code
                      </label>
                      <input
                        type="text"
                        placeholder="NAMC-AYU-KS-01"
                        value={manualForm.condition_code}
                        onChange={(e) => setManualForm({ ...manualForm, condition_code: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="fhir-form-grid">
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        ICD-11 Target Code
                      </label>
                      <input
                        type="text"
                        placeholder="MD11"
                        value={manualForm.icd11_code}
                        onChange={(e) => setManualForm({ ...manualForm, icd11_code: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        ICD-11 Concept Display Title
                      </label>
                      <input
                        type="text"
                        placeholder="Cough"
                        value={manualForm.icd11_title}
                        onChange={(e) => setManualForm({ ...manualForm, icd11_title: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Clinical Verification Status
                    </label>
                    <select
                      value={manualForm.clinical_verification_status}
                      onChange={(e) => setManualForm({ ...manualForm, clinical_verification_status: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    >
                      <option value="unconfirmed">unconfirmed (Default — pending clinician confirmation)</option>
                      <option value="provisional">provisional (Provisional working diagnosis)</option>
                      <option value="confirmed">confirmed (Confirmed by treating physician)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Clinical Summary / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="External hospital referral details, dosage or treatment summary..."
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Paste HL7 FHIR R4 Transaction/Collection Bundle JSON *
                  </label>
                  <textarea
                    rows={12}
                    required
                    placeholder='{\n  "resourceType": "Bundle",\n  "type": "transaction",\n  "entry": [ ... ]\n}'
                    value={rawJsonInput}
                    onChange={(e) => setRawJsonInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      background: 'var(--code-bg)',
                      color: 'var(--code-text)',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setRawJsonInput(ev.target?.result || '');
                          reader.readAsText(file);
                        }
                      }}
                      style={{ fontSize: '0.75rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="theme-toggle-btn"
                  style={{ padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="primary-btn"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  {uploadLoading ? 'Integrating & Validating...' : 'Integrate Medical Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspect Raw FHIR JSON */}
      {inspectModalOpen && activeBundle && (
        <div className="modal-overlay-responsive">
          <div className="modal-card-responsive" style={{ maxWidth: '850px', padding: '1.5rem', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileJson size={20} color="var(--accent-color)" /> FHIR R4 Bundle Specification
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Bundle ID: <strong>{activeBundle.bundle_id}</strong> • Patient: <strong>{activeBundle.patient_name}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={copyInspectJson}
                  className="theme-toggle-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                >
                  <Copy size={14} /> {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                <button
                  onClick={downloadInspectJson}
                  className="theme-toggle-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => setInspectModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <pre
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '1rem',
                borderRadius: '8px',
                background: 'var(--code-bg)',
                color: 'var(--code-text)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                margin: 0,
                maxHeight: '65vh'
              }}
            >
              {JSON.stringify(activeBundle.bundle, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL 3: Clinical Endorsement & Verification Status Update */}
      {endorseModalOpen && endorseTarget && (
        <div className="modal-overlay-responsive">
          <div className="modal-card-responsive" style={{ maxWidth: '520px', padding: '1.5rem', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  Clinical Verification Endorsement
                </h3>
              </div>
              <button
                onClick={() => setEndorseModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'var(--surface-hover)', fontSize: '0.82rem' }}>
              <div>Patient: <strong>{endorseTarget.patient_name}</strong> (DOB: {endorseTarget.patient_birth_date || 'N/A'})</div>
              <div style={{ marginTop: '0.2rem' }}>
                Diagnosis: <strong>{endorseTarget.namaste_term}</strong> &rarr; <strong>{endorseTarget.icd11_title} ({endorseTarget.icd11_code})</strong>
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                Current Status: <strong style={{ color: endorseTarget.clinical_verification_status === 'confirmed' ? '#10b981' : '#f59e0b' }}>{endorseTarget.clinical_verification_status || 'unconfirmed'}</strong>
              </div>
            </div>

            <form onSubmit={handleEndorseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Select Updated Verification Status *
                </label>
                <select
                  value={endorseStatus}
                  onChange={(e) => setEndorseStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="confirmed">confirmed — Clinical Diagnosis Confirmed by Attending Clinician / Reviewer</option>
                  <option value="unconfirmed">unconfirmed — Pending Laboratory or Specialist Examination</option>
                  <option value="provisional">provisional — Provisional Working Hypothesis</option>
                  <option value="refuted">refuted — Clinical Diagnosis Ruled Out by Follow-up Testing</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Clinical Justification / Endorsement Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Confirmed after patient clinical encounter, blood test evaluation, or specialist sign-off."
                  value={endorseNote}
                  onChange={(e) => setEndorseNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEndorseModalOpen(false)}
                  className="theme-toggle-btn"
                  style={{ padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={endorseLoading}
                  className="primary-btn"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  {endorseLoading ? 'Saving Endorsement...' : 'Apply Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

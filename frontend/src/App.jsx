import React, { useState } from 'react';
import axios from 'axios';
import {
  Search,
  Stethoscope,
  FileJson,
  Activity,
  CheckCircle2,
  Shield,
  BarChart3,
  BrainCircuit,
  Copy,
  Download,
  FileText,
  Printer
} from 'lucide-react';
import PipelineVisualizer from './components/PipelineVisualizer';
import ExplainabilityCard from './components/ExplainabilityCard';
import CareSuggestionsCard from './components/CareSuggestionsCard';
import HumanReviewModal from './components/HumanReviewModal';
import ResearchDashboard from './components/ResearchDashboard';
import PatientReportModal from './components/PatientReportModal';
import { generateAndDownloadPatientReportPdf } from './utils/pdfReportGenerator';
import './index.css';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'review' | 'fhir' | 'research'

  // Search & Pipeline state
  const [searchQuery, setSearchQuery] = useState('Jwara');
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(5);
  const [pipelineData, setPipelineData] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // FHIR Bundle state
  const [patient, setPatient] = useState({
    first_name: 'Ram',
    last_name: 'Kumar',
    gender: 'male',
    birth_date: '1995-10-15'
  });
  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Patient Mapping Report state
  const [reportData, setReportData] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const runMappingPipeline = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) return;

    setPipelineLoading(true);
    setErrorMessage(null);
    setSelectedCandidate(null);
    setBundle(null);
    setPipelineStep(0);

    try {
      // Simulate live visual progress step transitions
      const interval = setInterval(() => {
        setPipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 250);

      const res = await axios.post(`${API_BASE}/mapping`, { term: searchQuery });
      clearInterval(interval);
      setPipelineStep(5);
      setPipelineData(res.data);
      if (res.data.candidates && res.data.candidates.length > 0) {
        setSelectedCandidate(res.data.candidates[0]);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to execute mapping pipeline. Please check backend connection.');
    } finally {
      setPipelineLoading(false);
    }
  };

  const generateFhirBundle = async () => {
    if (!selectedCandidate) return;
    setBundleLoading(true);
    setErrorMessage(null);
    try {
      const payload = {
        patient,
        namaste_code: pipelineData?.source_code || 'NAMC-AYU',
        namaste_term: pipelineData?.source_term || searchQuery,
        selected_candidate_code: selectedCandidate?.code,
        force_unverified: false
      };
      const res = await axios.post(`${API_BASE}/fhir/generate-bundle`, payload);
      setBundle(res.data);
      // Pre-fetch aligned patient report data
      fetchPatientReportData();
    } catch (err) {
      console.error('Failed to generate bundle:', err);
      const errDetail = err.response?.data?.detail || 'Failed to generate FHIR Bundle.';
      alert(`FHIR Bundle Policy Warning: ${errDetail}`);
    } finally {
      setBundleLoading(false);
    }
  };

  const fetchPatientReportData = async () => {
    if (!selectedCandidate) return null;
    if (!patient.first_name?.trim() || !patient.last_name?.trim() || !patient.birth_date?.trim()) {
      alert('Please fill in required patient fields: First Name, Last Name, and Date of Birth.');
      return null;
    }
    setReportLoading(true);
    try {
      const payload = {
        patient,
        namaste_code: pipelineData?.source_code || 'NAMC-AYU',
        namaste_term: pipelineData?.source_term || searchQuery,
        candidate: selectedCandidate,
        pipeline_data: pipelineData
      };
      const res = await axios.post(`${API_BASE}/reports/patient-mapping`, payload);
      setReportData(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to generate patient report:', err);
      const errDetail = err.response?.data?.detail || 'Failed to generate patient mapping report.';
      alert(`Report Generation Notice: ${errDetail}`);
      return null;
    } finally {
      setReportLoading(false);
    }
  };

  const handleViewPatientReport = async () => {
    const data = reportData || (await fetchPatientReportData());
    if (data) {
      setReportModalOpen(true);
    }
  };

  const handleDownloadPatientReportPdf = async () => {
    const data = reportData || (await fetchPatientReportData());
    if (data) {
      generateAndDownloadPatientReportPdf(data);
    }
  };

  const copyBundleJson = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBundleJson = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-bundle-${pipelineData?.source_code || 'namaste'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <h1>
          <Stethoscope size={36} color="#60a5fa" /> ClinBridge AI
        </h1>
        <p>Context-Aware, Evidence-Grounded Ayurveda/NAMASTE &rarr; ICD-11 Interoperability Platform</p>

        {/* Tab Navigation */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} /> Clinical Search & GraphRAG
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            <Shield size={18} /> Audit Trail & Admin Overrides
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'fhir' ? 'active' : ''}`}
            onClick={() => setActiveTab('fhir')}
          >
            <FileJson size={18} /> FHIR R4 Bundle Studio
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'research' ? 'active' : ''}`}
            onClick={() => setActiveTab('research')}
          >
            <BarChart3 size={18} /> Research Evaluation (B1–B6)
          </button>
        </div>
      </header>

      {/* TAB 1: Clinical Search & Live Pipeline */}
      {activeTab === 'search' && (
        <div>
          {/* Search Bar */}
          <form onSubmit={runMappingPipeline} className="search-box-container">
            <input
              type="text"
              placeholder="Search NAMASTE Ayurveda term or code (e.g., Jwara, Kasa, vAtavyAdhiH)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="primary-btn" disabled={pipelineLoading}>
              <BrainCircuit size={18} /> {pipelineLoading ? 'Reasoning...' : 'Run Pipeline'}
            </button>
          </form>

          {/* Visual Step-by-Step Pipeline Flow */}
          <PipelineVisualizer currentStep={pipelineStep} isRunning={pipelineLoading} />

          {errorMessage && (
            <div className="glass-panel" style={{ padding: '1rem', borderColor: '#ef4444', color: '#f87171' }}>
              {errorMessage}
            </div>
          )}

          {/* Pipeline Results View */}
          {pipelineData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Candidate Selection Bar */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>
                    Candidate ICD-11 Matches ({pipelineData.candidates?.length || 0}) for "{pipelineData.source_term}"
                  </h4>
                  {pipelineData.decision_class && (
                    <span className={`badge ${pipelineData.decision_class === 'AUTO_ACCEPTED' ? 'badge-high' : pipelineData.decision_class === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-low'}`}>
                      Policy: {pipelineData.decision_class}
                    </span>
                  )}
                </div>

                {(!pipelineData.candidates || pipelineData.candidates.length === 0) ? (
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.9rem' }}>
                    <strong>Status: UNMAPPED</strong> — No reliable ICD-11 candidates satisfied the retrieval or ontology gate criteria for "{pipelineData.source_term}". No fake codes fabricated.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {pipelineData.candidates.map((cand, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCandidate(cand)}
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: selectedCandidate === cand ? '2px solid #3b82f6' : '1px solid var(--surface-border)',
                          background: selectedCandidate === cand ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                          color: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: 500
                        }}
                      >
                        <span>{cand.term}</span>
                        <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>({(cand.confidence * 100).toFixed(0)}%)</span>
                        {cand.decision && (
                          <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: cand.decision === 'AUTO_ACCEPTED' ? '#065f46' : 'rgba(255,255,255,0.1)' }}>
                            {cand.decision}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Explainability & Grounding Details for Selected Candidate */}
              {selectedCandidate && (
                <ExplainabilityCard
                  candidate={selectedCandidate}
                  sourceTerm={pipelineData.source_term}
                  decisionReason={pipelineData.decision_reason}
                  fhirAllowed={pipelineData.fhir_generation_allowed}
                />
              )}

              {/* AI-Powered Evidence-Grounded Care Suggestions */}
              {selectedCandidate && (
                <CareSuggestionsCard
                  candidate={selectedCandidate}
                  sourceTerm={pipelineData.source_term}
                  decisionClass={pipelineData.decision_class}
                  initialCareSuggestions={pipelineData.care_suggestions}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Human-in-the-Loop Review Workspace */}
      {activeTab === 'review' && (
        <HumanReviewModal
          candidate={selectedCandidate}
          sourceTerm={pipelineData?.source_term || searchQuery}
          onReviewComplete={(action) => {
            alert(`Mapping decision '${action}' logged into the audit repository.`);
          }}
        />
      )}

      {/* TAB 3: FHIR R4 Bundle Studio */}
      {activeTab === 'fhir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Patient Demographic Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson size={20} color="#38bdf8" /> Patient Encounter & FHIR Parameters
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>First Name</label>
                <input
                  type="text"
                  value={patient.first_name}
                  onChange={(e) => setPatient({ ...patient, first_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Name</label>
                <input
                  type="text"
                  value={patient.last_name}
                  onChange={(e) => setPatient({ ...patient, last_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gender</label>
                <select
                  value={patient.gender}
                  onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date of Birth</label>
                <input
                  type="date"
                  value={patient.birth_date}
                  onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="primary-btn"
                disabled={bundleLoading || !selectedCandidate}
                onClick={generateFhirBundle}
              >
                <FileJson size={18} /> {bundleLoading ? 'Generating Bundle...' : 'Generate FHIR R4 Bundle'}
              </button>

              <button
                className="primary-btn"
                disabled={reportLoading || !selectedCandidate}
                onClick={handleViewPatientReport}
                style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
              >
                <FileText size={18} /> {reportLoading ? 'Loading Report...' : 'View Patient Report'}
              </button>

              <button
                className="primary-btn"
                disabled={reportLoading || !selectedCandidate}
                onClick={handleDownloadPatientReportPdf}
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                <Printer size={18} /> Download Patient Mapping Report (PDF)
              </button>

              {!selectedCandidate && (
                <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                  Please run a search in Tab 1 first to select a verified mapping.
                </span>
              )}
            </div>
          </div>

          {/* Patient Mapping Report Quick Status Card */}
          {reportData && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Clinical Documentation Ready
                </div>
                <h4 style={{ fontSize: '1.05rem', color: '#f8fafc', margin: '0.2rem 0' }}>
                  {reportData.report_title} ({reportData.report_id})
                </h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Patient: <strong>{reportData.patient?.full_name}</strong> • Source: <strong>{reportData.original_ayurveda_diagnosis?.condition_name}</strong> &rarr; Target: <strong>{reportData.mapped_icd11_concept?.target_code} ({reportData.mapped_icd11_concept?.target_title})</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="nav-tab-btn"
                  onClick={handleViewPatientReport}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}
                >
                  <FileText size={16} /> View 10-Section Report
                </button>
                <button
                  className="primary-btn"
                  onClick={handleDownloadPatientReportPdf}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={16} /> Save / Print PDF
                </button>
              </div>
            </div>
          )}

          {/* FHIR Bundle JSON Viewer */}
          {bundle && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#34d399' }}>
                  FHIR R4 Transaction Bundle (Valid JSON)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="nav-tab-btn" onClick={copyBundleJson}>
                    <Copy size={15} /> {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                  <button className="nav-tab-btn" onClick={downloadBundleJson}>
                    <Download size={15} /> Download Bundle
                  </button>
                </div>
              </div>
              <pre className="json-viewer">{JSON.stringify(bundle, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Research Dashboard (B1 - B6, A1 - A5) */}
      {activeTab === 'research' && <ResearchDashboard />}

      {/* Patient Report Modal View */}
      {reportModalOpen && (
        <PatientReportModal
          reportData={reportData}
          onClose={() => setReportModalOpen(false)}
          onDownloadPdf={() => generateAndDownloadPatientReportPdf(reportData)}
        />
      )}
    </div>
  );
}

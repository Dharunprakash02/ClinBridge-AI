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
  Download
} from 'lucide-react';
import PipelineVisualizer from './components/PipelineVisualizer';
import ExplainabilityCard from './components/ExplainabilityCard';
import HumanReviewModal from './components/HumanReviewModal';
import ResearchDashboard from './components/ResearchDashboard';
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
    try {
      const payload = {
        patient,
        namaste_code: pipelineData?.source_code || 'NAMC-AYU',
        namaste_term: pipelineData?.source_term || searchQuery
      };
      const res = await axios.post(`${API_BASE}/fhir/generate-bundle`, payload);
      setBundle(res.data);
    } catch (err) {
      console.error('Failed to generate bundle:', err);
    } finally {
      setBundleLoading(false);
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
            <Shield size={18} /> Expert Review & Audit
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
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Candidate ICD-11 Matches ({pipelineData.candidates.length}) for "{pipelineData.source_term}"
                </h4>
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
                    </button>
                  ))}
                </div>
              </div>

              {/* Explainability & Grounding Details for Selected Candidate */}
              <ExplainabilityCard candidate={selectedCandidate} sourceTerm={pipelineData.source_term} />
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

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                className="primary-btn"
                disabled={bundleLoading || !selectedCandidate}
                onClick={generateFhirBundle}
              >
                <FileJson size={18} /> {bundleLoading ? 'Generating Bundle...' : 'Generate FHIR R4 Bundle'}
              </button>
              {!selectedCandidate && (
                <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                  Please run a search in Tab 1 first to select a verified mapping.
                </span>
              )}
            </div>
          </div>

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
    </div>
  );
}

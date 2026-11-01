import React, { useState, useEffect } from 'react';
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
  Printer,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
  Building2,
  Lock,
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import PipelineVisualizer from './components/PipelineVisualizer';
import ExplainabilityCard from './components/ExplainabilityCard';
import CareSuggestionsCard from './components/CareSuggestionsCard';
import HumanReviewModal from './components/HumanReviewModal';
import ResearchDashboard from './components/ResearchDashboard';
import PatientReportModal from './components/PatientReportModal';
import AuthLandingPage from './components/AuthLandingPage';
import MedicalReportsHistory from './components/MedicalReportsHistory';
import { useAuth } from './context/AuthContext';
import { generateAndDownloadPatientReportPdf } from './utils/pdfReportGenerator';
import './index.css';

import { API_BASE } from './config/api';

// Page definitions with Role-Based Access Control (RBAC)
const ALL_PAGES = [
  {
    id: 'search',
    label: 'Clinical Search & GraphRAG',
    icon: Search,
    roles: ['clinician', 'reviewer', 'admin'],
    desc: 'Terminology Search, Graph Context & Care Suggestions'
  },
  {
    id: 'fhir',
    label: 'FHIR R4 Bundle Studio',
    icon: FileJson,
    roles: ['clinician', 'admin'],
    desc: 'Generate & Validate HL7 FHIR R4 Transaction Bundles'
  },
  {
    id: 'history',
    label: 'Medical Reports Integration & History',
    icon: Layers,
    roles: ['clinician', 'reviewer', 'admin'],
    desc: 'Progress Tracking, FHIR Bundle Repository & Report Upload'
  },
  {
    id: 'review',
    label: 'Audit Trail & Admin Overrides',
    icon: Shield,
    roles: ['reviewer', 'admin'],
    desc: 'Audit Endorsement & Quality Assurance Overrides'
  },
  {
    id: 'research',
    label: 'Research Evaluation (B1–B6)',
    icon: BarChart3,
    roles: ['reviewer', 'admin'],
    desc: 'Benchmark Metrics & Ablation Study (A1–A5)'
  }
];

export default function App() {
  const {
    user,
    isAuthenticated,
    role,
    loading,
    logout,
    hasRole
  } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clinbridge_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clinbridge_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Compute allowed pages based on active user role
  const userRole = role || 'clinician';
  const allowedPages = ALL_PAGES.filter((p) => p.roles.includes(userRole));

  // Determine initial active tab
  const [activeTab, setActiveTab] = useState(() => {
    if (userRole === 'reviewer') return 'review';
    return 'search';
  });

  // Sync active tab when user role changes
  useEffect(() => {
    if (allowedPages.length > 0 && !allowedPages.some((p) => p.id === activeTab)) {
      setActiveTab(allowedPages[0].id);
    }
  }, [userRole]);

  // Search & Pipeline state
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineData, setPipelineData] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // FHIR Bundle state
  const [patient, setPatient] = useState({
    first_name: 'Ram',
    last_name: 'Kumar',
    gender: 'male',
    birth_date: '1995-10-15',
    patient_id: 'PAT-9021',
    clinical_verification_status: 'unconfirmed'
  });
  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleValidation, setBundleValidation] = useState(null);
  const [bundleSaveNotice, setBundleSaveNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  // Patient Mapping Report state
  const [reportData, setReportData] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // 1. Loading Splash Screen while checking session
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-gradient)',
          color: 'var(--text-primary)',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            marginBottom: '1.25rem'
          }}
        >
          <Stethoscope size={30} />
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          ClinBridge AI Enterprise
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
          Verifying institutional authentication & credentials...
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render dedicated Production-Level Authentication Landing Page
  if (!isAuthenticated) {
    return <AuthLandingPage theme={theme} toggleTheme={toggleTheme} />;
  }

  // 3. Authenticated: Render Full Platform with Role-Based Route Access
  const runMappingPipeline = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) return;

    setPipelineLoading(true);
    setErrorMessage(null);
    setSelectedCandidate(null);
    setBundle(null);
    setBundleSaveNotice(null);
    setPipelineStep(0);

    try {
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
      if (err.response?.status === 401) {
        logout(false);
      } else {
        setErrorMessage('Failed to execute mapping pipeline. Please check backend connection.');
      }
    } finally {
      setPipelineLoading(false);
    }
  };

  const generateFhirBundle = async () => {
    if (!selectedCandidate) return;
    setBundleLoading(true);
    setErrorMessage(null);
    setBundleSaveNotice(null);
    try {
      const payload = {
        patient,
        namaste_code: pipelineData?.source_code || 'NAMC-AYU',
        namaste_term: pipelineData?.source_term || searchQuery,
        selected_candidate_code: selectedCandidate?.code,
        selected_candidate_title: selectedCandidate?.term || selectedCandidate?.title,
        selected_candidate_uri: selectedCandidate?.uri,
        force_unverified: false,
        clinical_verification_status: patient.clinical_verification_status || 'unconfirmed'
      };
      const res = await axios.post(`${API_BASE}/fhir/generate-bundle`, payload);
      const bundleData = res.data?.bundle || res.data;
      setBundle(bundleData);
      if (res.data?.structure_valid !== undefined) {
        setBundleValidation({
          isValid: res.data.structure_valid,
          errors: res.data.validation_errors || [],
          warnings: res.data.validation_warnings || [],
          disclaimer: res.data.validation_disclaimer
        });
      }
      setBundleSaveNotice({
        bundle_id: res.data?.bundle_id || bundleData?.id || 'Saved',
        message: 'FHIR R4 Bundle successfully generated and stored in Medical Reports Integration & History.'
      });
      // Pre-fetch aligned patient report data
      fetchPatientReportData();
    } catch (err) {
      console.error('Failed to generate bundle:', err);
      const errDetail = err.response?.data?.detail || 'Failed to generate FHIR Bundle.';
      alert(`FHIR Bundle Notice: ${errDetail}`);
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

  // Check if current activeTab is permitted
  const isTabPermitted = allowedPages.some((p) => p.id === activeTab);

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-color)', border: '1px solid var(--surface-border)' }}>
              v2.0.0 • AYUSH &harr; WHO ICD-11
            </span>
            <span className="header-status-badge" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Shield size={12} color="#10b981" /> Authenticated & RBAC Enforced
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', position: 'relative' }}>
            {/* User Profile Pill */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  boxShadow: 'var(--card-shadow)',
                  transition: 'all 0.2s ease'
                }}
                title="Account and role details"
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background:
                      userRole === 'admin'
                        ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                        : userRole === 'reviewer'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || user?.email}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    background:
                      userRole === 'admin'
                        ? 'rgba(139, 92, 246, 0.18)'
                        : userRole === 'reviewer'
                        ? 'rgba(245, 158, 11, 0.18)'
                        : 'rgba(59, 130, 246, 0.15)',
                    color:
                      userRole === 'admin'
                        ? 'var(--purple-accent)'
                        : userRole === 'reviewer'
                        ? 'var(--warning-color)'
                        : 'var(--accent-color)',
                    border: `1px solid ${
                      userRole === 'admin'
                        ? 'rgba(139, 92, 246, 0.3)'
                        : userRole === 'reviewer'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(59, 130, 246, 0.3)'
                    }`
                  }}
                >
                  {userRole}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: '280px',
                      maxWidth: 'calc(100vw - 1.5rem)',
                      background: 'var(--surface-color)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
                      zIndex: 999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {user?.full_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {user?.email}
                      </div>
                      {user?.organization && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          <Building2 size={12} /> {user.organization}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Active Role Scope:</strong>{' '}
                      {userRole === 'admin'
                        ? 'Complete Governance & Access Overrides (All 5 Platform Workspaces)'
                        : userRole === 'reviewer'
                        ? 'Audit Trail Endorsement & Quality Assurance Overrides'
                        : 'Clinician (Search, Pipeline, Reports, FHIR Export)'}
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} className="theme-icon sun" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={16} className="theme-icon moon" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        <h1>
          <Stethoscope size={36} color={theme === 'dark' ? '#60a5fa' : '#2563eb'} /> ClinBridge AI
        </h1>
        <p>Context-Aware, Evidence-Grounded Ayurveda/NAMASTE &rarr; ICD-11 Interoperability Platform</p>

        {/* Dynamic Role-Based Tab Navigation */}
        <div className="nav-tabs" style={{ flexWrap: 'wrap' }}>
          {allowedPages.map((page) => {
            const Icon = page.icon;
            const isActive = activeTab === page.id;
            return (
              <button
                key={page.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(page.id)}
                title={page.desc}
              >
                <Icon size={18} /> {page.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* RBAC Fallback: If unauthorized tab is somehow targeted */}
      {!isTabPermitted && (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderColor: '#ef4444' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Access Restricted (RBAC Policy)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            Your account role (<strong>{userRole}</strong>) does not have access permissions for this workspace.
          </p>
          <button
            className="primary-btn"
            onClick={() => setActiveTab(allowedPages[0]?.id || 'search')}
          >
            Go to {allowedPages[0]?.label || 'Workspace'}
          </button>
        </div>
      )}

      {/* PAGE 1: Clinical Search & Live Pipeline */}
      {isTabPermitted && activeTab === 'search' && (
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
                          background: selectedCandidate === cand ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-card)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: 500
                        }}
                      >
                        <span>{cand.term}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>({(cand.confidence * 100).toFixed(0)}%)</span>
                        {cand.decision && (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: cand.decision === 'AUTO_ACCEPTED' ? 'var(--badge-selfcare-bg)' : 'var(--badge-triage-bg)',
                            color: cand.decision === 'AUTO_ACCEPTED' ? 'var(--badge-selfcare-text)' : 'var(--badge-triage-text)',
                            border: `1px solid ${cand.decision === 'AUTO_ACCEPTED' ? 'var(--badge-selfcare-border)' : 'var(--badge-triage-border)'}`
                          }}>
                            {cand.decision}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Explainability & Grounding Details */}
              {selectedCandidate && (
                <ExplainabilityCard
                  candidate={selectedCandidate}
                  sourceTerm={pipelineData.source_term}
                  decisionReason={pipelineData.decision_reason}
                  fhirAllowed={pipelineData.fhir_generation_allowed}
                />
              )}

              {/* Care Suggestions */}
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

      {/* PAGE 2: FHIR R4 Bundle Studio */}
      {isTabPermitted && activeTab === 'fhir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Patient Demographic Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson size={20} color="#38bdf8" /> Patient Encounter & FHIR Parameters
            </h3>
            <div className="fhir-form-grid">
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
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Clinical Verification</label>
                <select
                  value={patient.clinical_verification_status || 'unconfirmed'}
                  onChange={(e) => setPatient({ ...patient, clinical_verification_status: e.target.value })}
                >
                  <option value="unconfirmed">unconfirmed (Pending review / labs)</option>
                  <option value="confirmed">confirmed (Attending Clinician Confirmed)</option>
                  <option value="provisional">provisional (Provisional Working Diagnosis)</option>
                </select>
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
                  Please run a search in Tab 1 first to select a verified mapping candidate.
                </span>
              )}
            </div>

            {/* Persistence Confirmation Banner */}
            {bundleSaveNotice && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--success-color)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{bundleSaveNotice.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  View in Medical Reports History <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Quick Status Card */}
          {reportData && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Clinical Documentation Ready
                </div>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#34d399', margin: 0 }}>
                    FHIR R4 Transaction Bundle (Standard JSON)
                  </h3>
                  {bundleValidation && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: bundleValidation.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: bundleValidation.isValid ? '#34d399' : '#f87171',
                        border: `1px solid ${bundleValidation.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}
                    >
                      {bundleValidation.isValid ? 'HL7 FHIR R4 Compliant' : 'Validation Error'}
                    </span>
                  )}
                </div>
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

      {/* PAGE 3: Medical Reports Integration & History (NEW) */}
      {isTabPermitted && activeTab === 'history' && (
        <MedicalReportsHistory
          onViewReportModal={(rep) => {
            setReportData(rep);
            setReportModalOpen(true);
          }}
        />
      )}

      {/* PAGE 4: Human-in-the-Loop Review Workspace */}
      {isTabPermitted && activeTab === 'review' && (
        <HumanReviewModal
          candidate={selectedCandidate}
          sourceTerm={pipelineData?.source_term || searchQuery}
          onReviewComplete={(action) => {
            alert(`Mapping decision '${action}' logged into the audit repository.`);
          }}
        />
      )}

      {/* PAGE 5: Research Dashboard (B1 - B6, A1 - A5) */}
      {isTabPermitted && activeTab === 'research' && <ResearchDashboard />}

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

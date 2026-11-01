import React, { useState } from 'react';
import {
  Stethoscope,
  Shield,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  FileJson,
  Database,
  BarChart3,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthLandingPage({ theme, toggleTheme }) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('clinician');
  const [organization, setOrganization] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Real-time password criteria
  const passwordCriteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[@$!%*?&#^()_+\-=[\]{}|;:,.<>/~`]/.test(password)
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!isPasswordValid) {
          setError('Please satisfy all password complexity requirements before registering.');
          setLoading(false);
          return;
        }
        await register({
          email,
          password,
          full_name: fullName,
          role,
          organization: organization || undefined
        });
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join('; '));
      } else {
        setError('Authentication request failed. Please verify credentials or backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (acc) => {
    setMode('login');
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
    setSuccessMsg(`Pre-filled credentials for ${acc.label} (${acc.role}). Click 'Sign In' to authenticate.`);
  };

  const demoAccounts = [
    {
      role: 'Clinician',
      label: 'Dr. Rajesh Varma',
      email: 'clinician@clinbridge.local',
      password: 'Clinician@ClinBridge2026!',
      badgeColor: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      scope: 'Search, Reasoning Pipeline, Patient Reports & FHIR Export'
    },
    {
      role: 'Reviewer',
      label: 'Dr. Ananya Sharma',
      email: 'reviewer@clinbridge.local',
      password: 'Reviewer@ClinBridge2026!',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      scope: 'Audit Trail Endorsement & Quality Assurance Overrides'
    },
    {
      role: 'Administrator',
      label: 'System Admin',
      email: 'admin@clinbridge.local',
      password: 'Admin@ClinBridge2026!',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      scope: 'Complete Governance, System Configuration & Full Access'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-gradient)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box'
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          width: '100%',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--surface-color)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxSizing: 'border-box',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Stethoscope size={22} />
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              ClinBridge AI
            </span>
            <span
              style={{
                marginLeft: '0.5rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-color)',
                border: '1px solid var(--surface-border)'
              }}
            >
              Enterprise v2.0
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className="header-status-badge"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)'
            }}
          >
            <Shield size={14} color="#10b981" /> HIPAA Security Active
          </span>

          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="#f59e0b" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#3b82f6" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div className="auth-landing-grid">
          {/* Left Hero & Platform Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--cyan-accent)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  marginBottom: '1rem'
                }}
              >
                <Sparkles size={14} /> Clinical Interoperability Gateway
              </div>
              <h1
                className="auth-hero-title"
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  margin: '0 0 1rem 0',
                  background: 'var(--heading-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Context-Aware Ayurveda & WHO ICD-11 Interoperability
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  margin: 0
                }}
              >
                Seamlessly crosswalk NAMASTE traditional terminology to international WHO ICD-11 concepts with
                multi-signal Knowledge Graph reasoning, GraphRAG evidence grounding, and HL7 FHIR R4 Bundle exports.
              </p>
            </div>

            {/* Platform Highlights */}
            <div className="auth-features-grid">
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <Shield size={16} /> Strict RBAC Access
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Segregated Clinician, Reviewer, and Admin governance pipelines.
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <FileJson size={16} /> HL7 FHIR R4
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Valid Transaction Bundles, Condition codings & 10-section PDF reports.
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan-accent)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <Database size={16} /> GraphRAG Evidence
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Clinical guideline grounding with verified publisher provenance.
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--purple-accent)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <BarChart3 size={16} /> Evaluation Suite
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  B1–B6 Benchmark metrics and A1–A5 ablation analysis.
                </div>
              </div>
            </div>

            {/* Quick-Access Demo Accounts */}
            <div
              style={{
                padding: '1.1rem',
                borderRadius: '12px',
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Instant Demonstration Access (Select Role to Pre-fill)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {demoAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickFill(acc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-hover)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          color: acc.badgeColor,
                          background: acc.badgeBg,
                          border: `1px solid ${acc.badgeColor}40`
                        }}
                      >
                        {acc.role}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {acc.label}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {acc.scope}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Container */}
          <div
            style={{
              background: 'var(--surface-color)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: 'var(--card-shadow)',
              boxSizing: 'border-box'
            }}
          >
            {/* Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--input-bg)',
                borderRadius: '10px',
                padding: '0.3rem',
                border: '1px solid var(--input-border)',
                marginBottom: '1.5rem'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: mode === 'login' ? 'var(--accent-color)' : 'transparent',
                  color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: mode === 'register' ? 'var(--accent-color)' : 'transparent',
                  color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Create Account
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                {mode === 'login' ? 'Sign In to Your Workspace' : 'Register New Clinician Account'}
              </h2>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
                {mode === 'login'
                  ? 'Enter your institutional email and credentials to access your authorized clinical routes.'
                  : 'Register a verified practitioner account to generate FHIR R4 records and track patient progress.'}
              </p>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: 'var(--error-color)',
                  fontSize: '0.83rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--success-color)',
                  fontSize: '0.83rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mode === 'register' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Full Name *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        placeholder="Dr. Siddharth Menon"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                          borderRadius: '8px',
                          border: '1px solid var(--input-border)',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Clinical Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="clinician">Clinician (Search, Pipeline, Reports, FHIR Export)</option>
                      <option value="reviewer">Reviewer (Audit Trail Endorsement & Quality Assurance)</option>
                      <option value="admin">Administrator (Complete Governance & Access Overrides)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Hospital / Institution (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. All India Institute of Ayurveda"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                          borderRadius: '8px',
                          border: '1px solid var(--input-border)',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Institutional Email *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    placeholder="doctor@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength checklist in register mode */}
              {mode === 'register' && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--surface-border)',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    HIPAA Password Requirements:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.length ? '#10b981' : 'var(--text-muted)' }}>
                      <Check size={12} /> 8+ Characters
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.upper ? '#10b981' : 'var(--text-muted)' }}>
                      <Check size={12} /> Uppercase Letter
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.lower ? '#10b981' : 'var(--text-muted)' }}>
                      <Check size={12} /> Lowercase Letter
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.digit ? '#10b981' : 'var(--text-muted)' }}>
                      <Check size={12} /> Numeric Digit
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.special ? '#10b981' : 'var(--text-muted)' }}>
                      <Check size={12} /> Special Symbol (@#$%)
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'register' && !isPasswordValid)}
                className="primary-btn"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Authenticating...
                  </>
                ) : mode === 'login' ? (
                  <>
                    Sign In to Workspace <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    Create Verified Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          padding: '1rem 2rem',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--surface-border)',
          background: 'var(--surface-color)',
          boxSizing: 'border-box'
        }}
      >
        ClinBridge AI Enterprise Interoperability System • Compliant with HL7 FHIR R4, WHO ICD-11 2026 MMS & Traditional Medicine Chapter 2
      </footer>
    </div>
  );
}


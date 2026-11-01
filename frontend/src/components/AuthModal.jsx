import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Shield,
  Building,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(authModalMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('clinician');
  const [organization, setOrganization] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Sync mode if changed from external trigger
  React.useEffect(() => {
    setIsLogin(authModalMode === 'login');
    setError(null);
    setSuccessMsg(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  // Real-time password strength analysis
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
      if (isLogin) {
        await login(email, password);
      } else {
        if (!isPasswordValid) {
          setError('Please meet all password strength requirements before proceeding.');
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
        setError(detail.map((d) => d.msg || d.detail).join(', '));
      } else {
        setError(err.message || 'Authentication request failed. Please check backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = (demoRole) => {
    if (demoRole === 'admin') {
      setEmail('admin@clinbridge.local');
      setPassword('Admin@ClinBridge2026!');
      setIsLogin(true);
    } else if (demoRole === 'reviewer') {
      setEmail('reviewer@clinbridge.local');
      setPassword('Reviewer@ClinBridge2026!');
      setIsLogin(true);
    } else if (demoRole === 'clinician') {
      setEmail('clinician@clinbridge.local');
      setPassword('Clinician@ClinBridge2026!');
      setIsLogin(true);
    }
    setError(null);
  };

  return (
    <div
      className="modal-overlay-responsive"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="modal-card-responsive"
        style={{
          maxWidth: '480px',
          padding: '1.75rem',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '6px'
          }}
          aria-label="Close auth dialog"
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '0.75rem'
            }}
          >
            <Stethoscope size={26} color="var(--accent-color)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            ClinBridge AI Security
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            HIPAA-Compliant AYUSH/NAMASTE &rarr; ICD-11 Role-Based Authentication
          </p>
        </div>

        {/* Tab Toggle (Sign In vs Register) */}
        <div
          style={{
            display: 'flex',
            borderRadius: '8px',
            background: 'var(--input-bg)',
            border: '1px solid var(--surface-border)',
            padding: '4px',
            marginBottom: '1.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: isLogin ? 'var(--accent-color)' : 'transparent',
              color: isLogin ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: !isLogin ? 'var(--accent-color)' : 'transparent',
              color: !isLogin ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--error-color)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginBottom: '1rem',
              lineHeight: 1.45
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'var(--badge-selfcare-bg)',
              border: '1px solid var(--badge-selfcare-border)',
              color: 'var(--badge-supported-color)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Full Name & Clinical Credentials *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma, MD (Ayu)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Institutional Email *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                placeholder="name@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Policy Checklist (Visible during registration) */}
            {!isLogin && (
              <div
                style={{
                  marginTop: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  background: 'var(--surface-card-subtle)',
                  border: '1px solid var(--surface-border)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                  HIPAA Security Password Standards:
                </div>
                <div style={{ color: passwordCriteria.length ? 'var(--badge-supported-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={12} color={passwordCriteria.length ? 'var(--badge-supported-color)' : 'var(--text-muted)'} />
                  At least 8 characters
                </div>
                <div style={{ color: passwordCriteria.upper && passwordCriteria.lower ? 'var(--badge-supported-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={12} color={passwordCriteria.upper && passwordCriteria.lower ? 'var(--badge-supported-color)' : 'var(--text-muted)'} />
                  Uppercase and lowercase letters
                </div>
                <div style={{ color: passwordCriteria.digit ? 'var(--badge-supported-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={12} color={passwordCriteria.digit ? 'var(--badge-supported-color)' : 'var(--text-muted)'} />
                  At least one numeric digit
                </div>
                <div style={{ color: passwordCriteria.special ? 'var(--badge-supported-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={12} color={passwordCriteria.special ? 'var(--badge-supported-color)' : 'var(--text-muted)'} />
                  At least one symbol (@$!%*?&#^()_+-=)
                </div>
              </div>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Role & Clinical Responsibility *
                </label>
                <div style={{ position: 'relative' }}>
                  <Shield size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '36px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '8px',
                      paddingTop: '0.65rem',
                      paddingBottom: '0.65rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="clinician">Clinician (Search, Pipeline, Reports, FHIR Export)</option>
                    <option value="reviewer">Reviewer (Audit Trail Endorsement & Quality Assurance)</option>
                    <option value="admin">Administrator (Complete Governance & Access Overrides)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Organization / Hospital (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="e.g. All India Institute of Ayurveda"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, var(--accent-color), var(--purple-accent))',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={18} className="spin-animate" /> : <KeyRound size={18} />}
            {loading ? 'Authenticating...' : isLogin ? 'Sign In to ClinBridge' : 'Register Account'}
          </button>
        </form>

        {/* Demo Fast Fill Section */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--surface-border)',
            fontSize: '0.75rem'
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            Demo Quick Login Credentials:
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('clinician')}
              style={{
                fontSize: '0.72rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                background: 'var(--surface-card-subtle)',
                border: '1px solid var(--surface-border)',
                color: 'var(--accent-color)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clinician Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('reviewer')}
              style={{
                fontSize: '0.72rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                background: 'var(--surface-card-subtle)',
                border: '1px solid var(--surface-border)',
                color: 'var(--purple-accent)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reviewer Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('admin')}
              style={{
                fontSize: '0.72rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                background: 'var(--surface-card-subtle)',
                border: '1px solid var(--surface-border)',
                color: 'var(--badge-supported-color)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '../../../components/common';
import { useAuth } from '../../../app/providers/AuthContext';
import { usePwaInstall } from '../../../hooks/usePwaInstall';
import { PwaInstallModal } from '../../../components/common/PwaInstallModal/PwaInstallModal';
import loginBg from '../../../assets/images/login.png';
import logoImg from '../../../assets/images/logo.png';
import './LoginPage.css';

export function LoginPage() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [bloodGroup, setBloodGroup] = useState('UNKNOWN');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, registerPatient } = useAuth();
  const { canInstall, triggerInstall, showGuideModal, setShowGuideModal, isIOS } = usePwaInstall();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'login') {
      if (!email || !password) {
        const msg = 'Please provide both email and password.';
        setError(msg);
        toast.error(msg);
        return;
      }

      setLoading(true);
      try {
        await login(email, password);
        toast.success('Signed in successfully!');
        navigate(from, { replace: true });
      } catch (err) {
        const msg = err.message || 'Login failed. Please check credentials.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      if (!name || !email || !password || !phone) {
        const msg = 'Please fill in Name, Phone, Email, and Password.';
        setError(msg);
        toast.error(msg);
        return;
      }

      setLoading(true);
      try {
        await registerPatient({
          name,
          email,
          password,
          phone,
          gender,
          bloodGroup,
        });
        toast.success('Account created successfully!');
        navigate('/appointments', { replace: true });
      } catch (err) {
        const msg = err.message || 'Registration failed. Please try again.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="modern-login-layout"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {canInstall && (
        <button
          type="button"
          className="login-pwa-install-top-btn"
          onClick={triggerInstall}
          title="Install LifeCare app on your phone"
        >
          📲 Install App
        </button>
      )}

      {/* Left Content Column */}
      <div className="modern-left-column">
        {/* Top Logo */}
        <div className="modern-brand-header">
          <img src={logoImg} alt="LifeCare HMS" className="modern-brand-logo-img" />
        </div>

        {/* Hero Headline & Intro */}
        <div className="modern-hero-text">
          <div className="modern-hero-kicker">Smart Hospital Management</div>
          <h1 className="modern-hero-title">
            Better Care. <br />
            <span className="modern-hero-accent">Smarter Management.</span>
          </h1>
          <p className="modern-hero-desc">
            Manage patients, doctors, appointments, medical records and hospital operations in one place.
          </p>
        </div>

        {/* 5 Feature Bullets */}
        <div className="modern-features-list">
          <div className="modern-feature-item">
            <div className="feature-icon-circle">
              <span className="feature-check-mark">✓</span>
            </div>
            <span>Patient Self-Service &amp; Doctor Booking</span>
          </div>

          <div className="modern-feature-item">
            <div className="feature-icon-circle">
              <span className="feature-check-mark">✓</span>
            </div>
            <span>Doctor &amp; Appointment Management</span>
          </div>

          <div className="modern-feature-item">
            <div className="feature-icon-circle">
              <span className="feature-check-mark">✓</span>
            </div>
            <span>OPD / IPD &amp; Bed Management</span>
          </div>

          <div className="modern-feature-item">
            <div className="feature-icon-circle">
              <span className="feature-check-mark">✓</span>
            </div>
            <span>Pharmacy &amp; Laboratory Services</span>
          </div>

          <div className="modern-feature-item">
            <div className="feature-icon-circle">
              <span className="feature-check-mark">✓</span>
            </div>
            <span>Billing &amp; Reports</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="modern-hero-footer">
          Enterprise Healthcare Portal &bull; All Rights Reserved
        </div>
      </div>

      {/* Right Login Card Column */}
      <div className="modern-right-column">
        <div className="floating-login-card">
          {/* Card Top Icon */}
          <div className="login-card-badge">
            <span className="badge-plus-symbol">✚</span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-mode-tab-group" style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                background: authMode === 'login' ? '#ffffff' : 'transparent',
                color: authMode === 'login' ? '#0f172a' : '#64748b',
                boxShadow: authMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                background: authMode === 'register' ? '#ffffff' : 'transparent',
                color: authMode === 'register' ? '#0f172a' : '#64748b',
                boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Patient Sign Up
            </button>
          </div>

          {/* Heading */}
          {authMode === 'login' ? (
            <>
              <h2 className="login-card-title">Hospital Portal Login</h2>
              <p className="login-card-subtitle">
                Sign in to access medical records, consultations, and hospital operations.
              </p>
            </>
          ) : (
            <>
              <h2 className="register-modal-heading">Create your patient account</h2>
              <p className="register-modal-subtext">
                It takes about a minute. Fields marked * are required.
              </p>
            </>
          )}

          {/* Alert */}
          {error && (
            <div className="login-error-banner" role="alert">
              {error}
            </div>
          )}

          {/* Form */}
          {authMode === 'register' ? (
            <form onSubmit={handleSubmit} className="patient-reg-form">
              {/* Full name */}
              <div className="patient-field-group">
                <label className="patient-field-label">
                  Full name <span className="patient-req-star">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jaydip Bela"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="patient-text-input"
                />
              </div>

              {/* Phone number with +91 */}
              <div className="patient-field-group">
                <label className="patient-field-label">
                  Phone number <span className="patient-req-star">*</span>
                </label>
                <div className="phone-input-combined">
                  <div className="phone-prefix-box">+91</div>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="patient-text-input"
                  />
                </div>
              </div>

              {/* Gender and Blood group row */}
              <div className="gender-blood-row">
                <div className="patient-field-group">
                  <label className="patient-field-label">Gender</label>
                  <div className="gender-chips-wrap">
                    {['Male', 'Female', 'Other'].map((g) => {
                      const val = g.toUpperCase();
                      const isActive = gender === val;
                      return (
                        <button
                          key={g}
                          type="button"
                          className={`gender-chip-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setGender(val)}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="patient-field-group">
                  <label className="patient-field-label">Blood group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="blood-select-input"
                  >
                    <option value="UNKNOWN">Not sure</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Email address */}
              <div className="patient-field-group">
                <label className="patient-field-label">
                  Email address <span className="patient-req-star">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="patient-text-input"
                />
              </div>

              {/* Password with Show button and 4-bar indicator */}
              <div className="patient-field-group">
                <label className="patient-field-label">
                  Password <span className="patient-req-star">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="patient-text-input"
                  />
                  <button
                    type="button"
                    className="btn-show-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* 4 strength bars */}
                <div className="password-bars-row">
                  <div className={`strength-bar-unit ${password.length >= 2 ? 'active' : ''}`} />
                  <div className={`strength-bar-unit ${password.length >= 5 ? 'active' : ''}`} />
                  <div className={`strength-bar-unit ${password.length >= 8 ? 'active' : ''}`} />
                  <div className={`strength-bar-unit ${password.length >= 10 && /\d/.test(password) ? 'active' : ''}`} />
                </div>
                <span className="password-hint-text">
                  Use 8 or more characters with a number.
                </span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-create-account-teal"
              >
                {loading ? 'Creating account...' : 'Create my account'}
              </button>

              {/* Bottom security assurance */}
              <div className="patient-security-note">
                <span className="security-bold-line">✔ Your data is encrypted</span>
                <span className="security-sub-line">
                  We only use it to run your hospital visits.
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="login-form-content">
              <div className="custom-input-group">
                <label htmlFor="login-email" className="custom-input-label">
                  Email Address <span className="label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-icon-left" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="custom-field-input"
                  />
                </div>
              </div>

              <div className="custom-input-group">
                <label htmlFor="login-password" className="custom-input-label">
                  Password <span className="label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-icon-left" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="custom-field-input"
                  />
                  <button
                    type="button"
                    className="input-icon-right-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </>
                      ) : (
                        <>
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                          <line x1="2" x2="22" y1="2" y2="22"/>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="login-action-btn"
              >
                Sign In to System
              </Button>

              {/* Secure & Trusted Footnote */}
              <div className="login-card-trust">
                <div className="trust-badge">
                  <span className="trust-check">✔</span>
                  <span>Secure &amp; Trusted</span>
                </div>
                <p className="trust-subtext">
                  🔒 256-Bit SSL Encrypted &bull; HIPAA Compliant Architecture
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      <PwaInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
      />
    </div>
  );
}

export default LoginPage;

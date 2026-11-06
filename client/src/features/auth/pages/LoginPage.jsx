import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/common';
import { useAuth } from '../../../app/providers/AuthContext';
import loginBg from '../../../assets/images/login.png';
import logoImg from '../../../assets/images/logo.png';
import './LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modern-login-layout"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
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
            <span>Patient &amp; Medical Records</span>
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

          {/* Heading */}
          <h2 className="login-card-title">Hospital Portal Login</h2>
          <p className="login-card-subtitle">
            Sign in to access medical records, consultations, and hospital operations.
          </p>

          {/* Alert */}
          {error && (
            <div className="login-error-banner" role="alert">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form-content">
            <div className="custom-input-group">
              <label htmlFor="login-email" className="custom-input-label">
                Email or Username <span className="label-required">*</span>
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
          </form>

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
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

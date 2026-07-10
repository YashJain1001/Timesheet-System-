import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, Clock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/index.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const validate = (): boolean => {
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    return true;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      triggerShake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/password-reset-request/', { email: email.trim() });
      setSuccess(true);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && data.email) {
        setEmailError(Array.isArray(data.email) ? data.email[0] : data.email);
      } else {
        setError(data?.detail || 'Request failed. Please try again.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, left: -100 }} />
        <div className="auth-bg-blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: -80, left: -80 }} />
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div className="auth-logo-placeholder">
            <CheckCircle size={36} color="white" />
          </div>
          <h2 className="auth-title" style={{ marginBottom: '0.5rem' }}>Link Sent!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
            If an active account exists with the email <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            Note: For development, check the backend Django server console to find the link.
          </p>
          <Link
            to="/login"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, left: -100 }} />
      <div className="auth-bg-blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: -80, right: -80 }} />

      <div className={`auth-card${shake ? ' shake' : ''}`} style={{ maxWidth: 400 }}>
        <div className="auth-logo-placeholder">
          <Clock size={36} color="white" />
        </div>
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">We will email you a password reset link</p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                className={`input-field${emailError ? ' error' : ''}`}
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="john@company.com"
                style={{ paddingRight: '2.5rem' }}
                disabled={loading}
              />
              <Mail
                size={16}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
            {emailError && <span className="form-error"><AlertCircle size={12} />{emailError}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <Mail size={18} />}
            {loading ? 'Sending link…' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

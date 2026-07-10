import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import '../styles/index.css';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<{ password?: string; confirm_password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errs.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errs.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errs.confirm_password = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirm_password = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !token) {
      setServerError('Invalid reset link. Please request a new link.');
      triggerShake();
      return;
    }
    if (!validate()) {
      triggerShake();
      return;
    }
    setServerError('');
    setLoading(true);
    try {
      await api.post('/password-reset-confirm/', {
        uid,
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const mapped: typeof errors = {};
        if (data.new_password) {
          mapped.password = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
        } else {
          setServerError(data.detail || 'Reset failed. The link might have expired.');
        }
      } else {
        setServerError('Reset failed. The link might have expired.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="auth-page">
        <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, left: -100 }} />
        <div className="auth-bg-blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: -80, right: -80 }} />
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div className="auth-logo-placeholder">
            <AlertCircle size={36} color="white" />
          </div>
          <h2 className="auth-title" style={{ marginBottom: '0.5rem' }}>Invalid Link</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
            This password reset link is invalid or has expired. Please request a new link.
          </p>
          <Link
            to="/forgot-password"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, left: -100 }} />
        <div className="auth-bg-blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: -80, right: -80 }} />
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div className="auth-logo-placeholder" style={{ background: 'var(--success-color)' }}>
            <CheckCircle size={36} color="white" />
          </div>
          <h2 className="auth-title" style={{ marginBottom: '0.5rem' }}>Password Reset!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Your password has been changed successfully. Redirecting you to login…
          </p>
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
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter your new secure password</p>

        {serverError && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reset-pass">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-pass"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field${errors.password ? ' error' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                style={{ paddingRight: '2.75rem' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error"><AlertCircle size={12} />{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field${errors.confirm_password ? ' error' : ''}`}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirm_password: undefined })); }}
                placeholder="Re-enter your new password"
                style={{ paddingRight: '2.75rem' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirm_password && <span className="form-error"><AlertCircle size={12} />{errors.confirm_password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <KeyRound size={18} />}
            {loading ? 'Resetting password…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, Clock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/index.css';

interface FormData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  number: string;
  password: string;
  confirm_password: string;
}

interface FormErrors {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  number?: string;
  password?: string;
  confirm_password?: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    number: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [shake, setShake] = useState(false);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!form.username.trim()) {
      errs.username = 'Username is required';
    } else if (form.username.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      errs.username = 'Username can only contain letters, numbers and underscores';
    }

    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required';

    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }

    if (form.number && !/^\+?[\d\s\-]{7,15}$/.test(form.number)) {
      errs.number = 'Enter a valid phone number';
    }

    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(form.password)) {
      errs.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = 'Password must contain at least one number';
    }

    if (!form.confirm_password) {
      errs.confirm_password = 'Please confirm your password';
    } else if (form.password !== form.confirm_password) {
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
    if (!validate()) { triggerShake(); return; }
    setServerError('');
    setLoading(true);
    try {
      await api.post('/register/', {
        username:   form.username.trim(),
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email:      form.email.trim(),
        number:     form.number.trim() || undefined,
        password:   form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        // Map backend field errors dynamically
        const mapped: FormErrors = {};
        let hasFieldErrors = false;
        
        Object.keys(data).forEach((key) => {
          const val = data[key];
          const errMsg = Array.isArray(val) ? val[0] : val;
          if (key === 'detail') {
            setServerError(errMsg);
          } else {
            mapped[key as keyof FormErrors] = errMsg;
            hasFieldErrors = true;
          }
        });
        
        if (hasFieldErrors) {
          setErrors(prev => ({ ...prev, ...mapped }));
        } else {
          setServerError(data.detail || 'Registration failed. Please try again.');
        }
      } else {
        setServerError('Registration failed. Please try again.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle size={56} color="var(--success-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Account Created!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Redirecting you to the login page…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, right: -100 }} />
      <div className="auth-bg-blob" style={{ width: 350, height: 350, background: '#8b5cf6', bottom: -80, left: -80 }} />

      <div className={`auth-card${shake ? ' shake' : ''}`} style={{ maxWidth: 480 }}>
        <div className="auth-logo-placeholder">
          <Clock size={36} color="white" />
        </div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join TimeFlow to track your timesheets</p>

        {serverError && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Name Row */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-first-name">First Name *</label>
              <input
                id="reg-first-name"
                type="text"
                className={`input-field${errors.first_name ? ' error' : ''}`}
                value={form.first_name}
                onChange={set('first_name')}
                placeholder="John"
              />
              {errors.first_name && <span className="form-error"><AlertCircle size={12} />{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-last-name">Last Name *</label>
              <input
                id="reg-last-name"
                type="text"
                className={`input-field${errors.last_name ? ' error' : ''}`}
                value={form.last_name}
                onChange={set('last_name')}
                placeholder="Doe"
              />
              {errors.last_name && <span className="form-error"><AlertCircle size={12} />{errors.last_name}</span>}
            </div>
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username *</label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              className={`input-field${errors.username ? ' error' : ''}`}
              value={form.username}
              onChange={set('username')}
              placeholder="john_doe"
            />
            {errors.username
              ? <span className="form-error"><AlertCircle size={12} />{errors.username}</span>
              : <span className="form-hint">Letters, numbers and underscores only</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className={`input-field${errors.email ? ' error' : ''}`}
              value={form.email}
              onChange={set('email')}
              placeholder="john@company.com"
            />
            {errors.email && <span className="form-error"><AlertCircle size={12} />{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-number">Phone Number</label>
            <input
              id="reg-number"
              type="tel"
              className={`input-field${errors.number ? ' error' : ''}`}
              value={form.number}
              onChange={set('number')}
              placeholder="+91 9876543210 (optional)"
            />
            {errors.number && <span className="form-error"><AlertCircle size={12} />{errors.number}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field${errors.password ? ' error' : ''}`}
                value={form.password}
                onChange={set('password')}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                style={{ paddingRight: '2.75rem' }}
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
            <label className="form-label" htmlFor="reg-confirm">Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field${errors.confirm_password ? ' error' : ''}`}
                value={form.confirm_password}
                onChange={set('confirm_password')}
                placeholder="Re-enter your password"
                style={{ paddingRight: '2.75rem' }}
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
            id="register-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <UserPlus size={18} />}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

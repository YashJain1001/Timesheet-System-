import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { LogIn, Clock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import '../styles/index.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // Validation
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  useEffect(() => {
    if (user) {
      if (user.is_superuser) navigate('/superuser/dashboard', { replace: true });
      else if (user.is_team_lead) navigate('/teamlead/dashboard', { replace: true });
      else navigate('/employee/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 4) newErrors.password = 'Password is too short';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { triggerShake(); return; }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/token/', { username: username.trim(), password });
      login(response.data.access, response.data.refresh);
      // Navigation happens via useEffect when user loads
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative blobs */}
      <div className="auth-bg-blob" style={{ width: 500, height: 500, background: '#6366f1', top: -100, left: -100 }} />
      <div className="auth-bg-blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: -80, right: -80 }} />

      <div className={`auth-card${shake ? ' shake' : ''}`} style={{ maxWidth: 400 }}>
        {/* Logo placeholder */}
        <div className="auth-logo-placeholder">
          <Clock size={36} color="white" />
        </div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to TimeFlow to continue</p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              className={`input-field${errors.username ? ' error' : ''}`}
              value={username}
              onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
              placeholder="Enter your username"
            />
            {errors.username && <span className="form-error"><AlertCircle size={12} />{errors.username}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                className={`input-field${errors.password ? ' error' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                placeholder="Enter your password"
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

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <LogIn size={18} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

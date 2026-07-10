import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Home } from 'lucide-react';

const NotFound: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '2rem',
    textAlign: 'center',
  }}>
    <div style={{ marginBottom: '1.5rem', opacity: 0.15 }}>
      <Clock size={80} color="var(--accent-color)" />
    </div>
    <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--accent-color)', lineHeight: 1, marginBottom: '0.5rem' }}>
      404
    </div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
      Page Not Found
    </h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: 360 }}>
      The page you're looking for doesn't exist or you don't have permission to access it.
    </p>
    <Link to="/" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
      <Home size={18} /> Back to Home
    </Link>
  </div>
);

export default NotFound;

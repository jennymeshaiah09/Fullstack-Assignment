import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authAPI } from '../utils/api.js';

const ROLES = [
  { value: 'viewer', label: 'Viewer — watch and review videos' },
  { value: 'editor', label: 'Editor — upload and manage videos' },
  { value: 'admin',  label: 'Admin — full platform access' },
];

export default function Register() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.register(form);
      login(res.data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = (() => {
    const pw = form.password;
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Weak', color: 'var(--color-flagged)', width: '25%' };
    if (pw.length < 10) return { label: 'Fair', color: 'var(--color-processing)', width: '55%' };
    return { label: 'Strong', color: 'var(--color-safe)', width: '100%' };
  })();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        position: 'fixed',
        bottom: '-200px',
        right: '-100px',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(108,58,232,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: '460px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'var(--color-primary)',
            fontSize: '24px',
            marginBottom: '12px',
          }}>
            ▶
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Pulse<span style={{ color: 'var(--color-primary)' }}>Vid</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Create your account
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>Get started</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Join PulseVid to start uploading and analysing videos
          </p>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '0.875rem',
              color: 'var(--color-flagged)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label htmlFor="name">Full name <span style={{ color: 'var(--color-flagged)' }}>*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-control"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address <span style={{ color: 'var(--color-flagged)' }}>*</span></label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                className="form-control"
                value={form.role}
                onChange={handleChange}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span style={{ color: 'var(--color-flagged)' }}>*</span>
                {passwordStrength && (
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                )}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              {passwordStrength && (
                <div style={{ marginTop: '6px' }}>
                  <div className="progress-track" style={{ height: '4px' }}>
                    <div className="progress-fill" style={{ width: passwordStrength.width, background: passwordStrength.color }} />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm password <span style={{ color: 'var(--color-flagged)' }}>*</span></label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                className="form-control"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); if (error) setError(''); }}
                autoComplete="new-password"
                required
              />
              {confirm && form.password && confirm === form.password && (
                <span style={{ fontSize: '0.78rem', color: 'var(--color-safe)', marginTop: '4px' }}>
                  ✓ Passwords match
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: '4px' }}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

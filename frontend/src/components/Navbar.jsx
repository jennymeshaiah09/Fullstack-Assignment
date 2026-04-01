import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: '64px',
    background: 'rgba(26, 26, 46, 0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
  },
  inner: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    marginRight: '16px',
    flexShrink: 0,
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  logoText: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  logoAccent: {
    color: 'var(--color-primary)',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '9999px',
    fontSize: '0.82rem',
    color: 'var(--color-text-secondary)',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 0,
  },
  mobileToggle: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '4px 8px',
  },
};

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
        background: isActive ? 'rgba(108, 58, 232, 0.15)' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
      })}
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user
    ? (user.name || user.email || 'U').slice(0, 2).toUpperCase()
    : 'U';

  const displayName = user?.name || user?.email || 'User';

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <NavLink to="/dashboard" style={styles.logo}>
          <span style={styles.logoIcon}>▶</span>
          <span style={styles.logoText}>
            Pulse<span style={styles.logoAccent}>Vid</span>
          </span>
        </NavLink>

        {/* Nav links */}
        <div style={styles.links}>
          <NavItem to="/dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </NavItem>
          <NavItem to="/upload">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Upload
          </NavItem>
          <NavItem to="/library">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
            Library
          </NavItem>
          {user?.role === 'admin' && (
            <NavItem to="/admin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin
            </NavItem>
          )}
        </div>

        {/* Right side */}
        <div style={styles.right}>
          {user && (
            <div style={styles.userBadge}>
              <div style={styles.avatar}>{initials}</div>
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              {user.role && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '1px 7px',
                  borderRadius: '9999px',
                  background: 'rgba(108, 58, 232, 0.2)',
                  color: 'var(--color-primary)',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}>
                  {user.role}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

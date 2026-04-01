import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI, authAPI } from '../utils/api.js';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const mb = bytes / (1024 ** 2);
  return mb >= 1000 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

const STATUS_MAP = {
  safe:       { label: 'Safe',       color: 'var(--color-safe)',       bg: 'rgba(16,185,129,0.12)' },
  flagged:    { label: 'Flagged',    color: 'var(--color-flagged)',     bg: 'rgba(239,68,68,0.12)' },
  processing: { label: 'Processing', color: 'var(--color-processing)',  bg: 'rgba(245,158,11,0.12)' },
  pending:    { label: 'Pending',    color: 'var(--color-text-muted)',  bg: 'rgba(107,114,128,0.12)' },
};

const TABS = ['Overview', 'All Videos', 'Users'];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'viewer', organisation: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      videoAPI.getAllAdmin(),
      authAPI.getAllUsers(),
    ])
      .then(([vRes, uRes]) => {
        setVideos(vRes.data.videos || []);
        setUsers(uRes.data.users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = videos.length;
    const flagged = videos.filter(v => v.status === 'flagged').length;
    const safe = videos.filter(v => v.status === 'safe').length;
    const processing = videos.filter(v => v.status === 'processing' || v.status === 'pending').length;
    const totalSize = videos.reduce((sum, v) => sum + (v.fileSize || 0), 0);
    return { total, flagged, safe, processing, totalSize };
  }, [videos]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await authAPI.createUser(createForm);
      setUsers(prev => [res.data.user, ...prev]);
      setCreateForm({ name: '', email: '', password: '', role: 'viewer', organisation: '' });
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await authAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  }

  const filteredVideos = useMemo(() => {
    let list = videos;
    if (statusFilter !== 'all') list = list.filter(v => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.uploadedBy?.email?.toLowerCase().includes(q) ||
        v.uploadedBy?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, statusFilter, search]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-secondary)' }}>
          Loading admin panel…
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper fade-in">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Admin Panel</h1>
          <span style={{
            fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px',
            borderRadius: '9999px', background: 'rgba(239,68,68,0.15)', color: 'var(--color-flagged)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Admin Only</span>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Manage all users and videos across the platform
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '28px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 18px', borderRadius: '6px', border: 'none',
            background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
            fontSize: '0.85rem', fontWeight: activeTab === tab ? '600' : '400',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Videos',   value: stats.total,      color: 'var(--color-primary)',    icon: '🎬' },
              { label: 'Flagged',        value: stats.flagged,    color: 'var(--color-flagged)',    icon: '⚠️' },
              { label: 'Safe',           value: stats.safe,       color: 'var(--color-safe)',       icon: '✓' },
              { label: 'Processing',     value: stats.processing, color: 'var(--color-processing)', icon: '⟳' },
              { label: 'Total Users',    value: users.length,     color: 'var(--color-primary)',    icon: '👥' },
              { label: 'Storage Used',   value: formatBytes(stats.totalSize), color: 'var(--color-text)', icon: '💾' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '20px',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Flagged videos alert */}
          {stats.flagged > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-lg)', padding: '18px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--color-flagged)' }}>
                    {stats.flagged} flagged video{stats.flagged > 1 ? 's' : ''} require review
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Sensitive content detected — please review before sharing
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setActiveTab('All Videos'); setStatusFilter('flagged'); }}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', color: 'var(--color-flagged)', flexShrink: 0 }}
              >
                View flagged →
              </button>
            </div>
          )}

          {/* Recent flagged */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px' }}>Recent Uploads</h3>
            <VideoTable videos={videos.slice(0, 5)} onView={id => navigate(`/video/${id}`)} />
          </div>
        </div>
      )}

      {/* ALL VIDEOS TAB */}
      {activeTab === 'All Videos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search" placeholder="Search by title or user…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '36px', width: '260px', fontSize: '0.85rem' }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="form-control" style={{ width: '150px', fontSize: '0.85rem' }}>
              <option value="all">All Statuses</option>
              <option value="safe">Safe</option>
              <option value="flagged">Flagged</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
              {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <VideoTable videos={filteredVideos} onView={id => navigate(`/video/${id}`)} showUser />
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'Users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {users.length} user{users.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(''); }}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create User
            </button>
          </div>

          {/* Create user form */}
          {showCreateForm && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid rgba(108,58,232,0.3)',
              borderRadius: 'var(--radius-lg)', padding: '24px',
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '18px' }}>Create New User</h3>
              <form onSubmit={handleCreateUser}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                    <input
                      className="form-control" placeholder="John Doe"
                      value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      required style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Email *</label>
                    <input
                      type="email" className="form-control" placeholder="john@example.com"
                      value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      required style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Password *</label>
                    <input
                      type="password" className="form-control" placeholder="Min 6 characters"
                      value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                      required style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Role *</label>
                    <select
                      className="form-control"
                      value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Organisation</label>
                    <input
                      className="form-control" placeholder="e.g. Acme Corp (optional)"
                      value={createForm.organisation} onChange={e => setCreateForm(p => ({ ...p, organisation: e.target.value }))}
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
                {createError && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-flagged)', marginBottom: '12px' }}>{createError}</p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={createLoading} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                    {createLoading ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users table */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  {['User', 'Email', 'Role', 'Organisation', 'Joined', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem',
                      fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'rgba(108,58,232,0.2)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)', flexShrink: 0,
                        }}>
                          {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>{u.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px', textTransform: 'capitalize',
                        background: u.role === 'admin' ? 'rgba(239,68,68,0.12)' : u.role === 'editor' ? 'rgba(108,58,232,0.12)' : 'rgba(107,114,128,0.12)',
                        color: u.role === 'admin' ? 'var(--color-flagged)' : u.role === 'editor' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{u.organisation || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatDate(u.createdAt)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleDeleteUser(u._id, u.name || u.email)}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.78rem', padding: '5px 10px', color: 'var(--color-flagged)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoTable({ videos, onView, showUser = false }) {
  const cols = showUser
    ? ['Title', 'User', 'Status', 'Score', 'Size', 'Uploaded', '']
    : ['Title', 'Status', 'Score', 'Size', 'Uploaded', ''];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {cols.map(h => (
            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem',
              fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {videos.map((v, i) => {
          const s = STATUS_MAP[v.status] || STATUS_MAP.pending;
          return (
            <tr key={v._id} style={{
              borderBottom: i < videos.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                <p style={{ fontWeight: '500', color: 'var(--color-text)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.title || 'Untitled'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {v.originalName}
                </p>
              </td>
              {showUser && (
                <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                  <p>{v.uploadedBy?.name || '—'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{v.uploadedBy?.email}</p>
                </td>
              )}
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px',
                  background: s.bg, color: s.color,
                }}>
                  {s.label}
                </span>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                {v.sensitivityScore !== undefined ? `${v.sensitivityScore}%` : '—'}
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                {formatBytes(v.fileSize)}
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                {formatDate(v.createdAt)}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <button onClick={() => onView(v._id)} className="btn btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
                  View
                </button>
              </td>
            </tr>
          );
        })}
        {videos.length === 0 && (
          <tr><td colSpan={showUser ? 7 : 6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No videos found
          </td></tr>
        )}
      </tbody>
    </table>
  );
}

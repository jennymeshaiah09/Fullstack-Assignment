import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { videoAPI } from '../utils/api.js';

const STATUS_META = {
  safe:       { label: 'Safe',       badgeClass: 'badge-safe',       icon: '✓' },
  flagged:    { label: 'Flagged',    badgeClass: 'badge-flagged',    icon: '⚠' },
  processing: { label: 'Processing', badgeClass: 'badge-processing', icon: '⟳' },
  pending:    { label: 'Pending',    badgeClass: 'badge-pending',    icon: '◷' },
};

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function StatCard({ label, value, color, icon, description }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1, color: 'var(--color-text)', marginBottom: '4px' }}>{value}</p>
        {description && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const greeting = user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back';

  const [videos, setVideos] = useState([]);

  useEffect(() => {
    videoAPI.getAll()
      .then(res => setVideos(res.data.videos || []))
      .catch(() => setVideos([]));
  }, []);

  const stats = {
    total:      videos.length,
    safe:       videos.filter(v => v.status === 'safe').length,
    flagged:    videos.filter(v => v.status === 'flagged').length,
    processing: videos.filter(v => v.status === 'processing').length,
    pending:    videos.filter(v => v.status === 'pending').length,
  };

  const recentVideos = videos.slice(0, 5);

  const safePercent = stats.total > 0
    ? Math.round((stats.safe / stats.total) * 100)
    : 0;

  return (
    <div className="page-wrapper fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{greeting} 👋</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Here's an overview of your video library
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary" style={{ gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload Video
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '40px',
      }}>
        <StatCard
          label="Total Videos"
          value={stats.total}
          color="var(--color-primary)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          }
          description="Across all statuses"
        />
        <StatCard
          label="Safe"
          value={stats.safe}
          color="var(--color-safe)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
            </svg>
          }
          description={`${safePercent}% of library`}
        />
        <StatCard
          label="Flagged"
          value={stats.flagged}
          color="var(--color-flagged)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          }
          description="Requires review"
        />
        <StatCard
          label="Processing"
          value={stats.processing}
          color="var(--color-processing)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          }
          description="Being analysed"
        />
      </div>

      {/* Content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Recent uploads table */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Recent Uploads</h2>
            <Link to="/library" style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: '500' }}>
              View all →
            </Link>
          </div>

          <div>
            {recentVideos.map((video, i) => {
              const meta = STATUS_META[video.status] || STATUS_META.pending;
              return (
                <Link
                  key={video._id}
                  to={`/video/${video._id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 24px',
                    borderBottom: i < recentVideos.length - 1 ? '1px solid var(--color-border)' : 'none',
                    textDecoration: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(108, 58, 232, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Thumbnail placeholder */}
                  <div style={{
                    width: '64px',
                    height: '40px',
                    borderRadius: '6px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-text-muted)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {video.title}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {formatDate(video.uploadedAt)} · {formatDuration(video.duration)}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Library health */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px' }}>Library Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Safe',       value: stats.safe,       color: 'var(--color-safe)',       total: stats.total },
                { label: 'Flagged',    value: stats.flagged,    color: 'var(--color-flagged)',    total: stats.total },
                { label: 'Processing', value: stats.processing, color: 'var(--color-processing)', total: stats.total },
                { label: 'Pending',    value: stats.pending,    color: 'var(--color-pending)',    total: stats.total },
              ].map(item => {
                const pct = Math.round((item.value / item.total) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.value} ({pct}%)</span>
                    </div>
                    <div className="progress-track" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/upload" className="btn btn-primary btn-full">
                Upload New Video
              </Link>
              <Link to="/library?filter=flagged" className="btn btn-danger btn-full">
                Review Flagged Videos
              </Link>
              <Link to="/library" className="btn btn-ghost btn-full">
                Browse Library
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

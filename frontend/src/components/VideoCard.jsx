import React from 'react';
import { useNavigate } from 'react-router-dom';

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const STATUS_MAP = {
  safe:       { label: 'Safe',       className: 'badge-safe' },
  flagged:    { label: 'Flagged',    className: 'badge-flagged' },
  processing: { label: 'Processing', className: 'badge-processing' },
  pending:    { label: 'Pending',    className: 'badge-pending' },
};

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const { id, title, status, uploadedAt, createdAt, duration, thumbnail, thumbnailUrl } = video;
  const thumbSrc = thumbnail || thumbnailUrl;
  const dateToShow = uploadedAt || createdAt;
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <div
      onClick={() => navigate(`/video/${id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        e.currentTarget.style.borderColor = 'rgba(108, 58, 232, 0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {/* Thumbnail */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ThumbnailPlaceholder status={status} />
        )}

        {/* Duration badge */}
        {duration > 0 && (
          <span style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: '600',
            padding: '2px 7px',
            borderRadius: '4px',
          }}>
            {formatDuration(duration)}
          </span>
        )}

        {/* Play overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.18s ease',
          background: 'rgba(108, 58, 232, 0.3)',
        }}
          className="card-play-overlay"
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--color-text)',
            lineHeight: '1.35',
            flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {title || 'Untitled Video'}
          </h3>
          <span className={`badge ${statusInfo.className}`} style={{ flexShrink: 0 }}>
            {statusInfo.label}
          </span>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          Uploaded {formatDate(dateToShow)}
        </p>
      </div>

      {/* Inline style hack for play overlay hover */}
      <style>{`
        div:hover .card-play-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

function ThumbnailPlaceholder({ status }) {
  const colors = {
    safe:       'rgba(16, 185, 129, 0.12)',
    flagged:    'rgba(239, 68, 68, 0.12)',
    processing: 'rgba(245, 158, 11, 0.12)',
    pending:    'rgba(107, 114, 128, 0.12)',
  };
  const bg = colors[status] || colors.pending;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>No preview</span>
    </div>
  );
}

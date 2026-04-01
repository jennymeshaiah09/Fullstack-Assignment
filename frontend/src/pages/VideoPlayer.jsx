import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { videoAPI } from '../utils/api.js';

const STATUS_META = {
  safe:       { label: 'Safe',       badgeClass: 'badge-safe',       description: 'No sensitive content detected.' },
  flagged:    { label: 'Flagged',    badgeClass: 'badge-flagged',     description: 'Sensitive content detected. Review required.' },
  processing: { label: 'Processing', badgeClass: 'badge-processing',  description: 'Analysis in progress…' },
  pending:    { label: 'Pending',    badgeClass: 'badge-pending',     description: 'Awaiting analysis.' },
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDuration(s) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${mb.toFixed(0)} MB`;
}

export default function VideoPlayer() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [video, setVideo]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    videoAPI.getOne(id)
      .then(res => setVideo(res.data.video))
      .catch(() => setError('Video not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    setDeleting(true);
    try {
      await videoAPI.delete(id);
      navigate('/library');
    } catch {
      setDeleting(false);
      alert('Failed to delete video.');
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-secondary)' }}>
          Loading video…
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>Video not found</h3>
          <p>The video you're looking for doesn't exist or has been removed.</p>
          <Link to="/library" className="btn btn-primary" style={{ marginTop: '20px' }}>
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[video.status] || STATUS_META.pending;
  const token = localStorage.getItem('token');
  const streamUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/videos/${id}/stream?token=${token}`;

  return (
    <div className="page-wrapper fade-in">
      {/* Back nav */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ fontSize: '0.85rem', padding: '7px 14px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '28px',
        alignItems: 'start',
      }}>
        {/* Left: player + details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Video player */}
          <div style={{
            background: '#000',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            aspectRatio: '16/9',
          }}>
            {video.status === 'safe' || video.status === 'flagged' ? (
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                controls
                src={streamUrl}
                onError={() => {}}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)',
                gap: '16px',
                minHeight: '360px',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(108, 58, 232, 0.2)',
                  border: '2px solid rgba(108, 58, 232, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-primary)" style={{ marginLeft: '4px' }}>
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  Video is still being processed…
                </p>
              </div>
            )}
          </div>

          {/* Title + badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '700', flex: 1, lineHeight: '1.3' }}>
                {video.title}
              </h1>
              <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '0.8rem', padding: '5px 12px', flexShrink: 0 }}>
                {meta.label}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
              Uploaded on {formatDate(video.createdAt)}
            </p>
          </div>

          {/* Flag alert */}
          {video.status === 'flagged' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-flagged)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <strong style={{ color: 'var(--color-flagged)', fontSize: '0.9rem' }}>Sensitive Content Detected</strong>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                This video has been flagged during sensitivity analysis. Please review before sharing.
              </p>
            </div>
          )}
        </div>

        {/* Right: metadata panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Analysis result */}
          <div style={{
            background: 'var(--color-surface)',
            border: `1px solid ${
              video.status === 'safe' ? 'rgba(16, 185, 129, 0.3)'
              : video.status === 'flagged' ? 'rgba(239, 68, 68, 0.3)'
              : 'var(--color-border)'
            }`,
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px' }}>Analysis Result</h3>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: video.status === 'safe' ? 'rgba(16,185,129,0.15)'
                  : video.status === 'flagged' ? 'rgba(239,68,68,0.15)'
                  : 'rgba(245,158,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '20px',
              }}>
                {video.status === 'safe' ? '✓' : video.status === 'flagged' ? '⚠' : '⟳'}
              </div>
              <div>
                <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  {meta.description}
                </p>
              </div>
            </div>

            {video.sensitivityScore !== undefined && video.sensitivityScore !== null && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Sensitivity score</span>
                  <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{video.sensitivityScore}%</span>
                </div>
                <div className="progress-track" style={{ marginBottom: '16px' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${video.sensitivityScore}%`,
                      background: video.status === 'safe' ? 'var(--color-safe)' : 'var(--color-flagged)',
                    }}
                  />
                </div>

                {/* Content category breakdown */}
                {video.sensitivityDetails && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '2px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Content Categories
                    </p>
                    {[
                      { key: 'adult',    label: 'Adult / Explicit', icon: '🔞' },
                      { key: 'violence', label: 'Violence',         icon: '⚔️' },
                      { key: 'hate',     label: 'Hate Speech',      icon: '🚫' },
                    ].map(({ key, label, icon }) => {
                      const detected = video.sensitivityDetails[key];
                      return (
                        <div key={key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: detected ? 'rgba(239,68,68,0.08)' : 'var(--color-bg)',
                          border: `1px solid ${detected ? 'rgba(239,68,68,0.25)' : 'var(--color-border)'}`,
                        }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{icon}</span> {label}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: detected ? 'var(--color-flagged)' : 'var(--color-safe)',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: detected ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                          }}>
                            {detected ? 'Detected' : 'Clean'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File metadata */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px' }}>File Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Original name', value: video.originalName },
                { label: 'File size',     value: formatBytes(video.fileSize) },
                { label: 'Format',        value: video.mimeType },
                { label: 'Video ID',      value: video._id, mono: true },
              ].map(item => item.value ? (
                <div key={item.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border)',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{item.label}</span>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: '500',
                    color: 'var(--color-text)',
                    fontFamily: item.mono ? 'monospace' : 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.value}
                  </span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px' }}>Actions</h3>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-ghost btn-full"
              style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '0.85rem', color: 'var(--color-flagged)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              {deleting ? 'Deleting…' : 'Delete Video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

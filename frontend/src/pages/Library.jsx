import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard.jsx';
import { videoAPI } from '../utils/api.js';

const FILTERS = [
  { value: 'all',        label: 'All Videos' },
  { value: 'safe',       label: 'Safe' },
  { value: 'flagged',    label: 'Flagged' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending',    label: 'Pending' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name',   label: 'Name A–Z' },
];

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [activeFilter, setActiveFilter] = useState(initialFilter);

  // Sync filter state when URL param changes externally
  useEffect(() => {
    const f = searchParams.get('filter') || 'all';
    setActiveFilter(f);
  }, [searchParams]);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('newest');
  const [videos, setVideos]             = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    videoAPI.getAll()
      .then(res => setVideos(res.data.videos || []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  function handleFilterChange(value) {
    setActiveFilter(value);
    setSearchParams(value !== 'all' ? { filter: value } : {});
  }

  const filtered = useMemo(() => {
    let list = videos;

    if (activeFilter !== 'all') {
      list = list.filter(v => v.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.title.toLowerCase().includes(q));
    }

    if (sort === 'newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt || b.uploadedAt) - new Date(a.createdAt || a.uploadedAt));
    } else if (sort === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.createdAt || a.uploadedAt) - new Date(b.createdAt || b.uploadedAt));
    } else if (sort === 'name') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [activeFilter, search, sort, videos]);

  const counts = useMemo(() => {
    const c = { all: videos.length, safe: 0, flagged: 0, processing: 0, pending: 0 };
    videos.forEach(v => { if (c[v.status] !== undefined) c[v.status]++; });
    return c;
  }, [videos]);

  return (
    <div className="page-wrapper fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Video Library</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {videos.length} videos in your library
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload
        </Link>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Filter tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          gap: '2px',
          flexWrap: 'wrap',
        }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeFilter === f.value ? 'var(--color-primary)' : 'transparent',
                color: activeFilter === f.value ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '0.82rem',
                fontWeight: activeFilter === f.value ? '600' : '400',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {f.label}
              <span style={{
                fontSize: '0.7rem',
                background: activeFilter === f.value ? 'rgba(255,255,255,0.2)' : 'var(--color-bg)',
                color: activeFilter === f.value ? '#fff' : 'var(--color-text-muted)',
                padding: '0 5px',
                borderRadius: '9999px',
                fontWeight: '700',
              }}>
                {counts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Search videos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '36px', width: '220px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="form-control"
          style={{ width: '160px', fontSize: '0.85rem' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          Loading videos...
        </div>
      ) : filtered.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {filtered.map(video => (
            <VideoCard key={video._id} video={{ ...video, id: video._id }} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <h3>No videos found</h3>
          <p>
            {search ? `No results for "${search}"` : `No ${activeFilter !== 'all' ? activeFilter + ' ' : ''}videos yet`}
          </p>
          {!search && (
            <Link to="/upload" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Upload your first video
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

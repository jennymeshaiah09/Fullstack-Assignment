import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import ProcessingStatus from '../components/ProcessingStatus.jsx';

const SOCKET_URL = 'http://localhost:5000';
const MAX_FILE_SIZE_MB = 500;
const ACCEPTED_TYPES   = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const UPLOAD_STAGES = ['uploading', 'validating', 'analysing', 'classifying', 'complete'];

export default function Upload() {
  const [dragOver, setDragOver]     = useState(false);
  const [file, setFile]             = useState(null);
  const [fileError, setFileError]   = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Processing state from Socket.io
  const [processing, setProcessing] = useState(false);
  const [procStage, setProcStage]   = useState('');
  const [procProgress, setProcProgress] = useState(0);
  const [procStatus, setProcStatus] = useState('pending');
  const [procVideoId, setProcVideoId] = useState(null);

  const [uploadComplete, setUploadComplete] = useState(false);

  const fileInputRef = useRef(null);
  const socketRef    = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('processing_progress', (data) => {
      const { stage, progress } = data;
      setProcStage(stage);
      setProcProgress(progress);
      setProcStatus('processing');
    });

    socketRef.current.on('processing_complete', (data) => {
      const { status } = data;
      setProcStage('complete');
      setProcProgress(100);
      setProcStatus(status === 'safe' || status === 'flagged' ? 'complete' : 'complete');
      setProcessing(false);
    });

    socketRef.current.on('connect_error', () => {
      // Socket unavailable — graceful degradation (backend not running yet)
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  function validateFile(f) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Unsupported file type. Please upload MP4, WebM, MOV, AVI, or MKV.';
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }

  function handleFileSelect(f) {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError('');
    setFile(f);
    setUploadProgress(0);
    setProcessing(false);
    setProcStage('');
    setProcProgress(0);
    setProcStatus('pending');
    setUploadComplete(false);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  function handleInputChange(e) {
    const chosen = e.target.files[0];
    if (chosen) handleFileSelect(chosen);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setFileError('');

    try {
      const token = localStorage.getItem('token');

      // Step 1: Get presigned URL from backend
      const presignRes = await axios.get('http://localhost:5000/api/videos/presigned-url', {
        params: { filename: file.name, mimeType: file.type },
        headers: { Authorization: `Bearer ${token}` },
      });
      const { presignedUrl, s3Key } = presignRes.data;

      // Step 2: Upload directly to S3 (no backend involved)
      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      // Step 3: Tell backend upload is done — save metadata + start analysis
      const confirmRes = await axios.post('http://localhost:5000/api/videos/confirm-upload', {
        s3Key,
        title: file.name.replace(/\.[^/.]+$/, ''),
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const videoId = confirmRes.data.video._id;
      setUploading(false);
      setUploadComplete(true);
      setProcessing(true);
      setProcStage('validating');
      setProcProgress(10);
      setProcStatus('processing');
      setProcVideoId(videoId);
    } catch (err) {
      setUploading(false);
      const msg = err.response?.data?.message || 'Upload failed. Please check your connection and try again.';
      setFileError(msg);
    }
  }

  function resetUpload() {
    setFile(null);
    setFileError('');
    setUploading(false);
    setUploadProgress(0);
    setProcessing(false);
    setProcStage('');
    setProcProgress(0);
    setProcStatus('pending');
    setProcVideoId(null);
    setUploadComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1>Upload Video</h1>
        <p>Upload a video file for sensitivity analysis. Supported formats: MP4, WebM, MOV, AVI, MKV</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '28px',
        alignItems: 'start',
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Drop zone */}
          {!uploadComplete && (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !file && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary)' : fileError ? 'var(--color-flagged)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: dragOver
                  ? 'rgba(108, 58, 232, 0.06)'
                  : fileError
                  ? 'rgba(239, 68, 68, 0.04)'
                  : 'var(--color-surface)',
                cursor: file ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '260px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />

              {!file ? (
                <>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: dragOver ? 'rgba(108, 58, 232, 0.15)' : 'var(--color-bg)',
                    border: `2px solid ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    transition: 'all 0.2s ease',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke={dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"/>
                      <line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '8px', color: dragOver ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {dragOver ? 'Drop your video here' : 'Drag & drop your video'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                    or click to browse files
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Browse files
                  </button>
                  <p style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Max file size: {MAX_FILE_SIZE_MB} MB · MP4, WebM, MOV, AVI, MKV
                  </p>
                </>
              ) : (
                /* File selected preview */
                <div style={{ width: '100%' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    textAlign: 'left',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: 'rgba(108, 58, 232, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {formatBytes(file.size)} · {file.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); resetUpload(); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        flexShrink: 0,
                      }}
                      title="Remove file"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {/* Upload button */}
                  {!uploading && (
                    <button
                      type="button"
                      className="btn btn-primary btn-full btn-lg"
                      onClick={e => { e.stopPropagation(); handleUpload(); }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                      Upload &amp; Analyse
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {fileError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '0.875rem',
              color: 'var(--color-flagged)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {fileError}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Uploading…</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>{uploadProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '10px' }}>
                Uploading {file?.name}…
              </p>
            </div>
          )}

          {/* Processing status */}
          {(processing || uploadComplete) && (
            <ProcessingStatus
              stage={procStage}
              progress={procProgress}
              status={procStatus}
              videoId={procVideoId}
            />
          )}

          {/* Success CTA */}
          {procStatus === 'complete' && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontWeight: '600', color: 'var(--color-safe)', marginBottom: '2px' }}>
                  ✓ Analysis complete!
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Your video has been processed and added to your library.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={resetUpload} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                  Upload another
                </button>
                <a href="/library" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  View in library
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — guidelines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Upload Guidelines
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '✓', text: 'MP4, WebM, MOV, AVI, MKV supported', color: 'var(--color-safe)' },
                { icon: '✓', text: 'Maximum file size 500 MB', color: 'var(--color-safe)' },
                { icon: '✓', text: 'HD video recommended for best results', color: 'var(--color-safe)' },
                { icon: '⚠', text: 'Do not upload copyrighted material', color: 'var(--color-processing)' },
                { icon: '⚠', text: 'Processing may take several minutes', color: 'var(--color-processing)' },
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: item.color, fontWeight: '700', flexShrink: 0 }}>{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Processing pipeline info */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px' }}>
              How It Works
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { step: '1', title: 'Upload',     desc: 'Your video is securely transferred to our servers' },
                { step: '2', title: 'Validate',   desc: 'File integrity and format checks are performed' },
                { step: '3', title: 'Analyse',    desc: 'AI models scan every frame for sensitive content' },
                { step: '4', title: 'Classify',   desc: 'Results are categorised and a report is generated' },
                { step: '5', title: 'Complete',   desc: 'Video is available in your library with status' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(108, 58, 232, 0.15)',
                    border: '1px solid rgba(108, 58, 232, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text)' }}>{item.title}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .upload-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

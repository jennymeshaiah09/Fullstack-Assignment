import React from 'react';

const STAGES = [
  { key: 'uploading',   label: 'Uploading',   icon: '⬆' },
  { key: 'validating',  label: 'Validating',  icon: '🔍' },
  { key: 'analysing',   label: 'Analysing',   icon: '🧠' },
  { key: 'classifying', label: 'Classifying', icon: '🏷' },
  { key: 'complete',    label: 'Complete',    icon: '✓' },
];

function stageIndex(stageName) {
  if (!stageName) return -1;
  const lower = stageName.toLowerCase();
  return STAGES.findIndex(s => s.key === lower || s.label.toLowerCase() === lower);
}

/**
 * Props:
 *  - stage    {string}  current stage name (e.g. "analysing")
 *  - progress {number}  0–100
 *  - status   {string}  "processing" | "complete" | "error" | "pending"
 *  - videoId  {string}  (optional) for display
 */
export default function ProcessingStatus({ stage, progress = 0, status = 'processing', videoId }) {
  const currentIndex = stageIndex(stage);
  const isComplete   = status === 'complete' || stage?.toLowerCase() === 'complete';
  const isError      = status === 'error';

  const fillColor = isError
    ? 'var(--color-flagged)'
    : isComplete
    ? 'var(--color-safe)'
    : 'var(--color-primary)';

  const displayProgress = isComplete ? 100 : Math.min(100, Math.max(0, progress));

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '2px' }}>
            {isError ? 'Processing Failed' : isComplete ? 'Processing Complete' : 'Processing Video'}
          </h3>
          {videoId && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>ID: {videoId}</p>
          )}
        </div>
        <span style={{
          fontSize: '1.1rem',
          fontWeight: '700',
          color: isError ? 'var(--color-flagged)' : isComplete ? 'var(--color-safe)' : 'var(--color-primary)',
        }}>
          {displayProgress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: '24px' }}>
        <div
          className="progress-fill"
          style={{
            width: `${displayProgress}%`,
            background: fillColor,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Stages */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0',
        position: 'relative',
      }}>
        {/* Connector line behind steps */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: 'calc(100% / 10)',
          right: 'calc(100% / 10)',
          height: '2px',
          background: 'var(--color-border)',
          zIndex: 0,
        }} />

        {STAGES.map((s, idx) => {
          const isDone    = idx < currentIndex || isComplete;
          const isCurrent = idx === currentIndex && !isComplete;
          const isPending = idx > currentIndex && !isComplete;

          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
              {/* Circle */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: `2px solid ${isDone ? 'var(--color-safe)' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: isDone ? 'var(--color-safe)' : isCurrent ? 'var(--color-primary)' : 'var(--color-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: isDone || isCurrent ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.3s ease',
                animation: isCurrent ? 'pulse 1.6s ease-in-out infinite' : 'none',
              }}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: '10px' }}>{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: isCurrent ? '600' : '400',
                color: isDone ? 'var(--color-safe)' : isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)',
                textAlign: 'center',
                lineHeight: '1.2',
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {isError && (
        <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--color-flagged)', textAlign: 'center' }}>
          An error occurred during processing. Please try re-uploading the video.
        </p>
      )}
      {!isError && !isComplete && stage && (
        <p style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Currently: <strong style={{ color: 'var(--color-primary)', textTransform: 'capitalize' }}>{stage}</strong>
        </p>
      )}
    </div>
  );
}

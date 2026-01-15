'use client'

import { CRISIS_RESOURCES } from '@/lib/crisis/detection'

interface CrisisModalProps {
  keywords: string[]
  onClose: () => void
}

export default function CrisisModal({ keywords, onClose }: CrisisModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem', color: '#d32f2f' }}>
          Immediate Support Available
        </h2>
        
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          We detected that you might be in crisis. Please know that help is available.
          You are not alone, and there are people who want to support you.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {CRISIS_RESOURCES.nationalSuicidePreventionLifeline.name}
          </h3>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Phone:</strong> {CRISIS_RESOURCES.nationalSuicidePreventionLifeline.phone}
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Text:</strong> {CRISIS_RESOURCES.nationalSuicidePreventionLifeline.text}
          </p>
          <a
            href={CRISIS_RESOURCES.nationalSuicidePreventionLifeline.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0070f3' }}
          >
            Visit website
          </a>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {CRISIS_RESOURCES.crisisTextLine.name}
          </h3>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>{CRISIS_RESOURCES.crisisTextLine.phone}</strong>
          </p>
          <a
            href={CRISIS_RESOURCES.crisisTextLine.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0070f3' }}
          >
            Visit website
          </a>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {CRISIS_RESOURCES.emergency.name}
          </h3>
          <p>
            <strong>{CRISIS_RESOURCES.emergency.phone}</strong> - Call for immediate emergency assistance
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          I Understand
        </button>
      </div>
    </div>
  )
}


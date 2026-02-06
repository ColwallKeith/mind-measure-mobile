import { useState } from 'react';
import { X } from 'lucide-react';

interface PrivacyOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyOverlay({ isOpen, onClose }: PrivacyOverlayProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
      setIsAnimatingOut(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        opacity: isAnimatingOut ? 0 : 1,
        transition: 'opacity 300ms ease-out',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          position: 'relative',
          transform: isAnimatingOut ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 300ms ease-out',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            padding: '32px 24px 24px',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 200ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
          >
            <X size={18} color="#FFFFFF" />
          </button>

          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              margin: '0 0 4px 0',
              position: 'relative',
            }}
          >
            Your privacy, clearly explained
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              margin: 0,
              position: 'relative',
            }}
          >
            Mind Measure is designed so you can reflect on your wellbeing without being monitored.
          </p>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* What we collect */}
          <Section title="What we collect">
            <BulletList items={[
              'Voluntary check-ins you choose to complete',
              'This may include text, audio, or video, depending on the check-in',
              'These inputs are used only for automated analysis within the app',
            ]} />
          </Section>

          {/* What your university can see */}
          <Section title="What your university can see">
            <BulletList items={[
              'Aggregated trends only, across groups of students',
              'No individual data',
              'No recordings, responses, or scores',
            ]} />
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6, margin: '12px 0 0 0', fontWeight: 600 }}>
              There is no way for your university to see your personal check-ins.
            </p>
          </Section>

          {/* What we don't do */}
          <Section title="What we don't do">
            <BulletList items={[
              "We don't diagnose or provide medical advice",
              "We don't monitor individuals",
              "We don't sell or share your data for advertising",
            ]} />
            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, margin: '12px 0 0 0', fontStyle: 'italic' }}>
              Mind Measure is not a clinical or surveillance tool.
            </p>
          </Section>

          {/* Your control */}
          <Section title="Your control" last>
            <BulletList items={[
              'Participation is voluntary',
              'You can stop using the app at any time',
              'You can request deletion of your data',
            ]} />
          </Section>

          {/* Learn more links */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '20px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              Learn more
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px 0' }}>
              Read our full:
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="https://mindmeasure.co.uk/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  color: '#8B5CF6',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Privacy Policy
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <a
                href="https://mindmeasure.co.uk/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  color: '#8B5CF6',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Terms of Service
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Got it button */}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              marginTop: '20px',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : '24px' }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 700,
        color: '#1F2937',
        margin: '0 0 8px 0',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '20px' }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#4B5563',
            marginBottom: i < items.length - 1 ? '6px' : 0,
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

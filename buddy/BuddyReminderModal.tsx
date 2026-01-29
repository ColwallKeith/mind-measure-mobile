import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';

interface BuddyReminderModalProps {
  isOpen: boolean;
  onChooseBuddy: () => void;
  onSkip: () => void;
}

export function BuddyReminderModal({ isOpen, onChooseBuddy, onSkip }: BuddyReminderModalProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Reset info panel when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowInfo(false);
      setIsAnimatingOut(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onSkip();
      setIsAnimatingOut(false);
    }, 300);
  };

  const handleChooseBuddy = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onChooseBuddy();
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
          overflow: 'hidden',
          position: 'relative',
          transform: isAnimatingOut ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 300ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            padding: '32px 24px 24px',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <X size={18} color="#FFFFFF" />
          </button>

          {/* Info button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: showInfo ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 200ms ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (!showInfo) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            <Info size={18} color="#FFFFFF" />
          </button>

          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: '-20px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />

          {/* Icon */}
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
            <div
              style={{
                fontSize: '32px',
                lineHeight: 1,
              }}
            >
              👥
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              margin: 0,
              position: 'relative',
            }}
          >
            Add a Buddy
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {showInfo ? (
            // Info panel
            <div
              style={{
                animation: 'fadeIn 300ms ease-out',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1F2937',
                  marginTop: 0,
                  marginBottom: '16px',
                }}
              >
                How Buddies work
              </h3>

              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#4B5563' }}>
                <p style={{ marginTop: 0, marginBottom: '16px' }}>
                  A Buddy is someone you trust who agrees to be gently reminded to check in with
                  you if things feel harder than usual.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1F2937',
                      marginTop: 0,
                      marginBottom: '8px',
                    }}
                  >
                    What happens
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '4px' }}>
                      You choose someone and send them an invite
                    </li>
                    <li style={{ marginBottom: '4px' }}>
                      They can accept or decline, with no explanation needed
                    </li>
                    <li style={{ marginBottom: 0 }}>
                      If they accept, they may occasionally get a nudge to check in with you
                    </li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1F2937',
                      marginTop: 0,
                      marginBottom: '8px',
                    }}
                  >
                    What Buddies see
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '4px' }}>
                      They do not see your scores, check-ins, or activity
                    </li>
                    <li style={{ marginBottom: '4px' }}>They are not alerted in emergencies</li>
                    <li style={{ marginBottom: 0 }}>
                      They are never expected to provide professional support
                    </li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1F2937',
                      marginTop: 0,
                      marginBottom: '8px',
                    }}
                  >
                    Your control
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '4px' }}>Buddies are always optional</li>
                    <li style={{ marginBottom: '4px' }}>
                      You can add or remove them at any time
                    </li>
                    <li style={{ marginBottom: 0 }}>They can opt out whenever they want</li>
                  </ul>
                </div>

                <p
                  style={{
                    marginTop: '16px',
                    marginBottom: 0,
                    fontStyle: 'italic',
                    color: '#6366F1',
                  }}
                >
                  Buddies are about staying connected, not monitoring or intervention.
                </p>
              </div>

              {/* Back to main button */}
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '12px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#6366F1',
                  cursor: 'pointer',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
              >
                Back
              </button>
            </div>
          ) : (
            // Main content
            <>
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#4B5563',
                  textAlign: 'center',
                  margin: '0 0 24px',
                }}
              >
                A Buddy is someone you trust who can be gently notified if you're finding things
                harder than usual.
              </p>

              <p
                style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#4B5563',
                  textAlign: 'center',
                  margin: '0 0 24px',
                }}
              >
                We'll always ask them first. They can say yes or no, and nothing happens without
                their consent.
              </p>

              <p
                style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#4B5563',
                  textAlign: 'center',
                  margin: '0 0 32px',
                }}
              >
                They won't see your check-ins or scores, just that you've asked them to be a Buddy.
              </p>

              {/* Primary CTA */}
              <button
                onClick={handleChooseBuddy}
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
                  marginBottom: '12px',
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
                Choose a Buddy
              </button>

              {/* Secondary CTA */}
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#6B7280',
                  cursor: 'pointer',
                  transition: 'background 200ms ease, color 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.color = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                Not right now
              </button>

              {/* Micro-copy */}
              <p
                style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  textAlign: 'center',
                  margin: '16px 0 0',
                }}
              >
                You can add or remove Buddies at any time.
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

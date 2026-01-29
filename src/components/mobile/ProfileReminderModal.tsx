/**
 * Pop-up shown after baseline assessment: reminds user to complete profile
 * and add buddies. Profile is in the bottom menu; buddies in Buddies tab.
 */

import { useState } from 'react';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

export interface ProfileReminderModalProps {
  isOpen: boolean;
  /** User tapped "Complete profile" – e.g. navigate to Profile tab */
  onComplete: () => void;
  /** User tapped "I'll do this later" – close modal */
  onSkip: () => void;
}

export function ProfileReminderModal({ isOpen, onComplete, onSkip }: ProfileReminderModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen && !isClosing) return null;

  const handleSkip = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onSkip();
    }, 300);
  };

  const handleComplete = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onComplete();
    }, 300);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: isClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
      }}
      onClick={handleSkip}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(30px); opacity: 0; }
          }
        `}
      </style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '24px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: isClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header with gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            padding: '32px 24px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
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
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            <img
              src={mindMeasureLogo}
              alt="Mind Measure"
              style={{ width: '56px', height: '56px' }}
            />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 8px 0',
              lineHeight: '1.2'
            }}
          >
            Complete Your Profile
          </h2>

          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Baseline assessment complete!
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center'
            }}
          >
            <p
              style={{
                fontSize: '16px',
                color: '#1a1a1a',
                margin: '0 0 12px 0',
                lineHeight: '1.6',
                fontWeight: '500'
              }}
            >
              Help us to help you with two quick steps:
            </p>
            <ul
              style={{
                fontSize: '14px',
                color: '#374151',
                margin: 0,
                paddingLeft: '20px',
                textAlign: 'left',
                lineHeight: '1.6'
              }}
            >
              <li style={{ marginBottom: '8px' }}><strong>Profile</strong> (bottom menu) – fill in your details</li>
              <li><strong>Buddies</strong> (bottom menu) – add buddies to your buddy list</li>
            </ul>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '12px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: '14px', color: '#666666', fontWeight: '600' }}>
                Only takes a minute
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p
              style={{
                fontSize: '14px',
                color: '#666666',
                margin: '0 0 16px 0',
                fontWeight: '600'
              }}
            >
              Why complete your profile?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '🎯', text: 'Personalised wellbeing insights' },
                { icon: '📊', text: 'More accurate tracking' },
                { icon: '🤝', text: 'Better support recommendations' }
              ].map((item, index) => (
                <div
                  key={index}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <div
                    style={{
                      fontSize: '20px',
                      width: '32px',
                      height: '32px',
                      background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: '1.5' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              marginBottom: '12px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
          >
            Go to Profile
          </button>

          <button
            type="button"
            onClick={handleSkip}
            style={{
              width: '100%',
              padding: '14px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              color: '#666666',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#666666';
            }}
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
}

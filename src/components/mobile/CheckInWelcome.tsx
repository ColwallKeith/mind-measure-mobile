import { Eye, Mic, MessageCircle, Shield } from 'lucide-react';
import mindMeasureLogo from '@/assets/Mindmeasure_logo.png';

interface CheckInWelcomeProps {
  userName?: string;
  onStartCheckIn?: () => void;
}

export function CheckInWelcome({ userName = 'Keith', onStartCheckIn }: CheckInWelcomeProps) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      padding: '20px',
      paddingBottom: '100px'
    }}>
      {/* Logo & Welcome */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        paddingTop: '60px'
      }}>
        <img 
          src={mindMeasureLogo} 
          alt="Mind Measure" 
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px'
          }}
        />
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 8px 0',
          lineHeight: '1.2'
        }}>
          Welcome back, {userName}
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#666666',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Ready for your daily mental wellness check-in?
        </p>
      </div>

      {/* Start Check-in Button */}
      <button
        onClick={onStartCheckIn}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start Check-in
      </button>

      {/* Helper Text */}
      <p style={{
        fontSize: '13px',
        color: '#999999',
        textAlign: 'center',
        margin: '0 0 32px 0',
        lineHeight: '1.5'
      }}>
        Find a quiet, comfortable space where you can speak freely
      </p>

      {/* What to Expect Heading */}
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1a1a1a',
        margin: '0 0 16px 0',
        textAlign: 'center'
      }}>
        What to Expect
      </h2>

      {/* Feature Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '40px'
      }}>
        {/* Visual Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Eye size={24} style={{ color: '#0284C7' }} />
          </div>
          <div>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 4px 0'
            }}>
              Visual Analysis
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666666',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Facial expression insights
            </p>
          </div>
        </div>

        {/* Voice Patterns */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Mic size={24} style={{ color: '#059669' }} />
          </div>
          <div>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 4px 0'
            }}>
              Voice Patterns
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666666',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Speech and tone analysis
            </p>
          </div>
        </div>

        {/* Conversation */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #FCE7F3, #FBCFE8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MessageCircle size={24} style={{ color: '#DB2777' }} />
          </div>
          <div>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 4px 0'
            }}>
              Conversation
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666666',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Natural dialogue
            </p>
          </div>
        </div>

        {/* Private & Secure */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Shield size={24} style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 4px 0'
            }}>
              Private & Secure
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666666',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Your data is encrypted and confidential. This takes about 3 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        paddingTop: '20px'
      }}>
        <p style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#8B5CF6',
          margin: 0,
          letterSpacing: '3px'
        }}>
          MEASURE, MONITOR, MANAGE
        </p>
      </div>
    </div>
  );
}

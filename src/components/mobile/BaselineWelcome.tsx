import mindMeasureLogo from '../../assets/Mindmeasure_logo.png';

interface BaselineWelcomeProps {
  onStartAssessment?: () => void;
}

export function BaselineWelcome({ onStartAssessment }: BaselineWelcomeProps) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      padding: '20px',
      paddingBottom: '40px'
    }}>
      {/* Logo & Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
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
          Welcome to Mind Measure!
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#666666',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Let's establish your personal wellness baseline
        </p>
      </div>

      {/* Why a Baseline Assessment Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 8px 0'
            }}>
              Why a Baseline Assessment?
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.6',
              margin: 0
            }}>
              This helps us understand your current wellness state, creating a personalised starting point for your mental health journey.
            </p>
          </div>
        </div>
      </div>

      {/* Start Assessment Button */}
      <button
        onClick={onStartAssessment}
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
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s'
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
        Start Your Baseline Assessment
      </button>

      {/* Instruction */}
      <p style={{
        fontSize: '13px',
        color: '#999999',
        textAlign: 'center',
        margin: '0 0 32px 0',
        lineHeight: '1.5'
      }}>
        Find a quiet, comfortable space where you can speak freely
      </p>

      {/* What We'll Measure Section */}
      <h2 style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#1a1a1a',
        margin: '0 0 16px 0'
      }}>
        What We'll Measure
      </h2>

      {/* Mental State */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        marginBottom: '12px'
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 4px 0'
        }}>
          Mental State
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#666666',
          margin: 0,
          lineHeight: '1.4'
        }}>
          Current emotional and cognitive patterns
        </p>
      </div>

      {/* Wellness Trends */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        marginBottom: '12px'
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 4px 0'
        }}>
          Wellness Trends
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#666666',
          margin: 0,
          lineHeight: '1.4'
        }}>
          Sleep, energy, and mood patterns
        </p>
      </div>

      {/* Stress Indicators */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        marginBottom: '32px'
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 4px 0'
        }}>
          Stress Indicators
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#666666',
          margin: 0,
          lineHeight: '1.4'
        }}>
          Voice, expression, and language analysis
        </p>
      </div>

      {/* Quick Facts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '32px'
      }}>
        {/* Time */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '4px'
          }}>
            3-5 Minutes
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666666'
          }}>
            Quick and comprehensive
          </div>
        </div>

        {/* Privacy */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '4px'
          }}>
            100% Private
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666666'
          }}>
            Encrypted and secure
          </div>
        </div>
      </div>

      {/* After Your Baseline */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 16px 0'
        }}>
          After Your Baseline
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Item 1 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5'
            }}>
              Personalised wellness insights
            </span>
          </div>

          {/* Item 2 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5'
            }}>
              Tailored recommendations
            </span>
          </div>

          {/* Item 3 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5'
            }}>
              Progress tracking over time
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Also export as BaselineAssessmentScreen for backward compatibility
export { BaselineWelcome as BaselineAssessmentScreen };

import { useState } from 'react';
import { CurrentScoreCard } from './CurrentScoreCard';
import { SevenDayViewCard } from './SevenDayViewCard';
import { ThirtyDayViewCard } from './ThirtyDayViewCard';
import logo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface DashboardProps {
  userName?: string;
  institutionName?: string;
  institutionLogo?: string;
}

export function Dashboard({ 
  userName = 'Keith',
  institutionName = 'Mind Measure',
  institutionLogo
}: DashboardProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Sample data for cards
  const weekData = [35, 72, 85, 48, 90, 95, 55];
  const monthData = [
    65, 45, 40, 58, 62, 60, 55, 50, 48, 63,
    67, 65, 70, 48, 45, 72, 75, 55, 60, 85,
    65, 55, 52, 48, 62, 68, 95, 88, 70, 50
  ];

  // Mock data
  const currentScore = 66;
  const lastCheckInDate = '05/01/2026';
  const previousCheckInDate = '03/01/2026';
  const previousCheckInScore = 72;
  const conversationSummary = 'You talked about a productive day back at work, including getting some work done, going to the gym, and taking a walk with your dog.';
  const moodScore = 7;
  const keyThemes = ['work', 'exercise', 'routine'];
  const topicsPleasure = ['productive day', 'enjoyable activities', 'time with pet'];
  const topicsWorry = ['work stress', 'sleep quality'];

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const scorecards = [
    <CurrentScoreCard 
      key="current"
      score={currentScore}
      status="Good"
      message="You're doing well today."
      lastUpdated="06/01/2026"
    />,
    <SevenDayViewCard 
      key="week"
      baselineScore={65}
      weekData={weekData}
    />,
    <ThirtyDayViewCard 
      key="month"
      baselineScore={65}
      monthData={monthData}
    />
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px' // Space for bottom nav
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {/* Mind Measure Logo & Name - Same width as scorecard */}
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <img 
              src={logo} 
              alt="Mind Measure" 
              style={{
                width: '96px',
                height: '96px',
                flexShrink: 0
              }}
            />
            <div style={{
              fontSize: '24px',
              color: '#1a1a1a',
              fontFamily: "'Chillax', sans-serif",
              fontWeight: '500',
              letterSpacing: '0.5px'
            }}>
              MIND MEASURE
            </div>
          </div>
        </div>

        {/* Greeting - Centered */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 4px 0',
            lineHeight: '1.2'
          }}>
            {getTimeGreeting()}, {userName}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Here's your latest mental health snapshot
          </p>
        </div>
      </div>

      {/* Score Cards */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {scorecards[currentCardIndex]}
        
        {/* Pagination Dots */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          padding: '8px 0'
        }}>
          {scorecards.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCardIndex(index)}
              style={{
                width: index === currentCardIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: index === currentCardIndex ? '#5B8FED' : '#D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.3s',
                padding: 0
              }}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 20px 24px 20px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 12px 0'
        }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <button style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
          }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Check-In
          </button>
          <button style={{
            padding: '14px 20px',
            background: '#F97316',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(249, 115, 22, 0.3)';
          }}
          >
            Need Help?
          </button>
        </div>
      </div>

      {/* Key Themes */}
      <div style={{ padding: '0 20px 24px 20px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 12px 0'
        }}>
          Key Themes
        </h3>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {keyThemes.map((theme, index) => (
            <span
              key={index}
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: '20px',
                fontSize: '13px',
                color: '#666666',
                fontWeight: '500'
              }}
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Latest Check-in */}
      <div style={{ padding: '0 20px 24px 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0
            }}>
              Latest Check-in
            </h3>
            <span style={{
              fontSize: '13px',
              color: '#999999'
            }}>
              {lastCheckInDate}
            </span>
          </div>

          {/* Conversation Summary */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#666666',
              margin: '0 0 8px 0'
            }}>
              Conversation Summary
            </h4>
            <p style={{
              fontSize: '13px',
              color: '#666666',
              lineHeight: '1.6',
              margin: 0
            }}>
              {conversationSummary}
            </p>
          </div>

          {/* Mood Score */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#666666',
                margin: 0
              }}>
                Mood Score
              </h4>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a1a1a'
              }}>
                {moodScore}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topics Discussed - Separate Card */}
      <div style={{ padding: '0 20px 24px 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>
            Topics Discussed
          </h3>
          
          {/* Finding Pleasure */}
          <div style={{
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
                marginTop: '6px',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Finding Pleasure in
                </div>
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  {topicsPleasure.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 14px',
                        background: '#D1FAE5',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#065F46',
                        fontWeight: '500'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Causing Worry */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#EF4444',
                marginTop: '6px',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Causing Worry
                </div>
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  {topicsWorry.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 14px',
                        background: '#FEE2E2',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#DC2626',
                        fontWeight: '500'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Check-in Card */}
      <div style={{ padding: '0 20px 24px 20px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 12px 0'
        }}>
          Previous Check-in
        </h3>
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'white'
            }}>
              Friday, 3 January 2026
            </div>
          </div>
          <div style={{
            textAlign: 'right'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'white',
              lineHeight: '1',
              marginBottom: '2px'
            }}>
              {previousCheckInScore}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '500'
            }}>
              Good
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
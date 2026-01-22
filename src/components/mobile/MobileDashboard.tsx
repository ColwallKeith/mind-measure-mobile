import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Activity, Shield, Loader2, GraduationCap, Plus } from 'lucide-react';
import { SwipeableScoreCard } from './SwipeableScoreCard';
import { MessageCard } from './MessageCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getDemoUniversity } from '@/config/demo';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import { NudgesDisplay } from './NudgesDisplay';
import { useActiveNudges } from '@/hooks/useActiveNudges';
interface DashboardScreenProps {
  onNeedHelp?: () => void;
  onCheckIn?: () => void;
  onRetakeBaseline?: () => void;
}
export function DashboardScreen({ onNeedHelp, onCheckIn, onRetakeBaseline }: DashboardScreenProps) {
  const { user } = useAuth();
  const {
    profile,
    latestScore,
    latestSession,
    recentActivity,
    trendData,
    hasData,
    loading,
    error
  } = useDashboardData();
  
  // Fetch active nudges
  useEffect(() => {
    console.log('[Dashboard] Profile for nudges:', {
      hasProfile: !!profile,
      universityId: profile?.university_id,
      profileData: profile
    });
  }, [profile]);
  
  const { pinned, rotated, loading: nudgesLoading } = useActiveNudges(profile?.university_id);
  
  // Developer hack: Click logo 5 times to reset baseline
  const [logoClickCount, setLogoClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = async () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    console.log(`🎯 Logo clicked ${newCount} times`);

    // Reset counter after 2 seconds of inactivity
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      setLogoClickCount(0);
    }, 2000);

    // Trigger reset on 5th click
    if (newCount === 5) {
      console.log('🔄 Developer mode: 5 clicks detected');
      setLogoClickCount(0);
      
      // Show confirmation popup
      const confirmed = window.confirm(
        'Developer Mode\n\n' +
        'Reset your baseline assessment?\n\n' +
        'This will clear your baseline data and let you retake the assessment.'
      );
      
      if (confirmed) {
        // User clicked OK - trigger baseline retake
        console.log('✅ User confirmed baseline reset');
        if (onRetakeBaseline) {
          onRetakeBaseline();
        } else {
          console.warn('⚠️ onRetakeBaseline prop not provided');
        }
      } else {
        console.log('❌ User cancelled baseline reset');
      }
    }
  };
  
  // NOTE: Baseline requirement is now handled by AuthenticatedApp component
  // This screen will only render if user has baseline data

  // Detect if this is the special post-baseline view
  // This happens when: user has baseline data but only baseline assessments (no check-ins yet)
  const isPostBaselineView = recentActivity.length > 0 && 
    recentActivity.every(activity => activity.type === 'baseline');
  
  console.log('[Dashboard] Render state:', {
    isPostBaselineView,
    hasLatestSession: !!latestSession,
    latestSessionSummary: latestSession?.summary?.substring(0, 50),
    recentActivityCount: recentActivity.length,
    recentActivityTypes: recentActivity.map(a => a.type)
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };
  // Get time-based greeting
  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    console.log('🕐 Current time debug:', {
      fullDate: now.toString(),
      hour: hour,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Format time ago (e.g., "2h ago", "Yesterday", "3 Dec")
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  // Filter check-ins only (exclude baseline) for recent activity display
  const checkInActivity = recentActivity.filter(activity => activity.type === 'checkin');

  return (
    <motion.div
      className="min-h-screen bg-gray-50 space-y-0 pb-24"
      style={{ paddingBottom: '80px' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header - White Background */}
      <div style={{
        backgroundColor: '#FFFFFF',
        paddingTop: '60px',
        paddingBottom: '10px',
        paddingLeft: '20px',
        paddingRight: '20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {/* Mind Measure Logo & Name Card */}
        <motion.div variants={itemVariants} style={{ marginBottom: '12px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'white',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer'
            }}
            onClick={handleLogoClick}
          >
            <img 
              src={mindMeasureLogo} 
              alt="Mind Measure" 
              style={{
                width: '48px',
                height: '48px',
                flexShrink: 0
              }}
            />
            <div style={{
              fontSize: '12px',
              color: '#1a1a1a',
              fontFamily: "'Chillax', sans-serif",
              fontWeight: '500',
              letterSpacing: '0.5px'
            }}>
              MIND MEASURE
            </div>
          </div>
        </motion.div>

        {/* Greeting - Centered */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 4px 0',
            lineHeight: '1.2'
          }}>
            {getGreeting()}, {profile.firstName || 'there'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Here's your latest mental health snapshot
          </p>
        </motion.div>
      </div>

      {/* Score Cards */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%'
      }}>
        {latestScore ? (
          <motion.div variants={itemVariants} style={{ width: '100%', maxWidth: '448px', display: 'flex', justifyContent: 'center' }}>
            <SwipeableScoreCard
              score={latestScore.score}
              lastUpdated={latestScore.lastUpdated}
              trend={latestScore.trend}
              last7Days={trendData.last7Days}
              last30Days={trendData.last30Days}
              baselineScore={recentActivity.find(a => a.type === 'baseline')?.score}
              userCreatedAt={profile.createdAt}
            />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} style={{ width: '100%', maxWidth: '448px' }}>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6 text-center">
              <h3 className="text-gray-900 mb-2">No Assessment Data Yet</h3>
              <p className="text-gray-600 text-sm mb-4">
                Complete your first assessment to see your Mind Measure score
              </p>
              <Button
                onClick={onCheckIn}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                Start Assessment
              </Button>
            </Card>
          </motion.div>
        )}
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
          <motion.button 
            onClick={onCheckIn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
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
              gap: '8px'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Check-In
          </motion.button>
          <motion.button 
            onClick={onNeedHelp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '14px 20px',
              background: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
            }}
          >
            Need Help?
          </motion.button>
        </div>
      </div>

      {/* Key Themes - Simple tags */}
      {!isPostBaselineView && latestSession?.themes && latestSession.themes.length > 0 && (
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
            {latestSession.themes.slice(0, 8).map((theme, index) => (
              <motion.span
                key={theme}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
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
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Latest Check-in */}
      {!isPostBaselineView && latestSession?.summary && (
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
                {latestSession.createdAt}
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
                {latestSession.summary}
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
                  {latestSession.moodScore}/10
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topics Discussed */}
      {!isPostBaselineView && latestSession && (latestSession.driverPositive.length > 0 || latestSession.driverNegative.length > 0) && (
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
            {latestSession.driverPositive.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
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
                      {latestSession.driverPositive.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
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
            )}

            {/* Causing Worry - ALWAYS SHOW */}
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
                  {latestSession.driverNegative.length > 0 ? (
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap'
                    }}>
                      {latestSession.driverNegative.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
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
                  ) : (
                    <div style={{
                      fontSize: '12px',
                      color: '#999999',
                      fontStyle: 'italic'
                    }}>
                      (none discussed)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Check-in Card */}
      {checkInActivity.length > 1 && (() => {
        const previousScore = checkInActivity[1].score;
        const getBackgroundGradient = (score: number) => {
          if (score >= 80) return 'linear-gradient(135deg, #10B981, #34D399)'; // Green - Excellent
          if (score >= 60) return 'linear-gradient(135deg, #3B82F6, #60A5FA)'; // Blue - Good
          if (score >= 40) return 'linear-gradient(135deg, #F59E0B, #FBBF24)'; // Amber - Moderate
          return 'linear-gradient(135deg, #EF4444, #F87171)'; // Red - Concerning
        };
        
        return (
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
              background: getBackgroundGradient(previousScore),
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
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
                  {new Date(checkInActivity[1].createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: 'white',
                  lineHeight: '1',
                  marginBottom: '2px'
                }}>
                  {previousScore}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500'
                }}>
                  {previousScore >= 80 ? 'Excellent' : previousScore >= 60 ? 'Good' : previousScore >= 40 ? 'Fair' : 'Needs attention'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Nudges - What's Happening */}
      {!nudgesLoading && (pinned || rotated) && (
        <motion.div 
          variants={itemVariants} 
          style={{ 
            padding: '0 20px 24px 20px',
            width: '100%'
          }}
        >
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 12px 0'
          }}>
            What's Happening
          </h3>
          <NudgesDisplay
            pinned={pinned}
            rotated={rotated}
          />
        </motion.div>
      )}

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </motion.div>
  );
}
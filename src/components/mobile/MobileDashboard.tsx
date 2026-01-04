import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Activity, Shield, Loader2, GraduationCap } from 'lucide-react';
import { SwipeableScoreCard } from './SwipeableScoreCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getDemoUniversity } from '@/config/demo';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
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
      className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* University Branding */}
      <motion.div variants={itemVariants} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div 
            className="w-12 h-12 flex items-center justify-center cursor-pointer"
            onClick={handleLogoClick}
          >
            <img
              src={mindMeasureLogo}
              alt="Mind Measure"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{getDemoUniversity().name}</h2>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <motion.h1
          className="text-3xl text-gray-900 mb-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {isPostBaselineView 
            ? `${getGreeting()}, ${profile.firstName || 'there'}`
            : `${getGreeting()}, ${profile.firstName || 'there'}`
          }
        </motion.h1>
        <motion.p
          className="text-gray-600"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {isPostBaselineView
            ? "Here's the result of your baseline assessment"
            : hasData
              ? "Here's your latest mental health snapshot"
              : "Complete your first assessment to see your dashboard"
          }
        </motion.p>
        {profile.streakCount > 0 && (
          <motion.div
            className="mt-2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Badge className="bg-green-100 text-green-800">
              🔥 {profile.streakCount} day streak
            </Badge>
          </motion.div>
        )}
      </motion.div>

      {/* Swipeable Score Card - Built on working foundation */}
      {latestScore ? (
        <motion.div variants={itemVariants}>
          <SwipeableScoreCard
            score={latestScore.score}
            lastUpdated={latestScore.lastUpdated}
            trend={latestScore.trend}
            last7Days={trendData.last7Days}
            last30Days={trendData.last30Days}
            baselineScore={recentActivity.find(a => a.type === 'baseline')?.score}
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
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

      {/* Quick Actions - Side by side */}
      <motion.div variants={itemVariants} className="space-y-3">
        <h3 className="text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onCheckIn}
              className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg rounded-xl"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Check-in
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onNeedHelp}
              className="w-full h-14 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg rounded-xl text-lg font-medium"
            >
              Need Help?
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Key Themes - Only show if we have check-in data (not just baseline) */}
      {!isPostBaselineView && latestSession?.themes && latestSession.themes.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-gray-900">Key Themes</h3>
          <div className="flex flex-wrap gap-2">
            {latestSession.themes.slice(0, 6).map((theme, index) => (
              <motion.span
                key={theme}
                className="px-4 py-2 bg-white/60 backdrop-blur-md text-gray-700 rounded-full text-sm shadow-sm"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.05, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.8)' }}
              >
                {theme}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Latest Check-in Card - Only show for check-ins with summary */}
      {!isPostBaselineView && latestSession?.summary && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-900">Latest Check-in</h3>
              <p className="text-gray-500 text-sm">{latestSession.createdAt}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-gray-800 font-medium mb-2">Conversation Summary</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {latestSession.summary}
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-gray-700">Mood Score</span>
                <span className="text-2xl font-semibold text-gray-900">{latestSession.moodScore}/10</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Topics Discussed - Positive/Negative drivers */}
      {!isPostBaselineView && latestSession && (latestSession.driverPositive.length > 0 || latestSession.driverNegative.length > 0) && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-gray-900">Topics Discussed</h3>
          <div className="space-y-3">
            {latestSession.driverPositive.length > 0 && (
              <Card className="border-0 shadow-sm backdrop-blur-xl bg-green-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-green-800 font-medium mb-2">Finding Pleasure In</p>
                    <div className="flex flex-wrap gap-2">
                      {latestSession.driverPositive.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs border border-green-300 text-green-700 bg-green-100/50 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            {latestSession.driverNegative.length > 0 && (
              <Card className="border-0 shadow-sm backdrop-blur-xl bg-orange-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-orange-800 font-medium mb-2">Causing Concern</p>
                    <div className="flex flex-wrap gap-2">
                      {latestSession.driverNegative.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs border border-orange-300 text-orange-700 bg-orange-100/50 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {/* Last Check-in Card */}
      {checkInActivity.length > 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <h3 className="text-gray-900 mb-4">Last Check-in</h3>
            {(() => {
              const lastCheckIn = checkInActivity[0];
              const checkInDate = new Date(lastCheckIn.createdAt);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
              const formattedDate = checkInDate.toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
              
              return (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium mb-1">{formattedDate}</p>
                    <p className="text-gray-600 text-sm mb-2">
                      {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{lastCheckIn.score}</span>
                      <Badge className={`${
                        lastCheckIn.score >= 80 ? 'bg-green-100 text-green-700' :
                        lastCheckIn.score >= 60 ? 'bg-blue-100 text-blue-700' :
                        lastCheckIn.score >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      } border-0`}>
                        {lastCheckIn.score >= 80 ? 'Excellent' : 
                         lastCheckIn.score >= 60 ? 'Good' : 
                         lastCheckIn.score >= 40 ? 'Fair' : 
                         'Needs Attention'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <h3 className="text-gray-900 mb-4">No Check-ins Yet</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium mb-1">Baseline Established</p>
                <p className="text-gray-600 text-sm mb-2">
                  {latestScore?.lastUpdated || 'Recently'}
                </p>
                <p className="text-gray-500 text-sm">
                  Ready to start your first check-in
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      
      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </motion.div>
  );
}
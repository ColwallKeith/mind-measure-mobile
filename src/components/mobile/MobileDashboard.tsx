import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Activity, Shield, Phone, Loader2, GraduationCap } from 'lucide-react';
import { ScoreCard } from './ScoreCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getDemoUniversity } from '@/config/demo';
import { useEffect, useState, useRef } from 'react';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
interface DashboardScreenProps {
  onNeedHelp?: () => void;
  onCheckIn?: () => void;
  onResetBaseline?: () => void;
}
export function DashboardScreen({ onNeedHelp, onCheckIn, onResetBaseline }: DashboardScreenProps) {
  const {
    profile,
    latestScore,
    latestSession,
    recentActivity,
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
      
      if (confirmed && onResetBaseline) {
        // User clicked OK - proceed with reset
        console.log('✅ User confirmed baseline reset');
        try {
          // Clear device storage
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.remove({ key: 'mindmeasure_baseline_complete' });
          console.log('✅ Baseline flag cleared from device');
          
          // Clear baseline from database
          const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
          const backendService = BackendServiceFactory.createService(
            BackendServiceFactory.getEnvironmentConfig()
          );
          
          // Get current user ID
          const { useAuth } = await import('../../contexts/AuthContext');
          const userId = profile?.user_id;
          
          if (userId) {
            // Delete baseline assessments
            await backendService.database.delete('fusion_outputs', { user_id: userId });
            console.log('✅ Baseline assessments deleted from database');
            
            // Update profile to mark baseline as not established
            await backendService.database.update(
              'profiles',
              { baseline_established: false },
              { user_id: userId }
            );
            console.log('✅ Profile updated - baseline_established set to false');
          }
          
          // Trigger navigation to baseline
          onResetBaseline();
        } catch (error) {
          console.error('❌ Error clearing baseline:', error);
          alert('Error resetting baseline. Please try again.');
        }
      } else {
        console.log('❌ User cancelled baseline reset');
      }
    }
  };
  
  // NOTE: Baseline requirement is now handled by AuthenticatedApp component
  // This screen will only render if user has baseline data

  // Detect if this is the special post-baseline view
  // This happens when: user has baseline data but only baseline assessments (no check-ins)
  const isPostBaselineView = recentActivity.length > 0 && 
    recentActivity.every(activity => activity.type === 'baseline') &&
    recentActivity.length === 1;

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
            ? `${getGreeting()}, ${profile.firstName ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1).toLowerCase() : 'Keith'} - here is the result of your baseline assessment`
            : `${getGreeting()}, ${profile.firstName ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1).toLowerCase() : 'there'}`
          }
        </motion.h1>
        {!isPostBaselineView && (
          <motion.p
            className="text-gray-600"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {hasData
              ? "Here's your latest mental health snapshot"
              : "Complete your first assessment to see your dashboard"
            }
          </motion.p>
        )}
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
      {/* Current Score Card */}
      {latestScore ? (
        <motion.div variants={itemVariants}>
          <ScoreCard
            score={latestScore.score}
            lastUpdated={latestScore.lastUpdated}
            trend={latestScore.trend}
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
      {/* Mind Measure Themes - Hide in post-baseline view */}
      {!isPostBaselineView && latestSession?.themes && latestSession.themes.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-gray-900">Recent Themes</h3>
          <div className="flex flex-wrap gap-2">
            {latestSession.themes.map((theme, index) => (
              <motion.span
                key={theme}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full text-sm"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.05 }}
              >
                {theme}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
      {/* Latest Check-in */}
      {/* Recent Activity Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-900">Recent Activity</h3>
            <p className="text-gray-500 text-sm">
              {recentActivity.length > 0 ? new Date(recentActivity[0].createdAt).toLocaleDateString() : 'Today'}
            </p>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    {recentActivity[0].type === 'baseline' ? 'Baseline Assessment Completed' : 'Check-in Completed'}
                  </span>
                  <span className="text-sm text-green-600 font-medium">✓ Complete</span>
                </div>
                {recentActivity[0].type === 'baseline' && (
                  <p className="text-gray-600 text-sm mt-2">
                    Great job completing your baseline assessment! This helps us understand your starting point.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Baseline Assessment Completed</span>
                  <span className="text-sm text-green-600 font-medium">✓ Complete</span>
                </div>
                <p className="text-gray-600 text-sm mt-2">
                  Welcome to Mind Measure! Your baseline assessment is complete.
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Quick Check-in Button - NOW AFTER Recent Activity */}
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onCheckIn}
            className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg shadow-lg rounded-2xl"
          >
            <motion.div
              className="flex items-center justify-center gap-3"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MessageCircle className="w-6 h-6" />
              <span>Check-In</span>
            </motion.div>
          </Button>
        </motion.div>
        <motion.p
          className="text-gray-600 text-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Check-in with Jodie to get your current score
        </motion.p>
      </motion.div>

      {/* Topics Discussed - Hide in post-baseline view */}
      {!isPostBaselineView && latestSession && latestSession.summary && (latestSession.driverPositive.length > 0 || latestSession.driverNegative.length > 0) && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-gray-900">Topics Discussed</h3>
          <div className="space-y-3">
            {latestSession.driverPositive.length > 0 && (
              <motion.div
                className="bg-green-50 p-4 rounded-lg"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className="text-green-800 font-medium">Positive Indicators</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {latestSession.driverPositive.map((tag, index) => (
                    <motion.span
                      key={tag}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
            {latestSession.driverNegative.length > 0 && (
              <motion.div
                className="bg-orange-50 p-4 rounded-lg"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className="text-orange-800 font-medium">Areas of Concern</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {latestSession.driverNegative.map((tag, index) => (
                    <motion.span
                      key={tag}
                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
      {/* Recent Activity - Hide in post-baseline view (already shown above) */}
      {!isPostBaselineView && recentActivity.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <h3 className="text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.slice(0, 3).map((activity, index) => (
                <motion.div
                  key={`${activity.createdAt}-${index}`}
                  className="flex items-center gap-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.8 + index * 0.1 }}
                >
                  <motion.div
                    className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Activity className="w-5 h-5 text-blue-600" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-gray-800">
                      {activity.type === 'baseline' ? 'Baseline Complete' : 'Check-in Complete'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Score: {activity.score} ({activity.score >= 80 ? 'Excellent' : activity.score >= 60 ? 'Good' : activity.score >= 40 ? 'Fair' : 'Needs Attention'})
                    </p>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
      {/* Need Help Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-red-50/70 to-pink-50/70 p-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Shield className="w-6 h-6 text-red-600" />
            </motion.div>
            <div className="flex-1">
              <h4 className="text-red-900 mb-1">Need Support?</h4>
              <p className="text-red-700 text-sm">Access crisis support and local resources anytime</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onNeedHelp}
                className="bg-red-500 hover:bg-red-600 text-white h-10 px-4"
              >
                <Phone className="w-4 h-4 mr-2" />
                Help
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
      
      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </motion.div>
  );
}
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { Preferences } from '@capacitor/preferences';
import { BottomNavigation } from '@/components/BottomNav';
import { DashboardScreen } from './MobileDashboard';
import { MobileCheckin } from './MobileCheckin';
import { MobileBuddies } from './MobileBuddies';
import { MobileProfile } from './MobileProfile';
import { HelpScreen as HelpPage } from './HelpPage';
import { MobileConversation } from './MobileConversation';
import { MobileSettings } from './MobileSettings';
import { SplashScreen } from './LandingPage';
import { RegistrationScreen } from './RegistrationScreen';
import { WelcomeBack } from './WelcomeBack';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessment } from './BaselineAssessment';
import { CheckinAssessment } from './CheckinAssessment';
import { ReturningSplashScreen } from './ReturningSplashScreen';
import NotFound from '../../pages/NotFound';
console.log('🔥 MobileAppWrapper module loaded');
// Helper functions for device user data management
export const saveUserToDevice = async (userId: string, baselineCompleted: boolean = false) => {
  try {
    const userData = {
      userId,
      baselineCompleted,
      lastLogin: Date.now(),
      savedAt: new Date().toISOString()
    };
    console.log('💾 Attempting to save user data to device:', userData);
    const result = await Preferences.set({
      key: 'mindmeasure_user',
      value: JSON.stringify(userData)
    });
    console.log('💾 Preferences.set result:', result);
    // Verify it was saved by reading it back
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    console.log('🔍 Verification read after save:', value);
    console.log('✅ User data saved successfully to device');
    return true;
  } catch (error) {
    console.error('❌ Failed to save user data to device:', error);
    return false;
  }
};
export const markBaselineComplete = async () => {
  try {
    console.log('🎯 Marking baseline complete...');
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    console.log('📋 Current user data before marking complete:', value);
    if (value) {
      const userData = JSON.parse(value);
      console.log('📝 Parsed user data:', userData);
      userData.baselineCompleted = true;
      userData.baselineCompletedAt = new Date().toISOString();
      console.log('💾 Saving updated user data:', userData);
      await Preferences.set({
        key: 'mindmeasure_user',
        value: JSON.stringify(userData)
      });
      // Verify it was saved
      const { value: newValue } = await Preferences.get({ key: 'mindmeasure_user' });
      console.log('🔍 Verification read after baseline complete:', newValue);
      console.log('✅ Baseline completion marked on device');
      return true;
    } else {
      console.warn('⚠️ No user data found to mark baseline complete');
    }
  } catch (error) {
    console.error('❌ Failed to mark baseline complete:', error);
  }
  return false;
};
export const clearUserFromDevice = async () => {
  try {
    await Preferences.remove({ key: 'mindmeasure_user' });
    console.log('🗑️ User data cleared from device');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear user data:', error);
    return false;
  }
};
export function MobileAppWrapper() {
  // AWS Backend Service
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );
  console.log('🚀 MobileAppWrapper rendering');
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile'>('dashboard');
  const [hasCheckedUserStatus, setHasCheckedUserStatus] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSimpleAuth();
  // Check device preferences for returning user status
  useEffect(() => {
    const checkDeviceUserStatus = async () => {
      console.log('📱 Checking device user status for path:', location.pathname);
      // Only redirect on the root path
      if (location.pathname === '/') {
        try {
          console.log('🔍 Reading from Capacitor Preferences...');
          // Check device preferences for stored user data
          const { value } = await Preferences.get({ key: 'mindmeasure_user' });
          console.log('📋 Raw preference value:', value);
          if (value) {
            const userData = JSON.parse(value);
            console.log('👤 Found stored user data:', userData);
            if (userData.baselineCompleted) {
              // Returning user with completed baseline
              console.log('👋 Returning user detected (from device) - redirecting to welcome-back');
              navigate('/welcome-back');
            } else {
              // User exists but baseline not completed
              console.log('🎯 User needs baseline (from device) - redirecting to baseline-welcome');
              navigate('/baseline-welcome');
            }
          } else {
            // No user data on device - new user
            console.log('🆕 New user detected - no data found in preferences');
            console.log('📍 Staying on splash screen for new user flow');
          }
        } catch (error) {
          console.error('❌ Error reading device preferences:', error);
          // On error, stay on splash (safest option for new users)
        }
      }
      setHasCheckedUserStatus(true);
    };
    checkDeviceUserStatus();
  }, [location.pathname, navigate]);
  try {
  console.log('📍 Current location:', location.pathname);
  // Update activeScreen based on current route
  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard') {
      setActiveScreen('dashboard');
    } else if (path === '/checkin-welcome') {
      setActiveScreen('checkin');
    } else if (path === '/buddies') {
      setActiveScreen('buddy');
    } else if (path === '/profile') {
      setActiveScreen('profile');
    } else if (path === '/help') {
      setActiveScreen('help');
    }
  }, [location.pathname]);
  const handleScreenChange = (screen: 'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile') => {
    setActiveScreen(screen);
    // Navigate to the appropriate route
    switch (screen) {
      case 'dashboard':
        window.location.href = '/dashboard';
        break;
      case 'checkin':
        window.location.href = '/checkin-welcome';
        break;
      case 'buddy':
        window.location.href = '/buddies';
        break;
      case 'profile':
        window.location.href = '/profile';
        break;
      case 'help':
        window.location.href = '/help';
        break;
    }
  };
  return (
    <>
      <Routes>
        <Route path="/" element={
          <>
            {console.log('🎨 Rendering SplashScreen route')}
            <SplashScreen onGetStarted={() => {
              console.log('🎯 Splash button clicked - navigating to /onboarding');
              navigate('/onboarding');
            }} />
          </>
        } />
        <Route path="/baseline-welcome" element={<BaselineAssessmentScreen onStartAssessment={() => navigate('/baseline')} />} />
        <Route path="/onboarding" element={
          <>
            {console.log('🎨 Rendering RegistrationScreen route')}
            <RegistrationScreen
              onBack={() => {
                console.log('⬅️ Registration back - navigating to /');
                navigate('/');
              }}
              onComplete={async (createdUserId?: string) => {
                console.log('✅ Registration complete - saving user data...');
                console.log('🔍 Passed user ID from registration:', createdUserId);
                console.log('🔍 Current SimpleAuthContext user state:', { user: !!user, userId: user?.id });
                // Use the user ID from registration if available, otherwise fall back to SimpleAuthContext
                const userIdToSave = createdUserId || user?.id;
                if (userIdToSave) {
                  console.log('💾 Saving authenticated user ID to device:', userIdToSave);
                  await saveUserToDevice(userIdToSave, false);
                } else {
                  console.warn('⚠️ No authenticated user found after registration - will use temporary ID');
                  // Fallback: save a temporary ID that will be replaced when user signs in
                  const tempId = `temp_${Date.now()}`;
                  await saveUserToDevice(tempId, false);
                }
                navigate('/baseline-welcome');
              }}
            />
          </>
        } />
        <Route path="/welcome-back" element={<ReturningSplashScreen onComplete={() => navigate('/dashboard')} />} />
        {/* TEST ROUTE: Simulate returning user */}
        <Route path="/test-returning" element={<ReturningSplashScreen onComplete={() => navigate('/dashboard')} />} />
        <Route path="/baseline" element={<BaselineAssessment onBack={() => window.history.back()} />} />
        <Route path="/checkin" element={<CheckinAssessment onBack={() => window.history.back()} />} />
        <Route path="/dashboard" element={
          <DashboardScreen
            onNeedHelp={() => navigate('/help')}
            onCheckIn={() => navigate('/checkin-welcome')}
          />
        } />
        <Route path="/checkin-welcome" element={<MobileCheckin onNavigateToJodie={() => navigate('/checkin')} />} />
        <Route path="/buddies" element={<MobileBuddies />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/profile" element={<MobileProfile onNavigateBack={() => {}} />} />
        <Route path="/settings" element={<MobileSettings onNavigateBack={() => {}} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Only show navigation bar on main app screens, hide on splash/onboarding and assessments */}
      {(() => {
        const hideNav = location.pathname === '/' || /^\/(onboarding|welcome-back|baseline-welcome|baseline)$/i.test(location.pathname);
        return !hideNav;
      })() && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation
            activeScreen={activeScreen}
            onScreenChange={handleScreenChange}
          />
        </div>
      )}
    </>
  );
  } catch (error) {
    console.error('❌ Error in MobileAppWrapper:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Mobile App Error</h1>
          <p className="text-lg">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}

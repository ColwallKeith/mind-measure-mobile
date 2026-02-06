import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { Preferences } from '@capacitor/preferences';
import { BottomNav } from '@/components/BottomNavigation';

// Eagerly loaded: first screen users see
import { SplashScreen } from './LandingPage';

// Lazily loaded: only fetched when navigated to
const DashboardScreen = lazy(() => import('./MobileDashboard').then(m => ({ default: m.DashboardScreen })));
const MobileCheckin = lazy(() => import('./MobileCheckin').then(m => ({ default: m.MobileCheckin })));
const BuddiesScreen = lazy(() => import('./BuddiesScreen').then(m => ({ default: m.BuddiesScreen })));
const BuddyConsentPage = lazy(() => import('./BuddyConsentPage').then(m => ({ default: m.BuddyConsentPage })));
const MobileProfile = lazy(() => import('./MobileProfile').then(m => ({ default: m.MobileProfile })));
const HelpPage = lazy(() => import('./HelpPage').then(m => ({ default: m.HelpScreen })));
const MobileConversation = lazy(() => import('./MobileConversation').then(m => ({ default: m.MobileConversation })));
const MobileSettings = lazy(() => import('./MobileSettings').then(m => ({ default: m.MobileSettings })));
const RegistrationScreen = lazy(() => import('./RegistrationScreen').then(m => ({ default: m.RegistrationScreen })));
const WelcomeBack = lazy(() => import('./WelcomeBack').then(m => ({ default: m.WelcomeBack })));
const BaselineAssessmentScreen = lazy(() => import('./BaselineWelcome').then(m => ({ default: m.BaselineAssessmentScreen })));
const BaselineAssessmentSDK = lazy(() => import('./BaselineAssessmentSDK').then(m => ({ default: m.BaselineAssessmentSDK })));
const CheckinAssessment = lazy(() => import('./CheckinAssessment').then(m => ({ default: m.CheckinAssessment })));
const ReturningSplashScreen = lazy(() => import('./ReturningSplashScreen').then(m => ({ default: m.ReturningSplashScreen })));

// Loading fallback
function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
    }}>
      <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(255,255,255,0.3)',
          borderTopColor: '#FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: 14, opacity: 0.8 }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}

// Simple NotFound component (no external dependency)
function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
    }}>
      <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 8 }}>404</h1>
        <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 24 }}>Page not found</p>
        <a href="/" style={{
          color: '#FFFFFF',
          textDecoration: 'underline',
          fontSize: 14,
        }}>Go home</a>
      </div>
    </div>
  );
}

// Helper functions for device user data management
export const saveUserToDevice = async (userId: string, baselineCompleted: boolean = false) => {
  try {
    const userData = {
      userId,
      baselineCompleted,
      lastLogin: Date.now(),
      savedAt: new Date().toISOString()
    };
    await Preferences.set({
      key: 'mindmeasure_user',
      value: JSON.stringify(userData)
    });
    return true;
  } catch (error) {
    console.error('Failed to save user data to device:', error);
    return false;
  }
};

export const markBaselineComplete = async () => {
  try {
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    if (value) {
      const userData = JSON.parse(value);
      userData.baselineCompleted = true;
      userData.baselineCompletedAt = new Date().toISOString();
      await Preferences.set({
        key: 'mindmeasure_user',
        value: JSON.stringify(userData)
      });
      return true;
    }
  } catch (error) {
    console.error('Failed to mark baseline complete:', error);
  }
  return false;
};

export const clearUserFromDevice = async () => {
  try {
    await Preferences.remove({ key: 'mindmeasure_user' });
    return true;
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return false;
  }
};

export function MobileAppWrapper() {
  // AWS Backend Service
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );

  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'content' | 'buddies' | 'profile'>('dashboard');
  const [hasCheckedUserStatus, setHasCheckedUserStatus] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Check device preferences for returning user status
  useEffect(() => {
    const checkDeviceUserStatus = async () => {
      // Only redirect on the root path
      if (location.pathname === '/') {
        try {
          const { value } = await Preferences.get({ key: 'mindmeasure_user' });
          if (value) {
            const userData = JSON.parse(value);
            if (userData.baselineCompleted) {
              navigate('/welcome-back');
            } else {
              navigate('/baseline-welcome');
            }
          }
        } catch (error) {
          console.error('Error reading device preferences:', error);
        }
      }
      setHasCheckedUserStatus(true);
    };
    checkDeviceUserStatus();
  }, [location.pathname, navigate]);

  try {
    // Update activeScreen based on current route
    React.useEffect(() => {
      const path = location.pathname;
      if (path === '/dashboard') {
        setActiveScreen('dashboard');
      } else if (path === '/content') {
        setActiveScreen('content');
      } else if (path === '/buddies') {
        setActiveScreen('buddies');
      } else if (path === '/profile') {
        setActiveScreen('profile');
      }
    }, [location.pathname]);

    const handleScreenChange = (screen: 'dashboard' | 'content' | 'buddies' | 'profile') => {
      setActiveScreen(screen);
      switch (screen) {
        case 'dashboard':
          window.location.href = '/dashboard';
          break;
        case 'content':
          window.location.href = '/content';
          break;
        case 'buddies':
          window.location.href = '/buddies';
          break;
        case 'profile':
          window.location.href = '/profile';
          break;
      }
    };

    return (
      <>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={
              <SplashScreen onGetStarted={() => navigate('/onboarding')} />
            } />
            <Route path="/baseline-welcome" element={<BaselineAssessmentScreen onStartAssessment={() => navigate('/baseline')} />} />
            <Route path="/onboarding" element={
              <RegistrationScreen
                onBack={() => navigate('/')}
                onComplete={async (createdUserId?: string) => {
                  const userIdToSave = createdUserId || user?.id;
                  if (userIdToSave) {
                    await saveUserToDevice(userIdToSave, false);
                  } else {
                    const tempId = `temp_${Date.now()}`;
                    await saveUserToDevice(tempId, false);
                  }
                  navigate('/baseline-welcome');
                }}
              />
            } />
            <Route path="/welcome-back" element={<ReturningSplashScreen onComplete={() => navigate('/dashboard')} />} />
            <Route path="/baseline" element={<BaselineAssessmentSDK onBack={() => window.history.back()} />} />
            <Route path="/checkin" element={<CheckinAssessment onBack={() => window.history.back()} />} />
            <Route path="/dashboard" element={
              <DashboardScreen
                onNeedHelp={() => navigate('/help')}
                onCheckIn={() => navigate('/checkin-welcome')}
              />
            } />
            <Route path="/checkin-welcome" element={<MobileCheckin onNavigateToJodie={() => navigate('/checkin')} />} />
            <Route path="/buddies" element={<BuddiesScreen />} />
            <Route path="/buddies/invite" element={<BuddyConsentPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/profile" element={<MobileProfile onNavigateBack={() => {}} onNavigateToBaseline={() => navigate('/baseline-welcome')} autoTriggerExport={false} onExportTriggered={() => {}} />} />
            <Route path="/settings" element={<MobileSettings onNavigateBack={() => navigate('/profile')} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {/* Only show navigation bar on main app screens, hide on splash/onboarding and assessments */}
        {(() => {
          const hideNav = location.pathname === '/' || /^\/(onboarding|welcome-back|baseline-welcome|baseline)$/i.test(location.pathname);
          return !hideNav;
        })() && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <BottomNav
              activeView={activeScreen === 'dashboard' ? 'home' : activeScreen}
              onViewChange={(view) => handleScreenChange(view === 'home' ? 'dashboard' : view)}
            />
          </div>
        )}
      </>
    );
  } catch (error) {
    console.error('Error in MobileAppWrapper:', error);
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

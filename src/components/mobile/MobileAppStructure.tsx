import React, { useState, useEffect, useCallback } from 'react';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { HelpScreen } from './HelpPage';
import { MobileBuddies } from './MobileBuddies';
import { MobileProfile } from './MobileProfile';
import { MobileSettings } from './MobileSettings';
import { RegistrationScreen } from "./RegistrationScreen";
import { EmailVerificationScreen } from "./EmailVerificationScreen";
import { SignInScreen } from "./SignInScreen";
import { ReturningSplashScreen } from './ReturningSplashScreen';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessmentSDK } from './BaselineAssessmentSDK';
import { SplashScreen } from './LandingPage';
import { useUserAssessmentHistory } from '@/hooks/useUserAssessmentHistory';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Heart,
  TrendingUp,
  HelpCircle,
  Users
} from 'lucide-react';
type MobileTab = 'dashboard' | 'checkin' | 'buddies' | 'help';
type Screen = MobileTab | 'profile' | 'settings';
type OnboardingScreen = 'splash' | 'registration' | 'email_verification' | 'sign_in' | 'baseline_welcome' | 'returning_splash' | 'baseline_assessment';
export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>('returning_splash');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // Track email for verification
  const [pendingPassword, setPendingPassword] = useState<string | null>(null); // Track password for auto-sign-in
  const [isManualBaselineRetake, setIsManualBaselineRetake] = useState(false); // Flag for intentional baseline retakes
  // Debug onboarding screen changes
  useEffect(() => {
    console.log('🔄 Onboarding screen changed to:', onboardingScreen);
  }, [onboardingScreen]);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [hasShownReturningSplash, setHasShownReturningSplash] = useState(false);
  const { user } = useAuth();
  const { needsBaseline, needsCheckin, hasAssessmentHistory, loading } = useUserAssessmentHistory();
  // SIMPLE FLOW: Always start with returning splash (looks like loader)
  // Let it play for 5 seconds while auth completes - DON'T INTERRUPT IT
  useEffect(() => {
    console.log('🎯 App start - user state:', {
      hasUser: !!user,
      userId: user?.id,
      hasAssessmentHistory,
      loading,
      currentOnboardingScreen: onboardingScreen
    });

    // If we're showing returning splash, let it finish its 5 second timer
    // Don't interrupt it - auth will complete during that time
    if (onboardingScreen === 'returning_splash') {
      console.log('⏳ Returning splash is playing - letting it complete naturally...');
      return;
    }

    // Still loading auth - wait
    if (loading) {
      console.log('⏳ Still loading auth...');
      return;
    }

    // NOW we know the final auth state - make routing decisions
    // But ONLY for screens other than returning_splash (which handles itself)
    
    if (!user) {
      // No authenticated user → Show new user flow
      if (onboardingScreen === null) {
        console.log('🆕 No authenticated user - starting new user flow');
        setOnboardingScreen('splash');
      }
      return;
    }

    // User is authenticated - check baseline status
    if (hasAssessmentHistory === false) {
      // No baseline → Force baseline
      if (onboardingScreen === null || onboardingScreen === 'splash') {
        console.log('🎯 No baseline - forcing baseline flow');
        setOnboardingScreen('baseline_welcome');
        setHasShownReturningSplash(false);
      }
      return;
    }

    if (hasAssessmentHistory === true) {
      // Has baseline → Dashboard
      if (onboardingScreen === 'baseline_welcome' && !isManualBaselineRetake) {
        // Somehow stuck on baseline welcome (not intentional) - clear it
        console.log('✅ User and baseline present - clearing baseline welcome');
        setOnboardingScreen(null);
        setHasShownReturningSplash(true);
      } else if (onboardingScreen === 'baseline_welcome' && isManualBaselineRetake) {
        // Intentional baseline retake - allow it
        console.log('🔄 Manual baseline retake - allowing baseline_welcome screen');
      } else if (onboardingScreen === null) {
        // Already on dashboard - stay there
        console.log('✅ On dashboard - staying put');
      }
      return;
    }
  }, [user, loading, hasAssessmentHistory, onboardingScreen, hasShownReturningSplash]);

  // Handle missing pendingEmail for email verification - move state update out of render
  useEffect(() => {
    if (onboardingScreen === 'email_verification' && !pendingEmail) {
      console.warn('⚠️ No pending email for verification, redirecting to registration');
      setOnboardingScreen('registration');
    }
  }, [onboardingScreen, pendingEmail]);

  // Handle baseline enforcement - move state update out of render
  useEffect(() => {
    if (!onboardingScreen && user && hasAssessmentHistory !== true) {
      console.log('🚫 User authenticated but no baseline - forcing baseline welcome');
      setOnboardingScreen('baseline_welcome');
    }
  }, [onboardingScreen, user, hasAssessmentHistory]);
  // Handle onboarding completion - SIMPLE FLOW
  // Memoize handlers to prevent unnecessary re-renders
  const handleSplashComplete = useCallback(() => {
    console.log('🎯 Splash complete - going to registration');
    setOnboardingScreen('registration');
  }, []);
  
  const handleRegistrationComplete = useCallback((email: string, password: string) => {
    console.log('✅ Registration complete - going to email verification for:', email);
    setPendingEmail(email);
    setPendingPassword(password);
    setOnboardingScreen('email_verification');
  }, []);
  
  const handleEmailVerified = useCallback(() => {
    console.log('✅ Email verified - going to sign in');
    setPendingEmail(null);
    setPendingPassword(null);
    setOnboardingScreen('sign_in');
  }, []);
  
  const handleVerificationBack = useCallback(() => {
    console.log('🔙 Going back to registration');
    setPendingEmail(null);
    setOnboardingScreen('registration');
  }, []);
  
  const handleBaselineStart = useCallback(() => {
    console.log('🎯 Starting baseline assessment');
    setOnboardingScreen('baseline_assessment');
  }, []);
  
  const handleBaselineBack = useCallback(() => {
    console.log('🔙 Going back to baseline welcome from failed assessment');
    setIsManualBaselineRetake(true); // Keep the flag so we can stay on baseline_welcome
    setOnboardingScreen('baseline_welcome');
  }, []);
  
  const handleBaselineComplete = useCallback(() => {
    console.log('✅ Baseline assessment completed - going to dashboard');
    setIsManualBaselineRetake(false); // Clear the flag
    setOnboardingScreen(null);
    setCurrentScreen('dashboard');
  }, []);
  
  const handleSignInComplete = useCallback(() => {
    console.log('✅ Sign in successful - going to baseline welcome');
    setOnboardingScreen('baseline_welcome');
  }, []);

  const handleReturningSplashComplete = useCallback(() => {
    console.log('✅ Returning user splash complete - making routing decision based on final auth state');
    console.log('📊 Final state:', { hasUser: !!user, hasAssessmentHistory, loading });
    
    setHasShownReturningSplash(true);
    
    // After 5 seconds, auth should be complete - make the routing decision
    if (!user) {
      // No user found after 5 seconds → new user flow
      console.log('🆕 No user detected - going to new user splash');
      setOnboardingScreen('splash');
    } else if (!hasAssessmentHistory) {
      // User but no baseline → baseline flow
      console.log('🎯 User found but no baseline - going to baseline welcome');
      setOnboardingScreen('baseline_welcome');
    } else {
      // User + baseline → dashboard
      console.log('✅ User + baseline confirmed - going to dashboard');
      setOnboardingScreen(null);
      setCurrentScreen('dashboard');
    }
  }, [user, hasAssessmentHistory, loading]);

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home', screen: 'dashboard' as const },
    { id: 'checkin', icon: Heart, label: 'Baseline Check', screen: 'checkin' as const },
    { id: 'buddies', icon: Users, label: 'Buddies', screen: 'buddies' as const },
    { id: 'help', icon: HelpCircle, label: 'Help', screen: 'help' as const }
  ];
  const handleTabChange = (tab: MobileTab) => {
    // "Baseline Check" button in footer always goes to baseline assessment
    if (tab === 'checkin') {
      console.log('🎯 Baseline Check clicked - starting baseline assessment');
      setIsManualBaselineRetake(true);
      setOnboardingScreen('baseline_welcome');
      return;
    }
    setActiveTab(tab);
    setCurrentScreen(tab);
  };
  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };
  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };
  const handleNavigateBack = () => {
    setCurrentScreen(activeTab);
  };
  // Render onboarding or main app screens
  const renderContent = () => {
    console.log('🎨 Rendering content - onboardingScreen:', onboardingScreen);
    // Show onboarding screens first
    if (onboardingScreen) {
      console.log('🎯 Rendering onboarding screen:', onboardingScreen);
      switch (onboardingScreen) {
        case 'splash':
          console.log('🎨 Rendering SplashScreen');
          return <SplashScreen onGetStarted={handleSplashComplete} />;
        case 'registration':
          console.log('🎨 Rendering RegistrationScreen');
          return <RegistrationScreen onBack={handleSplashComplete} onComplete={handleRegistrationComplete} />;
        case 'email_verification':
          console.log('🎨 Rendering EmailVerificationScreen');
          if (!pendingEmail) {
            console.warn('⚠️ No pending email for verification, going back to registration');
            // Don't call setOnboardingScreen here - use useEffect instead
            return <RegistrationScreen onBack={handleSplashComplete} onComplete={handleRegistrationComplete} />;
          }
          return <EmailVerificationScreen email={pendingEmail} onVerified={handleEmailVerified} onBack={handleVerificationBack} />;
        case 'sign_in':
          console.log('🎨 Rendering SignInScreen');
          return <SignInScreen onSignInComplete={handleSignInComplete} onBack={handleVerificationBack} />;
        case 'baseline_welcome':
          console.log('🎨 Rendering BaselineAssessmentScreen');
          return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
        case 'returning_splash':
          console.log('🎨 Rendering ReturningSplashScreen');
          return <ReturningSplashScreen onComplete={handleReturningSplashComplete} />;
        case 'baseline_assessment':
          console.log('🎨 Rendering BaselineAssessmentSDK');
          return <BaselineAssessmentSDK onComplete={handleBaselineComplete} onBack={handleBaselineBack} />;
        default:
          console.log('🎨 Rendering default SplashScreen');
          return <SplashScreen onGetStarted={handleSplashComplete} />;
      }
    }
    // Show main app screens after onboarding
    // ENFORCE BASELINE REQUIREMENT: No access to main screens without baseline completion
    // BUT: Only enforce if user is authenticated - don't block unauthenticated users from seeing splash
    if (user && hasAssessmentHistory !== true) {
      console.log('🚫 Blocking access to main screens - baseline not completed');
      // Force user back to baseline flow - but don't set state during render
      // This should be handled by the useEffect that checks hasAssessmentHistory
      return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
    }
    
    // If no onboarding screen and no user, something is wrong - show splash
    if (!onboardingScreen && !user) {
      console.log('⚠️ No onboarding screen and no user - showing splash');
      return <SplashScreen onGetStarted={handleSplashComplete} />;
    }
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen
          onNeedHelp={() => setCurrentScreen('help')}
          onCheckIn={() => setCurrentScreen('checkin')}
        />;
      case 'checkin':
        // Show welcome screen first
        return <CheckInWelcome onStartCheckIn={() => setCurrentScreen('checkin_assessment')} />;
      case 'checkin_assessment':
        return (
          <CheckInAssessmentSDK
            onBack={() => setCurrentScreen('checkin')}
            onComplete={() => {
              console.log('✅ Check-in complete');
              setCurrentScreen('dashboard');
              setActiveTab('dashboard');
            }}
          />
        );
      case 'buddies':
        return <HelpScreen />;
      case 'profile':
        return <MobileProfile onNavigateBack={handleNavigateBack} />;
      case 'settings':
        return <MobileSettings onNavigateBack={handleNavigateBack} />;
      default:
        return <DashboardScreen
          onNeedHelp={() => setCurrentScreen('help')}
        />;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="pb-24">
        {renderContent()}
      </div>
      {/* Bottom Navigation - Only show on main tabs after onboarding */}
      {!onboardingScreen && ['dashboard', 'checkin', 'buddies', 'help'].includes(currentScreen) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/60 shadow-lg">
          <div className="flex items-center justify-around px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as MobileTab)}
                  className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-white' : ''}`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { HelpScreen } from './HelpPage';
import { MobileBuddies } from './MobileBuddies';
import { MobileProfile } from './MobileProfile';
import { MobileSettings } from './MobileSettings';
import { RegistrationScreen } from "./RegistrationScreen";
import { EmailVerificationScreen } from "./EmailVerificationScreen";
import { ReturningSplashScreen } from './ReturningSplashScreen';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessment } from './BaselineAssessment';
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
type OnboardingScreen = 'splash' | 'registration' | 'email_verification' | 'baseline_welcome' | 'returning_splash' | 'baseline_assessment';
export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // Track email for verification
  // Debug onboarding screen changes
  useEffect(() => {
    console.log('🔄 Onboarding screen changed to:', onboardingScreen);
  }, [onboardingScreen]);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const { user } = useAuth();
  const { needsBaseline, needsCheckin, hasAssessmentHistory, loading } = useUserAssessmentHistory();
  // SIMPLE FLOW: Always start with new user splash for unauthenticated users
  useEffect(() => {
    console.log('🎯 App start - user state:', {
      hasUser: !!user,
      userId: user?.id,
      hasAssessmentHistory,
      loading,
      currentOnboardingScreen: onboardingScreen
    });
    // For debugging - always start with splash if not set
    if (onboardingScreen === null && !loading) {
      console.log('🚀 Initializing onboarding - setting to splash');
      setOnboardingScreen('splash');
    } else if (!user && !loading && onboardingScreen === null) {
      // No authenticated user → Show new user flow
      console.log('🆕 No authenticated user - starting new user flow');
      setOnboardingScreen('splash');
    } else if (user && !loading && onboardingScreen === null) {
      // User is authenticated - check if they need baseline
      if (hasAssessmentHistory === true) {
        // Has baseline → Dashboard
        console.log('🔄 Has baseline - going to dashboard');
        setOnboardingScreen('returning_splash');
      } else {
        // No baseline → Force baseline
        console.log('🎯 No baseline - forcing baseline flow');
        setOnboardingScreen('baseline_welcome');
      }
    }
  }, [user, loading, hasAssessmentHistory, onboardingScreen]);
  // Handle onboarding completion - SIMPLE FLOW
  const handleSplashComplete = () => {
    console.log('🎯 Splash complete - going to registration');
    console.log('🔍 Current onboarding screen before:', onboardingScreen);
    // From new user splash → Always go to registration for now
    setOnboardingScreen('registration');
    console.log('🔍 Onboarding screen set to registration');
  };
  const handleRegistrationComplete = (email: string) => {
    console.log('✅ Registration complete - going to email verification for:', email);
    // After registration → Go to email verification
    setPendingEmail(email);
    setOnboardingScreen('email_verification');
  };
  const handleEmailVerified = () => {
    console.log('✅ Email verified - going to baseline welcome');
    // After email verification → Go to baseline welcome
    setPendingEmail(null);
    setOnboardingScreen('baseline_welcome');
  };
  const handleVerificationBack = () => {
    console.log('🔙 Going back to registration');
    // Allow user to go back and re-register
    setPendingEmail(null);
    setOnboardingScreen('registration');
  };
  const handleBaselineStart = () => {
    console.log('🎯 Starting baseline assessment - transitioning to baseline assessment');
    // Start baseline assessment - stay in onboarding but show baseline assessment
    setOnboardingScreen('baseline_assessment');
  };
  const handleBaselineComplete = () => {
    console.log('u2705 Baseline assessment completed - going to dashboard');
    // Baseline completed u2192 Clear onboarding and go to main app
    setOnboardingScreen(null);
    setCurrentScreen('dashboard');
  };  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home', screen: 'dashboard' as const },
    { id: 'checkin', icon: Heart, label: 'Check-in', screen: 'checkin' as const },
    { id: 'buddies', icon: Users, label: 'Buddies', screen: 'buddies' as const },
    { id: 'help', icon: HelpCircle, label: 'Help', screen: 'help' as const }
  ];
  const handleTabChange = (tab: MobileTab) => {
    // Prevent access to check-in if baseline not completed
    if (tab === 'checkin' && hasAssessmentHistory !== true) {
      console.log('🚫 Blocking check-in access - baseline not completed');
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
            setOnboardingScreen('registration');
            return <RegistrationScreen onBack={handleSplashComplete} onComplete={handleRegistrationComplete} />;
          }
          return <EmailVerificationScreen email={pendingEmail} onVerified={handleEmailVerified} onBack={handleVerificationBack} />;
        case 'baseline_welcome':
          console.log('🎨 Rendering BaselineAssessmentScreen');
          return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
        case 'returning_splash':
          console.log('🎨 Rendering ReturningSplashScreen');
          return <ReturningSplashScreen onComplete={handleSplashComplete} />;
        case 'baseline_assessment':
          console.log('🎨 Rendering BaselineAssessment');
          return <BaselineAssessment onComplete={handleBaselineComplete} />;
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
      // Force user back to baseline flow
      setOnboardingScreen('baseline_welcome');
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
        return (
          <MobileConversation
            onNavigateBack={() => setCurrentScreen('dashboard')}
            assessmentMode='checkin' // Only allow checkin mode after baseline is complete
          />
        );
      case 'buddies':
        return <MobileBuddies />;
      case 'help':
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

import React, { useState, useEffect } from 'react';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { HelpScreen } from './HelpPage';
import { MobileBuddies } from './MobileBuddies';
import { MobileProfile } from './MobileProfile';
import { MobileSettings } from './MobileSettings';
import { RegistrationScreen } from './NewUserOnboarding';
import { ReturningSplashScreen } from './ReturningSplashScreen';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { SplashScreen } from './LandingPage';
import { useUserAssessmentHistory } from '@/hooks/useUserAssessmentHistory';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import {
  Home,
  Heart,
  TrendingUp,
  HelpCircle,
  Users
} from 'lucide-react';
type MobileTab = 'dashboard' | 'checkin' | 'buddies' | 'help';
type Screen = MobileTab | 'profile' | 'settings';
type OnboardingScreen = 'splash' | 'registration' | 'baseline_welcome' | 'returning_splash';
export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>(null);
  // Debug onboarding screen changes
  useEffect(() => {
    console.log('🔄 Onboarding screen changed to:', onboardingScreen);
  }, [onboardingScreen]);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const { user } = useSimpleAuth();
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
  const handleRegistrationComplete = () => {
    console.log('✅ Registration complete - going to baseline welcome');
    // After registration → Go to baseline welcome
    setOnboardingScreen('baseline_welcome');
  };
  const handleBaselineStart = () => {
    console.log('🎯 Starting baseline assessment - transitioning to conversation screen');
    // Start baseline assessment
    setOnboardingScreen(null);
    setCurrentScreen('checkin');
  };
  const navItems = [
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
        case 'baseline_welcome':
          console.log('🎨 Rendering BaselineAssessmentScreen');
          return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
        case 'returning_splash':
          console.log('🎨 Rendering ReturningSplashScreen');
          return <ReturningSplashScreen onComplete={handleSplashComplete} />;
        default:
          console.log('🎨 Rendering default SplashScreen');
          return <SplashScreen onGetStarted={handleSplashComplete} />;
      }
    }
    // Show main app screens after onboarding
    // ENFORCE BASELINE REQUIREMENT: No access to main screens without baseline completion
    if (hasAssessmentHistory !== true) {
      console.log('🚫 Blocking access to main screens - baseline not completed');
      // Force user back to baseline flow
      setOnboardingScreen('baseline_welcome');
      return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
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

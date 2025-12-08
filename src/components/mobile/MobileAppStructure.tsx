import React, { useState, useEffect, useCallback } from 'react';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { CheckInWelcome } from './CheckInWelcome';
import { CheckinAssessment } from './CheckinAssessment';
import { HelpScreen } from './HelpPage';
import { MobileBuddies } from './MobileBuddies';
import { MobileProfile } from './MobileProfile';
import { MobileSettings } from './MobileSettings';
import { RegistrationScreen } from "./RegistrationScreen";
import { EmailVerificationScreen } from "./EmailVerificationScreen";
import { SignInScreen } from "./SignInScreen";
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
type Screen = MobileTab | 'profile' | 'settings' | 'checkin_welcome' | 'checkin_assessment';
type OnboardingScreen = 'splash' | 'registration' | 'email_verification' | 'sign_in' | 'baseline_welcome' | 'returning_splash' | 'baseline_assessment';
export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('🔄 Onboarding screen changed to:', onboardingScreen);
  }, [onboardingScreen]);
  
  const [hasCompletedInitialSplash, setHasCompletedInitialSplash] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { hasAssessmentHistory, loading: historyLoading } = useUserAssessmentHistory();
  
  // Simple logic: Always show returning splash on launch, then route after 5 seconds
  useEffect(() => {
    // On first mount, always show returning splash
    if (!hasCompletedInitialSplash && onboardingScreen === null) {
      console.log('🚀 App launch - showing returning splash for 5 seconds');
      setOnboardingScreen('returning_splash');
    }
  }, [hasCompletedInitialSplash, onboardingScreen]);

  useEffect(() => {
    if (onboardingScreen === 'email_verification' && !pendingEmail) {
      console.warn('⚠️ No pending email for verification, redirecting to registration');
      setOnboardingScreen('registration');
    }
  }, [onboardingScreen, pendingEmail]);

  const handleSplashComplete = useCallback(() => {
    console.log('✅ Splash complete - going to registration');
    setOnboardingScreen('registration');
  }, []);

  const handleReturningSplashComplete = useCallback(() => {
    console.log('✅ Returning splash complete - checking auth state');
    setHasCompletedInitialSplash(true);
    
    // After splash, route based on actual auth state
    if (!user) {
      console.log('🆕 No user found - showing new user splash');
      setOnboardingScreen('splash');
    } else if (hasAssessmentHistory === true) {
      console.log('✅ Returning user with history - going to dashboard');
      setOnboardingScreen(null);
      setCurrentScreen('dashboard');
      setActiveTab('dashboard');
    } else {
      console.log('🎯 User needs baseline - showing baseline welcome');
      setOnboardingScreen('baseline_welcome');
    }
  }, [user, hasAssessmentHistory]);

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
    console.log('⬅️ Back from verification - going to registration');
    setPendingEmail(null);
    setPendingPassword(null);
    setOnboardingScreen('registration');
  }, []);

  const handleSignInComplete = useCallback(() => {
    console.log('✅ Sign in successful - going to baseline welcome');
    setOnboardingScreen('baseline_welcome');
  }, []);

  const handleBaselineStart = useCallback(() => {
    console.log('🎯 Starting baseline assessment');
    setOnboardingScreen('baseline_assessment');
  }, []);

  const handleBaselineComplete = useCallback(() => {
    console.log('✅ Baseline complete - going to dashboard');
    setOnboardingScreen(null);
    setCurrentScreen('dashboard');
    setActiveTab('dashboard');
  }, []);

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    setCurrentScreen(tab);
  }, []);

  const handleNavigateToProfile = useCallback(() => {
    setCurrentScreen('profile');
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);

  const handleNavigateBack = useCallback(() => {
    setCurrentScreen(activeTab);
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'checkin', label: 'Check-in', icon: Heart },
    { id: 'buddies', label: 'Buddies', icon: Users },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  const renderContent = () => {
    console.log('🎨 Rendering content - onboardingScreen:', onboardingScreen);
    
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
          console.log('🎨 Rendering BaselineAssessment');
          return <BaselineAssessment onComplete={handleBaselineComplete} />;
        default:
          console.log('🎨 Rendering default SplashScreen');
          return <SplashScreen onGetStarted={handleSplashComplete} />;
      }
    }
    
    if (!onboardingScreen && !user) {
      console.log('⚠️ No onboarding screen and no user - showing splash');
      return <SplashScreen onGetStarted={handleSplashComplete} />;
    }
    
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen
          onNeedHelp={() => setCurrentScreen('help')}
          onCheckIn={() => setCurrentScreen('checkin')}
          onRetakeBaseline={() => {
            console.log('🔄 Retaking baseline from developer mode');
            setOnboardingScreen('baseline_welcome');
          }}
        />;
      case 'checkin':
        // Show welcome screen with user's first name
        const firstName = user?.user_metadata?.first_name || 'there';
        return <CheckInWelcome userName={firstName} onStartCheckIn={() => setCurrentScreen('checkin_assessment')} />;
      case 'checkin_assessment':
        return (
          <CheckinAssessment
            onBack={() => setCurrentScreen('dashboard')}
            onComplete={() => {
              console.log('✅ Check-in complete');
              setCurrentScreen('dashboard');
              setActiveTab('dashboard');
            }}
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
      <div className="pb-24">
        {renderContent()}
      </div>
      {!onboardingScreen && ['dashboard', 'checkin', 'checkin_assessment', 'buddies', 'help'].includes(currentScreen) && (
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

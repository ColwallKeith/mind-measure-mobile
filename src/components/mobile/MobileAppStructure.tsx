import React, { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { BottomNav } from '@/components/BottomNavigation';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { CheckInWelcome } from './CheckInWelcome';
import { CheckinAssessmentSDK } from './CheckinAssessmentSDK';
import { HelpScreen } from './HelpPage';
import { SupportCircle } from './SupportCircle';
import { MobileProfile } from './MobileProfile';
import { ContentPage } from './ContentPage';
import { MobileSettings } from './MobileSettings';
import { RegistrationScreen } from "./RegistrationScreen";
import { EmailVerificationScreen } from "./EmailVerificationScreen";
import { EmailLookupScreen } from "./EmailLookupScreen";
import { SignInScreen } from "./SignInScreen";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { ReturningSplashScreen } from './ReturningSplashScreen';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessmentSDK } from './BaselineAssessmentSDK';
import { SplashScreen } from './LandingPage';
import { useUserAssessmentHistory } from '@/hooks/useUserAssessmentHistory';
import { useAuth } from '@/contexts/AuthContext';

// Device user data management helpers
const saveUserToDevice = async (userId: string, baselineCompleted: boolean = false) => {
  try {
    const userData = {
      userId,
      baselineCompleted,
      lastLogin: Date.now(),
      savedAt: new Date().toISOString()
    };
    console.log('💾 Saving user data to device:', userData);
    await Preferences.set({
      key: 'mindmeasure_user',
      value: JSON.stringify(userData)
    });
    
    // Verify it was saved
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    console.log('🔍 Verification read after save:', value);
    console.log('✅ User data saved successfully to device');
    return true;
  } catch (error) {
    console.error('❌ Failed to save user data to device:', error);
    return false;
  }
};

const markBaselineComplete = async () => {
  try {
    console.log('🎯 Marking baseline complete...');
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    if (value) {
      const userData = JSON.parse(value);
      userData.baselineCompleted = true;
      userData.baselineCompletedAt = new Date().toISOString();
      await Preferences.set({
        key: 'mindmeasure_user',
        value: JSON.stringify(userData)
      });
      
      // Verify
      const { value: newValue } = await Preferences.get({ key: 'mindmeasure_user' });
      console.log('🔍 Verification after baseline complete:', newValue);
      console.log('✅ Baseline completion marked on device');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to mark baseline complete:', error);
  }
  return false;
};
import {
  Home,
  BookOpen,
  User,
  Users
} from 'lucide-react';
type MobileTab = 'dashboard' | 'content' | 'buddies' | 'profile';
type Screen = MobileTab | 'settings' | 'checkin_welcome' | 'checkin_assessment';
type OnboardingScreen = 'splash' | 'name_entry' | 'email_lookup' | 'registration' | 'email_verification' | 'sign_in' | 'forgot_password' | 'baseline_welcome' | 'returning_splash' | 'baseline_assessment';

type BaselineReturnContext = 'dashboard' | 'export_data';

export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>(null);
  const [baselineReturnContext, setBaselineReturnContext] = useState<BaselineReturnContext>('dashboard');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  const [pendingFirstName, setPendingFirstName] = useState<string>('');
  const [pendingLastName, setPendingLastName] = useState<string>('');
  const [deviceUserData, setDeviceUserData] = useState<any>(null);
  
  useEffect(() => {
    console.log('🔄 Onboarding screen changed to:', onboardingScreen);
  }, [onboardingScreen]);
  
  const [hasCompletedInitialSplash, setHasCompletedInitialSplash] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { hasAssessmentHistory, loading: historyLoading } = useUserAssessmentHistory();
  
  // Check device preferences on mount to determine if this is a returning user
  useEffect(() => {
    const checkDeviceUser = async () => {
      try {
        console.log('📱 Checking device preferences for returning user...');
        const { value } = await Preferences.get({ key: 'mindmeasure_user' });
        if (value) {
          const userData = JSON.parse(value);
          console.log('👤 Found device user data:', userData);
          setDeviceUserData(userData);
        } else {
          console.log('🆕 No device user data found - new user');
          setDeviceUserData(null);
        }
      } catch (error) {
        console.error('❌ Error reading device preferences:', error);
        setDeviceUserData(null);
      }
    };
    checkDeviceUser();
  }, []);
  
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
      console.log('🎯 Returning user without history - showing baseline welcome');
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

  const handleSignInComplete = useCallback(async (userId: string) => {
    console.log('✅ Sign in successful - received userId:', userId);
    
    // CRITICAL: Save user to device IMMEDIATELY with the passed userId
    console.log('💾 Saving signed-in user to device:', userId);
    await saveUserToDevice(userId, false); // baselineCompleted = false (they need to do it)
    
    setOnboardingScreen('baseline_welcome');
  }, []);

  const handleBaselineStart = useCallback(() => {
    console.log('🎯 Starting baseline assessment');
    setOnboardingScreen('baseline_assessment');
  }, []);

  const handleBaselineComplete = useCallback(async () => {
    console.log('✅ Baseline complete - marking on device');
    console.log('🔍 Current baselineReturnContext:', baselineReturnContext);
    
    // CRITICAL: Mark baseline as complete on device
    await markBaselineComplete();
    
    setOnboardingScreen(null);
    
    // Check the return context to determine where to go
    if (baselineReturnContext === 'export_data') {
      console.log('📊 Baseline completed from export flow - returning to profile with auto-export');
      setCurrentScreen('profile');
      setActiveTab('profile');
      // Don't reset context yet - we'll use it to trigger auto-export
    } else {
      console.log('🏠 Baseline completed from normal flow - going to dashboard');
      setCurrentScreen('dashboard');
      setActiveTab('dashboard');
    }
  }, [baselineReturnContext]);

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
    { id: 'content', label: 'Content', icon: BookOpen },
    { id: 'buddies', label: 'Buddies', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
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
          console.log('🎨 Rendering BaselineAssessmentSDK (multimodal)');
          return <BaselineAssessmentSDK onComplete={handleBaselineComplete} />;
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
          <CheckinAssessmentSDK
            onBack={() => setCurrentScreen('dashboard')}
            onComplete={() => {
              console.log('✅ Check-in complete');
              setCurrentScreen('dashboard');
              setActiveTab('dashboard');
            }}
          />
        );
      case 'buddies':
        return <SupportCircle onNavigateToHelp={() => setCurrentScreen('help')} />;
      case 'content':
        return <ContentPage universityName="University of Worcester" />;
      case 'help':
        return <HelpScreen onNavigateBack={handleNavigateBack} />;
      case 'profile':
        const shouldAutoExport = baselineReturnContext === 'export_data';
        console.log('🎯 Rendering profile - shouldAutoExport:', shouldAutoExport, 'context:', baselineReturnContext);
        return <MobileProfile 
          onNavigateBack={handleNavigateBack} 
          onNavigateToBaseline={() => {
            console.log('🔄 Starting baseline from export flow - setting return context to export_data');
            setBaselineReturnContext('export_data');
            setOnboardingScreen('baseline_welcome');
          }}
          autoTriggerExport={shouldAutoExport}
          onExportTriggered={() => {
            // Reset context AFTER export is triggered
            console.log('✅ Export triggered - resetting context to dashboard');
            setBaselineReturnContext('dashboard');
          }}
        />;
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
      {!onboardingScreen && ['dashboard', 'content', 'buddies', 'profile'].includes(currentScreen) && (
        <BottomNav
          activeView={activeTab === 'dashboard' ? 'home' : activeTab}
          onViewChange={(view) => handleTabChange((view === 'home' ? 'dashboard' : view) as MobileTab)}
        />
      )}
    </div>
  );
};

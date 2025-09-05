import { useState, useEffect } from 'react';
import { CheckInScreen } from './components/CheckInScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { HelpScreen } from './components/HelpScreen';
import { BuddyScreen } from './components/BuddyScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import { ReturningSplashScreen } from './components/ReturningSplashScreen';
import { RegistrationScreen } from './components/RegistrationScreen';
import { BaselineAssessmentScreen } from './components/BaselineAssessmentScreen';
import { BottomNavigation } from './components/BottomNavigation';

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'returning-splash' | 'registration' | 'baseline' | 'main'>('splash');
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile'>('dashboard');
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(null);

  // Check if user is returning (has completed registration before)
  useEffect(() => {
    const hasCompletedRegistration = localStorage.getItem('mindMeasureRegistrationCompleted');
    const hasCompletedBaseline = localStorage.getItem('mindMeasureBaselineCompleted');
    const returning = hasCompletedRegistration === 'true';
    setIsReturningUser(returning);
    
    if (returning) {
      setAppState('returning-splash');
    }
  }, []);

  // Development helper: Add keyboard shortcut to reset user state (Ctrl/Cmd + Shift + R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        // Reset user state for testing
        localStorage.removeItem('mindMeasureRegistrationCompleted');
        localStorage.removeItem('mindMeasureBaselineCompleted');
        setIsReturningUser(false);
        setAppState('splash');
        console.log('User state reset - now showing new user experience');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle onboarding flow
  if (appState === 'splash' && !isReturningUser) {
    return <SplashScreen onGetStarted={() => setAppState('registration')} />;
  }

  // Handle returning user splash
  if (appState === 'returning-splash') {
    return <ReturningSplashScreen onComplete={() => {
      // Check if baseline is completed for returning users
      const hasCompletedBaseline = localStorage.getItem('mindMeasureBaselineCompleted');
      if (hasCompletedBaseline === 'true') {
        setAppState('main');
      } else {
        setAppState('baseline');
      }
    }} />;
  }

  if (appState === 'registration') {
    return (
      <RegistrationScreen 
        onBack={() => setAppState('splash')}
        onComplete={() => {
          // Mark user as having completed registration
          localStorage.setItem('mindMeasureRegistrationCompleted', 'true');
          setIsReturningUser(true);
          // Check if baseline is completed to decide next step
          const hasCompletedBaseline = localStorage.getItem('mindMeasureBaselineCompleted');
          if (hasCompletedBaseline === 'true') {
            setAppState('main');
          } else {
            setAppState('baseline');
          }
        }}
      />
    );
  }

  // Baseline assessment for new users
  if (appState === 'baseline') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
        {/* Background glass effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/20 to-pink-100/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
        <div className="absolute top-60 right-20 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
        
        <div className="relative z-10 h-screen overflow-auto">
          <BaselineAssessmentScreen 
            onStartAssessment={() => {
              // Mark baseline as completed and go to main app
              localStorage.setItem('mindMeasureBaselineCompleted', 'true');
              setAppState('main');
            }}
          />
        </div>
      </div>
    );
  }

  // Main app experience
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
      {/* Background glass effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/20 to-pink-100/30" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-32 right-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
      <div className="absolute top-60 right-20 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
      

      
      <div className="relative z-10 h-screen flex flex-col">
        <div className="flex-1 overflow-auto">
          {activeScreen === 'dashboard' && <DashboardScreen onNeedHelp={() => setActiveScreen('help')} />}
          {activeScreen === 'checkin' && <CheckInScreen />}
          {activeScreen === 'buddy' && <BuddyScreen />}
          {activeScreen === 'profile' && <ProfileScreen />}
          {activeScreen === 'help' && <HelpScreen />}
        </div>
        
        <BottomNavigation 
          activeScreen={activeScreen} 
          onScreenChange={setActiveScreen}
        />
      </div>
    </div>
  );
}
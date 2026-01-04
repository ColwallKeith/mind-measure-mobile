import { useState, useEffect } from 'react';
import { CheckInScreen } from './components/CheckInScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { HelpScreen } from './components/HelpScreen';
import { BuddyScreen } from './components/BuddyScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import { ReturningSplashScreen } from './components/ReturningSplashScreen';
import { RegistrationScreen } from './components/mobile/RegistrationScreen';
import { BaselineWelcomeScreen } from './components/BaselineWelcomeScreen';
import { BaselineAssessmentWidget } from './components/BaselineAssessmentWidget';
import { BottomNavigation } from './components/BottomNavigation';
import { SimpleAuthProvider, useAuth } from './contexts/AuthContext';
// import { AuthDebugger } from .* // Removed - was using Supabase

// Create a wrapper component that uses auth
function AppContent() {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<'splash' | 'returning-splash' | 'registration' | 'baseline-welcome' | 'baseline' | 'main'>('splash');
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile'>('dashboard');

  // Handle auth state changes
  useEffect(() => {
    console.log('=== AUTH STATE CHECK ===');
    console.log('Loading:', loading);
    console.log('User:', user);
    console.log('User email:', user?.email);
    console.log('Has baseline:', user?.hasCompletedBaseline);
    console.log('Current app state:', appState);
    
    if (loading) {
      console.log('Still loading auth, waiting...');
      return; // Wait for auth to initialize
    }

    if (user) {
      // User is authenticated (returning user)
      console.log('✅ User authenticated:', user.email, 'Has baseline:', user.hasCompletedBaseline);
      
      if (!user.hasCompletedBaseline) {
        // Returning user who hasn't completed baseline yet - go to baseline welcome
        // (Dashboard would be empty without baseline data)
        console.log('→ Going to baseline-welcome (no baseline completed)');
        setAppState('baseline-welcome');
      } else {
        // Returning user who has completed baseline - show returning splash, then dashboard
        console.log('→ Going to returning-splash (has baseline)');
        setAppState('returning-splash');
      }
    } else {
      // User not authenticated - show new user splash for registration
      console.log('❌ No user authenticated, going to splash');
      setAppState('splash');
    }
  }, [user, loading]);

  // Development helper: Add keyboard shortcut to reset user state (Ctrl/Cmd + Shift + R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        // Reset user state for testing by signing out
        setAppState('splash');
        console.log('User state reset - now showing new user experience');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading screen while auth initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle onboarding flow for new users
  if (appState === 'splash') {
    return <SplashScreen onGetStarted={() => setAppState('registration')} />;
  }

  if (appState === 'registration') {
    return (
      <RegistrationScreen 
        onBack={() => setAppState('splash')}
        onComplete={() => {
          // Registration completed - auth state will handle the transition
          // User will be automatically moved to baseline-welcome state
        }}
      />
    );
  }

  // Returning user splash (no authentication needed)
  if (appState === 'returning-splash') {
    return (
      <ReturningSplashScreen 
        onComplete={() => {
          // Returning user goes straight to main app
          setAppState('main');
        }} 
      />
    );
  }

  // Baseline welcome screen (after registration)
  if (appState === 'baseline-welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
        {/* Background glass effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/20 to-pink-100/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
        <div className="absolute top-60 right-20 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
        
        <div className="relative z-10 h-screen overflow-auto">
          <BaselineWelcomeScreen 
            onStartAssessment={() => {
              // Move to ElevenLabs baseline assessment
              setAppState('baseline');
            }}
          />
        </div>
      </div>
    );
  }

  // ElevenLabs baseline assessment widget
  if (appState === 'baseline') {
    return (
      <BaselineAssessmentWidget 
        onComplete={() => {
          // TODO: Save baseline completion to database
          // TODO: Process assessment results
          setAppState('main');
        }}
      />
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
      
      {/* Temporary debug info */}
      {/* <AuthDebugger /> */}
    </div>
  );
}

// Main App component with AuthProvider
export default function App() {
  return (
    <SimpleAuthProvider>
      <AppContent />
    </SimpleAuthProvider>
  );
}
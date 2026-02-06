import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { BottomNav } from '@/components/BottomNavigation';
import { DashboardScreen } from './MobileDashboard';
import { MobileConversation } from './MobileConversation';
import { CheckInWelcome } from './CheckInWelcome';
import { CheckinAssessmentSDK } from './CheckinAssessmentSDK';
import { HelpScreen } from './HelpPage';
import { BuddiesScreen } from './BuddiesScreen';
import { MobileProfile } from './MobileProfile';
import { ContentPage } from './ContentPage';
import { MobileSettings } from './MobileSettings';
import { RegistrationFlow } from "./RegistrationFlow";
import { ReturningSplashScreen } from './ReturningSplashScreen';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessmentSDK } from './BaselineAssessmentSDK';
import { ProfileReminderModal } from './ProfileReminderModal';
import { BuddyReminderModal } from './BuddyReminderModal';
import { SplashScreen } from './LandingPage';
import { useUserAssessmentHistory } from '@/hooks/useUserAssessmentHistory';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { buddiesApi } from '@/services/buddies-api';

const PROFILE_REMINDER_VISIT_KEY = 'profile_reminder_visit_count';
const BUDDY_REMINDER_SHOWN_KEY = 'buddy_reminder_shown';

const getProfileReminderVisitCount = async (): Promise<number> => {
  try {
    const { value } = await Preferences.get({ key: PROFILE_REMINDER_VISIT_KEY });
    return value ? Math.max(0, parseInt(value, 10)) : 0;
  } catch {
    return 0;
  }
};

const incrementProfileReminderVisitCount = async (): Promise<number> => {
  const current = await getProfileReminderVisitCount();
  const next = current + 1;
  await Preferences.set({ key: PROFILE_REMINDER_VISIT_KEY, value: String(next) });
  return next;
};

/**
 * Returns true if we should show the profile reminder this visit.
 * Shows only when profile is incomplete and on every 3rd visit (3, 6, 9, …).
 */
const shouldShowProfileReminderThisVisit = async (userId: string): Promise<boolean> => {
  try {
    const backend = BackendServiceFactory.createService(BackendServiceFactory.getEnvironmentConfig());
    const { data } = await backend.database.select('profiles', {
      filters: { user_id: userId },
      columns: 'profile_completed'
    });
    const profileCompleted = !!(data?.[0] as { profile_completed?: boolean } | undefined)?.profile_completed;
    if (profileCompleted) return false;

    const count = await incrementProfileReminderVisitCount();
    return count > 0 && count % 3 === 0;
  } catch (e) {
    console.warn('[Profile reminder] Could not check profile/visit:', e);
    return false;
  }
};

const getBuddyReminderShown = async (): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key: BUDDY_REMINDER_SHOWN_KEY });
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
};

const setBuddyReminderShown = async (): Promise<void> => {
  try {
    await Preferences.set({ key: BUDDY_REMINDER_SHOWN_KEY, value: '1' });
  } catch (e) {
    console.warn('[Buddy reminder] Could not persist shown flag:', e);
  }
};

/**
 * Returns true if we should show the buddy reminder this visit.
 * Show once: on the next visit after the user’s first check-in, only if they have 0 buddies.
 * Stop for good once they have ≥1 buddy or we’ve already shown it.
 */
const shouldShowBuddyReminderThisVisit = async (userId: string): Promise<boolean> => {
  try {
    if (await getBuddyReminderShown()) return false;

    const { activeBuddies } = await buddiesApi.list();
    if (activeBuddies.length >= 1) return false;

    const backend = BackendServiceFactory.createService(BackendServiceFactory.getEnvironmentConfig());
    const { data: sessions } = await backend.database.select('fusion_outputs', {
      filters: { user_id: userId },
      columns: 'analysis',
      orderBy: [{ column: 'created_at', ascending: false }],
      limit: 200
    });
    const rows = Array.isArray(sessions) ? sessions : [];
    const checkInCount = rows.filter((r: { analysis?: unknown }) => {
      try {
        const a = typeof r.analysis === 'string' ? JSON.parse(r.analysis as string) : r.analysis;
        return (a as { assessment_type?: string })?.assessment_type === 'checkin';
      } catch {
        return false;
      }
    }).length;
    if (checkInCount < 1) return false;

    return true;
  } catch (e) {
    console.warn('[Buddy reminder] Could not check buddies/check-ins:', e);
    return false;
  }
};

// Device user data management helpers
const saveUserToDevice = async (userId: string, baselineCompleted: boolean = false) => {
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
    
    // Verify it was saved
    const { value } = await Preferences.get({ key: 'mindmeasure_user' });
    return true;
  } catch (error) {
    console.error('❌ Failed to save user data to device:', error);
    return false;
  }
};

const markBaselineComplete = async () => {
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
      
      // Verify
      const { value: newValue } = await Preferences.get({ key: 'mindmeasure_user' });
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
type OnboardingScreen = 'splash' | 'auth' | 'baseline_welcome' | 'returning_splash' | 'baseline_assessment';

type BaselineReturnContext = 'dashboard' | 'export_data';

export const MobileAppStructure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen | null>(null);
  const [baselineReturnContext, setBaselineReturnContext] = useState<BaselineReturnContext>('dashboard');
  const baselineReturnContextRef = useRef<BaselineReturnContext>('dashboard');
  const [deviceUserData, setDeviceUserData] = useState<any>(null);
  const [showProfileReminderModal, setShowProfileReminderModal] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'details' | undefined>(undefined);
  const [profileHasUnsavedChanges, setProfileHasUnsavedChanges] = useState(false);
  const [showProfileUnsavedWarning, setShowProfileUnsavedWarning] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<MobileTab | null>(null);
  const [showBuddyReminderModal, setShowBuddyReminderModal] = useState(false);
  // Ref to trigger save from parent
  const profileSaveRef = useRef<(() => Promise<void>) | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    baselineReturnContextRef.current = baselineReturnContext;
  }, [baselineReturnContext]);
  
  useEffect(() => {
  }, [onboardingScreen]);

  // Clear profile initial tab when leaving profile so next open uses default tab
  useEffect(() => {
    if (currentScreen !== 'profile') setProfileInitialTab(undefined);
  }, [currentScreen]);
  
  const [hasCompletedInitialSplash, setHasCompletedInitialSplash] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { hasAssessmentHistory, loading: historyLoading } = useUserAssessmentHistory();
  
  // Check device preferences on mount to determine if this is a returning user
  useEffect(() => {
    const checkDeviceUser = async () => {
      try {
        const { value } = await Preferences.get({ key: 'mindmeasure_user' });
        if (value) {
          const userData = JSON.parse(value);
          setDeviceUserData(userData);
        } else {
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
      setOnboardingScreen('returning_splash');
    }
  }, [hasCompletedInitialSplash, onboardingScreen]);

  const handleSplashComplete = useCallback(() => {
    setOnboardingScreen('auth');
  }, []);

  const handleReturningSplashComplete = useCallback(async () => {
    setHasCompletedInitialSplash(true);
    
    if (!user) {
      setOnboardingScreen('splash');
      return;
    }
    if (hasAssessmentHistory === true) {
      setOnboardingScreen(null);
      setCurrentScreen('dashboard');
      setActiveTab('dashboard');
      const showProfile = await shouldShowProfileReminderThisVisit(user.id);
      if (showProfile) setShowProfileReminderModal(true);
      else {
        const showBuddy = await shouldShowBuddyReminderThisVisit(user.id);
        if (showBuddy) setShowBuddyReminderModal(true);
      }
      return;
    }
    setOnboardingScreen('baseline_welcome');
  }, [user, hasAssessmentHistory]);

  const handleBaselineStart = useCallback(() => {
    setOnboardingScreen('baseline_assessment');
  }, []);

  const handleBaselineComplete = useCallback(async () => {
    await markBaselineComplete();
    setOnboardingScreen(null);
    if (baselineReturnContextRef.current === 'export_data') {
      setCurrentScreen('profile');
      setActiveTab('profile');
    } else {
      setCurrentScreen('dashboard');
      setActiveTab('dashboard');
      if (user?.id) {
        const showProfile = await shouldShowProfileReminderThisVisit(user.id);
        if (showProfile) setShowProfileReminderModal(true);
        else {
          const showBuddy = await shouldShowBuddyReminderThisVisit(user.id);
          if (showBuddy) setShowBuddyReminderModal(true);
        }
      }
    }
  }, [user]);

  const handleTabChange = useCallback((tab: MobileTab) => {
    // If leaving profile with unsaved changes, show warning
    if (currentScreen === 'profile' && tab !== 'profile' && profileHasUnsavedChanges) {
      setPendingTabChange(tab);
      setShowProfileUnsavedWarning(true);
      return;
    }
    setActiveTab(tab);
    setCurrentScreen(tab);
  }, [currentScreen, profileHasUnsavedChanges]);

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
    
    if (onboardingScreen) {
      switch (onboardingScreen) {
        case 'splash':
          return <SplashScreen onGetStarted={handleSplashComplete} />;
        case 'auth':
          return (
            <RegistrationFlow
              onBack={() => setOnboardingScreen('splash')}
              onSignInSuccess={async (userId) => {
                if (userId) await saveUserToDevice(userId, false);
                setOnboardingScreen('returning_splash');
              }}
              onRegistrationComplete={() => {
                setOnboardingScreen('baseline_welcome');
              }}
            />
          );
        case 'baseline_welcome':
          return <BaselineAssessmentScreen onStartAssessment={handleBaselineStart} />;
        case 'returning_splash':
          return <ReturningSplashScreen onComplete={handleReturningSplashComplete} />;
        case 'baseline_assessment':
          return <BaselineAssessmentSDK onComplete={handleBaselineComplete} />;
        default:
          return <SplashScreen onGetStarted={handleSplashComplete} />;
      }
    }
    
    if (!onboardingScreen && !user) {
      return <SplashScreen onGetStarted={handleSplashComplete} />;
    }
    
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen
          onNeedHelp={() => setCurrentScreen('help')}
          onCheckIn={() => setCurrentScreen('checkin')}
          onRetakeBaseline={() => {
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
            onComplete={async () => {
              setCurrentScreen('dashboard');
              setActiveTab('dashboard');
              if (user?.id) {
                const showProfile = await shouldShowProfileReminderThisVisit(user.id);
                if (showProfile) setShowProfileReminderModal(true);
                else {
                  const showBuddy = await shouldShowBuddyReminderThisVisit(user.id);
                  if (showBuddy) setShowBuddyReminderModal(true);
                }
              }
            }}
          />
        );
      case 'buddies':
        return <BuddiesScreen />;
      case 'content':
        return <ContentPage universityName="University of Worcester" />;
      case 'help':
        return <HelpScreen onNavigateBack={handleNavigateBack} />;
      case 'profile':
        const shouldAutoExport = baselineReturnContext === 'export_data';
        return <MobileProfile 
          onNavigateBack={handleNavigateBack} 
          onNavigateToSettings={handleNavigateToSettings}
          initialTab={profileInitialTab}
          onNavigateToBaseline={() => {
            setBaselineReturnContext('export_data');
            setOnboardingScreen('baseline_welcome');
          }}
          autoTriggerExport={shouldAutoExport}
          onExportTriggered={() => {
            // Reset context AFTER export is triggered
            setBaselineReturnContext('dashboard');
          }}
          onUnsavedChangesChange={setProfileHasUnsavedChanges}
          saveRef={profileSaveRef}
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
      <ProfileReminderModal
        isOpen={showProfileReminderModal}
        onComplete={() => {
          setShowProfileReminderModal(false);
          setProfileInitialTab('details');
          setCurrentScreen('profile');
          setActiveTab('profile');
        }}
        onSkip={() => setShowProfileReminderModal(false)}
      />
      <BuddyReminderModal
        isOpen={showBuddyReminderModal}
        onChooseBuddy={async () => {
          await setBuddyReminderShown();
          setShowBuddyReminderModal(false);
          setCurrentScreen('buddies');
          setActiveTab('buddies');
        }}
        onSkip={async () => {
          await setBuddyReminderShown();
          setShowBuddyReminderModal(false);
        }}
      />
      {/* Unsaved changes warning when leaving Profile via bottom nav */}
      {showProfileUnsavedWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowProfileUnsavedWarning(false);
            setPendingTabChange(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 16px 0'
            }}>
              Unsaved changes
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              margin: '0 0 24px 0',
              lineHeight: '1.6'
            }}>
              You have unsaved changes in your profile. Do you want to save before leaving?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={async () => {
                  // Trigger save via ref
                  if (profileSaveRef.current) {
                    await profileSaveRef.current();
                  }
                  setShowProfileUnsavedWarning(false);
                  if (pendingTabChange) {
                    setActiveTab(pendingTabChange);
                    setCurrentScreen(pendingTabChange);
                    setPendingTabChange(null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileUnsavedWarning(false);
                  setProfileHasUnsavedChanges(false);
                  if (pendingTabChange) {
                    setActiveTab(pendingTabChange);
                    setCurrentScreen(pendingTabChange);
                    setPendingTabChange(null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666666',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileUnsavedWarning(false);
                  setPendingTabChange(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#999999',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

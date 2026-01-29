import { useState, useEffect } from 'react';
import { Download, Edit2 } from 'lucide-react';
import { Select } from './Select';
import { MoodTrendChart } from './MoodTrendChart';
import { KeyThemes, type ThemeData } from './KeyThemes';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { cognitoApiClient } from '@/services/cognito-api-client';
import mindMeasureLogo from '@/assets/Mindmeasure_logo.png';

type TabType = 'overview' | 'details' | 'wellness';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  institution: string;
  institutionLogo: string;
  accountType: string;
  ageRange: string;
  gender: string;
  school: string;
  yearOfStudy: string;
  course: string;
  studyMode: string;
  livingArrangement: string;
  accommodationName: string;
  domicileStatus: string;
  firstGenStudent: boolean;
  caringResponsibilities: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  averageScore: number | null;
}

interface UniversityData {
  id: string;
  name: string;
  logo?: string;
  schools: Array<{ name: string; studentCount?: number }>;
  halls_of_residence?: Array<{ name: string }>;
}

interface MobileProfileProps {
  onNavigateBack?: () => void;
  onNavigateToBaseline?: () => void;
  /** When set (e.g. from post-baseline reminder), open on this tab (e.g. 'details') */
  initialTab?: TabType;
  autoTriggerExport?: boolean;
  onExportTriggered?: () => void;
  /** Called when unsaved changes state changes */
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  /** Ref to register save function for parent to call */
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function MobileProfile({ onNavigateBack, onNavigateToBaseline, initialTab, autoTriggerExport = false, onExportTriggered, onUnsavedChangesChange, saveRef }: MobileProfileProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'wellness');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [universityData, setUniversityData] = useState<UniversityData | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [hallOptions, setHallOptions] = useState<string[]>([]);
  const [moodData, setMoodData] = useState<Array<{ date: string; score: number }>>([]);
  const [themesData, setThemesData] = useState<ThemeData[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<14 | 30 | 90>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [hasBaselineToday, setHasBaselineToday] = useState<boolean | null>(null);
  const [showBaselineRequired, setShowBaselineRequired] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showExportProfileReminder, setShowExportProfileReminder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  // Store original profile data to detect changes
  const [originalUserData, setOriginalUserData] = useState<UserData | null>(null);
  
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    institution: 'University of Worcester',
    institutionLogo: '',
    accountType: 'Student',
    ageRange: '',
    gender: '',
    school: '',
    yearOfStudy: '',
    course: '',
    studyMode: '',
    livingArrangement: '',
    accommodationName: '',
    domicileStatus: '',
    firstGenStudent: false,
    caringResponsibilities: false,
    currentStreak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    averageScore: null
  });

  // Sync activeTab when initialTab prop changes (e.g. from post-baseline reminder "Go to Profile")
  // Also enable editing if navigating to details tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'details') {
        setIsEditing(true);
      }
    }
  }, [initialTab]);

  // Detect unsaved changes by comparing current userData with original
  useEffect(() => {
    if (!originalUserData || !isEditing) {
      setHasUnsavedChanges(false);
      return;
    }
    // Compare editable fields only
    const editableFields: (keyof UserData)[] = [
      'firstName', 'lastName', 'phone', 'ageRange', 'gender', 'school',
      'yearOfStudy', 'course', 'studyMode', 'livingArrangement',
      'accommodationName', 'domicileStatus', 'firstGenStudent', 'caringResponsibilities'
    ];
    const hasChanges = editableFields.some(
      (field) => userData[field] !== originalUserData[field]
    );
    setHasUnsavedChanges(hasChanges);
  }, [userData, originalUserData, isEditing]);

  // Report unsaved changes to parent
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Helper to handle navigation with unsaved changes check
  const handleTabChangeWithWarning = (newTab: TabType) => {
    if (activeTab === 'details' && isEditing && hasUnsavedChanges) {
      setPendingNavigation(() => () => {
        setActiveTab(newTab);
        setIsEditing(false);
        setHasUnsavedChanges(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newTab);
      if (activeTab === 'details') setIsEditing(false);
    }
  };

  // Auto-trigger export after completing baseline
  useEffect(() => {
    if (autoTriggerExport && user && !isLoading) {
      console.log('🚀 Auto-triggering export after baseline completion');
      // Switch to wellness tab
      setActiveTab('wellness');
      // Open export modal after a short delay
      setTimeout(() => {
        handleExportData();
        // Notify parent that export was triggered
        if (onExportTriggered) {
          onExportTriggered();
        }
      }, 500);
    }
  }, [autoTriggerExport, user, isLoading]);

  // Fetch user profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Fetch profile data
      const profileResponse = await backendService.database.select('profiles', {
        filters: { user_id: user.id }
      });

      if (profileResponse.data && profileResponse.data.length > 0) {
        const profile = profileResponse.data[0];
        
        // Fetch university data using the user's actual university_id
        const universityResponse = await backendService.database.select('universities', {
          filters: { id: profile.university_id }
        });

        let uniData: UniversityData | null = null;
        let schools: string[] = [];
        let halls: string[] = [];

        if (universityResponse.data && universityResponse.data.length > 0) {
          const uni = universityResponse.data[0];
          uniData = {
            id: uni.id,
            name: uni.name,
            logo: uni.logo,
            schools: uni.schools || [],
            halls_of_residence: uni.halls_of_residence || []
          };

          // Extract school names for dropdown
          schools = (uni.schools || []).map((s: any) => s.name);
          
          // Extract hall names for dropdown
          halls = (uni.halls_of_residence || []).map((h: any) => h.name);
          
          setUniversityData(uniData);
          setSchoolOptions(schools);
          setHallOptions(halls);
        }
        
        // Fetch wellness stats and mood scores from fusion_outputs
        const sessionsResponse = await backendService.database.select('fusion_outputs', {
          filters: { user_id: user.id },
          orderBy: [{ column: 'created_at', ascending: false }],
          select: 'id, user_id, final_score, analysis, created_at'
        });

        const sessions = sessionsResponse.data || [];
        
        console.log('📊 Sessions fetched:', sessions.length);
        if (sessions.length > 0) {
          console.log('📊 Sample session:', {
            has_analysis: !!sessions[0].analysis,
            analysis_type: typeof sessions[0].analysis,
            analysis_preview: sessions[0].analysis ? JSON.stringify(sessions[0].analysis).substring(0, 100) : 'null'
          });
        }
        
        const totalCheckIns = sessions.length;
        
        // Calculate average score
        const averageScore = totalCheckIns > 0
          ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.final_score || 0), 0) / totalCheckIns)
          : null;

        // Calculate current streak
        const currentStreak = calculateCurrentStreak(sessions);

        // Extract mood scores from sessions
        // The analysis field contains the moodScore
        const moodScores = sessions
          .map((session: any) => {
            try {
              // Analysis might be in the session already or need to be parsed
              const analysis = typeof session.analysis === 'string'
                ? JSON.parse(session.analysis)
                : session.analysis;
              
              const moodScore = analysis?.moodScore || analysis?.mood_score;
              
              if (moodScore && moodScore > 0) {
                return {
                  date: session.created_at,
                  score: moodScore
                };
              }
              return null;
            } catch (e) {
              return null;
            }
          })
          .filter((item: any) => item !== null);

        console.log('📊 Mood scores extracted:', moodScores.length, 'from', sessions.length, 'sessions');
        setMoodData(moodScores);

        // Extract themes from sessions
        const themeCounts: Record<string, number> = {};
        sessions.forEach((session: any) => {
          try {
            const analysis = typeof session.analysis === 'string'
              ? JSON.parse(session.analysis)
              : session.analysis;
            
            const themes = analysis?.themes || [];
            themes.forEach((theme: string) => {
              if (theme && typeof theme === 'string') {
                // Capitalize first letter
                const capitalizedTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
                themeCounts[capitalizedTheme] = (themeCounts[capitalizedTheme] || 0) + 1;
              }
            });
          } catch (e) {
            // Skip invalid analysis
          }
        });

        // Convert to ThemeData array and sort by frequency
        const themesArray: ThemeData[] = Object.entries(themeCounts)
          .map(([text, value]) => ({ text, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 15); // Top 15 themes

        console.log('📊 Themes extracted:', themesArray.length, 'unique themes');
        setThemesData(themesArray);

        setProfileCompleted(!!profile.profile_completed);
        const loadedUserData = {
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
          institution: uniData?.name || 'University of Worcester',
          institutionLogo: uniData?.logo || '',
          accountType: 'Student',
          ageRange: profile.age_range || '',
          gender: profile.gender || '',
          school: profile.school || '',
          yearOfStudy: profile.year_of_study || '',
          course: profile.course || '',
          studyMode: profile.study_mode || '',
          livingArrangement: profile.living_situation || '',
          accommodationName: profile.hall_of_residence || '',
          domicileStatus: profile.domicile || '',
          firstGenStudent: profile.is_first_generation || false,
          caringResponsibilities: profile.has_caring_responsibilities || false,
          currentStreak,
          longestStreak: currentStreak, // TODO: Track longest streak separately
          totalCheckIns,
          averageScore
        };
        setUserData(loadedUserData);
        setOriginalUserData(loadedUserData);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate current streak from check-in dates
  const calculateCurrentStreak = (sessions: any[]): number => {
    if (sessions.length === 0) return 0;

    // Sort by date descending
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.created_at);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0 || daysDiff === 1) {
        // Same day or consecutive day
        if (daysDiff === 1) {
          streak++;
          checkDate = new Date(sessionDate);
        }
      } else {
        // Streak broken
        break;
      }
    }

    return streak;
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      await backendService.database.update(
        'profiles',
        {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          age_range: userData.ageRange,
          gender: userData.gender,
          school: userData.school,
          year_of_study: userData.yearOfStudy,
          course: userData.course,
          study_mode: userData.studyMode,
          living_situation: userData.livingArrangement,
          hall_of_residence: userData.accommodationName,
          domicile: userData.domicileStatus,
          is_first_generation: userData.firstGenStudent,
          has_caring_responsibilities: userData.caringResponsibilities,
          profile_completed: true,
          profile_completed_at: new Date().toISOString()
        },
        { user_id: user.id }
      );

      setProfileCompleted(true);
      setOriginalUserData({ ...userData });
      setHasUnsavedChanges(false);
      setIsEditing(false);
      console.log('✅ Profile saved successfully');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Register save function with parent via ref (must run after handleSaveProfile is defined)
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSaveProfile;
    }
    return () => {
      if (saveRef) {
        saveRef.current = null;
      }
    };
  }, [saveRef, handleSaveProfile]);

  // Check if user has completed baseline today
  const checkBaselineToday = async () => {
    if (!user?.id) {
      console.log('[Baseline Check] No user ID');
      return false;
    }

    try {
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      console.log('[Baseline Check] Checking for baseline on date:', today);
      
      const response = await backendService.database.select('fusion_outputs', {
        filters: { 
          user_id: user.id,
        },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 10 // Check last 10 entries
      });

      console.log('[Baseline Check] Found sessions:', response.data?.length);

      if (response.data && response.data.length > 0) {
        // Check if any are baselines from today
        const baselineToday = response.data.find((session: any) => {
          const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
          const isBaseline = session.analysis?.assessment_type === 'baseline';
          console.log('[Baseline Check] Session:', sessionDate, 'isBaseline:', isBaseline, 'matches today:', sessionDate === today);
          return isBaseline && sessionDate === today;
        });
        
        console.log('[Baseline Check] Has baseline today:', !!baselineToday);
        return !!baselineToday;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking baseline:', error);
      return false;
    }
  };

  const handleExportData = async () => {
    console.log('[Export Flow] Starting export data check...');
    const hasBaseline = await checkBaselineToday();
    console.log('[Export Flow] Has baseline today?', hasBaseline);
    setHasBaselineToday(hasBaseline);
    
    if (!hasBaseline) {
      console.log('[Export Flow] No baseline - showing requirement modal');
      setShowBaselineRequired(true);
    } else if (!profileCompleted) {
      console.log('[Export Flow] Profile not complete - showing reminder');
      setShowExportProfileReminder(true);
    } else {
      console.log('[Export Flow] Has baseline - showing export modal');
      setShowExportModal(true);
    }
  };

  const handleConfirmExport = async () => {
    if (!user) return;

    try {
      setIsExporting(true);

      console.log('[MobileProfile] Generating report with periodDays:', exportPeriod);

      // Get JWT token for authentication
      const idToken = await cognitoApiClient.getIdToken();
      if (!idToken) {
        console.error('[MobileProfile] No authentication token available');
        alert('Authentication required. Please sign in again.');
        return;
      }

      // Call the report generation API with authentication
      const response = await fetch('https://admin.mindmeasure.co.uk/api/reports/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: userData.firstName || 'there',
          periodDays: exportPeriod
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Export] API returned error:', errorData);
        console.error('[Export] Status code:', response.status);
        
        if (errorData.error === 'Baseline required') {
          // Show baseline required modal
          setShowExportModal(false);
          setShowBaselineRequired(true);
          return;
        }
        throw new Error(errorData.message || errorData.error || 'Failed to generate report');
      }

      const data = await response.json();
      console.log('[Export] Report generated successfully:', data);

      setShowExportModal(false);
      alert(`Report generated successfully!\n\nWe've sent an email to ${user.email} with a link to view your report.\n\nCheck your inbox (and spam folder).`);
    } catch (error) {
      console.error('[Export] Full error object:', error);
      console.error('[Export] Error message:', error instanceof Error ? error.message : String(error));
      alert(`Failed to generate report. Please try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#999999' }}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px' // Space for bottom nav
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '72px 20px 24px 20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* University Logo */}
          {userData.institutionLogo ? (
            <img
              src={userData.institutionLogo}
              alt={userData.institution}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                objectFit: 'contain',
                flexShrink: 0,
                border: '1px solid #E0E0E0',
                padding: '4px',
                backgroundColor: 'white'
              }}
            />
          ) : (
            <img
              src={mindMeasureLogo}
              alt="Logo"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#1a1a1a',
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {userData.firstName} {userData.lastName}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#999999',
              marginBottom: '2px'
            }}>
              {userData.institution || 'No institution'}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#666666'
            }}>
              {userData.email}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => handleTabChangeWithWarning('overview')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'overview' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'overview' ? 'white' : '#666666'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabChangeWithWarning('details')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'details' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'details' ? 'white' : '#666666'
            }}
          >
            Details
          </button>
          <button
            onClick={() => handleTabChangeWithWarning('wellness')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'wellness' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'wellness' ? 'white' : '#666666'
            }}
          >
            Wellness
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.currentStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Day Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.averageScore ?? '-'}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Avg Score
                </div>
              </div>
            </div>

            {/* Mood Trend Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                  Mood Trend
                </span>
              </div>
              <MoodTrendChart data={moodData} />
            </div>

            {/* Key Themes Card */}
            <KeyThemes 
              themes={themesData.length > 0 ? themesData : undefined}
              title="Your Key Themes"
              subtitle={themesData.length > 0 ? `From ${userData.totalCheckIns} check-ins` : 'Top themes'}
              height="240px"
            />
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            {/* Your Information Section */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                  Your Information
                </h2>
                <button
                  onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  disabled={isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: isSaving ? 'default' : 'pointer',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  <Edit2 size={14} />
                  {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
                </button>
              </div>

              {/* Personal Information */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Personal Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={userData.firstName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        background: isEditing ? 'white' : '#FAFAFA',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userData.lastName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        background: isEditing ? 'white' : '#FAFAFA',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: isEditing ? 'white' : '#FAFAFA',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Age Range
                    </label>
                    <Select
                      value={userData.ageRange}
                      onChange={(value) => setUserData({ ...userData, ageRange: value })}
                      options={['17-18', '19-21', '22-25', '26-30', '31-40', '41+']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Gender
                    </label>
                    <Select
                      value={userData.gender}
                      onChange={(value) => setUserData({ ...userData, gender: value })}
                      options={['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Academic Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      School / Faculty <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.school}
                      onChange={(value) => setUserData({ ...userData, school: value })}
                      options={schoolOptions.length > 0 ? schoolOptions : ['School of Arts and Humanities', 'Worcester Business School', 'School of Education', 'School of Health and Wellbeing', 'School of Science and the Environment', 'School of Sport and Exercise Science']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Year of Study <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.yearOfStudy}
                      onChange={(value) => setUserData({ ...userData, yearOfStudy: value })}
                      options={['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate', 'Foundation']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Course / Programme
                  </label>
                  <input
                    type="text"
                    value={userData.course}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: isEditing ? 'white' : '#FAFAFA',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Study Mode
                  </label>
                  <Select
                    value={userData.studyMode}
                    onChange={(value) => setUserData({ ...userData, studyMode: value })}
                    options={['Full-time', 'Part-time', 'Distance Learning']}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Living Situation */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Living Situation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: userData.livingArrangement === 'University Accommodation' ? '12px' : '0' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Where do you live? <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.livingArrangement}
                      onChange={(value) => setUserData({ ...userData, livingArrangement: value, accommodationName: value === 'University Accommodation' ? userData.accommodationName : '' })}
                      options={['University Accommodation', 'Off Campus - Private', 'Living at Home', 'Commuting']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Domicile Status
                    </label>
                    <Select
                      value={userData.domicileStatus}
                      onChange={(value) => setUserData({ ...userData, domicileStatus: value })}
                      options={['Home (UK)', 'EU', 'International']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {userData.livingArrangement === 'University Accommodation' && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Name of Accommodation
                    </label>
                    {hallOptions.length > 0 ? (
                      <Select
                        value={userData.accommodationName}
                        onChange={(value) => setUserData({ ...userData, accommodationName: value })}
                        options={hallOptions}
                        disabled={!isEditing}
                        placeholder="Select hall of residence"
                      />
                    ) : (
                      <input
                        type="text"
                        value={userData.accommodationName}
                        disabled={!isEditing}
                        onChange={(e) => setUserData({ ...userData, accommodationName: e.target.value })}
                        placeholder="e.g., Smith Hall"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#1a1a1a',
                          background: isEditing ? 'white' : '#FAFAFA',
                          outline: 'none'
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Additional Information
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                  cursor: isEditing ? 'pointer' : 'default'
                }}>
                  <input
                    type="checkbox"
                    checked={userData.firstGenStudent}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, firstGenStudent: e.target.checked })}
                    style={{
                      marginTop: '2px',
                      width: '18px',
                      height: '18px',
                      cursor: isEditing ? 'pointer' : 'default'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500', marginBottom: '2px' }}>
                      First generation student
                    </div>
                    <div style={{ fontSize: '12px', color: '#999999' }}>
                      First in your immediate family to attend university
                    </div>
                  </div>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: isEditing ? 'pointer' : 'default'
                }}>
                  <input
                    type="checkbox"
                    checked={userData.caringResponsibilities}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, caringResponsibilities: e.target.checked })}
                    style={{
                      marginTop: '2px',
                      width: '18px',
                      height: '18px',
                      cursor: isEditing ? 'pointer' : 'default'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500', marginBottom: '2px' }}>
                      Caring responsibilities
                    </div>
                    <div style={{ fontSize: '12px', color: '#999999' }}>
                      You care for a family member or dependent
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Usage Info */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E8F0FE'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#5B8FED',
                marginBottom: '12px'
              }}>
                How we use your information
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12px',
                color: '#666666',
                lineHeight: '1.6'
              }}>
                <li style={{ marginBottom: '4px' }}>Your data helps us personalise your wellbeing support</li>
                <li style={{ marginBottom: '4px' }}>Academic info enables aggregate cohort insights</li>
                <li style={{ marginBottom: '4px' }}>All data is anonymised for institutional research</li>
                <li>You can update or delete your information anytime</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'wellness' && (
          <div>
            {/* Wellness Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.currentStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Current Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.longestStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Longest Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.totalCheckIns}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Total Check-ins
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.averageScore ?? '-'}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Average Score
                </div>
              </div>
            </div>

            {/* Data Ownership Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1a1a1a',
                margin: 0,
                marginBottom: '16px'
              }}>
                This is YOUR Data
              </h3>
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#666666',
                lineHeight: '1.6'
              }}>
                Every conversation, score, and insight belongs to you. Use this data for personal reflection and growth, share with therapists or counsellors when helpful, and export to keep for your personal records.
              </p>
              <button
                onClick={handleExportData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #5B8FED, #6BA3FF)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Download size={18} />
                Export My Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div style={{
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 16px 0'
            }}>
              Email Wellbeing Report
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#666666',
              margin: '0 0 20px 0',
              lineHeight: '1.6'
            }}>
              We'll email a detailed wellbeing report to <strong>{user?.email}</strong> including your check-in history, scores, themes, and AI-generated summary.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#1a1a1a',
                display: 'block',
                marginBottom: '12px'
              }}>
                Time Period
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${exportPeriod === 14 ? '#5B8FED' : '#E0E0E0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: exportPeriod === 14 ? '#F0F7FF' : 'white'
                }}>
                  <input
                    type="radio"
                    name="period"
                    value="14"
                    checked={exportPeriod === 14}
                    onChange={() => setExportPeriod(14)}
                    style={{ marginRight: '12px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                    Last 14 Days
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${exportPeriod === 30 ? '#5B8FED' : '#E0E0E0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: exportPeriod === 30 ? '#F0F7FF' : 'white'
                }}>
                  <input
                    type="radio"
                    name="period"
                    value="30"
                    checked={exportPeriod === 30}
                    onChange={() => setExportPeriod(30)}
                    style={{ marginRight: '12px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                    Last Month (30 Days)
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${exportPeriod === 90 ? '#5B8FED' : '#E0E0E0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: exportPeriod === 90 ? '#F0F7FF' : 'white'
                }}>
                  <input
                    type="radio"
                    name="period"
                    value="90"
                    checked={exportPeriod === 90}
                    onChange={() => setExportPeriod(90)}
                    style={{ marginRight: '12px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                    Last 3 Months (90 Days)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666666',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isExporting ? 'default' : 'pointer',
                  opacity: isExporting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExport}
                disabled={isExporting}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #5B8FED, #6BA3FF)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isExporting ? 'default' : 'pointer',
                  opacity: isExporting ? 0.7 : 1
                }}
              >
                {isExporting ? 'Sending...' : 'Email Report to Me'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
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
          onClick={() => setShowUnsavedWarning(false)}
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
              You have unsaved changes. Do you want to save before leaving?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={async () => {
                  setShowUnsavedWarning(false);
                  await handleSaveProfile();
                  if (pendingNavigation) {
                    pendingNavigation();
                    setPendingNavigation(null);
                  }
                }}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSaving ? 'default' : 'pointer',
                  opacity: isSaving ? 0.6 : 1
                }}
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  // Discard changes: restore original data
                  if (originalUserData) {
                    setUserData(originalUserData);
                  }
                  setHasUnsavedChanges(false);
                  if (pendingNavigation) {
                    pendingNavigation();
                    setPendingNavigation(null);
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
                  setShowUnsavedWarning(false);
                  setPendingNavigation(null);
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

      {/* Export: Profile incomplete reminder */}
      {showExportProfileReminder && (
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
          onClick={() => setShowExportProfileReminder(false)}
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
              Complete your profile
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              margin: '0 0 24px 0',
              lineHeight: '1.6'
            }}>
              Complete your profile so your export includes your details. You can fill in your details in the Details tab.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowExportProfileReminder(false);
                  setActiveTab('details');
                  setIsEditing(true);
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
                Go to details
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExportProfileReminder(false);
                  setShowExportModal(true);
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
                Export anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Baseline Required Modal */}
      {showBaselineRequired && (
        <div style={{
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 16px 0'
            }}>
              Baseline Assessment Required
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#666666',
              margin: '0 0 16px 0',
              lineHeight: '1.6'
            }}>
              To generate your wellbeing report, we need your current PHQ-2 and GAD-2 scores.
            </p>

            <p style={{
              fontSize: '14px',
              color: '#666666',
              margin: '0 0 24px 0',
              lineHeight: '1.6'
            }}>
              Please complete a fresh baseline assessment today to ensure your report reflects your current wellbeing status.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowBaselineRequired(false)}
                style={{
                  flex: 1,
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
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBaselineRequired(false);
                  // Navigate to baseline assessment
                  if (onNavigateToBaseline) {
                    onNavigateToBaseline();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #5B8FED, #6BA3FF)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Start Baseline Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

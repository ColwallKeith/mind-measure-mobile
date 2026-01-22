import { useState, useEffect } from 'react';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { useAuth } from '@/contexts/AuthContext';
import { cognitoApiClient } from '@/services/cognito-api-client';

interface DashboardData {
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    streakCount: number;
    baselineEstablished: boolean;
    createdAt?: string; // Account creation date for determining available views
    university_id?: string; // University ID for content/nudges
  };
  latestScore: {
    score: number;
    lastUpdated: string;
    trend: 'up' | 'down' | 'stable';
    label: string;
  } | null;
  latestSession: {
    id: string;
    createdAt: string;
    summary: string;
    themes: string[];
    moodScore: number;
    driverPositive: string[];
    driverNegative: string[];
  } | null;
  recentActivity: Array<{
    type: 'checkin' | 'baseline';
    score: number;
    createdAt: string;
  }>;
  trendData: {
    last7CheckIns: Array<{ date: string; score: number }>;
    last7Days: Array<{ date: string; score: number }>;
    last30Days: Array<{ date: string; score: number }>;
    weeklyAverages: Array<{ date: string; score: number }>;
    monthlyAverages: Array<{ date: string; score: number }>;
  };
  hasData: boolean;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );
  
  const [data, setData] = useState<DashboardData>({
    profile: {
      firstName: 'User',
      lastName: '',
      displayName: 'User',
      streakCount: 0,
      baselineEstablished: false,
    },
    latestScore: null,
    latestSession: null,
    recentActivity: [],
    trendData: {
      last7CheckIns: [],
      last7Days: [],
      last30Days: [],
      weeklyAverages: [],
      monthlyAverages: []
    },
    hasData: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }
    
    fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📊 Fetching dashboard data for user:', user.id);
      console.log('👤 User details:', {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        given_name: user.user_metadata?.given_name,
        family_name: user.user_metadata?.family_name,
        name: user.user_metadata?.name
      });
      
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      // Fetch user profile
      const { data: profiles, error: profileError } = await backendService.database.select('profiles', {
        filters: { user_id: user.id },
        columns: 'first_name, last_name, display_name, streak_count, baseline_established, created_at, university_id'
      });
      
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
      
      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        // Profile might not exist yet, create it
        const firstName = user.user_metadata?.given_name || user.user_metadata?.first_name || 'User';
        const lastName = user.user_metadata?.family_name || user.user_metadata?.last_name || '';
        const displayName = user.user_metadata?.name || user.user_metadata?.full_name || firstName;
        
        const { data: newProfile, error: createError } = await backendService.database.insert('profiles', {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          streak_count: 0,
          baseline_established: false,
        });
        
        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }
        console.log('✅ Created new profile:', newProfile);
      }

      // Fetch latest assessment data from fusion_outputs (where baseline scores are stored)
      // DO NOT query assessment_sessions - it has FK constraints and missing columns (conversation_summary) for baseline
      const { data: sessions, error: sessionsError } = await backendService.database.select(
        'fusion_outputs',
        {
          columns: ['id', 'score', 'final_score', 'analysis', 'created_at'],
          filters: { user_id: user.id },
          orderBy: [{ column: 'created_at', ascending: false }]
        }
      );
      
      if (sessionsError) {
        console.warn('⚠️ Database select failed (failing silently for baseline):', sessionsError);
        // Don't throw - fail gracefully for baseline users who might not have sessions yet
      }
      
      console.log('📋 Fetched sessions:', sessions?.length || 0);

      // Process the data
      const firstName = user.user_metadata?.given_name || user.user_metadata?.first_name || 'User';
      const lastName = user.user_metadata?.family_name || user.user_metadata?.last_name || '';
      const displayName = user.user_metadata?.name || user.user_metadata?.full_name || firstName;
      
      const profileData = profile || {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        streak_count: 0,
        baseline_established: false,
      };

      // Debug: Log all sessions data (fusion_outputs format: has score/final_score, analysis JSON)
      console.log('🔍 All sessions data:', sessions?.map(s => ({
        id: s.id,
        created_at: s.created_at,
        score: s.score,
        final_score: s.final_score,
        analysis: s.analysis
      })));

      // Get latest session with score (use score or final_score from fusion_outputs)
      // This is used for the score card display - can be baseline or check-in
      const latestSessionWithScore = sessions?.find(s => s.final_score || s.score);
      let latestScore = null;
      let latestSession = null;
      
      console.log('🎯 Latest session with score:', latestSessionWithScore ? {
        id: latestSessionWithScore.id,
        created_at: latestSessionWithScore.created_at,
        score: latestSessionWithScore.score,
        final_score: latestSessionWithScore.final_score,
        raw_date: latestSessionWithScore.created_at,
        parsed_date: new Date(latestSessionWithScore.created_at),
        formatted_date: new Date(latestSessionWithScore.created_at).toLocaleDateString('en-GB')
      } : 'No session with score found');
      
      if (latestSessionWithScore) {
        const currentScore = latestSessionWithScore.final_score || latestSessionWithScore.score;
        
        // Find the second session with a score (skip the first one which is latestSessionWithScore)
        const sessionsWithScores = sessions?.filter(s => s.final_score || s.score) || [];
        const previousSession = sessionsWithScores.length > 1 ? sessionsWithScores[1] : null;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (previousSession) {
          const previousScore = previousSession.final_score || previousSession.score;
          if (currentScore > previousScore + 5) trend = 'up';
          else if (currentScore < previousScore - 5) trend = 'down';
        }
        
        // Fix date formatting to use British format (DD/MM/YYYY)
        const assessmentDate = new Date(latestSessionWithScore.created_at);
        const formattedDate = assessmentDate.toLocaleDateString('en-GB');
        
        latestScore = {
          score: currentScore,
          lastUpdated: formattedDate,
          trend,
          label: getScoreLabel(currentScore),
        };
      }
      
      // Find latest CHECK-IN specifically (not baseline) for the "Latest Check-in" section
      const latestCheckIn = sessions?.find(s => {
        if (!(s.final_score || s.score)) return false;
        
        let analysisData: any = {};
        try {
          analysisData = typeof s.analysis === 'string' 
            ? JSON.parse(s.analysis) 
            : s.analysis || {};
        } catch (e) {
          return false;
        }
        
        return analysisData.assessment_type === 'checkin';
      });
      
      console.log('🔍 Latest check-in found:', latestCheckIn ? {
        id: latestCheckIn.id,
        created_at: latestCheckIn.created_at,
        score: latestCheckIn.final_score || latestCheckIn.score
      } : 'No check-ins found');
      
      if (latestCheckIn) {
        const checkInScore = latestCheckIn.final_score || latestCheckIn.score;
        
        // Parse analysis field
        let analysisData: any = {};
        try {
          analysisData = typeof latestCheckIn.analysis === 'string' 
            ? JSON.parse(latestCheckIn.analysis) 
            : latestCheckIn.analysis || {};
        } catch (e) {
          console.warn('Failed to parse check-in analysis:', e);
        }
        
        console.log('🔍 Check-in details:', { 
          assessment_type: analysisData.assessment_type,
          has_conversation_summary: !!analysisData.conversation_summary,
          themes_count: analysisData.themes?.length || 0,
          positives_count: (analysisData.driver_positive || analysisData.drivers_positive || []).length,
          negatives_count: (analysisData.driver_negative || analysisData.drivers_negative || []).length
        });
        
        latestSession = {
          id: latestCheckIn.id,
          createdAt: new Date(latestCheckIn.created_at).toLocaleDateString('en-GB'),
          summary: analysisData.conversation_summary || 'Check-in completed.',
          themes: analysisData.themes || [],
          moodScore: analysisData.mood_score || Math.round(checkInScore / 10),
          driverPositive: analysisData.driver_positive || analysisData.drivers_positive || [],
          driverNegative: analysisData.driver_negative || analysisData.drivers_negative || [],
        };
        
        console.log('📊 Latest check-in loaded:', {
          summary: latestSession.summary?.substring(0, 50),
          themes: latestSession.themes,
          moodScore: latestSession.moodScore,
          driverPositive: latestSession.driverPositive,
          driverNegative: latestSession.driverNegative
        });
      }
      
      // Recent activity from all sessions (parse analysis to get assessment_type)
      const recentActivity = sessions?.slice(0, 5).map(session => {
        let analysisData: any = {};
        try {
          analysisData = typeof session.analysis === 'string' 
            ? JSON.parse(session.analysis) 
            : session.analysis || {};
        } catch (e) {
          // Ignore parse errors
        }
        
        return {
          type: analysisData.assessment_type === 'baseline' ? 'baseline' : 'checkin' as const,
          score: session.final_score || session.score || 0,
          createdAt: session.created_at,
        };
      }) || [];
      
      // Calculate trend data for charts
      const trendData = calculateTrendData(sessions || []);
      
      const hasData = sessions && sessions.length > 0;
      
      setData({
        profile: {
          firstName: (profileData.first_name || 'User').charAt(0).toUpperCase() + (profileData.first_name || 'User').slice(1).toLowerCase(),
          lastName: (profileData.last_name || '').charAt(0).toUpperCase() + (profileData.last_name || '').slice(1).toLowerCase(),
          displayName: profileData.display_name || 'User',
          streakCount: profileData.streak_count || 0,
          baselineEstablished: profileData.baseline_established || (sessions && sessions.length > 0),
          createdAt: profileData.created_at, // Account creation date
          university_id: profileData.university_id, // University ID for nudges/content
        },
        latestScore,
        latestSession,
        recentActivity,
        trendData,
        hasData: !!hasData,
        loading: false,
        error: null,
      });
      
      console.log('✅ Dashboard data loaded:', { hasData, sessionsCount: sessions?.length });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
      }));
    }
  };
  
  return data;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

function calculateTrendData(sessions: any[]) {
  // Filter only check-ins (exclude baseline)
  const checkIns = sessions.filter(s => {
    let analysisData: any = {};
    try {
      analysisData = typeof s.analysis === 'string' ? JSON.parse(s.analysis) : s.analysis || {};
    } catch (e) {
      return false;
    }
    return analysisData.assessment_type !== 'baseline';
  });

  // Last 7 check-ins
  const last7CheckIns = checkIns.slice(0, 7).reverse().map(s => ({
    date: s.created_at,
    score: s.final_score || s.score || 0
  }));

  // Last 7 days (one data point per day, using most recent score for that day)
  const last7Days: Array<{ date: string; score: number }> = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Find the most recent check-in for this day
    const dayCheckIn = checkIns.find(s => {
      const sessionDate = new Date(s.created_at);
      return sessionDate >= targetDate && sessionDate < nextDate;
    });
    
    if (dayCheckIn) {
      last7Days.push({
        date: targetDate.toISOString(),
        score: dayCheckIn.final_score || dayCheckIn.score || 0
      });
    }
  }

  // Last 30 days (one data point per day)
  const last30Days: Array<{ date: string; score: number }> = [];
  
  for (let i = 29; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Find the most recent check-in for this day
    const dayCheckIn = checkIns.find(s => {
      const sessionDate = new Date(s.created_at);
      return sessionDate >= targetDate && sessionDate < nextDate;
    });
    
    if (dayCheckIn) {
      last30Days.push({
        date: targetDate.toISOString(),
        score: dayCheckIn.final_score || dayCheckIn.score || 0
      });
    }
  }

  // Weekly averages (last 10 weeks)
  const weeklyAverages: Array<{ date: string; score: number }> = [];
  
  for (let i = 9; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekSessions = checkIns.filter(s => {
      const sessionDate = new Date(s.created_at);
      return sessionDate >= weekStart && sessionDate < weekEnd;
    });
    
    if (weekSessions.length > 0) {
      const avgScore = Math.round(
        weekSessions.reduce((sum, s) => sum + (s.final_score || s.score || 0), 0) / weekSessions.length
      );
      weeklyAverages.push({
        date: weekStart.toISOString(),
        score: avgScore
      });
    }
  }

  // Monthly averages (last 12 months)
  const monthlyAverages: Array<{ date: string; score: number }> = [];
  
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthSessions = checkIns.filter(s => {
      const sessionDate = new Date(s.created_at);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });
    
    if (monthSessions.length > 0) {
      const avgScore = Math.round(
        monthSessions.reduce((sum, s) => sum + (s.final_score || s.score || 0), 0) / monthSessions.length
      );
      monthlyAverages.push({
        date: monthStart.toISOString(),
        score: avgScore
      });
    }
  }

  return {
    last7CheckIns,
    last7Days,
    last30Days,
    weeklyAverages,
    monthlyAverages
  };
}


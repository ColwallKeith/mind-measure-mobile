import { useState, useEffect } from 'react';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    streakCount: number;
    baselineEstablished: boolean;
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
        columns: 'first_name, last_name, display_name, streak_count, baseline_established'
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
        const previousSession = sessions?.find((s, index) =>
          index > 0 && (s.final_score || s.score)
        );
        
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
        
        // Parse analysis field to determine if baseline or check-in
        let analysisData: any = {};
        try {
          analysisData = typeof latestSessionWithScore.analysis === 'string' 
            ? JSON.parse(latestSessionWithScore.analysis) 
            : latestSessionWithScore.analysis || {};
        } catch (e) {
          console.warn('Failed to parse analysis field:', e);
        }
        
        // Only include detailed conversation data for check-ins, not baseline assessments
        const isBaselineOnly = analysisData.assessment_type === 'baseline';
        latestSession = {
          id: latestSessionWithScore.id,
          createdAt: new Date(latestSessionWithScore.created_at).toLocaleDateString('en-GB'),
          summary: isBaselineOnly ? null : 'Assessment completed successfully.', // conversation_summary doesn't exist for baseline
          themes: isBaselineOnly ? [] : ['wellbeing', 'mood', 'energy'], // No themes for baseline
          moodScore: Math.round(currentScore / 10), // Convert 0-100 to 0-10
          driverPositive: isBaselineOnly ? [] : ['positive outlook', 'good energy'],
          driverNegative: isBaselineOnly ? [] : ['stress', 'fatigue'],
        };
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
      
      const hasData = sessions && sessions.length > 0;
      
      setData({
        profile: {
          firstName: (profileData.first_name || 'User').charAt(0).toUpperCase() + (profileData.first_name || 'User').slice(1).toLowerCase(),
          lastName: (profileData.last_name || '').charAt(0).toUpperCase() + (profileData.last_name || '').slice(1).toLowerCase(),
          displayName: profileData.display_name || 'User',
          streakCount: profileData.streak_count || 0,
          baselineEstablished: profileData.baseline_established || (sessions && sessions.length > 0),
        },
        latestScore,
        latestSession,
        recentActivity,
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



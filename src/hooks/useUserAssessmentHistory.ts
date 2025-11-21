import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';

export interface UserAssessmentHistory {
  needsBaseline: boolean;
  needsCheckin: boolean;
  hasAssessmentHistory: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useUserAssessmentHistory(): UserAssessmentHistory {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsBaseline, setNeedsBaseline] = useState(true);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [hasAssessmentHistory, setHasAssessmentHistory] = useState(false);

  const checkAssessmentHistory = useCallback(async () => {
    if (!user?.id) {
      console.log('[useUserAssessmentHistory] No user ID - assuming needs baseline');
      setNeedsBaseline(true);
      setHasAssessmentHistory(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[useUserAssessmentHistory] Checking assessment history for user:', user.id);
      
      const backendService = await BackendServiceFactory.createService();
      
      // Check for any fusion_outputs (baseline assessment records) for this user
      const { data: assessments, error } = await backendService.database.select(
        'fusion_outputs',
        ['id', 'score', 'created_at'],
        { user_id: user.id }
      );

      if (error) {
        console.error('[useUserAssessmentHistory] Error checking assessments:', error);
        setNeedsBaseline(true);
        setHasAssessmentHistory(false);
      } else if (assessments && assessments.length > 0) {
        console.log('[useUserAssessmentHistory] Found', assessments.length, 'assessment(s) - baseline complete');
        setHasAssessmentHistory(true);
        setNeedsBaseline(false);
      } else {
        console.log('[useUserAssessmentHistory] No assessments found - needs baseline');
        setHasAssessmentHistory(false);
        setNeedsBaseline(true);
      }
    } catch (error) {
      console.error('[useUserAssessmentHistory] Error checking assessment history:', error);
      setNeedsBaseline(true);
      setHasAssessmentHistory(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkAssessmentHistory();
  }, [checkAssessmentHistory]);

  return {
    needsBaseline,
    needsCheckin,
    hasAssessmentHistory,
    loading,
    refetch: checkAssessmentHistory
  };
}

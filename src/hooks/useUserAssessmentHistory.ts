import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
    const userId = user?.id;
    
    // Early return if no userId
    if (!userId) {
      console.log('[useUserAssessmentHistory] No user ID - needs baseline');
      setNeedsBaseline(true);
      setHasAssessmentHistory(false);
      setNeedsCheckin(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[useUserAssessmentHistory] Checking assessment history for user:', userId);
      
      // Import and create backend service using same pattern as BaselineAssessment
      const { BackendServiceFactory } = await import('@/services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      
      // Query fusion_outputs table for baseline assessments - same signature as BaselineAssessment uses
      const { data: assessments, error } = await backendService.database.select(
        'fusion_outputs',
        ['id', 'score', 'created_at', 'analysis'],
        { user_id: userId }
      );

      if (error) {
        console.error('[useUserAssessmentHistory] Database error:', error);
        console.error('[useUserAssessmentHistory] Error type:', typeof error);
        console.error('[useUserAssessmentHistory] Error details:', JSON.stringify(error, null, 2));
        // On error, assume needs baseline (safe default)
        setHasAssessmentHistory(false);
        setNeedsBaseline(true);
        setNeedsCheckin(false);
      } else if (assessments && assessments.length > 0) {
        console.log('[useUserAssessmentHistory] Found', assessments.length, 'assessment(s) - baseline complete');
        setHasAssessmentHistory(true);
        setNeedsBaseline(false);
        // Check if needs check-in (future feature)
        setNeedsCheckin(false);
      } else {
        console.log('[useUserAssessmentHistory] No assessments found - needs baseline');
        setHasAssessmentHistory(false);
        setNeedsBaseline(true);
        setNeedsCheckin(false);
      }
    } catch (error) {
      console.error('[useUserAssessmentHistory] Exception caught:', error);
      // Log full error details
      if (error instanceof Error) {
        console.error('[useUserAssessmentHistory] Error name:', error.name);
        console.error('[useUserAssessmentHistory] Error message:', error.message);
        console.error('[useUserAssessmentHistory] Error stack:', error.stack);
      } else {
        console.error('[useUserAssessmentHistory] Non-Error object:', JSON.stringify(error));
      }
      // On error, assume needs baseline (safe default)
      setHasAssessmentHistory(false);
      setNeedsBaseline(true);
      setNeedsCheckin(false);
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

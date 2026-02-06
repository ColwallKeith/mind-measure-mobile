import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cognitoApiClient } from '@/services/cognito-api-client';

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
      setNeedsBaseline(true);
      setHasAssessmentHistory(false);
      setNeedsCheckin(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get JWT token for authentication
      const idToken = await cognitoApiClient.getIdToken();
      if (!idToken) {
        console.warn('[useUserAssessmentHistory] No auth token - assuming needs baseline');
        setHasAssessmentHistory(false);
        setNeedsBaseline(true);
        setNeedsCheckin(false);
        setLoading(false);
        return;
      }


      // Call secure assessment history endpoint
      const response = await fetch('https://mobile.mindmeasure.app/api/assessments/history', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useUserAssessmentHistory] API error:', response.status, response.statusText, errorText);
        // On error, assume needs baseline (safe default)
        setHasAssessmentHistory(false);
        setNeedsBaseline(true);
        setNeedsCheckin(false);
      } else {
        const data = await response.json();
        const assessments = data.data || [];
        
        if (assessments.length > 0) {
          setHasAssessmentHistory(true);
          setNeedsBaseline(false);
          setNeedsCheckin(false);
        } else {
          setHasAssessmentHistory(false);
          setNeedsBaseline(true);
          setNeedsCheckin(false);
        }
      }
    } catch (error) {
      console.error('[useUserAssessmentHistory] Exception caught:', error);
      if (error instanceof Error) {
        console.error('[useUserAssessmentHistory] Error:', error.message);
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

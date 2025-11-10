import { useState, useEffect } from 'react';

export interface UserAssessmentHistory {
  needsBaseline: boolean;
  needsCheckin: boolean;
  hasAssessmentHistory: boolean;
  loading: boolean;
}

export function useUserAssessmentHistory(): UserAssessmentHistory {
  const [loading, setLoading] = useState(true);
  const [needsBaseline, setNeedsBaseline] = useState(true);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [hasAssessmentHistory, setHasAssessmentHistory] = useState(false);

  useEffect(() => {
    // Simulate loading and determine user assessment state
    const checkAssessmentHistory = async () => {
      try {
        // For now, assume new users need baseline
        // This would normally check the backend for user's assessment history
        setNeedsBaseline(true);
        setNeedsCheckin(false);
        setHasAssessmentHistory(false);
      } catch (error) {
        console.error('Error checking assessment history:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAssessmentHistory();
  }, []);

  return {
    needsBaseline,
    needsCheckin,
    hasAssessmentHistory,
    loading
  };
}

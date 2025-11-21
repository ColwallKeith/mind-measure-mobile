import React, { useState } from 'react';
import { useUserAssessmentHistory } from '@/hooks/useUserAssessmentHistory';
import { BaselineAssessmentScreen } from './BaselineWelcome';
import { BaselineAssessment } from './BaselineAssessment';
import { DashboardScreen } from './MobileDashboard';

/**
 * AuthenticatedApp - Gate component for authenticated users
 * 
 * Enforces baseline requirement before allowing access to main app.
 * Phase 2A: Structure only, no profile creation yet (Phase 2B).
 */
export const AuthenticatedApp: React.FC = () => {
  const { hasAssessmentHistory, needsBaseline, loading, refetch } = useUserAssessmentHistory();
  const [showBaselineWelcome, setShowBaselineWelcome] = useState(true);

  console.log('🔐 AuthenticatedApp gate:', { hasAssessmentHistory, needsBaseline, loading, showBaselineWelcome });

  // Loading state - checking baseline status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Baseline Gate - enforce baseline requirement
  if (needsBaseline || !hasAssessmentHistory) {
    console.log('🎯 No baseline - showing baseline flow');
    
    // First show the welcome screen
    if (showBaselineWelcome) {
      return (
        <BaselineAssessmentScreen
          onStartAssessment={() => {
            console.log('🎯 Starting baseline assessment from welcome screen');
            setShowBaselineWelcome(false);
          }}
        />
      );
    }
    
    // Then show the actual assessment
    return (
      <BaselineAssessment
        onComplete={async () => {
          console.log('✅ Baseline completed - refreshing assessment history');
          // Phase 2B: Refetch assessment history to check if baseline is now complete
          await refetch();
          console.log('✅ Assessment history refreshed');
        }}
      />
    );
  }

  // User has baseline - show main app
  console.log('✅ Has baseline - showing dashboard');
  return <DashboardScreen onNeedHelp={() => {}} onCheckIn={() => {}} />;
};


import { supabase, dbHelpers, AssessmentSession, FusionOutput, UserBaseline } from '../lib/supabase';

export interface CreateSessionData {
  category?: string;
  assessment_type: 'full' | 'quick' | 'voice-only';
  mood_before?: any;
  text_data?: any;
  audio_data?: any;
  visual_data?: any;
  reflection_notes?: string;
}

export interface WellnessScore {
  session_id: string;
  score: number;
  score_smoothed: number;
  uncertainty: number;
  qc_overall: string;
  created_at: string;
}

class AssessmentService {
  
  /**
   * Create a new assessment session
   */
  async createSession(sessionData: CreateSessionData): Promise<{ session: AssessmentSession | null; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { session: null, error: 'User not authenticated' };
      }

      console.log('Creating assessment session for user:', authData.user.id);

      const { data: session, error } = await dbHelpers.createAssessmentSession({
        user_id: authData.user.id,
        status: 'pending',
        category: sessionData.category || 'general',
        assessment_type: sessionData.assessment_type,
        mood_before: sessionData.mood_before,
        text_data: sessionData.text_data,
        audio_data: sessionData.audio_data,
        visual_data: sessionData.visual_data,
        reflection_notes: sessionData.reflection_notes
      });

      if (error) {
        console.error('Error creating assessment session:', error);
        return { session: null, error: error.message };
      }

      console.log('Assessment session created:', session.id);
      return { session, error: null };

    } catch (error) {
      console.error('Create session error:', error);
      return { 
        session: null, 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      };
    }
  }

  /**
   * Update an existing assessment session
   */
  async updateSession(sessionId: string, updates: Partial<AssessmentSession>): Promise<{ session: AssessmentSession | null; error: string | null }> {
    try {
      console.log('Updating assessment session:', sessionId);

      const { data: session, error } = await dbHelpers.updateAssessmentSession(sessionId, updates);

      if (error) {
        console.error('Error updating assessment session:', error);
        return { session: null, error: error.message };
      }

      console.log('Assessment session updated successfully');
      return { session, error: null };

    } catch (error) {
      console.error('Update session error:', error);
      return { 
        session: null, 
        error: error instanceof Error ? error.message : 'Failed to update session' 
      };
    }
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string, finalData?: Partial<AssessmentSession>): Promise<{ session: AssessmentSession | null; error: string | null }> {
    try {
      const updates = {
        ...finalData,
        status: 'completed' as const
      };

      return await this.updateSession(sessionId, updates);

    } catch (error) {
      console.error('Complete session error:', error);
      return { 
        session: null, 
        error: error instanceof Error ? error.message : 'Failed to complete session' 
      };
    }
  }

  /**
   * Get user's assessment sessions
   */
  async getUserSessions(limit = 10): Promise<{ sessions: AssessmentSession[] | null; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { sessions: null, error: 'User not authenticated' };
      }

      const { data: sessions, error } = await dbHelpers.getAssessmentSessions(authData.user.id, limit);

      if (error) {
        console.error('Error fetching user sessions:', error);
        return { sessions: null, error: error.message };
      }

      return { sessions, error: null };

    } catch (error) {
      console.error('Get user sessions error:', error);
      return { 
        sessions: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions' 
      };
    }
  }

  /**
   * Get user's wellness scores (from fusion_outputs table)
   */
  async getWellnessScores(limit = 10): Promise<{ scores: WellnessScore[] | null; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { scores: null, error: 'User not authenticated' };
      }

      const { data: fusionOutputs, error } = await dbHelpers.getFusionOutputs(authData.user.id, limit);

      if (error) {
        console.error('Error fetching wellness scores:', error);
        return { scores: null, error: error.message };
      }

      // Transform fusion outputs to wellness scores
      const scores: WellnessScore[] = fusionOutputs?.map(output => ({
        session_id: output.session_id,
        score: output.score,
        score_smoothed: output.score_smoothed,
        uncertainty: output.uncertainty,
        qc_overall: output.qc_overall,
        created_at: output.created_at
      })) || [];

      return { scores, error: null };

    } catch (error) {
      console.error('Get wellness scores error:', error);
      return { 
        scores: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch wellness scores' 
      };
    }
  }

  /**
   * Get latest wellness score
   */
  async getLatestScore(): Promise<{ score: number | null; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { score: null, error: 'User not authenticated' };
      }

      const score = await dbHelpers.getLatestWellnessScore(authData.user.id);
      return { score, error: null };

    } catch (error) {
      console.error('Get latest score error:', error);
      return { 
        score: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch latest score' 
      };
    }
  }

  /**
   * Get user's baselines
   */
  async getUserBaselines(): Promise<{ baselines: UserBaseline[] | null; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { baselines: null, error: 'User not authenticated' };
      }

      const { data: baselines, error } = await dbHelpers.getUserBaselines(authData.user.id);

      if (error) {
        console.error('Error fetching user baselines:', error);
        return { baselines: null, error: error.message };
      }

      return { baselines, error: null };

    } catch (error) {
      console.error('Get user baselines error:', error);
      return { 
        baselines: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch baselines' 
      };
    }
  }

  /**
   * Check if user has completed baseline assessment
   */
  async hasCompletedBaseline(): Promise<{ completed: boolean; error: string | null }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        return { completed: false, error: 'User not authenticated' };
      }

      const completed = await dbHelpers.hasCompletedBaseline(authData.user.id);
      return { completed, error: null };

    } catch (error) {
      console.error('Check baseline completion error:', error);
      return { 
        completed: false, 
        error: error instanceof Error ? error.message : 'Failed to check baseline completion' 
      };
    }
  }

  /**
   * Create baseline assessment session
   */
  async createBaselineSession(): Promise<{ session: AssessmentSession | null; error: string | null }> {
    return await this.createSession({
      assessment_type: 'full',
      category: 'baseline'
    });
  }

  /**
   * Create quick check-in session
   */
  async createCheckInSession(moodBefore?: any, notes?: string): Promise<{ session: AssessmentSession | null; error: string | null }> {
    return await this.createSession({
      assessment_type: 'quick',
      category: 'check-in',
      mood_before: moodBefore,
      reflection_notes: notes
    });
  }

  /**
   * Create voice-only assessment session
   */
  async createVoiceSession(): Promise<{ session: AssessmentSession | null; error: string | null }> {
    return await this.createSession({
      assessment_type: 'voice-only',
      category: 'voice-check'
    });
  }
}

export const assessmentService = new AssessmentService();
export default assessmentService;

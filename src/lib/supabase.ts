import { createClient } from '@supabase/supabase-js';

// Supabase configuration - these should be set in your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iaauvatsswayuhxgvplu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Database types based on the comprehensive schema
export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  wellness_goals?: any[];
  assessment_frequency?: string;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSession {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  category: string;
  assessment_type: 'full' | 'quick' | 'voice-only';
  mood_before?: any;
  mood_after?: any;
  text_data?: any;
  audio_data?: any;
  visual_data?: any;
  reflection_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FusionOutput {
  session_id: string;
  user_id: string;
  p_worse_fused: number;
  p_worse_audio?: number;
  p_worse_visual?: number;
  p_worse_text?: number;
  p_worse_passive?: number;
  score: number;
  score_smoothed: number;
  uncertainty: number;
  qc_overall: string;
  drivers?: any;
  model_version: string;
  created_at: string;
}

export interface UserBaseline {
  id: string;
  user_id: string;
  metric_type: string;
  baseline_score: number;
  confidence_level: number;
  sample_count: number;
  created_at: string;
  last_updated: string;
}

// Auth helper functions
export const authHelpers = {
  getCurrentUser: () => supabase.auth.getUser(),
  getSession: () => supabase.auth.getSession(),
  signUp: (email: string, password: string, userData?: any) => 
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    }),
  signIn: (email: string, password: string) => 
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  onAuthStateChange: (callback: (event: string, session: any) => void) =>
    supabase.auth.onAuthStateChange(callback)
};

// Database helper functions
export const dbHelpers = {
  // Profile operations
  createProfile: (profileData: Partial<Profile>) =>
    supabase.from('profiles').insert(profileData).select().single(),
  
  getProfile: (userId: string) =>
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
  
  updateProfile: (userId: string, updates: Partial<Profile>) =>
    supabase.from('profiles').update(updates).eq('user_id', userId).select().single(),
  
  // Assessment session operations
  createAssessmentSession: (sessionData: Partial<AssessmentSession>) =>
    supabase.from('assessment_sessions').insert(sessionData).select().single(),
  
  getAssessmentSessions: (userId: string, limit = 10) =>
    supabase
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  
  updateAssessmentSession: (sessionId: string, updates: Partial<AssessmentSession>) =>
    supabase
      .from('assessment_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single(),
  
  // Fusion outputs (wellness scores)
  getFusionOutputs: (userId: string, limit = 10) =>
    supabase
      .from('fusion_outputs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  
  // User baselines
  getUserBaselines: (userId: string) =>
    supabase
      .from('user_baselines')
      .select('*')
      .eq('user_id', userId),
  
  createUserBaseline: (baselineData: Partial<UserBaseline>) =>
    supabase.from('user_baselines').insert(baselineData).select().single(),
  
  // Check if user has completed baseline
  hasCompletedBaseline: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('assessment_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('assessment_type', 'full')
        .eq('status', 'completed')
        .limit(1);
      
      if (error) {
        console.error('Error checking baseline completion:', error);
        // For new users without database access, assume no baseline completed
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Cannot access assessment_sessions table:', error);
      // If we can't access the table, assume no baseline completed
      return false;
    }
  },
  
  // Get latest wellness score
  getLatestWellnessScore: async (userId: string): Promise<number | null> => {
    const { data, error } = await supabase
      .from('fusion_outputs')
      .select('score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error getting latest wellness score:', error);
      return null;
    }
    
    return data?.score || null;
  }
};

export default supabase;

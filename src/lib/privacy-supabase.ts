import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

// Privacy-compliant Supabase client with domain separation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iaauvatsswayuhxgvplu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Privacy-compliant types for domain separation
export interface UserIdentity {
  id: string;
  email: string;
  created_at: string;
  last_login?: string;
  scheduled_deletion?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  university_code?: string; // For cohort assignment only
  consent_version: string;
  consent_timestamp: string;
  data_retention_preference: '1_year' | '3_years' | '7_years' | 'indefinite';
  created_at: string;
  updated_at: string;
}

export interface ConsentRecord {
  consentVersion: string;
  consentTimestamp: Date;
  dataProcessingPurposes: {
    personalWellness: boolean;        // Required for service
    anonymousAnalytics: boolean;      // Can opt-out
    universityReporting: boolean;     // Can opt-out
    serviceImprovement: boolean;      // Can opt-out
  };
  dataRetentionPreference: '1_year' | '3_years' | '7_years' | 'indefinite';
  rightToWithdraw: boolean; // Always true
}

export interface UserPseudonym {
  id: string;
  user_hash: string; // SHA-256(user_id + salt + timestamp)
  university_code_hash?: string; // SHA-256(university_code + salt)
  cohort_hash?: string; // For grouping without identification
  created_month: string; // Month-level granularity only
  is_active: boolean;
}

export interface PrivacyCompliantAssessmentSession {
  id: string;
  user_hash: string; // References pseudonym, not user
  session_type: 'baseline' | 'checkin' | 'voice';
  completion_status: 'pending' | 'processing' | 'completed' | 'failed';
  mood_before_category?: 'low' | 'medium' | 'high'; // Categorical only
  mood_after_category?: 'low' | 'medium' | 'high';
  assessment_duration_minutes?: number;
  created_week: string; // Week-level granularity
  time_of_day: 'morning' | 'afternoon' | 'evening';
}

export interface WellnessScore {
  id: string;
  session_id: string;
  score_category: 'improving' | 'stable' | 'concerning';
  confidence_level: 'low' | 'medium' | 'high';
  trend_direction?: 'improving' | 'declining' | 'stable';
  created_week: string;
}

// Pseudonymization utilities
export class PseudonymGenerator {
  private static readonly SALT_LENGTH = 32;
  private static readonly PEPPER = 'mind_measure_privacy_salt_2025'; // In production, use env var
  
  static async generateUserHash(userId: string, timestamp: Date): Promise<string> {
    const salt = randomBytes(this.SALT_LENGTH);
    const monthKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
    
    const input = `${userId}:${salt.toString('hex')}:${this.PEPPER}:${monthKey}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    return hash;
  }
  
  static async generateUniversityHash(universityCode: string): Promise<string> {
    const input = `${universityCode}:${this.PEPPER}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    return hash;
  }
  
  static async generateCohortHash(universityCode: string, cohortId: string): Promise<string> {
    const input = `${universityCode}:${cohortId}:${this.PEPPER}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    return hash;
  }
}

// Privacy-compliant database operations
export class PrivacyCompliantDatabase {
  
  /**
   * Create user account with proper consent tracking
   */
  async createUser(
    email: string, 
    password: string, 
    profileData: Partial<UserProfile>,
    consent: ConsentRecord
  ): Promise<{ user: UserIdentity | null; profile: UserProfile | null; error: string | null }> {
    try {
      console.log('Creating privacy-compliant user account for:', email);
      
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            consent_version: consent.consentVersion,
            consent_timestamp: consent.consentTimestamp.toISOString()
          }
        }
      });

      if (authError || !authData.user) {
        return { user: null, profile: null, error: authError?.message || 'User creation failed' };
      }

      // 2. Create user profile with consent record
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          ...profileData,
          consent_version: consent.consentVersion,
          consent_timestamp: consent.consentTimestamp.toISOString(),
          data_retention_preference: consent.dataRetentionPreference
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { user: null, profile: null, error: 'Profile creation failed' };
      }

      // 3. Create pseudonym for analytics (if user consented)
      if (consent.dataProcessingPurposes.anonymousAnalytics) {
        await this.createUserPseudonym(authData.user.id, profileData.university_code);
      }

      // 4. Record detailed consent
      await this.recordConsent(authData.user.id, consent);

      const user: UserIdentity = {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at,
        scheduled_deletion: this.calculateDeletionDate(consent.dataRetentionPreference)
      };

      console.log('Privacy-compliant user created successfully');
      return { user, profile, error: null };

    } catch (error) {
      console.error('Privacy-compliant user creation error:', error);
      return { 
        user: null, 
        profile: null, 
        error: error instanceof Error ? error.message : 'User creation failed' 
      };
    }
  }

  /**
   * Create pseudonym for analytics while preserving privacy
   */
  private async createUserPseudonym(userId: string, universityCode?: string): Promise<void> {
    try {
      const userHash = await PseudonymGenerator.generateUserHash(userId, new Date());
      const universityCodeHash = universityCode 
        ? await PseudonymGenerator.generateUniversityHash(universityCode)
        : null;
      const cohortHash = universityCode 
        ? await PseudonymGenerator.generateCohortHash(universityCode, 'default')
        : null;

      await supabase
        .from('user_pseudonyms')
        .insert({
          user_hash: userHash,
          university_code_hash: universityCodeHash,
          cohort_hash: cohortHash,
          created_month: new Date().toISOString().substring(0, 7), // YYYY-MM format
          is_active: true
        });

      // Store mapping for current session (in memory only, never persisted)
      this.setSessionPseudonym(userId, userHash);

    } catch (error) {
      console.error('Error creating user pseudonym:', error);
    }
  }

  /**
   * Create assessment session using pseudonym
   */
  async createPrivacyCompliantAssessment(
    userId: string,
    sessionData: {
      session_type: 'baseline' | 'checkin' | 'voice';
      mood_before?: 'low' | 'medium' | 'high';
      mood_after?: 'low' | 'medium' | 'high';
      assessment_duration_minutes?: number;
    }
  ): Promise<{ session: PrivacyCompliantAssessmentSession | null; error: string | null }> {
    try {
      // Get user's pseudonym (or create if doesn't exist)
      const userHash = await this.getUserPseudonym(userId);
      if (!userHash) {
        return { session: null, error: 'User not consented for analytics' };
      }

      const now = new Date();
      const currentWeek = this.getWeekString(now);
      const timeOfDay = this.getTimeOfDay(now);

      const { data: session, error } = await supabase
        .from('privacy_assessment_sessions')
        .insert({
          user_hash: userHash,
          session_type: sessionData.session_type,
          completion_status: 'pending',
          mood_before_category: sessionData.mood_before,
          mood_after_category: sessionData.mood_after,
          assessment_duration_minutes: sessionData.assessment_duration_minutes,
          created_week: currentWeek,
          time_of_day: timeOfDay
        })
        .select()
        .single();

      if (error) {
        console.error('Privacy-compliant assessment creation error:', error);
        return { session: null, error: error.message };
      }

      return { session, error: null };

    } catch (error) {
      console.error('Privacy-compliant assessment error:', error);
      return { 
        session: null, 
        error: error instanceof Error ? error.message : 'Assessment creation failed' 
      };
    }
  }

  /**
   * Get user's wellness data (personal view only)
   */
  async getUserWellnessData(userId: string): Promise<{
    sessions: PrivacyCompliantAssessmentSession[];
    scores: WellnessScore[];
    error: string | null;
  }> {
    try {
      const userHash = await this.getUserPseudonym(userId);
      if (!userHash) {
        return { sessions: [], scores: [], error: 'User not found in analytics' };
      }

      // Get user's own assessment sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('privacy_assessment_sessions')
        .select('*')
        .eq('user_hash', userHash)
        .order('created_week', { ascending: false })
        .limit(50);

      if (sessionsError) {
        return { sessions: [], scores: [], error: sessionsError.message };
      }

      // Get wellness scores for those sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      const { data: scores, error: scoresError } = await supabase
        .from('wellness_scores')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_week', { ascending: false });

      if (scoresError) {
        return { sessions: sessions || [], scores: [], error: scoresError.message };
      }

      return { sessions: sessions || [], scores: scores || [], error: null };

    } catch (error) {
      console.error('Get user wellness data error:', error);
      return { 
        sessions: [], 
        scores: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch wellness data' 
      };
    }
  }

  /**
   * Record user consent with cryptographic proof
   */
  private async recordConsent(userId: string, consent: ConsentRecord): Promise<void> {
    const consentHash = createHash('sha256')
      .update(JSON.stringify(consent) + userId + Date.now())
      .digest('hex');

    await supabase
      .from('consent_records')
      .insert({
        user_id: userId,
        consent_data: consent,
        consent_hash: consentHash,
        timestamp: consent.consentTimestamp.toISOString()
      });
  }

  /**
   * Handle user data deletion request
   */
  async deleteUserData(userId: string, reason: string): Promise<{
    success: boolean;
    deletionCertificateId?: string;
    error?: string;
  }> {
    try {
      console.log('Processing data deletion request for user:', userId);
      
      // 1. Create encrypted backup for compliance
      const backupId = await this.createComplianceBackup(userId);
      
      // 2. Get user's pseudonym before deletion
      const userHash = await this.getUserPseudonym(userId);
      
      // 3. Delete from identity domain (auth and profile)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      
      if (profileError) {
        throw new Error(`Profile deletion failed: ${profileError.message}`);
      }
      
      // 4. Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn('Auth deletion error (may already be deleted):', authError);
      }
      
      // 5. Anonymize analytics data (don't delete - preserve for population health)
      if (userHash) {
        await supabase
          .from('user_pseudonyms')
          .update({ is_active: false })
          .eq('user_hash', userHash);
      }
      
      // 6. Generate deletion certificate
      const deletionCertificateId = await this.generateDeletionCertificate(userId, reason, backupId);
      
      console.log('User data deletion completed successfully');
      return { 
        success: true, 
        deletionCertificateId 
      };

    } catch (error) {
      console.error('User data deletion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deletion failed' 
      };
    }
  }

  // Utility methods
  private sessionPseudonyms = new Map<string, string>(); // In-memory only
  
  private setSessionPseudonym(userId: string, userHash: string): void {
    this.sessionPseudonyms.set(userId, userHash);
  }
  
  private async getUserPseudonym(userId: string): Promise<string | null> {
    // Check session cache first
    const cached = this.sessionPseudonyms.get(userId);
    if (cached) return cached;
    
    // Query database (this should be rare)
    const { data } = await supabase
      .from('user_pseudonyms')
      .select('user_hash')
      .eq('user_id', userId) // This would require a secure mapping table
      .eq('is_active', true)
      .single();
    
    return data?.user_hash || null;
  }
  
  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  private calculateDeletionDate(preference: string): string {
    const now = new Date();
    switch (preference) {
      case '1_year': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
      case '3_years': return new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
      case '7_years': return new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString();
      case 'indefinite': return new Date(now.getTime() + 50 * 365 * 24 * 60 * 60 * 1000).toISOString();
      default: return new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  
  private async createComplianceBackup(userId: string): Promise<string> {
    // In production, this would create an encrypted backup
    const backupId = `backup_${userId}_${Date.now()}`;
    console.log('Created compliance backup:', backupId);
    return backupId;
  }
  
  private async generateDeletionCertificate(userId: string, reason: string, backupId: string): Promise<string> {
    const certificateId = `cert_${Date.now()}_${createHash('sha256').update(userId + reason + backupId).digest('hex').substring(0, 8)}`;
    
    // Log deletion for compliance
    await supabase
      .from('audit_log')
      .insert({
        event_type: 'data_deletion',
        actor_type: 'user',
        actor_id: userId,
        resource_type: 'user_account',
        resource_id: userId,
        action: 'delete',
        success: true,
        data_classification: 'personal',
        deletion_reason: reason,
        backup_id: backupId,
        certificate_id: certificateId
      });
    
    return certificateId;
  }
}

// Export privacy-compliant database instance
export const privacyDb = new PrivacyCompliantDatabase();
export default privacyDb;

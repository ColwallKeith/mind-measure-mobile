import { privacyDb, ConsentRecord, UserIdentity, UserProfile } from '../lib/privacy-supabase';

export interface PrivacyCompliantRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  universityCode?: string;
  consent: ConsentRecord;
}

export interface PrivacyCompliantAuthUser {
  id: string;
  email: string;
  profile?: UserProfile;
  hasCompletedBaseline?: boolean;
  consentStatus: ConsentRecord;
}

class PrivacyCompliantAuthService {
  
  /**
   * Register a new user with comprehensive consent collection
   */
  async register(data: PrivacyCompliantRegistrationData): Promise<{ 
    user: PrivacyCompliantAuthUser | null; 
    error: string | null 
  }> {
    try {
      console.log('Starting privacy-compliant registration for:', data.email);
      
      // Validate consent (must consent to personal wellness at minimum)
      if (!data.consent.dataProcessingPurposes.personalWellness) {
        return { 
          user: null, 
          error: 'Consent to personal wellness tracking is required to use this service' 
        };
      }

      const profileData: Partial<UserProfile> = {
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        university_code: data.universityCode
      };

      const { user, profile, error } = await privacyDb.createUser(
        data.email,
        data.password,
        profileData,
        data.consent
      );

      if (error || !user || !profile) {
        return { user: null, error: error || 'Registration failed' };
      }

      // Check if user needs baseline (always true for new users)
      const hasCompletedBaseline = false;

      const authUser: PrivacyCompliantAuthUser = {
        id: user.id,
        email: user.email,
        profile: profile,
        hasCompletedBaseline,
        consentStatus: data.consent
      };

      console.log('Privacy-compliant registration completed successfully');
      return { user: authUser, error: null };

    } catch (error) {
      console.error('Privacy-compliant registration error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  /**
   * Sign in existing user with consent validation
   */
  async signIn(email: string, password: string): Promise<{ 
    user: PrivacyCompliantAuthUser | null; 
    error: string | null 
  }> {
    try {
      console.log('Privacy-compliant sign in for:', email);
      
      // Use standard Supabase auth for login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return { user: null, error: authError?.message || 'Sign in failed' };
      }

      // Get user profile and consent status
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { user: null, error: 'Profile not found' };
      }

      // Get latest consent record
      const { data: consentRecord, error: consentError } = await supabase
        .from('consent_records')
        .select('consent_data')
        .eq('user_id', authData.user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (consentError) {
        console.warn('No consent record found, requiring re-consent');
        // User will need to re-consent on next app update
      }

      // Check if user has completed baseline
      const { data: baselineSession } = await supabase
        .from('privacy_assessment_sessions')
        .select('id')
        .eq('user_hash', await this.getUserHash(authData.user.id))
        .eq('session_type', 'baseline')
        .eq('completion_status', 'completed')
        .limit(1)
        .single();

      const hasCompletedBaseline = !!baselineSession;

      const authUser: PrivacyCompliantAuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        profile: profile,
        hasCompletedBaseline,
        consentStatus: consentRecord?.consent_data || this.getDefaultConsent()
      };

      console.log('Privacy-compliant sign in successful');
      return { user: authUser, error: null };

    } catch (error) {
      console.error('Privacy-compliant sign in error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Update user consent preferences
   */
  async updateConsent(userId: string, consent: ConsentRecord): Promise<{ error: string | null }> {
    try {
      // Record new consent
      await privacyDb.recordConsent(userId, consent);
      
      // Update profile with new consent version
      await supabase
        .from('user_profiles')
        .update({
          consent_version: consent.consentVersion,
          consent_timestamp: consent.consentTimestamp.toISOString(),
          data_retention_preference: consent.dataRetentionPreference
        })
        .eq('user_id', userId);

      // If user withdrew analytics consent, deactivate their pseudonym
      if (!consent.dataProcessingPurposes.anonymousAnalytics) {
        const userHash = await this.getUserHash(userId);
        if (userHash) {
          await supabase
            .from('user_pseudonyms')
            .update({ is_active: false })
            .eq('user_hash', userHash);
        }
      }

      console.log('Consent updated successfully');
      return { error: null };

    } catch (error) {
      console.error('Consent update error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Consent update failed' 
      };
    }
  }

  /**
   * Request account deletion with full data removal
   */
  async deleteAccount(userId: string, reason: string = 'User request'): Promise<{ 
    success: boolean; 
    deletionCertificateId?: string; 
    error?: string 
  }> {
    try {
      console.log('Processing account deletion request for user:', userId);
      
      const result = await privacyDb.deleteUserData(userId, reason);
      
      if (result.success) {
        // Sign out user
        await supabase.auth.signOut();
        console.log('Account deletion completed successfully');
      }
      
      return result;

    } catch (error) {
      console.error('Account deletion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Account deletion failed' 
      };
    }
  }

  /**
   * Export user's personal data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{ 
    data?: any; 
    downloadUrl?: string; 
    error?: string 
  }> {
    try {
      // Get all user data from identity domain
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: consentRecords } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      // Get wellness data (personal view only)
      const { sessions, scores } = await privacyDb.getUserWellnessData(userId);

      const exportData = {
        exportInfo: {
          exportDate: new Date().toISOString(),
          dataFormat: 'JSON',
          exportedBy: 'user_request'
        },
        personalInfo: {
          profile: profile,
          consentHistory: consentRecords
        },
        wellnessData: {
          assessmentSessions: sessions,
          wellnessScores: scores
        },
        privacyInfo: {
          dataRetentionStatus: profile?.data_retention_preference,
          scheduledDeletion: profile?.scheduled_deletion,
          anonymousAnalyticsEnabled: consentRecords?.[0]?.consent_data?.dataProcessingPurposes?.anonymousAnalytics
        }
      };

      // In production, this would generate a secure download link
      const downloadUrl = await this.generateSecureDownloadUrl(exportData);

      return { data: exportData, downloadUrl, error: null };

    } catch (error) {
      console.error('Data export error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Data export failed' 
      };
    }
  }

  /**
   * Create privacy-compliant assessment session
   */
  async createAssessmentSession(
    userId: string,
    sessionType: 'baseline' | 'checkin' | 'voice',
    additionalData?: any
  ): Promise<{ sessionId?: string; error?: string }> {
    try {
      // Check if user has consented to data processing
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('consent_version')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return { error: 'User profile not found' };
      }

      // Create session using privacy-compliant method
      const { session, error } = await privacyDb.createPrivacyCompliantAssessment(userId, {
        session_type: sessionType,
        mood_before: additionalData?.moodBefore,
        mood_after: additionalData?.moodAfter,
        assessment_duration_minutes: additionalData?.duration
      });

      if (error || !session) {
        return { error: error || 'Session creation failed' };
      }

      return { sessionId: session.id, error: null };

    } catch (error) {
      console.error('Assessment session creation error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Session creation failed' 
      };
    }
  }

  // Utility methods
  private async getUserHash(userId: string): Promise<string | null> {
    // This would need to be implemented securely
    // For now, return null to indicate no analytics tracking
    return null;
  }

  private getDefaultConsent(): ConsentRecord {
    return {
      consentVersion: '1.0',
      consentTimestamp: new Date(),
      dataProcessingPurposes: {
        personalWellness: true,
        anonymousAnalytics: false,
        universityReporting: false,
        serviceImprovement: false
      },
      dataRetentionPreference: '7_years',
      rightToWithdraw: true
    };
  }

  private async generateSecureDownloadUrl(data: any): Promise<string> {
    // In production, this would upload to secure storage and return download URL
    const dataBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    return URL.createObjectURL(dataBlob);
  }
}

export const privacyAuthService = new PrivacyCompliantAuthService();
export default privacyAuthService;

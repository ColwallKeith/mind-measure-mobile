// AWS Cognito-based Authentication Service
// Replaces AWS auth with AWS Cognito
import { BackendServiceFactory } from './database/BackendServiceFactory';
import { DatabaseService } from './database/DatabaseService';
export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  profile?: Profile;
  hasCompletedBaseline?: boolean;
  lastUpdated?: string;
}
export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  university_id?: string;
  created_at: string;
  updated_at: string;
}
class AWSAuthService {
  private databaseService: DatabaseService;
  constructor() {
    const backendService = BackendServiceFactory.createService(
      BackendServiceFactory.getEnvironmentConfig()
    );
    this.databaseService = backendService.database;
  }
  /**
   * Register a new user with email and password
   * Uses AWS Cognito for authentication and Aurora for profile data
   */
  async register(data: RegistrationData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Starting AWS Cognito registration for:', data.email);
      // Use the database service's auth methods (which use AWS Cognito)
      const authResult = await this.databaseService.auth.signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName
      });
      if (authResult.error) {
        console.error('AWS Cognito registration error:', authResult.error);
        return { user: null, error: authResult.error };
      }
      if (!authResult.user) {
        return { user: null, error: 'Registration failed - no user created' };
      }
      console.log('✅ AWS Cognito user created:', authResult.user.id);
      // Create profile in Aurora database
      const profileData = {
        user_id: authResult.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        display_name: `${data.firstName} ${data.lastName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { data: profile, error: profileError } = await this.databaseService.insert('profiles', profileData);
      if (profileError) {
        console.warn('Profile creation failed, but auth succeeded:', profileError);
      } else {
        console.log('✅ Profile created in Aurora:', profile?.[0]?.id);
      }
      // Check baseline completion status
      const hasCompletedBaseline = await this.hasCompletedBaseline(authResult.user.id);
      const user: AuthUser = {
        id: authResult.user.id,
        email: authResult.user.email,
        email_confirmed_at: authResult.user.emailVerified ? new Date().toISOString() : null,
        profile: profile?.[0] as Profile,
        hasCompletedBaseline,
        lastUpdated: new Date().toISOString()
      };
      console.log('✅ AWS registration completed successfully');
      return { user, error: null };
    } catch (error) {
      console.error('AWS registration error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }
  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Signing in user with AWS Cognito:', email);
      const authResult = await this.databaseService.auth.signIn({
        email,
        password
      });
      if (authResult.error) {
        console.error('AWS Cognito sign in error:', authResult.error);
        return { user: null, error: authResult.error };
      }
      if (!authResult.user) {
        return { user: null, error: 'Sign in failed - no user returned' };
      }
      console.log('✅ AWS Cognito sign in successful:', authResult.user.id);
      // Get profile from Aurora database
      const { data: profiles, error: profileError } = await this.databaseService.select('profiles', {
        filters: { user_id: authResult.user.id  },
        columns: '*'
      });
      let profile: Profile | undefined;
      if (profileError) {
        console.warn('Failed to fetch profile:', profileError);
      } else if (profiles && profiles.length > 0) {
        profile = profiles[0] as Profile;
        console.log('✅ Profile loaded from Aurora:', profile.id);
      }
      // Check baseline completion status
      const hasCompletedBaseline = await this.hasCompletedBaseline(authResult.user.id);
      const user: AuthUser = {
        id: authResult.user.id,
        email: authResult.user.email,
        email_confirmed_at: authResult.user.emailVerified ? new Date().toISOString() : null,
        profile,
        hasCompletedBaseline,
        lastUpdated: new Date().toISOString()
      };
      console.log('✅ AWS sign in completed successfully');
      return { user, error: null };
    } catch (error) {
      console.error('AWS sign in error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }
  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      console.log('🔐 Signing out user with AWS Cognito');
      const result = await this.databaseService.auth.signOut();
      if (result.error) {
        console.error('AWS Cognito sign out error:', result.error);
        return { error: result.error };
      }
      console.log('✅ AWS sign out successful');
      return { error: null };
    } catch (error) {
      console.error('AWS sign out error:', error);
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  }
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Getting current AWS Cognito user');
      const authResult = await this.databaseService.auth.getCurrentUser();
      if (authResult.error) {
        console.error('AWS get current user error:', authResult.error);
        return { user: null, error: authResult.error };
      }
      if (!authResult.user) {
        console.log('No current AWS user session');
        return { user: null, error: null };
      }
      console.log('✅ Current AWS user found:', authResult.user.id);
      // Get profile from Aurora database
      const { data: profiles, error: profileError } = await this.databaseService.select('profiles', {
        filters: { user_id: authResult.user.id  },
        columns: '*'
      });
      let profile: Profile | undefined;
      if (profileError) {
        console.warn('Failed to fetch profile:', profileError);
      } else if (profiles && profiles.length > 0) {
        profile = profiles[0] as Profile;
      }
      // Check baseline completion status
      const hasCompletedBaseline = await this.hasCompletedBaseline(authResult.user.id);
      const user: AuthUser = {
        id: authResult.user.id,
        email: authResult.user.email,
        email_confirmed_at: authResult.user.emailVerified ? new Date().toISOString() : null,
        profile,
        hasCompletedBaseline,
        lastUpdated: new Date().toISOString()
      };
      return { user, error: null };
    } catch (error) {
      console.error('AWS get current user error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Failed to get current user'
      };
    }
  }
  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Profile>): Promise<{ error: string | null }> {
    try {
      const currentUserResult = await this.getCurrentUser();
      if (currentUserResult.error || !currentUserResult.user) {
        return { error: 'No authenticated user' };
      }
      const userId = currentUserResult.user.id;
      console.log('🔐 Updating AWS user profile:', userId);
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      const { error } = await this.databaseService.update('profiles',
        { user_id: userId  },
        updateData
      );
      if (error) {
        console.error('Profile update error:', error);
        return { error };
      }
      console.log('✅ AWS profile updated successfully');
      return { error: null };
    } catch (error) {
      console.error('AWS update profile error:', error);
      return { error: error instanceof Error ? error.message : 'Profile update failed' };
    }
  }
  /**
   * Complete user onboarding
   */
  async completeOnboarding(): Promise<{ error: string | null }> {
    try {
      const currentUserResult = await this.getCurrentUser();
      if (currentUserResult.error || !currentUserResult.user) {
        return { error: 'No authenticated user' };
      }
      console.log('🔐 Completing AWS user onboarding');
      return await this.updateProfile({
        // Add any onboarding completion flags here
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('AWS complete onboarding error:', error);
      return { error: error instanceof Error ? error.message : 'Onboarding completion failed' };
    }
  }
  /**
   * Complete baseline assessment
   */
  async completeBaseline(sessionId: string): Promise<{ error: string | null }> {
    try {
      const currentUserResult = await this.getCurrentUser();
      if (currentUserResult.error || !currentUserResult.user) {
        return { error: 'No authenticated user' };
      }
      const userId = currentUserResult.user.id;
      console.log('🔐 Completing AWS user baseline:', userId, sessionId);
      // Mark baseline as completed in assessment_sessions table
      const { error } = await this.databaseService.update('assessment_sessions',
        {
          id: sessionId ,
          user_id: userId 
        },
        {
          baseline_completed: true,
          updated_at: new Date().toISOString()
        }
      );
      if (error) {
        console.error('Baseline completion error:', error);
        return { error };
      }
      console.log('✅ AWS baseline completed successfully');
      return { error: null };
    } catch (error) {
      console.error('AWS complete baseline error:', error);
      return { error: error instanceof Error ? error.message : 'Baseline completion failed' };
    }
  }
  /**
   * Check if user has completed baseline assessment
   */
  private async hasCompletedBaseline(userId: string): Promise<boolean> {
    try {
      const { data: sessions, error } = await this.databaseService.select('assessment_sessions', {
        filters: {
          user_id: userId ,
          baseline_completed: true 
        },
        columns: 'id'
      });
      if (error) {
        console.warn('Error checking baseline completion:', error);
        return false;
      }
      return sessions && sessions.length > 0;
    } catch (error) {
      console.warn('Error checking baseline completion:', error);
      return false;
    }
  }
  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    // For now, we'll implement a simple polling mechanism
    // In a full implementation, you'd want to use AWS Cognito's event system
    let isActive = true;
    let lastUser: AuthUser | null = null;
    const checkAuthState = async () => {
      if (!isActive) return;
      try {
        const { user } = await this.getCurrentUser();
        // Only call callback if user state changed
        if (JSON.stringify(user) !== JSON.stringify(lastUser)) {
          lastUser = user;
          callback(user);
        }
      } catch (error) {
        console.error('Auth state check error:', error);
      }
      // Check again in 30 seconds
      if (isActive) {
        setTimeout(checkAuthState, 30000);
      }
    };
    // Initial check
    checkAuthState();
    // Return cleanup function
    return () => {
      isActive = false;
    };
  }
}
// Create singleton instance
const awsAuthService = new AWSAuthService();
// Export the service instance
export { awsAuthService as authService };
export default awsAuthService;

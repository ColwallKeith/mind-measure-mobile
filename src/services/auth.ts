import { supabase, authHelpers, dbHelpers, Profile } from '../lib/supabase';

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  hasCompletedBaseline?: boolean;
}

class AuthService {
  
  /**
   * Register a new user with email and password
   * Creates both auth user and profile in database
   */
  async register(data: RegistrationData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('Starting registration for:', data.email);
      
      // Create auth user with metadata for profile creation
      const { data: authData, error: authError } = await authHelpers.signUp(
        data.email,
        data.password,
        {
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: `${data.firstName} ${data.lastName}`
        }
      );

      if (authError) {
        console.error('Auth registration error:', authError);
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Registration failed - no user created' };
      }

      console.log('Auth user created:', authData.user.id);

      // The profile should be auto-created by the handle_new_user() trigger
      // But let's also ensure it exists and has the right data
      let profile: Profile | null = null;
      
      // Wait a moment for the trigger to fire
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if profile was created by trigger
      const { data: existingProfile, error: profileError } = await dbHelpers.getProfile(authData.user.id);
      
      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for existing profile:', profileError);
      }

      if (existingProfile) {
        console.log('Profile found from trigger:', existingProfile.id);
        profile = existingProfile;
        
        // Update with complete registration data if needed
        if (!profile.first_name || !profile.last_name) {
          const { data: updatedProfile, error: updateError } = await dbHelpers.updateProfile(
            authData.user.id,
            {
              first_name: data.firstName,
              last_name: data.lastName,
              display_name: `${data.firstName} ${data.lastName}`,
              onboarding_completed: false
            }
          );
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
          } else {
            profile = updatedProfile;
            console.log('Profile updated with registration data');
          }
        }
      } else {
        // Fallback: create profile manually if trigger didn't work
        console.log('Creating profile manually...');
        const { data: newProfile, error: createError } = await dbHelpers.createProfile({
          user_id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: `${data.firstName} ${data.lastName}`,
          wellness_goals: [],
          assessment_frequency: 'weekly',
          onboarding_completed: false
        });

        if (createError) {
          console.error('Error creating profile:', createError);
          return { user: null, error: 'Failed to create user profile' };
        }

        profile = newProfile;
        console.log('Profile created manually:', profile?.id);
      }

      // Check baseline completion status
      const hasCompletedBaseline = await dbHelpers.hasCompletedBaseline(authData.user.id);

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        profile: profile || undefined,
        hasCompletedBaseline
      };

      console.log('Registration completed successfully');
      return { user, error: null };

    } catch (error) {
      console.error('Registration error:', error);
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
      console.log('Signing in user:', email);
      
      const { data: authData, error: authError } = await authHelpers.signIn(email, password);

      if (authError) {
        console.error('Sign in error:', authError);
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Sign in failed' };
      }

      // Get user profile
      const { data: profile, error: profileError } = await dbHelpers.getProfile(authData.user.id);
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Continue without profile - it might be created later
      }

      // Check baseline completion
      const hasCompletedBaseline = await dbHelpers.hasCompletedBaseline(authData.user.id);

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        profile: profile || undefined,
        hasCompletedBaseline
      };

      console.log('Sign in successful');
      return { user, error: null };

    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: authData, error: authError } = await authHelpers.getCurrentUser();

      if (authError) {
        console.error('Get current user error:', authError);
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: null }; // Not signed in
      }

      // Get user profile
      const { data: profile, error: profileError } = await dbHelpers.getProfile(authData.user.id);
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Check baseline completion
      const hasCompletedBaseline = await dbHelpers.hasCompletedBaseline(authData.user.id);

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        profile: profile || undefined,
        hasCompletedBaseline
      };

      return { user, error: null };

    } catch (error) {
      console.error('Get current user error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Failed to get current user' 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await authHelpers.signOut();
      if (error) {
        console.error('Sign out error:', error);
        return { error: error.message };
      }
      
      console.log('User signed out successfully');
      return { error: null };

    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Profile>): Promise<{ profile: Profile | null; error: string | null }> {
    try {
      const { data: authData } = await authHelpers.getCurrentUser();
      
      if (!authData.user) {
        return { profile: null, error: 'User not authenticated' };
      }

      const { data: profile, error } = await dbHelpers.updateProfile(authData.user.id, updates);

      if (error) {
        console.error('Profile update error:', error);
        return { profile: null, error: error.message };
      }

      console.log('Profile updated successfully');
      return { profile, error: null };

    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        profile: null, 
        error: error instanceof Error ? error.message : 'Profile update failed' 
      };
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<{ error: string | null }> {
    try {
      const { profile, error } = await this.updateProfile({ onboarding_completed: true });
      
      if (error) {
        return { error };
      }

      console.log('Onboarding marked as completed');
      return { error: null };

    } catch (error) {
      console.error('Complete onboarding error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to complete onboarding' 
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: authListener } = authHelpers.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        // Get full user data when signed in
        const { user } = await this.getCurrentUser();
        callback(user);
      } else {
        // User signed out
        callback(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }
}

export const authService = new AuthService();
export default authService;

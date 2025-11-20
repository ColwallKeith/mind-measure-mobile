import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { amplifyAuth } from '../services/amplify-auth';
import { BackendServiceFactory } from '../services/database/BackendServiceFactory';

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
  hasCompletedBaseline?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: any) => Promise<{ error: string | null }>;
  completeOnboarding: () => Promise<{ error: string | null }>;
  completeBaseline: (sessionId: string) => Promise<{ error: string | null }>;
  confirmEmail: (email: string, code: string) => Promise<{ error: string | null }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<{ error: string | null }>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = amplifyAuth.onAuthStateChange((event, user) => {
      console.log('🔄 Auth state changed:', event, user?.email);
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔄 Initializing AWS Amplify auth...');
      const { data, error } = await amplifyAuth.getUser();
      if (error) {
        console.log('ℹ️ No authenticated user found:', error);
        setUser(null);
      } else if (data?.user && data.user.email) {
        console.log('✅ Current user restored:', data.user.email);
        setUser(data.user);
      } else {
        console.log('ℹ️ No authenticated user found');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // FIX: Pass email and password as separate arguments, not as object
      const { data, error } = await amplifyAuth.signInWithPassword(email, password);
      if (error) {
        return { error };
      }
      setUser(data.user);
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Sign in failed' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    setLoading(true);
    try {
      const { data: authData, error } = await amplifyAuth.signUp(
        data.email,
        data.password,
        {
          data: {
            first_name: data.firstName,
            last_name: data.lastName
          }
        }
      );
      
      if (error) {
        return { error };
      }
      
      // Create user profile in database after successful Cognito registration
      // CRITICAL: Profile MUST be created or user cannot save assessment data
      if (authData.user) {
        console.log('👤 Creating user profile in database for:', authData.user.id);
        
        try {
          // Create backend service directly instead of using getInstance()
          const backendService = BackendServiceFactory.createService(
            BackendServiceFactory.getEnvironmentConfig()
          );
          
          // Ensure 'worcester' university exists before creating profile
          const universityId = 'worcester';
          try {
            // Check if university exists
            const { data: existingUniversity } = await backendService.database.select('universities', {
              filters: { id: universityId }
            });
            
            if (!existingUniversity || existingUniversity.length === 0) {
              console.log('🏫 Creating Worcester university record...');
              // Create the university if it doesn't exist
              const { error: universityError } = await backendService.database.insert('universities', {
                id: universityId,
                name: 'University of Worcester',
                short_name: 'Worcester',
                contact_email: 'support@worcester.ac.uk',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
              if (universityError) {
                console.warn('⚠️ University creation failed (may already exist):', universityError);
              } else {
                console.log('✅ Worcester university created successfully');
              }
            }
          } catch (universityCheckError) {
            console.warn('⚠️ Error checking/creating university:', universityCheckError);
            // Continue with profile creation anyway - the database constraint will catch it if needed
          }
          
          const profileData = {
            user_id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            display_name: `${data.firstName} ${data.lastName}`,
            university_id: universityId,
            baseline_established: false,
            streak_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: profileError } = await backendService.database.insert('profiles', profileData);
          
          if (profileError) {
            console.error('❌ Profile creation failed:', profileError);
            
            // Check if it's a duplicate key error (user profile already exists)
            if (profileError.toString().includes('duplicate key') || profileError.toString().includes('profiles_email_key')) {
              console.warn('⚠️ Profile already exists for this user - continuing with existing profile');
              // Profile already exists, this is OK - continue with sign up
            } else if (profileError.toString().includes('foreign key constraint')) {
              console.error('❌ Foreign key constraint violation - university_id may not exist in universities table');
              // CRITICAL: Fail registration if profile creation fails
              return { error: `Registration incomplete: Failed to create user profile. Please contact support. Error: ${profileError}` };
            } else {
              // Other database errors should fail registration
              return { error: `Registration incomplete: Failed to create user profile. Please contact support. Error: ${profileError}` };
            }
          } else {
            console.log('✅ User profile created successfully');
          }
        } catch (profileError: any) {
          console.error('❌ Profile creation error:', profileError);
          // CRITICAL: Fail registration if profile creation fails
          return { error: `Registration incomplete: Failed to create user profile. Please contact support. Error: ${profileError?.message || 'Unknown error'}` };
        }
      } else {
        console.error('❌ No user data returned from Cognito signup');
        return { error: 'Registration failed: No user data received' };
      }

      setUser(authData.user);
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await amplifyAuth.signOut();
      setUser(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: 'Sign out failed' };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    // TODO: Implement profile updates
    return { error: null };
  };

  const completeOnboarding = async () => {
    // TODO: Implement onboarding completion
    return { error: null };
  };

  const completeBaseline = async (sessionId: string) => {
    if (user) {
      const updatedUser = { ...user, hasCompletedBaseline: true };
      setUser(updatedUser);
    }
    return { error: null };
  };

  const confirmEmail = async (email: string, code: string) => {
    try {
      const { error } = await amplifyAuth.confirmSignUp(email, code);
      return { error };
    } catch (error) {
      console.error('Email confirmation error:', error);
      return { error: 'Email confirmation failed' };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await amplifyAuth.resendConfirmationCode(email);
      return { error };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { error: 'Failed to resend confirmation' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const { error } = await amplifyAuth.resetPassword(email);
      return { error };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { error: 'Password reset failed' };
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const { error } = await amplifyAuth.confirmResetPassword(email, code, newPassword);
      return { error };
    } catch (error) {
      console.error('Confirm forgot password error:', error);
      return { error: 'Password confirmation failed' };
    }
  };

  const refetchUser = async () => {
    try {
      const user = await amplifyAuth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Refetch user error:', error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    completeOnboarding,
    completeBaseline,
    confirmEmail,
    resendConfirmation,
    forgotPassword,
    confirmForgotPassword,
    refetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

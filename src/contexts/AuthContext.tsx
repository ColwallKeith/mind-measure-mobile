import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cognitoApiClient } from '../services/cognito-api-client';

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

  // Initialize auth state ONCE on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        console.log('🔐 initializeAuth: checking current user');
        const { data, error } = await cognitoApiClient.getUser();
        console.log('👤 Current user:', data);
        
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

        // Set up auth state listener (simplified - no polling)
        unsubscribe = cognitoApiClient.onAuthStateChange((event, user) => {
          console.log('🔄 Auth state changed:', event, user?.email);
          setUser(user);
        });
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []); // Run ONCE on mount

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await cognitoApiClient.signInWithPassword(email, password);
      if (result.error) {
        // Pass through needsVerification flag for unverified emails
        return { 
          error: result.error, 
          needsVerification: result.needsVerification,
          email: result.email
        };
      }
      setUser(result.data.user);
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
      const { data: authData, error } = await cognitoApiClient.signUp(
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
      
      // Phase 1: Auth only handles Cognito signup
      // Profile creation will be moved to BaselineAssessment in Phase 2
      console.log('✅ Cognito user created:', authData.user?.id);

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
      await cognitoApiClient.signOut();
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
      const { error } = await cognitoApiClient.confirmSignUp(email, code);
      return { error };
    } catch (error) {
      console.error('Email confirmation error:', error);
      return { error: 'Email confirmation failed' };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await cognitoApiClient.resendConfirmationCode(email);
      return { error };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { error: 'Failed to resend confirmation' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const { error } = await cognitoApiClient.resetPassword(email);
      return { error };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { error: 'Password reset failed' };
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const { error } = await cognitoApiClient.confirmResetPassword(email, code, newPassword);
      return { error };
    } catch (error) {
      console.error('Confirm forgot password error:', error);
      return { error: 'Password confirmation failed' };
    }
  };

  const refetchUser = async () => {
    try {
      const { data } = await cognitoApiClient.getUser();
      if (data?.user) {
        setUser(data.user);
      }
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

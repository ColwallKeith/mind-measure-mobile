import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser } from '../services/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: any) => Promise<{ error: string | null }>;
  completeOnboarding: () => Promise<{ error: string | null }>;
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
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      console.log('Auth state changed in context:', authUser?.email);
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth state...');
      const { user: currentUser, error } = await authService.getCurrentUser();
      
      if (error) {
        console.error('Error initializing auth:', error);
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: signedInUser, error } = await authService.signIn(email, password);
      
      if (error) {
        return { error };
      }
      
      setUser(signedInUser);
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
      const { user: newUser, error } = await authService.register(data);
      
      if (error) {
        return { error };
      }
      
      setUser(newUser);
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
      const { error } = await authService.signOut();
      
      if (error) {
        return { error };
      }
      
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
    try {
      const { profile, error } = await authService.updateProfile(updates);
      
      if (error) {
        return { error };
      }
      
      // Update user in context
      if (user && profile) {
        setUser({ ...user, profile });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: 'Profile update failed' };
    }
  };

  const completeOnboarding = async () => {
    try {
      const { error } = await authService.completeOnboarding();
      
      if (error) {
        return { error };
      }
      
      // Update user in context
      if (user?.profile) {
        setUser({
          ...user,
          profile: { ...user.profile, onboarding_completed: true }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Complete onboarding error:', error);
      return { error: 'Failed to complete onboarding' };
    }
  };

  const refetchUser = async () => {
    try {
      const { user: refreshedUser, error } = await authService.getCurrentUser();
      if (!error) {
        setUser(refreshedUser);
      }
    } catch (error) {
      console.error('Refetch user error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    completeOnboarding,
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

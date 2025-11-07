import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  hasCompletedBaseline: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  confirmEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  completeBaseline: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function SimpleAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  console.log('🎉 Simple Auth Provider initialized - no more complex auth!');

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    console.log('📝 Simple Auth: Mock registration for:', email);
    
    // For now, just create a mock user
    const mockUser = {
      id: `user_${Date.now()}`,
      email,
      firstName,
      lastName,
      hasCompletedBaseline: false
    };
    
    // Store in localStorage
    localStorage.setItem('mindmeasure_user', JSON.stringify(mockUser));
    
    setUser(mockUser);
    
    return { success: true };
  };

  const confirmEmail = async (email: string, code: string) => {
    console.log('📧 Simple Auth: Mock email confirmation for:', email);
    return { success: true };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Simple Auth: Mock sign in for:', email);
    
    // Check if user exists in localStorage
    const storedUser = localStorage.getItem('mindmeasure_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.email === email) {
        setUser(user);
        return { success: true };
      }
    }
    
    return { success: false, error: 'User not found' };
  };

  const signOut = () => {
    console.log('🚪 Simple Auth: Signing out');
    localStorage.removeItem('mindmeasure_user');
    setUser(null);
  };

  const completeBaseline = async () => {
    if (user) {
      const updatedUser = { ...user, hasCompletedBaseline: true };
      setUser(updatedUser);
      localStorage.setItem('mindmeasure_user', JSON.stringify(updatedUser));
    }
  };

  // Check for existing user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('mindmeasure_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    confirmEmail,
    signIn,
    signOut,
    completeBaseline
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}

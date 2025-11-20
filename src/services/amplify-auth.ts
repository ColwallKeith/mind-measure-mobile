import { Amplify } from 'aws-amplify';
import { Hub, ResourcesConfig } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { 
  signUp, 
  signIn, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession
} from 'aws-amplify/auth';
import { Preferences } from '@capacitor/preferences';

// Create Capacitor storage adapter for AWS Amplify Auth tokens
const capacitorStorage = {
  async setItem(key: string, value: string): Promise<void> {
    console.log('💾 Storing auth token:', key.substring(0, 20) + '...');
    await Preferences.set({ key, value });
  },
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    console.log('📖 Retrieved auth token:', key.substring(0, 20) + '...', value ? 'found' : 'not found');
    return value;
  },
  async removeItem(key: string): Promise<void> {
    console.log('🗑️ Removing auth token:', key.substring(0, 20) + '...');
    await Preferences.remove({ key });
  },
  async clear(): Promise<void> {
    console.log('🧹 Clearing all auth tokens');
    await Preferences.clear();
  }
};

// Track if Amplify has been initialized
let isAmplifyConfigured = false;

// Initialize Amplify - call this before any auth operations
function initializeAmplify() {
  if (isAmplifyConfigured) {
    return; // Already configured
  }
  
  console.log('🚀 Initializing AWS Amplify...');
  
  // Configure token provider to use Capacitor storage
  cognitoUserPoolsTokenProvider.setKeyValueStorage(capacitorStorage);
  console.log('✅ Configured Capacitor storage for AWS Cognito tokens');

  // Configure Amplify with our existing Cognito User Pool
  const authConfig: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim() || '',
        userPoolClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID?.trim() || '',
        region: import.meta.env.VITE_AWS_REGION?.trim() || 'eu-west-2',
      }
    }
  };

  Amplify.configure(authConfig);

  console.log('🔧 AWS Amplify configured with:', {
    userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim(),
    clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID?.trim(),
    region: import.meta.env.VITE_AWS_REGION?.trim()
  });
  
  isAmplifyConfigured = true;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
  hasCompletedBaseline?: boolean;
}

// Export the official Amplify auth functions directly
export const amplifyAuth = {
  // Sign up new user (AuthContext compatible)
  async signUp(email: string, password: string, options?: { data?: { first_name?: string; last_name?: string } }) {
    try {
      console.log('🔐 AWS Amplify sign up for:', email);

      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            ...(options?.data?.first_name && { given_name: options.data.first_name }),
            ...(options?.data?.last_name && { family_name: options.data.last_name })
          }
        }
      });

      console.log('✅ AWS Amplify sign up result:', { isSignUpComplete, userId, nextStep });

      const user: AuthUser = {
        id: userId || email,
        email,
        email_confirmed_at: null,
        user_metadata: options?.data
      };

      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify sign up error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });
      
      let errorMessage = 'Sign up failed';
      if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers';
      } else if (error.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Invalid email format';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { data: { user: null }, error: errorMessage };
    }
  },

  // Sign in existing user
  async signInWithPassword(email: string, password: string) {
    try {
      console.log('🔐 AWS Amplify sign in for:', email);

      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password
      });

      console.log('✅ AWS Amplify sign in result:', { isSignedIn, nextStep });

      if (!isSignedIn) {
        console.log('⚠️ Sign in requires additional steps:', nextStep);
        
        // Check if it's specifically email confirmation required
        if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          console.log('📧 User exists but email not confirmed - treating as unverified email');
          return { data: { user: null }, error: 'UNVERIFIED_EMAIL', needsVerification: true, email };
        }
        
        return { data: { user: null }, error: 'Additional verification required' };
      }

      // Get current user details
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      console.log('✅ Current user:', currentUser);

      const user: AuthUser = {
        id: currentUser.userId,
        email: email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          first_name: currentUser.signInDetails?.loginId, // We'll get proper attributes later
        }
      };

      console.log('✅ AWS Amplify sign in successful');
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify sign in error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });

      let errorMessage = 'Sign in failed';
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password. Please double-check your credentials and try again.';
      } else if (error.name === 'UserNotConfirmedException') {
        // Special handling: Treat unverified user as needing email verification
        console.log('📧 User exists but email not confirmed - treating as new user flow');
        return { data: { user: null }, error: 'UNVERIFIED_EMAIL', needsVerification: true, email };
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address. Please check the email or create a new account.';
      } else if (error.name === 'TooManyRequestsException') {
        errorMessage = 'Too many failed attempts. Please wait a few minutes before trying again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { data: { user: null }, error: errorMessage };
    }
  },

  // Confirm email with code
  async confirmSignUp(email: string, code: string) {
    try {
      console.log('📧 AWS Amplify confirm sign up for:', email);

      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });

      console.log('✅ AWS Amplify email confirmation result:', { isSignUpComplete, nextStep });

      if (!isSignUpComplete) {
        return { error: 'Email confirmation incomplete' };
      }

      return { error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify confirm sign up error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });

      let errorMessage = 'Email confirmation failed';
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid confirmation code. Please check the code and try again.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Confirmation code has expired. Please request a new code.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { error: errorMessage };
    }
  },

  // Resend confirmation code
  async resendConfirmationCode(email: string) {
    try {
      console.log('📧 AWS Amplify resend confirmation for:', email);

      const result = await resendSignUpCode({
        username: email
      });

      console.log('✅ AWS Amplify resend confirmation successful:', result);
      return { error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify resend confirmation error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });
      return { error: error.message || 'Failed to resend confirmation code' };
    }
  },

  // Reset password (forgot password)
  async resetPassword(email: string) {
    try {
      console.log('🔑 AWS Amplify reset password for:', email);

      const result = await resetPassword({
        username: email
      });

      console.log('✅ AWS Amplify reset password initiated:', result);
      return { error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify reset password error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });
      
      // Handle unverified email in password reset
      if (error.name === 'InvalidParameterException' && 
          error.message?.includes('no registered/verified email')) {
        console.log('📧 User exists but email not verified - cannot reset password');
        return { error: 'UNVERIFIED_EMAIL_RESET', needsVerification: true, email };
      }
      
      return { error: error.message || 'Failed to initiate password reset' };
    }
  },

  // Confirm password reset with code
  async confirmResetPassword(email: string, code: string, newPassword: string) {
    try {
      console.log('🔑 AWS Amplify confirm reset password for:', email);

      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });

      console.log('✅ AWS Amplify password reset successful');
      return { error: null };

    } catch (error: any) {
      console.error('❌ AWS Amplify confirm reset password error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });

      let errorMessage = 'Password reset failed';
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid reset code. Please check the code and try again.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Reset code has expired. Please request a new code.';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { error: errorMessage };
    }
  },

  // Sign out
  async signOut() {
    try {
      console.log('🔐 AWS Amplify sign out');
      await signOut();
      console.log('✅ AWS Amplify sign out successful');
      return { error: null };
    } catch (error: any) {
      console.error('❌ AWS Amplify sign out error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message });
      return { error: error.message || 'Sign out failed' };
    }
  },

  // Get current user
  async getUser() {
    try {
      console.log('🔍 Checking for authenticated user...');
      const currentUser = await getCurrentUser();
      console.log('📱 getCurrentUser result:', currentUser);
      
      const session = await fetchAuthSession();
      console.log('🔐 fetchAuthSession result:', { 
        hasTokens: !!session.tokens,
        isValid: session.tokens?.accessToken ? 'yes' : 'no'
      });

      if (!currentUser || !session.tokens) {
        console.log('❌ No valid session - user not authenticated');
        return { data: { user: null }, error: null };
      }

      const user: AuthUser = {
        id: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        email_confirmed_at: new Date().toISOString(),
      };

      console.log('✅ User session restored:', user.email);
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ Error checking authenticated user:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message, code: error.code });
      return { data: { user: null }, error: null };
    }
  },

  // Auth state change listener (simplified for now)
  onAuthStateChange(callback: (event: string, user: AuthUser | null) => void) {
    // Listen to Amplify Hub auth events
    const hubListener = Hub.listen('auth', async ({ payload }) => {
      const { event, data } = payload;
      console.log('🔔 Auth Hub event:', event);
      
      try {
        // Map Amplify events to our callback
        switch (event) {
          case 'signedIn':
          case 'signIn':
          case 'tokenRefresh':
            // User signed in or token refreshed - get current user
            const { data: userData } = await amplifyAuth.getUser();
            callback(event, userData?.user || null);
            break;
            
          case 'signedOut':
          case 'signOut':
            // User signed out
            callback(event, null);
            break;
            
          case 'tokenRefresh_failure':
            // Token refresh failed - treat as signed out
            callback('signOut', null);
            break;
            
          default:
            // Other events - check current auth state
            const { data: currentUserData } = await amplifyAuth.getUser();
            callback(event, currentUserData?.user || null);
        }
      } catch (error) {
        console.error('❌ Error in auth state change handler:', error);
        callback(event, null);
      }
    });
    
    // Return unsubscribe function
    return () => {
      hubListener();
    };
  },

  // Additional methods for AuthContext compatibility
  // Note: The main methods are already defined above with the correct signatures
};


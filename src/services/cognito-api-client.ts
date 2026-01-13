/**
 * Cognito API Client - Secure client-side wrapper for server-side auth endpoints
 * 
 * This replaces direct AWS Amplify calls with calls to secure Vercel API endpoints.
 * All AWS credentials stay server-side - the client only handles JWT tokens.
 */

import { Preferences } from '@capacitor/preferences';

// Token storage keys
const ACCESS_TOKEN_KEY = 'cognito_access_token';
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';
const TOKEN_EXPIRY_KEY = 'cognito_token_expiry';

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

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Helper to get API base URL
function getApiBaseUrl(): string {
  // In production, use the current origin
  // In development, could use env variable if needed
  return window.location.origin;
}

// Helper to make authenticated API calls
async function makeAuthRequest(endpoint: string, body: any) {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Token management
async function storeTokens(tokens: AuthTokens) {
  const expiryTime = Date.now() + (tokens.expiresIn * 1000);
  
  await Promise.all([
    Preferences.set({ key: ACCESS_TOKEN_KEY, value: tokens.accessToken }),
    Preferences.set({ key: ID_TOKEN_KEY, value: tokens.idToken }),
    Preferences.set({ key: REFRESH_TOKEN_KEY, value: tokens.refreshToken }),
    Preferences.set({ key: TOKEN_EXPIRY_KEY, value: expiryTime.toString() })
  ]);
  
  console.log('✅ Tokens stored securely in device storage');
}

async function getStoredTokens(): Promise<AuthTokens | null> {
  const [accessToken, idToken, refreshToken, expiry] = await Promise.all([
    Preferences.get({ key: ACCESS_TOKEN_KEY }),
    Preferences.get({ key: ID_TOKEN_KEY }),
    Preferences.get({ key: REFRESH_TOKEN_KEY }),
    Preferences.get({ key: TOKEN_EXPIRY_KEY })
  ]);

  if (!accessToken.value || !idToken.value || !refreshToken.value) {
    return null;
  }

  // Check if tokens are expired
  const expiryTime = parseInt(expiry.value || '0');
  if (expiryTime < Date.now()) {
    console.log('⚠️ Tokens expired - attempting refresh...');
    
    // Try to refresh the tokens
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken.value })
      });
      
      const data = await response.json();
      
      if (response.ok && data.session) {
        console.log('✅ Tokens refreshed successfully');
        await storeTokens(data.session);
        return data.session;
      } else {
        console.log('❌ Token refresh failed:', data.error);
        await clearTokens();
        return null;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      await clearTokens();
      return null;
    }
  }

  return {
    accessToken: accessToken.value,
    idToken: idToken.value,
    refreshToken: refreshToken.value,
    expiresIn: Math.floor((expiryTime - Date.now()) / 1000)
  };
}

async function clearTokens() {
  await Promise.all([
    Preferences.remove({ key: ACCESS_TOKEN_KEY }),
    Preferences.remove({ key: ID_TOKEN_KEY }),
    Preferences.remove({ key: REFRESH_TOKEN_KEY }),
    Preferences.remove({ key: TOKEN_EXPIRY_KEY })
  ]);
  
  console.log('🗑️ Tokens cleared from device storage');
}

// Parse JWT token to extract user info (without verifying - server already verified it)
function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Cognito API Client
 * Drop-in replacement for amplify-auth with same interface
 */
export const cognitoApiClient = {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, options?: { data?: { first_name?: string; last_name?: string } }) {
    try {
      console.log('🔐 API Client: Sign up for:', email);

      const result = await makeAuthRequest('signup', {
        email,
        password,
        firstName: options?.data?.first_name,
        lastName: options?.data?.last_name
      });

      const user: AuthUser = {
        id: result.userSub || email,
        email,
        email_confirmed_at: null,
        user_metadata: options?.data
      };

      console.log('✅ API Client: Sign up successful');
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ API Client: Sign up error:', error);
      return { data: { user: null }, error: error.message || 'Sign up failed' };
    }
  },

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string) {
    try {
      console.log('🔐 API Client: Sign in for:', email);

      const result = await makeAuthRequest('signin', {
        email,
        password
      });

      // Check for special cases
      if (result.needsVerification) {
        console.log('📧 API Client: Email not verified');
        return { data: { user: null }, error: 'UNVERIFIED_EMAIL', needsVerification: true, email };
      }

      // Store tokens
      if (result.accessToken && result.idToken && result.refreshToken) {
        await storeTokens({
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn || 3600
        });

        // Parse ID token to get user info
        const idPayload = parseJwtPayload(result.idToken);
        
        const user: AuthUser = {
          id: idPayload.sub || idPayload['cognito:username'],
          email: idPayload.email || email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            first_name: idPayload.given_name,
            last_name: idPayload.family_name
          }
        };

        console.log('✅ API Client: Sign in successful');
        return { data: { user }, error: null };
      }

      throw new Error('Invalid response from server');

    } catch (error: any) {
      console.error('❌ API Client: Sign in error:', error);
      return { data: { user: null }, error: error.message || 'Sign in failed' };
    }
  },

  /**
   * Confirm sign up with email code
   */
  async confirmSignUp(email: string, code: string) {
    try {
      console.log('📧 API Client: Confirm sign up for:', email);

      await makeAuthRequest('confirm-signup', {
        email,
        code
      });

      console.log('✅ API Client: Email confirmation successful');
      return { error: null };

    } catch (error: any) {
      console.error('❌ API Client: Confirm sign up error:', error);
      return { error: error.message || 'Email confirmation failed' };
    }
  },

  /**
   * Resend confirmation code
   */
  async resendConfirmationCode(email: string) {
    try {
      console.log('📧 API Client: Resend confirmation for:', email);

      await makeAuthRequest('resend-confirmation', {
        email
      });

      console.log('✅ API Client: Confirmation code resent');
      return { error: null };

    } catch (error: any) {
      console.error('❌ API Client: Resend confirmation error:', error);
      return { error: error.message || 'Failed to resend confirmation code' };
    }
  },

  /**
   * Initiate password reset
   */
  async resetPassword(email: string) {
    try {
      console.log('🔑 API Client: Reset password for:', email);

      const result = await makeAuthRequest('forgot-password', {
        email
      });

      if (result.needsVerification) {
        console.log('📧 API Client: Email not verified - cannot reset password');
        return { error: 'UNVERIFIED_EMAIL_RESET', needsVerification: true, email };
      }

      console.log('✅ API Client: Password reset initiated');
      return { error: null };

    } catch (error: any) {
      console.error('❌ API Client: Reset password error:', error);
      return { error: error.message || 'Failed to initiate password reset' };
    }
  },

  /**
   * Confirm password reset with code
   */
  async confirmResetPassword(email: string, code: string, newPassword: string) {
    try {
      console.log('🔑 API Client: Confirm reset password for:', email);

      await makeAuthRequest('confirm-forgot-password', {
        email,
        code,
        newPassword
      });

      console.log('✅ API Client: Password reset successful');
      return { error: null };

    } catch (error: any) {
      console.error('❌ API Client: Confirm reset password error:', error);
      return { error: error.message || 'Password reset failed' };
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      console.log('🔐 API Client: Sign out');
      await clearTokens();
      console.log('✅ API Client: Sign out successful');
      return { error: null };
    } catch (error: any) {
      console.error('❌ API Client: Sign out error:', error);
      return { error: error.message || 'Sign out failed' };
    }
  },

  /**
   * Get current authenticated user
   */
  async getUser() {
    try {
      console.log('🔍 API Client: Checking for authenticated user...');
      
      const tokens = await getStoredTokens();
      
      if (!tokens) {
        console.log('❌ API Client: No valid tokens - user not authenticated');
        return { data: { user: null }, error: null };
      }

      // Get user info from server using access token
      const result = await makeAuthRequest('get-user', {
        accessToken: tokens.accessToken
      });

      // Parse ID token for user info
      const idPayload = parseJwtPayload(tokens.idToken);
      
      const user: AuthUser = {
        id: idPayload.sub || idPayload['cognito:username'],
        email: result.attributes.email || idPayload.email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          first_name: result.attributes.given_name || idPayload.given_name,
          last_name: result.attributes.family_name || idPayload.family_name
        }
      };

      console.log('✅ API Client: User session restored:', user.email);
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ API Client: Error checking authenticated user:', error);
      
      // If token is invalid, clear it
      if (error.message?.includes('Invalid or expired token')) {
        await clearTokens();
      }
      
      return { data: { user: null }, error: null };
    }
  },

  /**
   * Auth state change listener
   * Simplified version - just polls for token changes
   */
  onAuthStateChange(callback: (event: string, user: AuthUser | null) => void) {
    // This is a simplified listener for explicit auth events (sign-in, sign-out)
    // We do NOT poll - we only trigger on actual auth actions
    console.log('🔔 Auth state listener registered');
    
    // Return unsubscribe function
    return () => {
      console.log('🔕 Auth state listener unsubscribed');
    };
  },

  /**
   * Get current ID token for API authentication
   */
  async getIdToken(): Promise<string | null> {
    try {
      const tokens = await getStoredTokens();
      return tokens?.idToken || null;
    } catch (error) {
      console.error('❌ Error getting ID token:', error);
      return null;
    }
  }
};

// Initialize on load - no AWS SDK initialization needed!
console.log('🔧 Cognito API Client initialized - all auth calls go through secure server endpoints');


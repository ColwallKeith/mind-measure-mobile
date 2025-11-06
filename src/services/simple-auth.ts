// Simple AWS Cognito Authentication Service
// Mimics the original Supabase auth.signUp() and auth.signIn() pattern
import { 
  CognitoIdentityProviderClient, 
  SignUpCommand, 
  InitiateAuthCommand, 
  GetUserCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { Preferences } from '@capacitor/preferences';

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

class SimpleAWSAuth {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private currentUser: AuthUser | null = null;
  private authStateCallbacks: ((user: AuthUser | null) => void)[] = [];
  private accessToken: string | null = null;

  constructor() {
    const region = import.meta.env.VITE_AWS_REGION?.trim() || 'eu-west-2';
    this.userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim() || '';
    this.clientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID?.trim() || '';
    
    console.log('🔧 SimpleAWSAuth config:', {
      region,
      userPoolId: this.userPoolId,
      clientId: this.clientId
    });

    this.client = new CognitoIdentityProviderClient({
      region: region,
      credentials: {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      }
    });

    // Try to restore user session from device storage
    this.restoreSession().catch(error => {
      console.error('❌ Error during session restoration:', error);
    });
  }

  // Restore user session from localStorage
  private async restoreSession() {
    try {
      const { value: userValue } = await Preferences.get({ key: 'mindmeasure_user' });
      const { value: tokenValue } = await Preferences.get({ key: 'mindmeasure_access_token' });
      
      if (userValue && tokenValue) {
        this.currentUser = JSON.parse(userValue);
        this.accessToken = tokenValue;
        console.log('✅ Restored user session:', this.currentUser?.email);
        
        // Verify the token is still valid (optional - can be enhanced later)
        this.notifyAuthStateChange(this.currentUser);
      } else {
        console.log('ℹ️ No stored user session found');
      }
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      this.clearSession();
    }
  }

  // Store user session in device storage (iOS Keychain-backed)
  private async storeSession(user: AuthUser, accessToken: string) {
    try {
      // Store user data with email for returning user experience
      const userData = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        user_metadata: user.user_metadata,
        hasCompletedBaseline: user.hasCompletedBaseline || false,
        lastLogin: Date.now(),
        savedAt: new Date().toISOString()
      };
      
      await Preferences.set({ key: 'mindmeasure_user', value: JSON.stringify(userData) });
      await Preferences.set({ key: 'mindmeasure_access_token', value: accessToken });
      console.log('💾 Stored user session with email:', user.email);
    } catch (error) {
      console.error('❌ Error storing session:', error);
    }
  }

  // Clear user session from device storage
  private async clearSession() {
    try {
      await Preferences.remove({ key: 'mindmeasure_user' });
      await Preferences.remove({ key: 'mindmeasure_access_token' });
      console.log('🗑️ Cleared user session');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
  }

  // Simple sign up - just like supabase.auth.signUp()
  async signUp(email: string, password: string, options?: { data?: { first_name?: string; last_name?: string } }) {
    try {
      console.log('🔐 Simple sign up for:', email);

      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          ...(options?.data?.first_name ? [{ Name: 'given_name', Value: options.data.first_name }] : []),
          ...(options?.data?.last_name ? [{ Name: 'family_name', Value: options.data.last_name }] : [])
        ]
      });

      const result = await this.client.send(command);
      
      console.log('✅ Simple sign up successful - AWS Response:', {
        userSub: result.UserSub,
        codeDeliveryDetails: result.CodeDeliveryDetails
      });
      
      // Check if email was actually sent
      if (result.CodeDeliveryDetails) {
        console.log('📧 Email delivery details:', result.CodeDeliveryDetails);
      } else {
        console.warn('⚠️ No email delivery details - email might not be sent');
      }
      
      const user: AuthUser = {
        id: result.UserSub || email,
        email: email,
        email_confirmed_at: null,
        user_metadata: {
          first_name: options?.data?.first_name,
          last_name: options?.data?.last_name
        }
      };

      this.currentUser = user;
      this.notifyAuthStateChange(user);

      console.log('✅ Simple sign up successful');
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ Simple sign up error:', error);
      
      let errorMessage = 'Sign up failed';
      if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters (!@#$%^&*)';
      } else if (error.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Invalid email format';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        data: { user: null }, 
        error: { message: errorMessage }
      };
    }
  }

  // Simple sign in - just like supabase.auth.signInWithPassword()
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      console.log('🔐 Simple sign in for:', email);

      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const result = await this.client.send(command);
      
      if (!result.AuthenticationResult?.AccessToken) {
        throw new Error('No access token received');
      }

      const accessToken = result.AuthenticationResult.AccessToken;

      // Get user details
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken
      });

      const userResult = await this.client.send(getUserCommand);
      
      const user: AuthUser = {
        id: userResult.Username || email,
        email: email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          first_name: userResult.UserAttributes?.find(attr => attr.Name === 'given_name')?.Value,
          last_name: userResult.UserAttributes?.find(attr => attr.Name === 'family_name')?.Value
        }
      };

      // Store session for persistence
      this.currentUser = user;
      this.accessToken = accessToken;
      this.storeSession(user, accessToken);
      this.notifyAuthStateChange(user);

      console.log('✅ Simple sign in successful');
      return { data: { user }, error: null };

    } catch (error: any) {
      console.error('❌ Simple sign in error:', error);
      return { 
        data: { user: null }, 
        error: { message: error.message || 'Sign in failed' }
      };
    }
  }

  // Simple sign out - just like supabase.auth.signOut()
  async signOut() {
    try {
      console.log('🔐 Simple sign out');
      this.currentUser = null;
      this.accessToken = null;
      this.clearSession();
      this.notifyAuthStateChange(null);
      console.log('✅ Simple sign out successful');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Simple sign out error:', error);
      return { error: { message: error.message || 'Sign out failed' } };
    }
  }

  // Get current user - just like supabase.auth.getUser()
  async getUser() {
    console.log('🔐 Getting current user:', this.currentUser?.email || 'none');
    return { 
      data: { user: this.currentUser }, 
      error: null 
    };
  }

  // Confirm email with code - just like supabase.auth.verifyOtp()
  async confirmSignUp(email: string, code: string) {
    try {
      console.log('🔐 Confirming email for:', email);

      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code
      });

      await this.client.send(command);
      
      console.log('✅ Email confirmed successfully');
      return { data: { user: { email } }, error: null };

    } catch (error: any) {
      console.error('❌ Email confirmation error:', error);
      
      let errorMessage = 'Email confirmation failed';
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid confirmation code. Please check the code and try again.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Confirmation code has expired. Please request a new one.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found. Please check your email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        data: { user: null }, 
        error: { message: errorMessage }
      };
    }
  }

  // Resend confirmation code - just like supabase.auth.resend()
  async resendConfirmationCode(email: string) {
    try {
      console.log('🔐 Resending confirmation code for:', email);

      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email
      });

      const result = await this.client.send(command);
      
      console.log('✅ Confirmation code resent - AWS Response:', {
        codeDeliveryDetails: result.CodeDeliveryDetails
      });
      
      // Check if email was actually sent
      if (result.CodeDeliveryDetails) {
        console.log('📧 Resend email delivery details:', result.CodeDeliveryDetails);
      } else {
        console.warn('⚠️ No resend email delivery details - email might not be sent');
      }
      
      return { data: {}, error: null };

    } catch (error: any) {
      console.error('❌ Resend confirmation error:', error);
      return { 
        data: {}, 
        error: { message: error.message || 'Failed to resend confirmation code' }
      };
    }
  }

  // Forgot password - initiate password reset
  async forgotPassword(email: string) {
    try {
      console.log('🔐 Initiating password reset for:', email);
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email
      });
      await this.client.send(command);
      console.log('✅ Password reset code sent successfully');
      return { data: {}, error: null };
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      let errorMessage = 'Failed to send password reset code';
      if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Invalid email format.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { data: {}, error: { message: errorMessage } };
    }
  }

  // Confirm forgot password with reset code
  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    try {
      console.log('🔐 Confirming password reset for:', email);
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
      });
      await this.client.send(command);
      console.log('✅ Password reset confirmed successfully');
      return { data: {}, error: null };
    } catch (error: any) {
      console.error('❌ Confirm forgot password error:', error);
      let errorMessage = 'Password reset failed';
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid reset code. Please check the code and try again.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Reset code has expired. Please request a new one.';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters (!@#$%^&*)';
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { data: {}, error: { message: errorMessage } };
    }
  }

  // Listen to auth changes - just like supabase.auth.onAuthStateChange()
  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.authStateCallbacks.push((user) => {
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
    });

    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.findIndex(cb => cb === callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  private notifyAuthStateChange(user: AuthUser | null) {
    this.authStateCallbacks.forEach(callback => callback(user));
  }
}

// Create singleton instance - just like Supabase
const simpleAuth = new SimpleAWSAuth();

// Export in Supabase-style format
export const supabase = {
  auth: simpleAuth
};

export default simpleAuth;

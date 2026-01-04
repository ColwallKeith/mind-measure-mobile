import { App } from '@capacitor/app';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
export interface DeepLinkHandler {
  handleEmailConfirmation: (url: string) => Promise<boolean>;
  handlePasswordReset: (url: string) => Promise<boolean>;
  setupDeepLinkListener: (onDeepLink: (url: string, type: 'email-confirmation' | 'password-reset' | 'unknown') => void) => void;
}
class DeepLinkService implements DeepLinkHandler {
  private listeners: Array<(url: string, type: 'email-confirmation' | 'password-reset' | 'unknown') => void> = [];
  async handleEmailConfirmation(url: string): Promise<boolean> {
    try {
      console.log('🔗 Handling email confirmation deep link:', url);
      // Extract the token and type from the URL
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      const type = urlObj.searchParams.get('type');
      console.log('🔍 Deep link params:', { token, accessToken, refreshToken, type });
      // Handle different token formats from AWS
      if (accessToken && refreshToken) {
        // This is a session token from AWS auth
        console.log('📱 Using access/refresh token for session');
        const { data, error } = await /* TODO: Replace with backendService - was: backendService */ backendService.databasesetSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) {
          console.error('❌ Session setup failed:', error.message);
          return false;
        }
        if (data.user) {
          console.log('✅ Email confirmed and session established for user:', data.user.email);
          console.log('📧 Email confirmed at:', data.user.email_confirmed_at);
          // Force a session refresh to ensure we have the latest user data
          const { data: refreshData, error: refreshError } = await /* TODO: Replace with backendService - was: backendService */ backendService.databaserefreshSession();
          if (refreshError) {
            console.warn('⚠️ Session refresh warning:', refreshError.message);
          } else {
            console.log('🔄 Session refreshed after email confirmation');
          }
          return true;
        }
      } else if (token && type === 'signup') {
        // This is an OTP token
        console.log('📱 Using OTP token for verification');
        const { data, error } = await /* TODO: Replace with backendService - was: backendService */ backendService.databaseverifyOtp({
          token_hash: token,
          type: 'signup'
        });
        if (error) {
          console.error('❌ Email confirmation failed:', error.message);
          return false;
        }
        if (data.user) {
          console.log('✅ Email confirmed successfully for user:', data.user.email);
          console.log('📧 Email confirmed at:', data.user.email_confirmed_at);
          // Force a session refresh to ensure we have the latest user data
          const { data: refreshData, error: refreshError } = await /* TODO: Replace with backendService - was: backendService */ backendService.databaserefreshSession();
          if (refreshError) {
            console.warn('⚠️ Session refresh warning:', refreshError.message);
          } else {
            console.log('🔄 Session refreshed after OTP verification');
          }
          return true;
        }
      } else {
        console.error('❌ Invalid email confirmation link - missing required tokens');
        console.log('Expected: token + type=signup OR access_token + refresh_token');
        return false;
      }
      return false;
    } catch (error) {
      console.error('❌ Error handling email confirmation:', error);
      return false;
    }
  }
  async handlePasswordReset(url: string): Promise<boolean> {
    try {
      console.log('🔗 Handling password reset deep link:', url);
      // Extract the token from the URL
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const type = urlObj.searchParams.get('type');
      if (!token || type !== 'recovery') {
        console.error('❌ Invalid password reset link - missing token or wrong type');
        return false;
      }
      // Verify the token with AWS
      const { data, error } = await /* TODO: Replace with backendService - was: backendService */ backendService.databaseverifyOtp({
        token_hash: token,
        type: 'recovery'
      });
      if (error) {
        console.error('❌ Password reset verification failed:', error.message);
        return false;
      }
      if (data.user) {
        console.log('✅ Password reset token verified for user:', data.user.email);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error handling password reset:', error);
      return false;
    }
  }
  setupDeepLinkListener(onDeepLink: (url: string, type: 'email-confirmation' | 'password-reset' | 'unknown') => void): void {
    this.listeners.push(onDeepLink);
    // Listen for app URL open events
    App.addListener('appUrlOpen', (event) => {
      console.log('🔗 Deep link received:', event.url);
      try {
        const url = event.url;
        const urlObj = new URL(url);
        // Determine the type of deep link
        const type = urlObj.searchParams.get('type');
        const accessToken = urlObj.searchParams.get('access_token');
        const token = urlObj.searchParams.get('token');
        let linkType: 'email-confirmation' | 'password-reset' | 'unknown' = 'unknown';
        if (type === 'signup' || (accessToken && !type)) {
          linkType = 'email-confirmation';
        } else if (type === 'recovery') {
          linkType = 'password-reset';
        }
        // Notify all listeners
        this.listeners.forEach(listener => {
          listener(url, linkType);
        });
      } catch (error) {
        console.error('❌ Error parsing deep link:', error);
        // Still notify listeners with unknown type
        this.listeners.forEach(listener => {
          listener(event.url, 'unknown');
        });
      }
    });
    console.log('🔗 Deep link listener setup complete');
  }
  // Helper method to determine if a URL is a deep link we should handle
  static isHandleableDeepLink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const type = urlObj.searchParams.get('type');
      const token = urlObj.searchParams.get('token');
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      // Handle OTP tokens
      if (token && (type === 'signup' || type === 'recovery')) {
        return true;
      }
      // Handle session tokens
      if (accessToken && refreshToken) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  // Helper method to convert web URLs to deep link URLs
  static convertWebUrlToDeepLink(webUrl: string): string {
    try {
      const urlObj = new URL(webUrl);
      const params = urlObj.searchParams;
      // Convert to our app's deep link scheme
      return `mindmeasure://auth${urlObj.pathname}?${params.toString()}`;
    } catch (error) {
      console.error('❌ Error converting web URL to deep link:', error);
      return webUrl;
    }
  }
}
export const deepLinkService = new DeepLinkService();

import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
export interface AdminUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  lastUpdated?: string;
}
class AdminAuthService {
  /**
   * Sign in admin user - simplified version without profiles/baseline checks
   */
  async signIn(email: string, password: string): Promise<{ user: AdminUser | null; error: string | null }> {
    try {
      console.log('🔐 Admin signing in user:', email);
      const { data: authData, error: authError } = await /* TODO: Replace with backendService - was: backendService */ backendService.databasesignInWithPassword({ email, password });
      if (authError) {
        console.error('❌ Admin sign in error:', authError);
        return { user: null, error: authError.message };
      }
      if (!authData.user) {
        return { user: null, error: 'Sign in failed' };
      }
      const user: AdminUser = {
        id: authData.user.id,
        email: authData.user.email!,
        email_confirmed_at: authData.user.email_confirmed_at,
        lastUpdated: new Date().toISOString()
      };
      console.log('✅ Admin sign in successful');
      return { user, error: null };
    } catch (error) {
      console.error('❌ Admin sign in error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }
  /**
   * Sign out admin user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await /* TODO: Replace with backendService - was: backendService */ backendService.databasesignOut();
      if (error) {
        console.error('❌ Admin sign out error:', error);
        return { error: error.message };
      }
      console.log('✅ Admin signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Admin sign out error:', error);
      return {
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }
  /**
   * Get current admin session
   */
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const { data: { session }, error } = await /* TODO: Replace with backendService - was: backendService */ backendService.databasegetSession();
      if (error) {
        console.error('❌ Error getting admin session:', error);
        return null;
      }
      if (!session?.user) {
        return null;
      }
      return {
        id: session.user.id,
        email: session.user.email!,
        email_confirmed_at: session.user.email_confirmed_at,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting current admin user:', error);
      return null;
    }
  }
}
export const adminAuthService = new AdminAuthService();
export default adminAuthService;

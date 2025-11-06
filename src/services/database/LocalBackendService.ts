// Local Backend Service using Capacitor Preferences for storage
// This provides a local-first backend that doesn't require AWS or network connectivity

import { Preferences } from '@capacitor/preferences';
import {
  BackendService,
  DatabaseService,
  AuthService,
  StorageService,
  RealtimeService,
  QueryResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  DatabaseConfig,
  FunctionService
} from './DatabaseService';

console.log('🏠 LOCAL BACKEND SERVICE CONSTRUCTOR CALLED - THIS SHOULD ALWAYS SHOW');

// Local Database Service using Capacitor Preferences
class LocalDatabaseService implements DatabaseService {
  constructor() {
    console.log('🏠 Initializing Local Database Service');
  }

  async select<T = any>(
    table: string,
    options?: {
      columns?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean }[];
      limit?: number;
      offset?: number;
    }
  ): Promise<QueryResult<T>> {
    try {
      console.log('🏠 Local select from table:', table, 'with options:', options);
      
      // Get data from Capacitor Preferences
      const { value } = await Preferences.get({ key: `table_${table}` });
      let data: T[] = value ? JSON.parse(value) : [];

      // Apply filters
      if (options?.filters) {
        data = data.filter(item => {
          return Object.entries(options.filters!).every(([key, value]) => {
            return (item as any)[key] === value;
          });
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        data.sort((a, b) => {
          for (const order of options.orderBy!) {
            const aVal = (a as any)[order.column];
            const bVal = (b as any)[order.column];
            const ascending = order.ascending !== false;
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
          }
          return 0;
        });
      }

      // Apply limit and offset
      if (options?.offset) {
        data = data.slice(options.offset);
      }
      if (options?.limit) {
        data = data.slice(0, options.limit);
      }

      console.log('🏠 Local select result:', data.length, 'rows');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Local select error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async insert<T = any>(table: string, data: Partial<T> | Partial<T>[]): Promise<InsertResult<T>> {
    try {
      console.log('🏠 Local insert to table:', table, 'data:', data);
      
      // Get existing data
      const { value } = await Preferences.get({ key: `table_${table}` });
      let existingData: T[] = value ? JSON.parse(value) : [];

      // Prepare new data
      const newData = Array.isArray(data) ? data : [data];
      const insertedData: T[] = [];

      for (const item of newData) {
        // Add ID and timestamps if not present
        const newItem = {
          id: (item as any).id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: (item as any).created_at || new Date().toISOString(),
          updated_at: (item as any).updated_at || new Date().toISOString(),
          ...item
        } as T;

        existingData.push(newItem);
        insertedData.push(newItem);
      }

      // Save back to storage
      await Preferences.set({ 
        key: `table_${table}`, 
        value: JSON.stringify(existingData) 
      });

      console.log('🏠 Local insert successful:', insertedData.length, 'rows');
      return { data: insertedData, error: null };
    } catch (error) {
      console.error('❌ Local insert error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async update<T = any>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>
  ): Promise<UpdateResult<T>> {
    try {
      console.log('🏠 Local update table:', table, 'data:', data, 'filters:', filters);
      
      // Get existing data
      const { value } = await Preferences.get({ key: `table_${table}` });
      let existingData: T[] = value ? JSON.parse(value) : [];

      // Find and update matching rows
      const updatedData: T[] = [];
      let updatedCount = 0;

      existingData = existingData.map(item => {
        const matches = Object.entries(filters).every(([key, value]) => {
          return (item as any)[key] === value;
        });

        if (matches) {
          const updatedItem = {
            ...item,
            ...data,
            updated_at: new Date().toISOString()
          } as T;
          updatedData.push(updatedItem);
          updatedCount++;
          return updatedItem;
        }
        return item;
      });

      // Save back to storage
      await Preferences.set({ 
        key: `table_${table}`, 
        value: JSON.stringify(existingData) 
      });

      console.log('🏠 Local update successful:', updatedCount, 'rows updated');
      return { data: updatedData, error: null };
    } catch (error) {
      console.error('❌ Local update error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async delete(table: string, filters: Record<string, any>): Promise<DeleteResult> {
    try {
      console.log('🏠 Local delete from table:', table, 'filters:', filters);
      
      // Get existing data
      const { value } = await Preferences.get({ key: `table_${table}` });
      let existingData: any[] = value ? JSON.parse(value) : [];

      // Filter out matching rows
      const originalCount = existingData.length;
      existingData = existingData.filter(item => {
        return !Object.entries(filters).every(([key, value]) => {
          return item[key] === value;
        });
      });

      const deletedCount = originalCount - existingData.length;

      // Save back to storage
      await Preferences.set({ 
        key: `table_${table}`, 
        value: JSON.stringify(existingData) 
      });

      console.log('🏠 Local delete successful:', deletedCount, 'rows deleted');
      return { error: null };
    } catch (error) {
      console.error('❌ Local delete error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test basic Preferences functionality
      await Preferences.set({ key: 'health_check', value: 'ok' });
      const { value } = await Preferences.get({ key: 'health_check' });
      await Preferences.remove({ key: 'health_check' });
      return value === 'ok';
    } catch {
      return false;
    }
  }
}

// Local Auth Service (mock implementation)
class LocalAuthService implements AuthService {
  async signUp(email: string, password: string, options?: any): Promise<any> {
    console.log('🏠 Local auth sign up:', email);
    // Mock successful signup
    return { 
      data: { 
        user: { 
          id: `local_${Date.now()}`, 
          email, 
          email_confirmed_at: new Date().toISOString() 
        } 
      }, 
      error: null 
    };
  }

  async signInWithPassword(email: string, password: string): Promise<any> {
    console.log('🏠 Local auth sign in:', email);
    // Mock successful signin
    return { 
      data: { 
        user: { 
          id: `local_${Date.now()}`, 
          email, 
          email_confirmed_at: new Date().toISOString() 
        } 
      }, 
      error: null 
    };
  }

  async signOut(): Promise<any> {
    console.log('🏠 Local auth sign out');
    return { error: null };
  }

  async getUser(): Promise<any> {
    console.log('🏠 Local auth get user');
    return { data: { user: null }, error: null };
  }

  async confirmSignUp(email: string, code: string): Promise<any> {
    console.log('🏠 Local auth confirm sign up:', email);
    return { error: null };
  }

  async resendConfirmationCode(email: string): Promise<any> {
    console.log('🏠 Local auth resend confirmation:', email);
    return { error: null };
  }

  async resetPassword(email: string): Promise<any> {
    console.log('🏠 Local auth reset password:', email);
    return { error: null };
  }

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<any> {
    console.log('🏠 Local auth confirm reset password:', email);
    return { error: null };
  }

  onAuthStateChange(callback: (event: string, user: any) => void): () => void {
    console.log('🏠 Local auth state change listener setup');
    // Return no-op unsubscribe function
    return () => {};
  }
}

// Local Storage Service (mock implementation)
class LocalStorageService implements StorageService {
  async uploadFile(file: File, path: string): Promise<any> {
    console.log('🏠 Local storage upload file:', path);
    return { data: { path }, error: null };
  }

  async downloadFile(path: string): Promise<any> {
    console.log('🏠 Local storage download file:', path);
    return { data: null, error: 'Local storage download not implemented' };
  }

  async deleteFile(path: string): Promise<any> {
    console.log('🏠 Local storage delete file:', path);
    return { error: null };
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<any> {
    console.log('🏠 Local storage get signed URL:', path);
    return { data: { signedUrl: `local://file/${path}` }, error: null };
  }

  async listFiles(path: string): Promise<any> {
    console.log('🏠 Local storage list files:', path);
    return { data: [], error: null };
  }
}

// Local Realtime Service (mock implementation)
class LocalRealtimeService implements RealtimeService {
  subscribe(table: string, callback: (payload: any) => void): any {
    console.log('🏠 Local realtime subscribe to:', table);
    return { unsubscribe: () => {} };
  }

  unsubscribe(subscription: any): void {
    console.log('🏠 Local realtime unsubscribe');
  }

  removeAllSubscriptions(): void {
    console.log('🏠 Local realtime remove all subscriptions');
  }
}

// Local Functions Service (mock implementation)
class LocalFunctionsService implements FunctionService {
  async invoke(functionName: string, payload?: any): Promise<{ data: any; error: any }> {
    console.log('🏠 Local functions invoke:', functionName, 'with payload:', payload);
    
    // Mock some common function responses
    if (functionName === 'analyze-baseline') {
      return {
        data: {
          score: Math.floor(Math.random() * 30) + 70, // Random score 70-100
          analysis: 'Local mock analysis completed',
          timestamp: new Date().toISOString()
        },
        error: null
      };
    }

    return {
      data: { message: 'Local function executed successfully' },
      error: null
    };
  }
}

// Main Local Backend Service
export class LocalBackendService implements BackendService {
  public database: DatabaseService;
  public auth: AuthService;
  public storage: StorageService;
  public realtime: RealtimeService;
  public functions: LocalFunctionsService;

  constructor() {
    console.log('🏠 Initializing Local Backend Service');
    console.log('🏠 LOCAL BACKEND SERVICE CONSTRUCTOR CALLED - THIS SHOULD ALWAYS SHOW');
    
    this.database = new LocalDatabaseService();
    this.auth = new LocalAuthService();
    this.storage = new LocalStorageService();
    this.realtime = new LocalRealtimeService();
    this.functions = new LocalFunctionsService();
    
    console.log('🏠 Local Backend Service initialized successfully');
  }
}
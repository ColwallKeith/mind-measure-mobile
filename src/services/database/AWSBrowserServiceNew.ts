// Browser-compatible AWS Backend Service
// Uses API endpoints instead of direct AWS SDK calls
import {
  AuthService,
  BackendService,
  DatabaseConfig,
  DatabaseService,
  RealtimeService,
  StorageService,
  QueryResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  DatabaseError,
  AuthError,
  StorageError
} from './DatabaseService';
// Browser-compatible database service that uses API endpoints
export class AWSBrowserDatabaseService implements DatabaseService {
  private config: DatabaseConfig;
  private apiBaseUrl: string;
  constructor(config: DatabaseConfig) {
    this.config = config;
    // Use Vercel API endpoints
    this.apiBaseUrl = '/api/database';
  }
  private async apiCall(endpoint: string, method: string = 'POST', body?: any): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers here when needed
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new DatabaseError(`API call failed: ${response.statusText} - ${errorText}`, 'API_ERROR');
    }
    return response.json();
  }
  async select<T = any>(
    table: string,
    options?: {
      columns?: string;
      filters?: Record<string, any>;
      orderBy?: Array<{ column: string; ascending?: boolean }>;
      limit?: number;
      offset?: number;
    }
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.apiCall('/select', 'POST', { table, options });
      return {
        data: result.data,
        error: null,
        count: result.count
      };
    } catch (error: any) {
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Database select failed',
        count: 0
      };
    }
  }
  async insert<T = any>(table: string, data: Partial<T> | Partial<T>[], options?: any): Promise<InsertResult<T>> {
    try {
      const result = await this.apiCall('/insert', 'POST', { table, data, options });
      return {
        data: result.data,
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Database insert failed'
      };
    }
  }
  async update<T = any>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>,
    options?: any
  ): Promise<UpdateResult<T>> {
    try {
      const result = await this.apiCall('/update', 'POST', { table, data, filters, options });
      return {
        data: result.data,
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Database update failed'
      };
    }
  }
  async delete<T = any>(table: string, filters: Record<string, any>): Promise<DeleteResult<T>> {
    try {
      const result = await this.apiCall('/delete', 'POST', { table, filters });
      return {
        data: result.data,
        error: null,
        count: result.count
      };
    } catch (error: any) {
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Database delete failed',
        count: 0
      };
    }
  }
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
// Browser-compatible Auth Service using API endpoints
export class AWSBrowserAuthService implements AuthService {
  private userPoolId: string;
  private clientId: string;
  private currentSession: any = null;
  private authStateCallbacks: ((event: string, session: any) => void)[] = [];
  private apiBaseUrl: string;
  constructor(private config: DatabaseConfig) {
    if (!config.cognitoUserPoolId || !config.cognitoClientId) {
      throw new Error('AWS Cognito requires userPoolId and clientId');
    }
    this.userPoolId = config.cognitoUserPoolId;
    this.clientId = config.cognitoClientId;
    this.apiBaseUrl = '/api/auth'; // We'll create auth API endpoints
  }
  private async authApiCall(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new AuthError(result.error || 'Authentication failed', 'AUTH_ERROR');
    }
    return result;
  }
  async signUp(email: string, password: string, options?: any): Promise<{ data: any; error: string | null }> {
    try {
      const result = await this.authApiCall('/signup', {
        email,
        password,
        userAttributes: options?.userAttributes || []
      });
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async signIn(email: string, password: string): Promise<{ data: any; error: string | null }> {
    try {
      const result = await this.authApiCall('/signin', { email, password });
      this.currentSession = result.session;
      // Notify listeners
      this.authStateCallbacks.forEach(callback =>
        callback('SIGNED_IN', this.currentSession)
      );
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async signOut(): Promise<{ error: string | null }> {
    try {
      await this.authApiCall('/signout', { session: this.currentSession });
      const oldSession = this.currentSession;
      this.currentSession = null;
      // Notify listeners
      this.authStateCallbacks.forEach(callback =>
        callback('SIGNED_OUT', oldSession)
      );
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
  async getCurrentUser(): Promise<{ data: any; error: string | null }> {
    try {
      if (!this.currentSession) {
        return { data: null, error: 'No current session' };
      }
      const result = await this.authApiCall('/user', { session: this.currentSession });
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async getCurrentSession(): Promise<{ data: any; error: string | null }> {
    return { data: this.currentSession, error: null };
  }
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      await this.authApiCall('/reset-password', { email });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
  async updatePassword(oldPassword: string, newPassword: string): Promise<{ error: string | null }> {
    try {
      await this.authApiCall('/update-password', {
        oldPassword,
        newPassword,
        session: this.currentSession
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
  async refreshSession(): Promise<{ data: any; error: string | null }> {
    try {
      if (!this.currentSession?.RefreshToken) {
        return { data: null, error: 'No refresh token available' };
      }
      const result = await this.authApiCall('/refresh', {
        refreshToken: this.currentSession.RefreshToken
      });
      this.currentSession = result.session;
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  onAuthStateChange(callback: (event: string, session: any) => void): { unsubscribe: () => void } {
    this.authStateCallbacks.push(callback);
    return {
      unsubscribe: () => {
        const index = this.authStateCallbacks.indexOf(callback);
        if (index > -1) {
          this.authStateCallbacks.splice(index, 1);
        }
      }
    };
  }
}
// Browser-compatible Storage Service using API endpoints
export class AWSBrowserStorageService implements StorageService {
  private defaultBucket: string;
  private apiBaseUrl: string;
  constructor(private config: DatabaseConfig) {
    if (!config.s3BucketName) {
      throw new Error('AWS S3 requires bucketName');
    }
    this.defaultBucket = config.s3BucketName;
    this.apiBaseUrl = '/api/storage'; // We'll create storage API endpoints
  }
  private async storageApiCall(endpoint: string, body?: any, method: string = 'POST'): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Storage operation failed');
    }
    return result;
  }
  async upload(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: string | null }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('bucket', options?.bucket || this.defaultBucket);
      const result = await this.storageApiCall('/upload', formData);
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async download(path: string, options?: any): Promise<{ data: Blob | null; error: string | null }> {
    try {
      const result = await this.storageApiCall('/download', {
        path,
        bucket: options?.bucket || this.defaultBucket
      });
      // Get the actual file from the signed URL
      const fileResponse = await fetch(result.url);
      const blob = await fileResponse.blob();
      return { data: blob, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async getPublicUrl(path: string, options?: any): Promise<{ data: string | null; error: string | null }> {
    try {
      const result = await this.storageApiCall('/public-url', {
        path,
        bucket: options?.bucket || this.defaultBucket
      });
      return { data: result.url, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async getSignedUrl(path: string, expiresIn: number = 3600, options?: any): Promise<{ data: string | null; error: string | null }> {
    try {
      const result = await this.storageApiCall('/signed-url', {
        path,
        expiresIn,
        bucket: options?.bucket || this.defaultBucket
      });
      return { data: result.url, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async delete(paths: string | string[], options?: any): Promise<{ error: string | null }> {
    try {
      await this.storageApiCall('/delete', {
        paths: Array.isArray(paths) ? paths : [paths],
        bucket: options?.bucket || this.defaultBucket
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
  async list(path?: string, options?: any): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const result = await this.storageApiCall('/list', {
        path: path || '',
        bucket: options?.bucket || this.defaultBucket,
        limit: options?.limit,
        offset: options?.offset
      });
      return { data: result.files, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
}
// Placeholder for browser-side real-time operations
class AWSBrowserRealtimeService implements RealtimeService {
  constructor(private config: DatabaseConfig) {}
  subscribe<T = any>(table: string, options?: any, callback?: any) {
    console.warn('Real-time service not implemented for browser-side AWS. Consider using WebSockets or Server-Sent Events.');
    return { unsubscribe: () => {} };
  }
  removeAllSubscriptions() {
    console.warn('Real-time service not implemented for browser-side AWS.');
  }
}
// Main backendService service for browser environments
export class AWSBrowserBackendService implements BackendService {
  public database: DatabaseService;
  public auth: AuthService;
  public storage: StorageService;
  public realtime: RealtimeService;
  constructor(config: DatabaseConfig) {
    this.database = new AWSBrowserDatabaseService(config);
    this.auth = new AWSBrowserAuthService(config);
    this.storage = new AWSBrowserStorageService(config);
    this.realtime = new AWSBrowserRealtimeService(config);
  }
}

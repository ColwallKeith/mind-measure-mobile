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
  DeleteResult
} from './DatabaseService';
// Browser-compatible database service that uses API endpoints
export class AWSBrowserDatabaseService implements DatabaseService {
  private config: DatabaseConfig;
  private apiBaseUrl: string;
  constructor(config: DatabaseConfig) {
    this.config = config;
    // Use environment variable for API base URL, fallback to relative path for production
    const envApiUrl = import.meta.env.VITE_API_BASE_URL;
    const isCapacitor = window.location.protocol === 'capacitor:' || !!(window as any).Capacitor;
    
    if (envApiUrl) {
      // Use explicit API URL from environment (e.g., https://mobile.mindmeasure.app/api)
      this.apiBaseUrl = envApiUrl + '/database';
    } else if (isCapacitor) {
      // Capacitor should always use production API
      this.apiBaseUrl = 'https://mobile.mindmeasure.app/api/database';
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !isCapacitor) {
      // Local development fallback (only for web browsers, not Capacitor)
      this.apiBaseUrl = 'http://localhost:3001/api/database';
    } else {
      // Production fallback (relative URL)
      this.apiBaseUrl = '/api/database';
    }
    
    console.log('🌐 Using Aurora Serverless v2 Browser Service with API endpoints');
    console.log('🔧 API Base URL:', this.apiBaseUrl);
  }
  private async apiCall(endpoint: string, method: string = 'POST', body?: any): Promise<any> {
    console.log('🔄 API Call:', method, `${this.apiBaseUrl}${endpoint}`);
    
    try {
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
        throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ API Response:', result);
      return result;
    } catch (error) {
      console.error('❌ API Call failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? error.cause : undefined
      });
      throw error;
    }
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
      // For baseline assessment, fail silently to avoid blocking ElevenLabs
      console.warn('⚠️ Database select failed (failing silently for baseline):', error);
      return {
        data: [],
        error: null, // Return null error to avoid blocking UI
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
      // For baseline assessment, fail silently to avoid blocking ElevenLabs
      console.warn('⚠️ Database insert failed (failing silently for baseline):', error);
      return {
        data: null,
        error: null // Return null error to avoid blocking UI
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
    // Trim any whitespace/newlines from environment variables
    const userPoolId = config.cognitoUserPoolId?.trim();
    const clientId = config.cognitoClientId?.trim();
    
    console.log('🔧 AWSBrowserAuthService config:', {
      cognitoUserPoolId: userPoolId,
      cognitoClientId: clientId,
      awsRegion: config.awsRegion?.trim()
    });
    
    if (!userPoolId || !clientId) {
      console.warn('AWS Cognito configuration missing - auth features will be limited');
      console.log('🔍 Missing values:', {
        userPoolId: userPoolId,
        clientId: clientId
      });
      // Use fallback values to prevent crashes
      this.userPoolId = userPoolId || 'fallback-pool-id';
      this.clientId = clientId || 'fallback-client-id';
    } else {
      this.userPoolId = userPoolId;
      this.clientId = clientId;
    }
    this.apiBaseUrl = '/api/auth'; // We'll create auth API endpoints
  }
  private async authApiCall(endpoint: string, body: any): Promise<any> {
    // Check if we have valid configuration
    if (this.userPoolId === 'fallback-pool-id' || this.clientId === 'fallback-client-id') {
      console.warn('AWS Cognito not properly configured - returning mock auth response');
      return {
        success: false,
        error: 'AWS Cognito configuration missing',
        session: null
      };
    }
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
  async upload(bucket: string, path: string, file: File | Blob, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    url?: string;
    key?: string;
    error: string | null;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filePath', path);
      formData.append('bucket', bucket);
      const result = await this.storageApiCall('/upload', formData);
      return { url: result.data?.url, key: result.data?.path, error: null };
    } catch (error: any) {
      return { url: undefined, key: undefined, error: error.message };
    }
  }

  // Convenience method for FileUpload component compatibility
  async uploadFile(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: string | null }> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const result = await this.upload(bucket, path, file, options);
      return { data: result, error: result.error };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
  async download(bucket: string, path: string): Promise<{
    data: Blob | null;
    error: string | null;
  }> {
    try {
      const result = await this.storageApiCall('/download', {
        path,
        bucket
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
  // Method overloads for different signatures
  async getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<{ url: string | null; error: string | null }>;
  async getSignedUrl(path: string, expiresIn?: number, options?: any): Promise<{ data: string | null; error: string | null }>;
  async getSignedUrl(pathOrBucket: string, pathOrExpiresIn?: string | number, optionsOrExpiresIn?: any): Promise<any> {
    try {
      // Handle both signatures:
      // 1. getSignedUrl(bucket, path, expiresIn) - interface signature
      // 2. getSignedUrl(path, expiresIn, options) - FileUpload signature
      
      let bucket: string, path: string, expiresIn: number;
      
      if (typeof pathOrExpiresIn === 'string') {
        // Interface signature: getSignedUrl(bucket, path, expiresIn)
        bucket = pathOrBucket;
        path = pathOrExpiresIn;
        expiresIn = (optionsOrExpiresIn as number) || 3600;
      } else {
        // FileUpload signature: getSignedUrl(path, expiresIn, options)
        path = pathOrBucket;
        expiresIn = (pathOrExpiresIn as number) || 3600;
        bucket = (optionsOrExpiresIn?.bucket) || this.defaultBucket;
      }

      const result = await this.storageApiCall('/signed-url', {
        path,
        expiresIn,
        bucket
      });
      
      // Return both formats for compatibility
      return { data: result.url, url: result.url, error: null };
    } catch (error: any) {
      return { data: null, url: null, error: error.message };
    }
  }
  async delete(bucket: string, path: string): Promise<{ error: string | null }> {
    try {
      await this.storageApiCall('/delete', {
        paths: [path],
        bucket
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
// Functions service for AWS Lambda integration
export class AWSBrowserFunctionsService {
  private lambdaBaseUrl: string;
  
  constructor(config: DatabaseConfig) {
    // Use environment variable if available, otherwise fallback to hardcoded dev endpoint
    const envLambdaUrl = import.meta.env.VITE_LAMBDA_BASE_URL;
    
    if (envLambdaUrl) {
      this.lambdaBaseUrl = envLambdaUrl.trim();
    } else {
      // Fallback to dev endpoint if env var not set
      this.lambdaBaseUrl = 'https://4xg1jsjh7k.execute-api.eu-west-2.amazonaws.com/dev';
    }
    
    console.log('🔧 Lambda Functions Base URL:', this.lambdaBaseUrl);
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Import fetchAuthSession from Amplify
      const { fetchAuthSession } = await import('aws-amplify/auth');
      
      // Get current auth session
      const session = await fetchAuthSession();
      
      if (!session.tokens?.accessToken) {
        throw new Error('No access token available - user not authenticated');
      }
      
      // Return the JWT access token
      return session.tokens.accessToken.toString();
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw new Error('Authentication required for Lambda functions');
    }
  }

  async invoke(functionName: string, data: any): Promise<any> {
    console.log(`🚀 Invoking Lambda function: ${functionName}`);
    
    try {
      const endpoint = `${this.lambdaBaseUrl}/${functionName}`;
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lambda function ${functionName} failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Lambda function ${functionName} completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`❌ Lambda function ${functionName} failed:`, error);
      console.error(`❌ Error details:`, {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: `${this.lambdaBaseUrl}/${functionName}`
      });
      throw error;
    }
  }
}

// Main backendService service for browser environments
export class AWSBrowserBackendService implements BackendService {
  public database: DatabaseService;
  public auth: AuthService;
  public storage: StorageService;
  public realtime: RealtimeService;
  public functions: AWSBrowserFunctionsService;
  
  constructor(config: DatabaseConfig) {
    console.log('🌐 Using Aurora Serverless v2 Browser Service with API endpoints');
    this.database = new AWSBrowserDatabaseService(config);
    this.auth = new AWSBrowserAuthService(config);
    this.functions = new AWSBrowserFunctionsService(config);
    
    // Make storage service optional - only create if S3 bucket is configured
    if (config.s3BucketName) {
      this.storage = new AWSBrowserStorageService(config);
    } else {
      console.warn('⚠️ S3 bucket not configured - storage features will be limited');
      // Create a minimal storage service that throws helpful errors
      this.storage = {
        uploadFile: async () => { throw new Error('S3 storage not configured'); },
        downloadFile: async () => { throw new Error('S3 storage not configured'); },
        deleteFile: async () => { throw new Error('S3 storage not configured'); },
        getSignedUrl: async () => { throw new Error('S3 storage not configured'); },
        listFiles: async () => { throw new Error('S3 storage not configured'); }
      } as StorageService;
    }
    this.realtime = new AWSBrowserRealtimeService(config);
  }
}

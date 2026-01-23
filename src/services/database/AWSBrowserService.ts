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
import { cognitoApiClient } from '../cognito-api-client';
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
      // Get JWT token for authentication
      const token = await cognitoApiClient.getIdToken();
      
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
      const result = await this.apiCall('/select', 'POST', {
        table,
        columns: options?.columns || '*',
        filters: options?.filters || {},
        orderBy: options?.orderBy || [],
        limit: options?.limit
      });
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
      console.log('[AWSBrowserService] 📝 Insert to table:', table);
      const result = await this.apiCall('/insert', 'POST', { table, data, options });
      console.log('[AWSBrowserService] ✅ Insert successful:', result?.data?.id || 'no id');
      return {
        data: result.data,
        error: null
      };
    } catch (error: any) {
      console.error('[AWSBrowserService] ❌ Database insert failed:', error);
      console.error('[AWSBrowserService] ❌ Error message:', error?.message || String(error));
      // Return the actual error so callers can handle it
      return {
        data: null,
        error: error?.message || 'Database insert failed'
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
      // Note: This is EXPECTED in production - we use token-based auth via cognito-api-client
      // not full Amplify in-browser. Auth works via tokens restored from native storage.
      console.log('🔧 Browser Cognito config not set (expected - using token-based auth)');
      // Use fallback values to prevent crashes - actual auth uses different pathway
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
    // Note: In production, auth goes through cognito-api-client, not this pathway
    if (this.userPoolId === 'fallback-pool-id' || this.clientId === 'fallback-client-id') {
      // This is expected - actual auth uses token-based cognito-api-client
      return {
        success: false,
        error: 'Using token-based auth pathway instead',
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
      // Get token from Capacitor Preferences storage
      // API Gateway Cognito authorizer typically expects ID token, not access token
      const { Preferences } = await import('@capacitor/preferences');
      
      // Try ID token first (preferred for API Gateway Cognito authorizers)
      let { value: idToken } = await Preferences.get({ key: 'mindmeasure_id_token' });
      if (!idToken) {
        ({ value: idToken } = await Preferences.get({ key: 'cognito_id_token' }));
      }
      
      // Fallback to access token if ID token not available
      let { value: accessToken } = await Preferences.get({ key: 'mindmeasure_access_token' });
      let tokenSource = 'mindmeasure_access_token';
      
      if (!accessToken) {
        console.warn('⚠️ Token not found at mindmeasure_access_token, trying cognito_access_token...');
        const result = await Preferences.get({ key: 'cognito_access_token' });
        accessToken = result.value;
        tokenSource = 'cognito_access_token';
      }
      
      // Prefer ID token if available (API Gateway Cognito authorizers expect ID tokens)
      // If not in storage, try to get from CognitoApiClient
      if (!idToken && !accessToken) {
        try {
          const { CognitoApiClient } = await import('../cognito-api-client');
          const cognitoClient = CognitoApiClient.getInstance();
          idToken = await cognitoClient.getIdToken();
          if (idToken) {
            console.log('✅ Retrieved ID token from CognitoApiClient');
          }
        } catch (e) {
          console.warn('⚠️ Could not get ID token from CognitoApiClient:', e);
        }
      }
      
      const token = idToken || accessToken;
      const tokenType = idToken ? 'ID' : 'Access';
      
      if (!token) {
        throw new Error('No token available - user not authenticated. Please sign in again.');
      }
      
      console.log(`✅ ${tokenType} token retrieved (length: ${token.length})`);
      
      // Log token type for debugging (decode without verification)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
          const base64 = base64Url + '='.repeat((4 - base64Url.length % 4) % 4);
          const payloadJson = atob(base64);
          const payload = JSON.parse(payloadJson);
          const actualTokenType = payload.token_use || 'unknown';
          console.log(`🔍 Token type from payload: ${actualTokenType}, issuer: ${payload.iss?.substring(0, 50) || 'unknown'}`);
        }
      } catch (e) {
        // Ignore decode errors
      }
      
      return token;
      
      // Validate token format (basic JWT check - should have 3 parts separated by dots)
      if (!accessToken.includes('.')) {
        console.error('❌ Invalid token format - not a JWT');
        throw new Error('Invalid token format');
      }
      
      // Check if token is a legacy Supabase token (before migration)
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          // Decode base64url payload (browser-compatible)
          const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
          const base64 = base64Url + '='.repeat((4 - base64Url.length % 4) % 4);
          const payloadJson = atob(base64);
          const payload = JSON.parse(payloadJson);
          const issuer = payload.iss || '';
          
          // Supabase tokens have a different issuer format
          if (issuer.includes('supabase.co') || issuer.includes('supabase')) {
            console.error('❌ Legacy Supabase token detected at', tokenSource);
            console.error('❌ This token is from before the AWS migration and is no longer valid');
            console.error('❌ Please sign out and sign in again to get a fresh Cognito token');
            
            // Clear the old token
            await Preferences.remove({ key: 'cognito_access_token' });
            await Preferences.remove({ key: 'mindmeasure_access_token' });
            
            throw new Error('Legacy Supabase token detected. Please sign out and sign in again to get a fresh Cognito token.');
          }
        }
      } catch (decodeError) {
        // If we can't decode, continue (will fail with proper error during validation)
        console.warn('⚠️ Could not pre-decode token for issuer check:', decodeError);
      }
      
      console.log('✅ Access token retrieved successfully from', tokenSource, '(length:', accessToken.length, ')');
      return accessToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw new Error('Authentication required for Lambda functions');
    }
  }

  async invoke(functionName: string, data: any): Promise<any> {
    console.log(`🚀 Invoking Lambda function: ${functionName}`);
    
    // Use proxy endpoint for finalize-session to avoid CORS issues
    const useProxy = functionName === 'finalize-session';
    const endpoint = useProxy 
      ? `/api/lambda/${functionName}`  // Use mobile app proxy
      : `${this.lambdaBaseUrl}/${functionName}`;  // Direct Lambda call
    
    try {
      const accessToken = await this.getAccessToken();
      
      console.log(`📡 Lambda request details:`, {
        functionName,
        endpoint,
        method: 'POST',
        hasAuth: !!accessToken,
        useProxy,
        payloadSize: JSON.stringify(data).length
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });

      // Try to get response body as text first
      const rawText = await response.text();
      let parsedBody: any = null;
      
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        console.warn(`⚠️ Lambda response not valid JSON:`, rawText);
      }

      if (!response.ok) {
        console.error(`❌ Lambda HTTP error:`, {
          functionName,
          endpoint,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          bodyParsed: parsedBody,
          bodyRaw: rawText,
        });
        
        throw new Error(
          `Lambda function ${functionName} failed with status ${response.status} ${response.statusText}. Body: ${rawText || '(empty)'}`
        );
      }

      console.log(`✅ Lambda function ${functionName} completed successfully:`, {
        status: response.status,
        bodyParsed: parsedBody,
      });
      
      return parsedBody;
      
    } catch (error) {
      // Enhanced error logging for network/fetch failures
      console.error(`❌ Lambda function ${functionName} failed:`, error);
      console.error(`❌ Detailed error info:`, {
        functionName,
        endpoint,
        errorType: error?.constructor?.name,
        errorName: (error as any)?.name,
        errorMessage: (error as Error)?.message,
        errorStack: (error as Error)?.stack,
        // Check if it's a network error
        isNetworkError: error instanceof TypeError,
        // Additional debugging info
        lambdaBaseUrl: this.lambdaBaseUrl,
      });
      
      // Re-throw with more context
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
    // Note: S3 is intentionally not configured - we stream to Rekognition directly
    // and don't persist raw media. This is expected behavior.
    if (config.s3BucketName) {
      this.storage = new AWSBrowserStorageService(config);
    } else {
      // Expected in production - no raw media persistence, direct API streaming instead
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

/**
 * Database Service Interface Definitions
 * 
 * Defines the contracts for database operations, authentication,
 * storage, and real-time functionality across different providers.
 */

// Query and filter types
export interface QueryFilter {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}

export interface QueryOptions {
  filters?: Record<string, QueryFilter>;
  columns?: string | string[];
  orderBy?: Array<{
    column: string;
    ascending: boolean;
  }>;
  limit?: number;
  offset?: number;
}

export interface DatabaseResult<T = any> {
  data: T[] | null;
  error: string | null;
  count?: number;
}

// Database service interface
export interface DatabaseService {
  select<T = any>(table: string, options?: QueryOptions): Promise<DatabaseResult<T>>;
  insert<T = any>(table: string, data: any): Promise<DatabaseResult<T>>;
  update<T = any>(table: string, data: any, options?: QueryOptions): Promise<DatabaseResult<T>>;
  delete(table: string, options?: QueryOptions): Promise<DatabaseResult<void>>;
  upsert<T = any>(table: string, data: any, options?: { onConflict?: string }): Promise<DatabaseResult<T>>;
}

// Authentication service interface
export interface AuthService {
  signUp(credentials: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{
    user: any | null;
    error: string | null;
  }>;
  
  signIn(credentials: {
    email: string;
    password: string;
  }): Promise<{
    user: any | null;
    error: string | null;
  }>;
  
  signOut(): Promise<{ error: string | null }>;
  
  getCurrentUser(): Promise<{
    user: any | null;
    error: string | null;
  }>;
  
  getSession(): Promise<{
    data: any | null;
    error: string | null;
  }>;
  
  refreshToken(): Promise<{
    user: any | null;
    error: string | null;
  }>;
  
  resetPassword(email: string): Promise<{ error: string | null }>;
  
  resendConfirmationCode(email: string): Promise<{ error: string | null }>;
}

// Storage service interface
export interface StorageService {
  upload(bucket: string, path: string, file: File | Blob, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    url?: string;
    key?: string;
    error: string | null;
  }>;
  
  download(bucket: string, path: string): Promise<{
    data: Blob | null;
    error: string | null;
  }>;
  
  delete(bucket: string, path: string): Promise<{ error: string | null }>;
  
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<{
    url: string | null;
    error: string | null;
  }>;
}

// Functions service interface
export interface FunctionService {
  invoke<T = any>(functionName: string, payload?: any, options?: {
    headers?: Record<string, string>;
  }): Promise<{
    data: T | null;
    error: string | null;
  }>;
}

// Real-time service interface
export interface RealtimeService {
  subscribe<T = any>(
    table: string,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      filter?: string;
    },
    callback?: (payload: {
      eventType: string;
      new: T;
      old: T;
      errors: any[];
    }) => void
  ): {
    unsubscribe: () => void;
  };
  removeAllSubscriptions(): void;
}

// Main service provider interface
export interface BackendService {
  database: DatabaseService;
  auth: AuthService;
  storage: StorageService;
  realtime: RealtimeService;
  functions: FunctionService;
}

// Error types
export interface DatabaseError {
  message: string;
  code?: string;
  details?: any;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

export interface StorageError {
  message: string;
  code?: string;
  details?: any;
}

// Result types
export interface QueryResult<T = any> {
  data: T[] | null;
  error: string | null;
  count?: number;
}

export interface SelectResult<T = any> {
  data: T[] | null;
  error: string | null;
  count?: number;
}

export interface InsertResult<T = any> {
  data: T | null;
  error: string | null;
}

export interface UpdateResult<T = any> {
  data: T | null;
  error: string | null;
}

export interface DeleteResult {
  error: string | null;
}

// Configuration interface
export interface DatabaseConfig {
  provider: 'aws' | 'aurora-serverless' | 'postgresql';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  
  // AWS specific
  baseUrl?: string;
  anonKey?: string;
  serviceKey?: string;
  region?: string;
  awsRegion?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  userPoolId?: string;
  clientId?: string;
  identityPoolId?: string;
  bucketName?: string;
  lambdaEndpoint?: string;
}
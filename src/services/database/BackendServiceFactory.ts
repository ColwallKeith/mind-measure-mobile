// Backend Service Factory
// This creates the appropriate backend service based on configuration
// Allows easy switching between AWS, AWS, or other providers
import { BackendService, DatabaseConfig } from './DatabaseService';
import { AWSBackendService } from './AWSService';
import { AWSBrowserBackendService } from './AWSBrowserService';
import { LocalBackendService } from './LocalBackendService';
export type BackendProvider = 'aurora-serverless' | 'postgresql' | 'local';
export interface BackendServiceConfig extends DatabaseConfig {
  provider: BackendProvider;
}
export class BackendServiceFactory {
  private static instance: BackendService | null = null;
  private static config: BackendServiceConfig | null = null;
  private static instances: Map<string, BackendService> = new Map();
  /**
   * Initialize the backend service with configuration
   */
  static initialize(config: BackendServiceConfig): void {
    this.config = config;
    this.instance = null; // Reset instance to force recreation with new config
  }
  /**
   * Get the current backend service instance (singleton)
   */
  static getInstance(): BackendService {
    if (!this.config) {
      throw new Error('Backend service not initialized. Call BackendServiceFactory.initialize() first.');
    }
    if (!this.instance) {
      this.instance = this.createService(this.config);
    }
    return this.instance;
  }

  /**
   * Get or create a named service instance
   */
  static getNamedInstance(instanceId: string, config?: BackendServiceConfig): BackendService {
    const serviceConfig = config || this.config;
    if (!serviceConfig) {
      throw new Error('Backend service not initialized. Provide config or call BackendServiceFactory.initialize() first.');
    }

    if (!this.instances.has(instanceId)) {
      console.log(`🔧 Creating new service instance: ${instanceId}`);
      this.instances.set(instanceId, this.createService(serviceConfig));
    }
    
    return this.instances.get(instanceId)!;
  }

  /**
   * Clear all cached instances
   */
  static clearInstances(): void {
    console.log('🧹 Clearing all service instances');
    this.instances.clear();
    this.instance = null;
  }

  /**
   * Get instance count for monitoring
   */
  static getInstanceCount(): number {
    return this.instances.size + (this.instance ? 1 : 0);
  }
  /**
   * Create a new backend service instance
   */
  static createService(config: BackendServiceConfig): BackendService {
    console.log('🔧 BackendServiceFactory.createService called with provider:', config.provider);
    switch (config.provider) {
      case 'aws':
        console.log('🔧 Using AWS Browser Service with Cognito and API endpoints');
        return new AWSBrowserBackendService(config);
      case 'local':
        console.log('🏠 Using Local Backend Service with Capacitor storage');
        console.log('🏠 CREATING LOCAL BACKEND SERVICE - NO AWS NEEDED');
        return new LocalBackendService();
      case 'aurora-serverless':
        // Check if we're in browser environment
        if (typeof window !== 'undefined') {
          // Use browser-compatible Aurora service with API endpoints
          console.log('🌐 Using Aurora Serverless v2 Browser Service with API endpoints');
          return new AWSBrowserBackendService(config);
        }
        // Server-side: use full Aurora Serverless v2 service
        if (!config.host || !config.database || !config.username || !config.password) {
          throw new Error('Aurora Serverless v2 provider requires host, database, username, and password');
        }
        return new AWSBackendService(config);
      case 'postgresql':
        // Check if we're in browser environment
        if (typeof window !== 'undefined') {
          throw new Error('PostgreSQL provider cannot be used in browser environment. Use Aurora Serverless for client-side operations.');
        }
        if (!config.host || !config.database || !config.username || !config.password) {
          throw new Error('PostgreSQL provider requires host, database, username, and password');
        }
        return new AWSBackendService(config);
      default:
        throw new Error(`Unsupported backend provider: ${config.provider}. Supported providers: aws, local, aurora-serverless, postgresql`);
    }
  }
  /**
   * Reset the service instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.config = null;
  }
  /**
   * Safe environment variable access for browser compatibility
   */
  private static getEnv(key: string, defaultValue: string = ''): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || defaultValue;
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || defaultValue;
    }
    return defaultValue;
  }

  /**
   * Get configuration for different environments
   */
  static getEnvironmentConfig(): BackendServiceConfig {
    // Safe environment access for browser compatibility
    const environment = this.getEnv('NODE_ENV', 'development');
    
    // Check localStorage for user preference first, then environment
    const storedProvider = typeof window !== 'undefined' ? localStorage.getItem('backend_provider') : null;
    
    // 🏠 FORCE LOCAL BACKEND FOR MOBILE - Override everything
    console.log('🔧 Backend Factory: Using AWS backend for production');
    const backendProvider = (storedProvider as BackendProvider) || 'aws' as BackendProvider;
    console.log('🔧 Backend provider set to:', backendProvider, '');
    const baseConfig: Partial<BackendServiceConfig> = {
      provider: backendProvider};
    switch (backendProvider) {
      case 'aws':
        return {
          ...baseConfig,
          provider: 'aws',
          awsRegion: this.getEnv('VITE_AWS_REGION', 'eu-west-2'),
          // Note: Cognito credentials removed - auth now handled server-side via /api/auth endpoints
          apiBaseUrl: this.getEnv('VITE_API_BASE_URL', 'https://api.mindmeasure.co.uk')
        } as BackendServiceConfig;      case 'local':
        return {
          ...baseConfig,
          provider: 'local'
        } as BackendServiceConfig;
      case 'aurora-serverless':
        return {
          ...baseConfig,
          provider: 'aurora-serverless',
          host: this.getEnv('VITE_DB_HOST', 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com'),
          port: parseInt(this.getEnv('VITE_DB_PORT', '5432')),
          database: this.getEnv('VITE_DB_NAME', 'mindmeasure'),
          username: this.getEnv('VITE_DB_USERNAME', 'mindmeasure_admin'),
          password: this.getEnv('VITE_DB_PASSWORD', 'MindMeasure2024!'),
          ssl: environment === 'production',
          awsRegion: this.getEnv('VITE_AWS_REGION', 'eu-west-2'),
          awsCredentials: {
            accessKeyId: this.getEnv('VITE_AWS_ACCESS_KEY_ID', ''),
            secretAccessKey: this.getEnv('VITE_AWS_SECRET_ACCESS_KEY', '')},
          // Note: Cognito credentials removed - auth now handled server-side via /api/auth endpoints
          s3BucketName: this.getEnv('VITE_AWS_S3_BUCKET_NAME', 'mindmeasure-user-content-459338929203'),
          s3Region: this.getEnv('VITE_AWS_S3_REGION', this.getEnv('VITE_AWS_REGION', 'eu-west-2'))} as BackendServiceConfig;
      case 'postgresql':
        return {
          ...baseConfig,
          provider: 'postgresql',
          connectionString: this.getEnv('VITE_DATABASE_URL', ''),
          host: this.getEnv('VITE_DB_HOST', ''),
          port: parseInt(this.getEnv('VITE_DB_PORT', '5432')),
          database: this.getEnv('VITE_DB_NAME', ''),
          username: this.getEnv('VITE_DB_USERNAME', ''),
          password: this.getEnv('VITE_DB_PASSWORD', ''),
          ssl: environment === 'production'} as BackendServiceConfig;
      default:
        throw new Error(`Unsupported backend provider: ${backendProvider}. Supported providers: aws, local, aurora-serverless, postgresql`);
    }
  }
}
// Convenience functions for accessing services
export const getDatabase = () => BackendServiceFactory.getInstance().database;
export const getAuth = () => BackendServiceFactory.getInstance().auth;
export const getStorage = () => BackendServiceFactory.getInstance().storage;
export const getRealtime = () => BackendServiceFactory.getInstance().realtime;
// Environment configuration helper
export const initializeBackendService = () => {
  // AWS Backend Service
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );
  const config = BackendServiceFactory.getEnvironmentConfig();
  BackendServiceFactory.initialize(config);
  console.log(`Backend service initialized with provider: ${config.provider}`);
  return BackendServiceFactory.getInstance();
};
// Legacy function removed - all operations now use backendService.database
// Health check for all services
export const performHealthCheck = async () => {
  try {
    const backend = BackendServiceFactory.getInstance();
    const results = {
      database: await backend.database.healthCheck(),
      auth: true, // Auth services typically don't have health checks
      storage: true, // Storage services typically don't have health checks
      realtime: true, // Realtime services typically don't have health checks
      provider: BackendServiceFactory.config?.provider || 'unknown',
      timestamp: new Date().toISOString()};
    console.log('Backend health check results:', results);
    return results;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return {
      database: false,
      auth: false,
      storage: false,
      realtime: false,
      provider: BackendServiceFactory.config?.provider || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()};
  }
};
// Development helper - switch providers at runtime
export const switchProvider = (provider: BackendProvider, additionalConfig: Partial<BackendServiceConfig> = {}) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Provider switching is not allowed in production');
  }
  const baseConfig = BackendServiceFactory.getEnvironmentConfig();
  const newConfig = {
    ...baseConfig,
    ...additionalConfig,
    provider};
  BackendServiceFactory.initialize(newConfig);
  console.log(`Switched to backend provider: ${provider}`);
  return BackendServiceFactory.getInstance();
};
export default BackendServiceFactory;

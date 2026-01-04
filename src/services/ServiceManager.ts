/**
 * ServiceManager - Centralized service management and lifecycle
 * 
 * This class provides:
 * - Singleton service instances
 * - Service health monitoring
 * - Configuration validation
 * - Error handling standardization
 * - Performance optimization
 */

import { BackendServiceFactory, BackendService } from './database/BackendServiceFactory';
import { DatabaseConfig } from './database/DatabaseService';

// Service health status
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

// Service configuration with validation
export interface ServiceConfig extends DatabaseConfig {
  // Health check settings
  healthCheckInterval?: number; // ms
  healthCheckTimeout?: number; // ms
  maxRetries?: number;
  retryDelay?: number; // ms
  
  // Performance settings
  connectionPoolSize?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number; // ms
  
  // Monitoring
  enableMetrics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Service error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, BackendService> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();
  private config: ServiceConfig;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(config: ServiceConfig) {
    this.config = this.validateConfig(config);
    this.initializeHealthMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: ServiceConfig): ServiceManager {
    if (!ServiceManager.instance) {
      if (!config) {
        throw new ServiceError(
          'ServiceManager not initialized. Provide config on first call.',
          'MANAGER_NOT_INITIALIZED',
          'ServiceManager'
        );
      }
      ServiceManager.instance = new ServiceManager(config);
    }
    return ServiceManager.instance;
  }

  /**
   * Get or create a service instance
   */
  public async getService(serviceId: string = 'default'): Promise<BackendService> {
    try {
      // Return cached service if available and healthy
      if (this.services.has(serviceId)) {
        const service = this.services.get(serviceId)!;
        const health = await this.checkServiceHealth(serviceId, service);
        
        if (health.status === 'healthy') {
          return service;
        } else {
          this.log('warn', `Service ${serviceId} unhealthy, recreating...`, { health });
          this.services.delete(serviceId);
        }
      }

      // Create new service instance
      this.log('info', `Creating new service instance: ${serviceId}`);
      const startTime = Date.now();
      
      const service = BackendServiceFactory.createService(this.config);
      
      const creationTime = Date.now() - startTime;
      this.log('info', `Service ${serviceId} created in ${creationTime}ms`);

      // Cache the service
      this.services.set(serviceId, service);
      
      // Initialize health monitoring for this service
      this.startHealthMonitoring(serviceId, service);
      
      return service;
    } catch (error) {
      const serviceError = new ServiceError(
        `Failed to create service ${serviceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SERVICE_CREATION_FAILED',
        'ServiceManager',
        true,
        { serviceId, originalError: error }
      );
      
      this.log('error', serviceError.message, serviceError.details);
      throw serviceError;
    }
  }

  /**
   * Get service health status
   */
  public getServiceHealth(serviceId: string = 'default'): ServiceHealth {
    return this.healthStatus.get(serviceId) || {
      status: 'unknown',
      lastCheck: new Date(),
      error: 'Service not found'
    };
  }

  /**
   * Get all services health status
   */
  public getAllServicesHealth(): Record<string, ServiceHealth> {
    const health: Record<string, ServiceHealth> = {};
    for (const [serviceId, status] of this.healthStatus.entries()) {
      health[serviceId] = status;
    }
    return health;
  }

  /**
   * Manually trigger health check for a service
   */
  public async checkServiceHealth(serviceId: string, service?: BackendService): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const targetService = service || this.services.get(serviceId);
      if (!targetService) {
        const health: ServiceHealth = {
          status: 'unhealthy',
          lastCheck: new Date(),
          error: 'Service not found'
        };
        this.healthStatus.set(serviceId, health);
        return health;
      }

      // Perform health check (simple database query)
      // Use a more basic table that's guaranteed to exist
      const { data, error } = await targetService.database.select('universities', {
        columns: 'id',
        limit: 1
      });

      const responseTime = Date.now() - startTime;
      
      const health: ServiceHealth = {
        status: error ? 'unhealthy' : 'healthy',
        lastCheck: new Date(),
        responseTime,
        error: error || undefined,
        details: {
          hasData: !!data,
          recordCount: data?.length || 0
        }
      };

      this.healthStatus.set(serviceId, health);
      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const health: ServiceHealth = {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { originalError: error }
      };

      this.healthStatus.set(serviceId, health);
      return health;
    }
  }

  /**
   * Retry a service operation with exponential backoff
   */
  public async retryOperation<T>(
    operation: () => Promise<T>,
    serviceId: string,
    maxRetries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        this.log('warn', `Service ${serviceId} operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, {
          error: lastError.message,
          attempt,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new ServiceError(
      `Service operation failed after ${maxRetries} attempts: ${lastError!.message}`,
      'OPERATION_FAILED_MAX_RETRIES',
      serviceId,
      false,
      { maxRetries, originalError: lastError! }
    );
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.log('info', 'Cleaning up ServiceManager resources');
    
    // Clear health check intervals
    for (const [serviceId, interval] of this.healthCheckIntervals.entries()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Cleanup services if they have cleanup methods
    for (const [serviceId, service] of this.services.entries()) {
      if (service && typeof (service as any).cleanup === 'function') {
        try {
          (service as any).cleanup();
          this.log('debug', `Cleaned up service: ${serviceId}`);
        } catch (error) {
          this.log('warn', `Error cleaning up service ${serviceId}:`, error);
        }
      }
    }
    
    // Clear services and health status
    this.services.clear();
    this.healthStatus.clear();
    
    // Force garbage collection hint (if available)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore - gc not available
      }
    }
  }

  /**
   * Optimize memory usage by cleaning up inactive services
   */
  public optimizeMemory(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [serviceId, health] of this.healthStatus.entries()) {
      const timeSinceLastCheck = now - health.lastCheck.getTime();
      
      if (timeSinceLastCheck > inactiveThreshold && health.status !== 'healthy') {
        this.log('info', `Cleaning up inactive service: ${serviceId}`);
        
        // Clear health check interval
        const interval = this.healthCheckIntervals.get(serviceId);
        if (interval) {
          clearInterval(interval);
          this.healthCheckIntervals.delete(serviceId);
        }
        
        // Remove service and health status
        this.services.delete(serviceId);
        this.healthStatus.delete(serviceId);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = this.validateConfig({ ...this.config, ...newConfig });
    this.log('info', 'ServiceManager configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // Private methods

  private validateConfig(config: ServiceConfig): ServiceConfig {
    const validated: ServiceConfig = {
      // Required fields
      provider: config.provider,
      
      // Optional fields with defaults
      healthCheckInterval: config.healthCheckInterval || 120000, // 2 minutes (reduced frequency for mobile)
      healthCheckTimeout: config.healthCheckTimeout || 5000, // 5s
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000, // 1s
      connectionPoolSize: config.connectionPoolSize || 10,
      cacheEnabled: config.cacheEnabled !== false, // Default true
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      enableMetrics: config.enableMetrics !== false, // Default true
      logLevel: config.logLevel || 'info',
      
      // Pass through other config
      ...config
    };

    // Validate required fields
    if (!validated.provider) {
      throw new ServiceError(
        'Provider is required in service configuration',
        'INVALID_CONFIG',
        'ServiceManager'
      );
    }

    return validated;
  }

  private initializeHealthMonitoring(): void {
    this.log('info', 'Initializing health monitoring system');
  }

  private startHealthMonitoring(serviceId: string, service: BackendService): void {
    // Clear existing interval if any
    const existingInterval = this.healthCheckIntervals.get(serviceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new health check interval
    const interval = setInterval(async () => {
      await this.checkServiceHealth(serviceId, service);
    }, this.config.healthCheckInterval!);

    this.healthCheckIntervals.set(serviceId, interval);
    this.log('debug', `Health monitoring started for service ${serviceId}`);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: any): void {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = logLevels[this.config.logLevel || 'info'];
    const messageLevel = logLevels[level];

    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [ServiceManager] [${level.toUpperCase()}] ${message}`;
      
      if (details) {
        console[level === 'debug' ? 'log' : level](logMessage, details);
      } else {
        console[level === 'debug' ? 'log' : level](logMessage);
      }
    }
  }
}

// Export convenience functions
export const getServiceManager = (config?: ServiceConfig) => ServiceManager.getInstance(config);
export const getService = async (serviceId?: string) => {
  const manager = ServiceManager.getInstance();
  return manager.getService(serviceId);
};

/**
 * ServiceContext - React context for service management
 * 
 * Provides centralized service access throughout the React component tree
 * with automatic service lifecycle management and health monitoring.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ServiceManager, ServiceConfig, ServiceHealth, getServiceManager } from '../services/ServiceManager';
import { BackendService, BackendServiceFactory } from '../services/database/BackendServiceFactory';

interface ServiceContextValue {
  // Service access
  getService: (serviceId?: string) => Promise<BackendService>;
  
  // Health monitoring
  serviceHealth: Record<string, ServiceHealth>;
  isHealthy: boolean;
  
  // Service management
  refreshServices: () => Promise<void>;
  updateConfig: (config: Partial<ServiceConfig>) => void;
  
  // Status
  isInitialized: boolean;
  error: string | null;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
  config?: ServiceConfig;
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
}

export function ServiceProvider({ 
  children, 
  config,
  enableHealthMonitoring = true,
  healthCheckInterval = 30000 
}: ServiceProviderProps) {
  const [serviceManager, setServiceManager] = useState<ServiceManager | null>(null);
  const [serviceHealth, setServiceHealth] = useState<Record<string, ServiceHealth>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service manager
  useEffect(() => {
    const initializeServices = async () => {
      try {
        
        // Get configuration from environment or props
        const serviceConfig: ServiceConfig = config || BackendServiceFactory.getEnvironmentConfig();

        const manager = getServiceManager(serviceConfig);
        setServiceManager(manager);
        
        // Initialize default service to warm up the system
        await manager.getService('default');
        
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to initialize ServiceManager:', errorMessage);
        setError(errorMessage);
        setIsInitialized(false);
      }
    };

    initializeServices();
  }, [config, healthCheckInterval]);

  // Health monitoring
  useEffect(() => {
    if (!serviceManager || !enableHealthMonitoring) return;

    const updateHealthStatus = () => {
      const health = serviceManager.getAllServicesHealth();
      setServiceHealth(health);
    };

    // Initial health check
    updateHealthStatus();

    // Set up periodic health updates
    const interval = setInterval(updateHealthStatus, healthCheckInterval);

    return () => clearInterval(interval);
  }, [serviceManager, enableHealthMonitoring, healthCheckInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceManager) {
        serviceManager.cleanup();
      }
    };
  }, [serviceManager]);

  // Context value
  const contextValue: ServiceContextValue = {
    getService: async (serviceId?: string) => {
      if (!serviceManager) {
        throw new Error('ServiceManager not initialized');
      }
      return serviceManager.getService(serviceId);
    },
    
    serviceHealth,
    isHealthy: Object.values(serviceHealth).every(health => 
      health.status === 'healthy' || health.status === 'unknown'
    ),
    
    refreshServices: async () => {
      if (!serviceManager) return;
      
      try {
        // Force recreation of services by clearing cache
        serviceManager.cleanup();
        
        // Reinitialize
        await serviceManager.getService('default');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to refresh services:', errorMessage);
        setError(errorMessage);
      }
    },
    
    updateConfig: (newConfig: Partial<ServiceConfig>) => {
      if (!serviceManager) return;
      serviceManager.updateConfig(newConfig);
    },
    
    isInitialized,
    error
  };

  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  );
}

/**
 * Hook to access service context
 */
export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

/**
 * Hook to get a specific service with automatic error handling
 */
export function useService(serviceId?: string) {
  const { getService, isInitialized, error } = useServices();
  const [service, setService] = useState<BackendService | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    const loadService = async () => {
      try {
        setLoading(true);
        setServiceError(null);
        const svc = await getService(serviceId);
        setService(svc);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed to load service ${serviceId || 'default'}:`, errorMessage);
        setServiceError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [getService, serviceId, isInitialized]);

  return {
    service,
    loading: loading || !isInitialized,
    error: serviceError || error
  };
}

/**
 * Hook for service health monitoring
 */
export function useServiceHealth(serviceId?: string) {
  const { serviceHealth, isHealthy } = useServices();
  
  const specificHealth = serviceId ? serviceHealth[serviceId] : null;
  const overallHealthy = serviceId ? 
    specificHealth?.status === 'healthy' : 
    isHealthy;

  return {
    health: specificHealth,
    allHealth: serviceHealth,
    isHealthy: overallHealthy,
    lastCheck: specificHealth?.lastCheck,
    responseTime: specificHealth?.responseTime,
    error: specificHealth?.error
  };
}

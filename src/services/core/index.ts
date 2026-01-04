/**
 * Core Services Barrel Export
 * 
 * Centralized exports for essential application services.
 * These are the foundational services used throughout the app.
 * 
 * Usage:
 * import { ServiceManager, authService } from '@/services/core';
 */

// Service Management
export { ServiceManager, getServiceManager, getService } from '../ServiceManager';
export type { ServiceConfig, ServiceHealth } from '../ServiceManager';

// Authentication Services
export { default as authService } from '../auth';
export type * from '../auth';

// Deep Link Service
export { deepLinkService } from '../deepLinkService';

// Core Service Types
export type { BackendService, BackendServiceConfig } from '../database/BackendServiceFactory';

// Re-export commonly used database services
export { BackendServiceFactory } from '../database/BackendServiceFactory';
export type { DatabaseConfig, DatabaseService } from '../database/DatabaseService';

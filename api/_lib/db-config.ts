/**
 * Database Configuration - Secure Implementation
 * NO FALLBACK PASSWORDS - Fails fast if environment variables are missing
 */

import { ClientConfig } from 'pg';

export function getSecureDbConfig(): ClientConfig {
  // CRITICAL: Fail fast if any required env var is missing
  const requiredEnvVars = [
    'AWS_AURORA_HOST',
    'AWS_AURORA_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `CRITICAL SECURITY ERROR: Missing required database environment variables: ${missingVars.join(', ')}. ` +
      `Database connections require explicit credentials - no fallbacks are provided for security.`
    );
  }

  // Validate password is not empty
  if (!process.env.AWS_AURORA_PASSWORD || process.env.AWS_AURORA_PASSWORD.trim() === '') {
    throw new Error('CRITICAL SECURITY ERROR: AWS_AURORA_PASSWORD is empty');
  }

  return {
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
    user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
    password: process.env.AWS_AURORA_PASSWORD,
    // SECURITY: Proper TLS verification enabled
    ssl: { 
      rejectUnauthorized: true 
    },
    // Connection timeouts
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  };
}

export function getDbConnectionString(): string {
  const config = getSecureDbConfig();
  
  // Build connection string without logging password
  return `postgresql://${config.user}@${config.host}:${config.port}/${config.database}`;
}

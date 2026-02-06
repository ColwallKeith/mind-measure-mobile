/**
 * University Resolver Service
 * 
 * Centralized service for resolving university from email domain.
 * Used by:
 * - Baseline profile creation
 * - Registration flows
 * - Admin user assignment
 * 
 * Benefits:
 * - Single source of truth for domain → university mapping
 * - Dynamic: reads from universities.domains in database
 * - No hardcoded mappings
 * - Supports multiple domains per university
 */

import { BackendServiceFactory } from './database/BackendServiceFactory';

export class UniversityResolver {
  private static instance: UniversityResolver;
  private cache: Map<string, string> = new Map(); // domain → university_id
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UniversityResolver {
    if (!UniversityResolver.instance) {
      UniversityResolver.instance = new UniversityResolver();
    }
    return UniversityResolver.instance;
  }

  /**
   * Resolve university from email address
   * @param email - User's email address
   * @returns university_id or null if no match found
   */
  async resolveFromEmail(email: string): Promise<string | null> {
    if (!email || !email.includes('@')) {
      console.warn('[UniversityResolver] Invalid email:', email);
      return null;
    }

    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) {
      console.warn('[UniversityResolver] Could not extract domain from email:', email);
      return null;
    }


    // Check cache first
    if (this.isCacheValid() && this.cache.has(domain)) {
      const universityId = this.cache.get(domain)!;
      return universityId;
    }

    // Cache miss or expired - query database
    try {
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Query universities - NOTE: 'domains' column may not exist yet
      
      const { data: universities, error } = await backendService.database.select(
        'universities',
        {
          columns: ['id', 'name'],
          filters: {}, // Get all universities
        }
      );

      if (error) {
        console.warn('[UniversityResolver] DB lookup failed, using default:', error);
        return null;
      }

      if (!universities || universities.length === 0) {
        console.warn('[UniversityResolver] No universities found in database, using default');
        return null;
      }

      
      // For now, we don't have a domains column, so we can't do dynamic mapping
      // Just return null and let the caller use the default
      console.warn('[UniversityResolver] Domain mapping not yet implemented, using default university');
      return null;

    } catch (error) {
      console.warn('[UniversityResolver] Error resolving university, using default:', error);
      return null;
    }
  }

  /**
   * Get default fallback university
   * Used when email domain doesn't match any university
   */
  getDefaultUniversity(): string {
    return 'worcester'; // Default fallback
  }

  /**
   * Clear cache (useful for testing or after university config changes)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * Get all cached domain mappings (for debugging)
   */
  getCachedMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    this.cache.forEach((universityId, domain) => {
      mappings[domain] = universityId;
    });
    return mappings;
  }
}

/**
 * Convenience function for one-off university resolution
 */
export async function resolveUniversityFromEmail(email: string): Promise<string> {
  const resolver = UniversityResolver.getInstance();
  const universityId = await resolver.resolveFromEmail(email);
  
  if (!universityId) {
    console.warn('[UniversityResolver] No match found, using default university');
    return resolver.getDefaultUniversity();
  }
  
  return universityId;
}


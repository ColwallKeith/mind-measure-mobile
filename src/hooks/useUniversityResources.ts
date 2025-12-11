/**
 * Hook to fetch university resources (emergency contacts, services, etc.) from CMS
 * Uses the logged-in user's university_id to fetch relevant data
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';

export interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  description?: string;
  is_24_hour?: boolean;
  is_primary?: boolean;
  category?: 'crisis' | 'medical' | 'security' | 'mental-health' | 'support';
}

export interface MentalHealthService {
  id?: string;
  name: string;
  description: string;
  contact_info?: string;
  phone?: string;
  email?: string;
  website?: string;
  availability?: string;
  type?: 'counseling' | 'therapy' | 'crisis' | 'support-group' | 'online';
}

export interface LocalResource {
  id?: string;
  name: string;
  description: string;
  contact_info?: string;
  phone?: string;
  website?: string;
  category?: 'academic' | 'wellbeing' | 'financial' | 'housing' | 'career';
}

export interface UniversityResources {
  id: string;
  name: string;
  short_name?: string;
  logo?: string;
  primary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  emergency_contacts: EmergencyContact[];
  mental_health_services: MentalHealthService[];
  local_resources: LocalResource[];
}

interface UseUniversityResourcesResult {
  resources: UniversityResources | null;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  refetch: () => Promise<void>;
}

export function useUniversityResources(): UseUniversityResourcesResult {
  const { user } = useAuth();
  const [resources, setResources] = useState<UniversityResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    if (!user?.id) {
      console.log('[useUniversityResources] No user logged in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // First get the user's profile to find their university_id
      console.log('[useUniversityResources] Fetching user profile...');
      const { data: profiles, error: profileError } = await backendService.database.select(
        'profiles',
        {
          filters: { user_id: user.id },
          limit: 1
        }
      );

      if (profileError) {
        console.error('[useUniversityResources] Profile error:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      const profile = profiles?.[0];
      const universityId = profile?.university_id;

      if (!universityId) {
        console.log('[useUniversityResources] No university associated with user');
        setResources(null);
        setLoading(false);
        return;
      }

      console.log('[useUniversityResources] Fetching university:', universityId);
      
      // Fetch the university with all resource fields
      const { data: universities, error: uniError } = await backendService.database.select(
        'universities',
        {
          filters: { id: universityId }
        }
      );

      if (uniError) {
        console.error('[useUniversityResources] University error:', uniError);
        throw new Error('Failed to fetch university data');
      }

      const university = universities?.[0];

      if (!university) {
        console.log('[useUniversityResources] University not found:', universityId);
        setResources(null);
        setLoading(false);
        return;
      }

      // Parse JSONB fields if they're strings
      const parseJsonField = (field: any): any[] => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
          try {
            return JSON.parse(field);
          } catch {
            return [];
          }
        }
        return [];
      };

      const universityResources: UniversityResources = {
        id: university.id,
        name: university.name,
        short_name: university.short_name,
        logo: university.logo,
        primary_color: university.primary_color,
        contact_email: university.contact_email,
        contact_phone: university.contact_phone,
        address: university.address,
        website: university.website,
        emergency_contacts: parseJsonField(university.emergency_contacts),
        mental_health_services: parseJsonField(university.mental_health_services),
        local_resources: parseJsonField(university.local_resources),
      };

      console.log('[useUniversityResources] Loaded resources:', {
        university: universityResources.name,
        emergencyContacts: universityResources.emergency_contacts.length,
        mentalHealthServices: universityResources.mental_health_services.length,
        localResources: universityResources.local_resources.length,
      });

      setResources(universityResources);
    } catch (err) {
      console.error('[useUniversityResources] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [user?.id]);

  const hasData = resources !== null && (
    resources.emergency_contacts.length > 0 ||
    resources.mental_health_services.length > 0 ||
    resources.local_resources.length > 0
  );

  return {
    resources,
    loading,
    error,
    hasData,
    refetch: fetchResources,
  };
}


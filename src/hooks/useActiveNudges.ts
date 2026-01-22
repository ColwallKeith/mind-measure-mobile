import { useState, useEffect } from 'react';

interface Nudge {
  id: string;
  template: 'event' | 'service' | 'tip';
  isPinned: boolean;
  
  // Event fields
  eventTitle?: string;
  eventDescription?: string;
  eventLocation?: string;
  eventDateTime?: string;
  eventButtonText?: string;
  eventButtonLink?: string;
  
  // Service fields
  serviceTitle?: string;
  serviceDescription?: string;
  serviceAccess?: string;
  serviceLink?: string;
  
  // Tip fields
  tipText?: string;
  tipArticleLink?: string;
}

export function useActiveNudges(universityId: string | null | undefined) {
  const [pinned, setPinned] = useState<Nudge | null>(null);
  const [rotated, setRotated] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!universityId) {
      setLoading(false);
      return;
    }

    async function fetchNudges() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[useActiveNudges] Fetching nudges for:', universityId);
        
        const response = await fetch(`/api/nudges/active?universityId=${universityId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('[useActiveNudges] Received:', {
          hasPinned: !!data.pinned,
          hasRotated: !!data.rotated,
          pinnedTemplate: data.pinned?.template,
          rotatedTemplate: data.rotated?.template
        });
        
        setPinned(data.pinned || null);
        setRotated(data.rotated || null);
      } catch (err) {
        console.error('[useActiveNudges] Error fetching nudges:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch nudges');
      } finally {
        setLoading(false);
      }
    }
    
    fetchNudges();
  }, [universityId]);

  return { pinned, rotated, loading, error };
}

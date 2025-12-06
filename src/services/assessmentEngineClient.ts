import { assessmentEngineConfig } from '../config/assessmentEngine';

/**
 * Assessment Engine Client
 * 
 * Handles all communication with the Assessment Engine API through proxy endpoints
 */

export interface CheckInStartResponse {
  checkInId: string;
  uploadUrls: {
    audio?: { url: string; key: string };
    video?: { url: string; key: string };
    images?: Array<{ url: string; key: string }>;
  };
}

export interface CheckInStatus {
  checkInId: string;
  status: 'PENDING_UPLOAD' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'QUALITY_FAILED';
  score?: number;
  analysis?: {
    mindMeasureScore?: number;
    audioScore?: number;
    visualScore?: number;
    textScore?: number;
    deviationFromBaseline?: number;
    confidence?: number;
    riskLevel?: 'none' | 'mild' | 'moderate' | 'high';
    riskReasons?: string[];
  };
  error?: string;
}

class AssessmentEngineClient {
  private getAuthToken(): string | null {
    // In browser environment, token should be available in localStorage or passed in
    return localStorage.getItem('cognito_id_token');
  }

  /**
   * Start a new check-in
   */
  async startCheckIn(type: 'baseline' | 'daily' | 'adhoc' = 'daily'): Promise<CheckInStartResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('[AssessmentEngine] Starting check-in, type:', type);

    const response = await fetch(assessmentEngineConfig.endpoints.startCheckIn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AssessmentEngine] Start check-in failed:', error);
      throw new Error(`Failed to start check-in: ${error}`);
    }

    const data = await response.json();
    console.log('[AssessmentEngine] Check-in started:', data.checkInId);
    return data;
  }

  /**
   * Mark check-in as complete and trigger processing
   */
  async completeCheckIn(
    checkInId: string,
    options: {
      type: 'baseline' | 'daily' | 'adhoc';
      hasAudio: boolean;
      hasVideo: boolean;
      transcript?: string;
    }
  ): Promise<{ success: boolean }> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('[AssessmentEngine] Completing check-in:', checkInId);
    console.log('[AssessmentEngine] Options:', {
      ...options,
      transcript: options.transcript ? `${options.transcript.length} chars` : 'none'
    });

    const response = await fetch(assessmentEngineConfig.endpoints.completeCheckIn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        checkInId,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AssessmentEngine] Complete check-in failed:', error);
      throw new Error(`Failed to complete check-in: ${error}`);
    }

    const data = await response.json();
    console.log('[AssessmentEngine] Check-in marked complete, processing started');
    return data;
  }

  /**
   * Get check-in status
   */
  async getCheckInStatus(checkInId: string): Promise<CheckInStatus> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(assessmentEngineConfig.endpoints.getCheckIn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ checkInId })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AssessmentEngine] Get check-in status failed:', error);
      throw new Error(`Failed to get check-in status: ${error}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Poll check-in status until complete or timeout
   */
  async pollCheckInStatus(
    checkInId: string,
    onProgress?: (status: CheckInStatus) => void
  ): Promise<CheckInStatus> {
    const { interval, maxAttempts } = assessmentEngineConfig.polling;
    let attempts = 0;

    console.log('[AssessmentEngine] Starting to poll check-in:', checkInId);

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const status = await this.getCheckInStatus(checkInId);
        
        console.log(`[AssessmentEngine] Poll attempt ${attempts}/${maxAttempts}, status: ${status.status}`);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }

        // Check if processing is complete
        if (status.status === 'COMPLETE') {
          console.log('[AssessmentEngine] Check-in complete!', status);
          return status;
        }

        if (status.status === 'FAILED' || status.status === 'QUALITY_FAILED') {
          console.error('[AssessmentEngine] Check-in failed:', status.error);
          throw new Error(status.error || 'Check-in processing failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error('[AssessmentEngine] Poll error:', error);
        throw error;
      }
    }

    throw new Error('Check-in processing timed out');
  }
}

// Export singleton instance
export const assessmentEngineClient = new AssessmentEngineClient();

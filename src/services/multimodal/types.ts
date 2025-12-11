/**
 * Multimodal Assessment - Shared Types
 * 
 * Type definitions shared across baseline and check-in multimodal assessments
 */

// ============================================================================
// BASELINE TYPES (Phase 1)
// ============================================================================

export interface BaselineAudioFeatures {
  // Pitch features
  meanPitch: number;           // Hz
  pitchVariability: number;    // Standard deviation
  
  // Speaking rate
  speakingRate: number;        // Words per minute
  
  // Pause features
  pauseFrequency: number;      // Pauses per minute
  pauseDuration: number;       // Average pause duration (seconds)
  
  // Voice quality
  voiceEnergy: number;         // Average amplitude (0-1)
  jitter: number;              // Voice stability (0-1)
  shimmer: number;             // Voice quality (0-1)
  harmonicRatio: number;       // Harmonic-to-noise ratio (0-1)
  
  // Quality metric
  quality: number;             // Overall signal quality (0-1)
}

export interface BaselineVisualFeatures {
  // Positive affect
  smileFrequency: number;      // % of time smiling (0-1)
  smileIntensity: number;      // Average smile intensity (0-1)
  
  // Engagement
  eyeContact: number;          // % of time looking at camera (0-1)
  
  // Stress indicators
  eyebrowPosition: number;     // Average eyebrow raise (0-1, higher = more raised)
  facialTension: number;       // Jaw/forehead tension (0-1)
  
  // Fatigue indicators
  blinkRate: number;           // Blinks per minute
  
  // Movement
  headMovement: number;        // Average head movement (0-1)
  
  // Overall affect
  affect: number;              // -1 (negative) to +1 (positive)
  
  // Quality metrics
  facePresenceQuality: number; // % of time face detected (0-1)
  overallQuality: number;      // Overall video quality (0-1)
}

export interface BaselineScoringBreakdown {
  clinicalScore: number;       // 0-100 from PHQ-2/GAD-2/mood
  clinicalWeight: number;      // 0.7
  
  audioScore: number;          // 0-100 from audio features
  visualScore: number;         // 0-100 from visual features
  multimodalScore: number;     // Average of audio and visual
  multimodalWeight: number;    // 0.3
  
  finalScore: number;          // Weighted combination
  
  confidence: number;          // Overall confidence (0-1)
}

// ============================================================================
// CHECK-IN TYPES (Phase 2 - placeholder)
// ============================================================================

export interface CheckInAudioFeatures {
  // 23 features - to be implemented in Phase 2
  [key: string]: number;
}

export interface CheckInVisualFeatures {
  // 18 features - to be implemented in Phase 2
  [key: string]: number;
}

export interface CheckInTextFeatures {
  // 16 features - to be implemented in Phase 2
  [key: string]: number;
}

// ============================================================================
// MEDIA CAPTURE TYPES
// ============================================================================

export interface MediaCaptureConfig {
  captureAudio: boolean;
  captureVideo: boolean;
  videoFrameRate?: number;     // Frames per second (default: 1)
  audioSampleRate?: number;    // Hz (default: 48000)
}

export interface CapturedMedia {
  audio?: Blob;
  videoFrames?: Blob[];        // Array of JPEG frames
  duration: number;            // Seconds
  startTime: number;           // Unix timestamp
  endTime: number;             // Unix timestamp
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class MultimodalError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'MultimodalError';
  }
}

export enum MultimodalErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MEDIA_CAPTURE_FAILED = 'MEDIA_CAPTURE_FAILED',
  FEATURE_EXTRACTION_FAILED = 'FEATURE_EXTRACTION_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
}




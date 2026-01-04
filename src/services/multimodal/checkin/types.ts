/**
 * Check-in Multimodal Types
 * 
 * Complete type definitions for the check-in assessment pipeline:
 * - Multimodal feature extraction (57 features)
 * - Text analysis (summary, keywords, drivers, risk)
 * - Fusion scoring
 * - Dashboard assembly
 */

import type { CapturedMedia } from '../types';

// ============================================================================
// AUDIO FEATURES (23 total)
// ============================================================================

export interface CheckinAudioFeatures {
  // Pitch/Prosody (8 features)
  meanPitch: number;              // Average F0 in Hz
  pitchRange: number;             // Max - Min pitch
  pitchVariability: number;       // Standard deviation of pitch
  pitchContourSlope: number;      // Overall pitch trend
  jitter: number | null;          // Pitch perturbation (voice quality)
  shimmer: number;                // Amplitude perturbation
  harmonicRatio: number;          // HNR - harmonic to noise ratio
  pitchDynamics: number;          // Rate of pitch change
  
  // Timing/Rhythm (7 features)
  speakingRate: number;           // Words per minute
  articulationRate: number;       // Syllables per second (excluding pauses)
  pauseFrequency: number;         // Pauses per minute
  pauseDuration: number;          // Average pause length (seconds)
  speechRatio: number;            // Speech time / total time
  filledPauseRate: number;        // "um", "uh" per minute
  silenceDuration: number;        // Total silence (seconds)
  
  // Energy/Intensity (5 features)
  voiceEnergy: number;            // Average RMS energy
  energyVariability: number;      // Standard deviation of energy
  energyContour: number;          // Energy trend over time
  dynamicRange: number;           // Max - Min energy
  stressPatterns: number;         // Syllable stress variation
  
  // Voice Quality (3 features)
  spectralCentroid: number;       // Brightness of voice
  spectralFlux: number;           // Spectral change rate
  voicedRatio: number;            // Voiced / total frames
  
  // Metadata
  quality: number;                // Overall audio quality (0-1)
  duration: number;               // Audio length in seconds
}

// ============================================================================
// VISUAL FEATURES (13 total - optimized for 0.5fps still-frame analysis)
// ============================================================================

export interface CheckinVisualFeatures {
  // Facial Expression (6 features)
  smileFrequency: number;         // % frames with smile
  smileIntensity: number;         // Average smile strength (0-1)
  eyebrowRaiseFrequency: number;  // % frames with raised eyebrows
  eyebrowFurrowFrequency: number; // % frames with furrowed brows
  mouthTension: number;           // Lip tightness (0-1)
  facialSymmetry: number;         // Left-right symmetry (0-1)
  
  // Gaze/Attention (2 features)
  eyeContact: number;             // % frames looking at camera
  gazeStability: number;          // Consistency of gaze direction
  
  // Movement/Behavior (2 features)
  headMovement: number;           // Average head motion between frames
  headStability: number;          // Steadiness of head position
  
  // Affect/Emotion (3 features)
  emotionalValence: number;       // Positive/negative emotion (-1 to 1)
  emotionalArousal: number;       // Intensity of emotion (0-1)
  emotionalStability: number;     // Consistency of emotional state
  
  // Metadata
  facePresenceQuality: number;    // % frames with clear face
  overallQuality: number;         // Overall visual quality (0-1)
  framesAnalyzed: number;         // Total frames processed
  
  // Note: Removed from v1 (require true video at >5fps):
  // - smileDuration (needs continuous tracking)
  // - blinkRate (blinks happen between 0.5fps frames)
  // - fidgetingRate (micro-movements need high fps)
  // - gestureFrequency (hand movements happen between frames)
  // - postureShift (too coarse at 0.5fps)
}

// ============================================================================
// TEXT ANALYSIS
// ============================================================================

export interface CheckinTextAnalysis {
  // User-Facing Outputs
  summary: string;                        // Natural language summary
  keywords: string[];                     // Main topics/themes
  positiveDrivers: string[];              // Things going well
  negativeDrivers: string[];              // Concerning factors
  
  // Risk Assessment
  riskLevel: 'none' | 'mild' | 'moderate' | 'high';
  riskReasons: string[];                  // Why this risk level
  
  // Linguistic Features (16 for fusion scoring)
  sentimentScore: number;                 // Overall sentiment (-1 to 1)
  sentimentIntensity: number;             // Strength of sentiment
  emotionalWords: number;                 // Count of emotion words
  negativeWordRatio: number;              // Negative / total words
  positiveWordRatio: number;              // Positive / total words
  
  cognitivComplexity: number;             // Sentence complexity
  lexicalDiversity: number;               // Unique words / total words
  verbTense: {                            // Temporal focus
    past: number;
    present: number;
    future: number;
  };
  
  firstPersonPronouns: number;            // "I", "me", "my" count
  negationFrequency: number;              // "not", "never", "no" count
  absolutismWords: number;                // "always", "never", "all"
  tentativeWords: number;                 // "maybe", "perhaps", "might"
  
  certaintyScore: number;                 // Confidence in statements
  coherenceScore: number;                 // Logical flow
  expressivityScore: number;              // Emotional expressiveness
  engagementScore: number;                // Conversational engagement
  
  // Metadata
  transcriptLength: number;               // Word count
  averageSentenceLength: number;
  quality: number;                        // Text analysis confidence (0-1)
}

// ============================================================================
// FUSION & SCORING
// ============================================================================

export interface CheckinFusionResult {
  // Final Outputs
  mindMeasureScore: number;               // 0-100 overall score
  directionOfChange: 'better' | 'same' | 'worse';  // vs baseline
  uncertainty: number;                    // Confidence interval (0-1)
  
  // Component Scores
  audioScore: number;                     // -1 to 1 (deviation from baseline)
  visualScore: number;                    // -1 to 1
  textScore: number;                      // -1 to 1
  
  // Confidence/Quality
  audioConfidence: number;                // 0-1
  visualConfidence: number;               // 0-1
  textConfidence: number;                 // 0-1
  overallConfidence: number;              // Weighted average
  
  // Insights
  contributingFactors: string[];          // Key factors in score
  improvementAreas: string[];             // Suggested focus areas
  
  // Metadata
  fusionMethod: 'quality-weighted' | 'equal' | 'text-only';
  processingTimeMs: number;
}

// ============================================================================
// DASHBOARD ASSEMBLY
// ============================================================================

export interface CheckinDashboardData {
  // Core Data
  checkInId: string;
  userId: string;
  timestamp: Date;
  
  // Scores
  mindMeasureScore: number;               // Final score (0-100)
  directionOfChange: 'better' | 'same' | 'worse';
  
  // User-Facing Text
  summary: string;
  keywords: string[];
  positiveDrivers: string[];
  negativeDrivers: string[];
  
  // Risk
  riskLevel: 'none' | 'mild' | 'moderate' | 'high';
  riskReasons: string[];
  
  // Insights
  contributingFactors: string[];
  improvementAreas: string[];
  
  // Metadata
  uncertainty: number;
  confidence: number;
  
  // Full Analysis (for database)
  fullAnalysis: {
    audioFeatures: CheckinAudioFeatures;
    visualFeatures: CheckinVisualFeatures;
    textAnalysis: CheckinTextAnalysis;
    fusionResult: CheckinFusionResult;
  };
}

// ============================================================================
// SERVICE INPUTS/OUTPUTS
// ============================================================================

export interface CheckinEnrichmentInput {
  // Media
  audioBlob: Blob;
  videoFrames: Blob[];
  transcript: string;
  duration: number;
  
  // Context
  userId: string;
  checkInId: string;
  conversationId: string;
  
  // Baseline (if exists)
  baselineData?: {
    audioBaseline: Record<string, { mu: number; sigma: number }>;
    visualBaseline: Record<string, { mu: number; sigma: number }>;
    textBaseline: Record<string, { mu: number; sigma: number }>;
  };
  
  // Metadata
  startTime: number;
  endTime: number;
}

export interface CheckinEnrichmentResult {
  success: boolean;
  dashboardData: CheckinDashboardData;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

// ============================================================================
// BASELINE DATA (for comparison)
// ============================================================================

export interface UserBaseline {
  userId: string;
  establishedAt: Date;
  
  // Feature Baselines (mean and standard deviation)
  audioBaseline: Record<string, { mu: number; sigma: number }>;
  visualBaseline: Record<string, { mu: number; sigma: number }>;
  textBaseline: Record<string, { mu: number; sigma: number }>;
  
  // Number of samples used
  sampleCount: number;
  lastUpdatedAt: Date;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class CheckinMultimodalError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public component?: 'audio' | 'visual' | 'text' | 'fusion'
  ) {
    super(message);
    this.name = 'CheckinMultimodalError';
  }
}


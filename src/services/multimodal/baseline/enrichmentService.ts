/**
 * Baseline Enrichment Service
 * 
 * Post-processes baseline assessment to add multimodal features
 * and compute hybrid 70/30 score.
 * 
 * Flow:
 * 1. Baseline completes with clinical score
 * 2. Processing screen shown
 * 3. This service enriches with audio/visual features
 * 4. Dashboard shows final hybrid score
 * 
 * Usage:
 * ```typescript
 * const service = new BaselineEnrichmentService();
 * 
 * const enrichedResult = await service.enrichBaseline({
 *   clinicalScore: 82,
 *   audioBlob: capturedAudio,
 *   videoFrames: capturedVideoFrames,
 *   duration: 120,
 *   userId: '...',
 *   fusionOutputId: '...'
 * });
 * 
 * // enrichedResult.finalScore is the 70/30 weighted score (whole number)
 * ```
 */

import { BaselineAudioExtractor } from './audioFeatures';
import { BaselineVisualExtractor } from './visualFeatures';
import { BaselineScoring } from './scoring';
import type {
  CapturedMedia,
  BaselineAudioFeatures,
  BaselineVisualFeatures,
  BaselineScoringBreakdown
} from '../types';

export interface EnrichmentInput {
  // Clinical component
  clinicalScore: number;           // 0-100 from PHQ-2/GAD-2/mood
  
  // Media to process
  audioBlob?: Blob;
  videoFrames?: Blob[];
  duration: number;                // Seconds
  
  // Database references
  userId: string;
  fusionOutputId: string;
  
  // Optional metadata
  startTime?: number;
  endTime?: number;
}

export interface EnrichmentResult {
  // Scores (all whole numbers)
  originalScore: number;           // Clinical only
  finalScore: number;              // 70% clinical + 30% multimodal (rounded)
  scoringBreakdown: BaselineScoringBreakdown;
  
  // Features
  audioFeatures: BaselineAudioFeatures | null;
  visualFeatures: BaselineVisualFeatures | null;
  
  // Metadata
  success: boolean;
  processingTimeMs: number;
  warnings: string[];
}

export class BaselineEnrichmentService {
  private audioExtractor: BaselineAudioExtractor;
  private visualExtractor: BaselineVisualExtractor;

  constructor() {
    this.audioExtractor = new BaselineAudioExtractor();
    this.visualExtractor = new BaselineVisualExtractor();
  }

  /**
   * Enrich baseline assessment with multimodal features
   * 
   * This is called during the processing screen, after the baseline
   * conversation completes but before showing the dashboard.
   */
  async enrichBaseline(input: EnrichmentInput): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log('[EnrichmentService] 🎯 Starting baseline enrichment...');
    console.log('[EnrichmentService] Clinical score:', input.clinicalScore);
    console.log('[EnrichmentService] Has audio:', !!input.audioBlob);
    console.log('[EnrichmentService] Has video:', !!input.videoFrames?.length);

    let audioFeatures: BaselineAudioFeatures | null = null;
    let visualFeatures: BaselineVisualFeatures | null = null;

    try {
      // Create captured media object
      const capturedMedia: CapturedMedia = {
        audio: input.audioBlob,
        videoFrames: input.videoFrames,
        duration: input.duration,
        startTime: input.startTime || Date.now() - (input.duration * 1000),
        endTime: input.endTime || Date.now()
      };

      // Extract audio features (if available)
      if (input.audioBlob) {
        try {
          console.log('[EnrichmentService] 🎤 Extracting audio features...');
          audioFeatures = await this.audioExtractor.extract(capturedMedia);
          console.log('[EnrichmentService] ✅ Audio features extracted');
        } catch (error) {
          console.warn('[EnrichmentService] ⚠️ Audio extraction failed:', error);
          warnings.push('Audio feature extraction failed - using clinical score only');
        }
      } else {
        warnings.push('No audio data available');
      }

      // Extract visual features (if available)
      if (input.videoFrames && input.videoFrames.length > 0) {
        try {
          console.log('[EnrichmentService] 📹 Extracting visual features...');
          visualFeatures = await this.visualExtractor.extract(capturedMedia);
          console.log('[EnrichmentService] ✅ Visual features extracted');
        } catch (error) {
          console.warn('[EnrichmentService] ⚠️ Visual extraction failed:', error);
          warnings.push('Visual feature extraction failed - using clinical score only');
        }
      } else {
        warnings.push('No video data available');
      }

      // Compute final score
      let scoringBreakdown: BaselineScoringBreakdown;
      
      if (audioFeatures || visualFeatures) {
        // Have at least one modality - compute hybrid score
        
        // If missing one modality, create placeholder with neutral values
        if (!audioFeatures) {
          audioFeatures = this.createNeutralAudioFeatures();
          warnings.push('Using neutral audio features');
        }
        
        if (!visualFeatures) {
          visualFeatures = this.createNeutralVisualFeatures();
          warnings.push('Using neutral visual features');
        }

        console.log('[EnrichmentService] 📊 Computing 70/30 weighted score...');
        scoringBreakdown = BaselineScoring.computeScore(
          input.clinicalScore,
          audioFeatures,
          visualFeatures
        );
        
        // Round to whole number
        scoringBreakdown.finalScore = Math.round(scoringBreakdown.finalScore);
        
        console.log('[EnrichmentService] ✅ Final score:', scoringBreakdown.finalScore);
      } else {
        // No multimodal data - fall back to clinical only
        console.log('[EnrichmentService] ⚠️ No multimodal data - using clinical score only');
        warnings.push('No multimodal data available - using clinical score only');
        
        scoringBreakdown = {
          clinicalScore: input.clinicalScore,
          clinicalWeight: 1.0,
          audioScore: input.clinicalScore,
          visualScore: input.clinicalScore,
          multimodalScore: input.clinicalScore,
          multimodalWeight: 0,
          finalScore: input.clinicalScore,
          confidence: 0.7 // Lower confidence without multimodal
        };
      }

      const processingTimeMs = Date.now() - startTime;
      console.log('[EnrichmentService] ✅ Enrichment complete in', processingTimeMs, 'ms');

      return {
        originalScore: input.clinicalScore,
        finalScore: scoringBreakdown.finalScore,
        scoringBreakdown,
        audioFeatures,
        visualFeatures,
        success: true,
        processingTimeMs,
        warnings
      };

    } catch (error) {
      console.error('[EnrichmentService] ❌ Enrichment failed:', error);
      
      // Fall back to clinical-only score
      const processingTimeMs = Date.now() - startTime;
      
      return {
        originalScore: input.clinicalScore,
        finalScore: input.clinicalScore,
        scoringBreakdown: {
          clinicalScore: input.clinicalScore,
          clinicalWeight: 1.0,
          audioScore: input.clinicalScore,
          visualScore: input.clinicalScore,
          multimodalScore: input.clinicalScore,
          multimodalWeight: 0,
          finalScore: input.clinicalScore,
          confidence: 0.5 // Low confidence due to failure
        },
        audioFeatures: null,
        visualFeatures: null,
        success: false,
        processingTimeMs,
        warnings: [
          'Multimodal enrichment failed completely',
          error instanceof Error ? error.message : 'Unknown error'
        ]
      };
    }
  }

  /**
   * Create neutral audio features for fallback
   */
  private createNeutralAudioFeatures(): BaselineAudioFeatures {
    return {
      meanPitch: 150,
      pitchVariability: 25,
      speakingRate: 140,
      pauseFrequency: 5,
      pauseDuration: 0.5,
      voiceEnergy: 0.6,
      jitter: 0.3,
      shimmer: 0.3,
      harmonicRatio: 0.7,
      quality: 0.5
    };
  }

  /**
   * Create neutral visual features for fallback
   */
  private createNeutralVisualFeatures(): BaselineVisualFeatures {
    return {
      smileFrequency: 0.3,
      smileIntensity: 0.4,
      eyeContact: 0.6,
      eyebrowPosition: 0.4,
      facialTension: 0.3,
      blinkRate: 17,
      headMovement: 0.4,
      affect: 0.1,
      facePresenceQuality: 0.8,
      overallQuality: 0.5
    };
  }
}

// Export types
export type {
  BaselineAudioFeatures,
  BaselineVisualFeatures,
  BaselineScoringBreakdown
};


/**
 * Baseline Multimodal Assessment Module
 * 
 * Public API for baseline multimodal feature extraction and scoring.
 * 
 * Usage:
 * ```typescript
 * import { BaselineMultimodal } from '@/services/multimodal/baseline';
 * 
 * const baseline = new BaselineMultimodal();
 * 
 * // Start capturing during ElevenLabs conversation
 * await baseline.startCapture();
 * 
 * // ... conversation happens ...
 * 
 * // Stop and process
 * const result = await baseline.stopAndProcess(clinicalScore);
 * 
 * // Result contains:
 * // - audioFeatures
 * // - visualFeatures
 * // - scoringBreakdown (70% clinical + 30% multimodal)
 * ```
 */

import { MediaCapture } from './mediaCapture';
import { BaselineAudioExtractor } from './audioFeatures';
import { BaselineVisualExtractor } from './visualFeatures';
import { BaselineScoring } from './scoring';
import type {
  MediaCaptureConfig,
  CapturedMedia,
  BaselineAudioFeatures,
  BaselineVisualFeatures,
  BaselineScoringBreakdown
} from '../types';
import { MultimodalError } from '../types';

export interface BaselineResult {
  audioFeatures: BaselineAudioFeatures;
  visualFeatures: BaselineVisualFeatures;
  scoringBreakdown: BaselineScoringBreakdown;
  capturedMedia: CapturedMedia;
}

export class BaselineMultimodal {
  private mediaCapture: MediaCapture | null = null;
  private audioExtractor: BaselineAudioExtractor;
  private visualExtractor: BaselineVisualExtractor;

  constructor() {
    this.audioExtractor = new BaselineAudioExtractor();
    this.visualExtractor = new BaselineVisualExtractor();
  }

  /**
   * Start capturing audio and video
   * 
   * @param config - Capture configuration (optional)
   */
  async startCapture(config?: Partial<MediaCaptureConfig>): Promise<void> {
    console.log('[BaselineMultimodal] Starting capture...');

    const fullConfig: MediaCaptureConfig = {
      captureAudio: true,
      captureVideo: true,
      videoFrameRate: 1, // 1 frame per second
      ...config
    };

    this.mediaCapture = new MediaCapture(fullConfig);
    await this.mediaCapture.start();

    console.log('[BaselineMultimodal] ✅ Capture started');
  }

  /**
   * Stop capturing, extract features, and compute final score
   * 
   * @param clinicalScore - Score from PHQ-2/GAD-2/mood (0-100)
   * @returns Complete baseline result with features and scoring
   */
  async stopAndProcess(clinicalScore: number): Promise<BaselineResult> {
    console.log('[BaselineMultimodal] Stopping capture and processing...');

    if (!this.mediaCapture) {
      throw new MultimodalError(
        'Capture not started',
        'CAPTURE_NOT_STARTED',
        false
      );
    }

    // Stop capture and get media
    const capturedMedia = await this.mediaCapture.stop();
    console.log('[BaselineMultimodal] ✅ Media captured');

    // Extract audio features
    console.log('[BaselineMultimodal] Extracting audio features...');
    const audioFeatures = await this.audioExtractor.extract(capturedMedia);
    console.log('[BaselineMultimodal] ✅ Audio features extracted');

    // Extract visual features
    console.log('[BaselineMultimodal] Extracting visual features...');
    const visualFeatures = await this.visualExtractor.extract(capturedMedia);
    console.log('[BaselineMultimodal] ✅ Visual features extracted');

    // Compute final score (70% clinical + 30% multimodal)
    console.log('[BaselineMultimodal] Computing final score...');
    const scoringBreakdown = BaselineScoring.computeScore(
      clinicalScore,
      audioFeatures,
      visualFeatures
    );
    console.log('[BaselineMultimodal] ✅ Final score:', scoringBreakdown.finalScore);

    // Cleanup
    this.mediaCapture = null;

    return {
      audioFeatures,
      visualFeatures,
      scoringBreakdown,
      capturedMedia
    };
  }

  /**
   * Cancel capture without processing
   */
  cancel(): void {
    console.log('[BaselineMultimodal] Cancelling capture...');
    
    if (this.mediaCapture) {
      this.mediaCapture.cancel();
      this.mediaCapture = null;
    }
  }

  /**
   * Check if capture is currently active
   */
  isCapturing(): boolean {
    return this.mediaCapture !== null;
  }
}

// Export types
export type {
  BaselineAudioFeatures,
  BaselineVisualFeatures,
  BaselineScoringBreakdown,
  MediaCaptureConfig
};

// Export error handling
export { MultimodalError, MultimodalErrorCode } from '../types';


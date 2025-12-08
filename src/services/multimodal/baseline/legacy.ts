/**
 * Baseline Multimodal - Legacy Direct Capture API
 * 
 * Original implementation that integrates capture directly.
 * Kept for backward compatibility and testing.
 * 
 * For new code, use BaselineEnrichmentService instead.
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
   */
  async startCapture(config?: Partial<MediaCaptureConfig>): Promise<void> {
    console.log('[BaselineMultimodal] Starting capture...');

    const fullConfig: MediaCaptureConfig = {
      captureAudio: true,
      captureVideo: true,
      videoFrameRate: 1,
      ...config
    };

    this.mediaCapture = new MediaCapture(fullConfig);
    await this.mediaCapture.start();

    console.log('[BaselineMultimodal] ✅ Capture started');
  }

  /**
   * Stop capturing, extract features, and compute final score
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

    const capturedMedia = await this.mediaCapture.stop();
    console.log('[BaselineMultimodal] ✅ Media captured');

    const audioFeatures = await this.audioExtractor.extract(capturedMedia);
    console.log('[BaselineMultimodal] ✅ Audio features extracted');

    const visualFeatures = await this.visualExtractor.extract(capturedMedia);
    console.log('[BaselineMultimodal] ✅ Visual features extracted');

    const scoringBreakdown = BaselineScoring.computeScore(
      clinicalScore,
      audioFeatures,
      visualFeatures
    );
    console.log('[BaselineMultimodal] ✅ Final score:', scoringBreakdown.finalScore);

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


/**
 * Baseline Multimodal Assessment Module
 * 
 * Public API for baseline multimodal feature extraction and scoring.
 * 
 * PRIMARY API (Recommended):
 * ```typescript
 * import { BaselineEnrichmentService } from '@/services/multimodal/baseline';
 * 
 * const service = new BaselineEnrichmentService();
 * const result = await service.enrichBaseline({
 *   clinicalScore: 82,
 *   audioBlob: capturedAudio,
 *   videoFrames: capturedFrames,
 *   duration: 120,
 *   userId: '...',
 *   fusionOutputId: '...'
 * });
 * 
 * // result.finalScore = 79 (whole number, 70/30 weighted)
 * ```
 * 
 * LEGACY API (for direct capture):
 * ```typescript
 * import { BaselineMultimodal } from '@/services/multimodal/baseline';
 * 
 * const baseline = new BaselineMultimodal();
 * await baseline.startCapture();
 * // ... conversation happens ...
 * const result = await baseline.stopAndProcess(clinicalScore);
 * ```
 */

// Export enrichment service (primary API)
export { BaselineEnrichmentService } from './enrichmentService';
export type { EnrichmentInput, EnrichmentResult } from './enrichmentService';

// Export legacy direct capture API
export { BaselineMultimodal } from './legacy';
export type { BaselineResult } from './legacy';

// Export types
export type {
  BaselineAudioFeatures,
  BaselineVisualFeatures,
  BaselineScoringBreakdown,
  MediaCaptureConfig
};

// Export error handling
export { MultimodalError, MultimodalErrorCode } from '../types';


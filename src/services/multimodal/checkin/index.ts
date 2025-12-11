/**
 * Check-in Multimodal Module - Public API
 * 
 * This is the main entry point for check-in multimodal analysis.
 * 
 * Usage:
 * ```typescript
 * import { enrichCheckIn } from '@/services/multimodal/checkin';
 * 
 * const result = await enrichCheckIn({
 *   audioBlob,
 *   videoFrames,
 *   transcript,
 *   duration,
 *   userId,
 *   checkInId,
 *   conversationId,
 *   baselineData, // optional
 *   startTime,
 *   endTime
 * });
 * 
 * // result.dashboardData contains everything needed for UI
 * const { mindMeasureScore, summary, keywords, riskLevel } = result.dashboardData;
 * ```
 */

// Main service
export { CheckinEnrichmentService, enrichCheckIn } from './enrichmentService';

// Extractors (for testing/debugging)
export { CheckinAudioExtractor } from './extractors/audioFeatures';
export { CheckinVisualExtractor } from './extractors/visualFeatures';

// Analyzers (for testing/debugging)
export { CheckinTextAnalyzer } from './analyzers/textAnalyzer';

// Fusion & Assembly (for testing/debugging)
export { CheckinFusionEngine } from './fusion/fusionEngine';
export { DashboardAssembler } from './assembly/dashboardAssembler';

// Types
export type {
  CheckinAudioFeatures,
  CheckinVisualFeatures,
  CheckinTextAnalysis,
  CheckinFusionResult,
  CheckinDashboardData,
  CheckinEnrichmentInput,
  CheckinEnrichmentResult,
  UserBaseline
} from './types';




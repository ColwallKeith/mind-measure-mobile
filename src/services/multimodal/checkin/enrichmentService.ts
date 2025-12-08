/**
 * Check-in Multimodal Enrichment Service
 * 
 * Main orchestrator for check-in multimodal processing.
 * Coordinates all extractors, analyzers, fusion, and assembly.
 */

import type { CapturedMedia } from '../types';
import type {
  CheckinEnrichmentInput,
  CheckinEnrichmentResult
} from './types';

import { CheckinAudioExtractor } from './extractors/audioFeatures';
import { CheckinVisualExtractor } from './extractors/visualFeatures';
import { CheckinTextAnalyzer } from './analyzers/textAnalyzer';
import { CheckinFusionEngine } from './fusion/fusionEngine';
import { DashboardAssembler } from './assembly/dashboardAssembler';

export class CheckinEnrichmentService {
  private audioExtractor: CheckinAudioExtractor;
  private visualExtractor: CheckinVisualExtractor;
  private textAnalyzer: CheckinTextAnalyzer;
  private fusionEngine: CheckinFusionEngine;
  private assembler: DashboardAssembler;
  
  constructor() {
    this.audioExtractor = new CheckinAudioExtractor();
    this.visualExtractor = new CheckinVisualExtractor();
    this.textAnalyzer = new CheckinTextAnalyzer();
    this.fusionEngine = new CheckinFusionEngine();
    this.assembler = new DashboardAssembler();
  }
  
  /**
   * Enrich check-in with full multimodal analysis
   */
  async enrichCheckIn(input: CheckinEnrichmentInput): Promise<CheckinEnrichmentResult> {
    console.log('[CheckinEnrichment] 🎯 Starting check-in enrichment...');
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Create captured media object
      const capturedMedia: CapturedMedia = {
        audio: input.audioBlob,
        videoFrames: input.videoFrames,
        duration: input.duration,
        startTime: input.startTime,
        endTime: input.endTime
      };
      
      // Extract features in parallel
      console.log('[CheckinEnrichment] 🔄 Running multimodal + text analysis in parallel...');
      
      const [
        audioResult,
        visualResult,
        textResult
      ] = await Promise.allSettled([
        this.audioExtractor.extract(capturedMedia),
        this.visualExtractor.extract(capturedMedia),
        this.textAnalyzer.analyze(input.transcript)
      ]);
      
      // Handle results
      const audioFeatures = audioResult.status === 'fulfilled' ? audioResult.value : null;
      const visualFeatures = visualResult.status === 'fulfilled' ? visualResult.value : null;
      const textAnalysis = textResult.status === 'fulfilled' ? textResult.value : null;
      
      // Collect warnings for failed extractions
      if (audioResult.status === 'rejected') {
        warnings.push('Audio feature extraction failed');
        console.warn('[CheckinEnrichment] ⚠️ Audio extraction failed:', audioResult.reason);
      }
      
      if (visualResult.status === 'rejected') {
        warnings.push('Visual feature extraction failed');
        console.warn('[CheckinEnrichment] ⚠️ Visual extraction failed:', visualResult.reason);
      }
      
      if (textResult.status === 'rejected') {
        errors.push('Text analysis failed');
        console.error('[CheckinEnrichment] ❌ Text analysis failed:', textResult.reason);
        // Text is critical - can't continue without it
        throw new Error('Text analysis is required but failed');
      }
      
      // Fusion (requires at least text analysis)
      console.log('[CheckinEnrichment] 🧠 Running fusion engine...');
      const fusionResult = await this.fusionEngine.fuse({
        audioFeatures,
        visualFeatures,
        textAnalysis: textAnalysis!,
        baseline: input.baselineData
      });
      
      // Assemble dashboard data
      console.log('[CheckinEnrichment] 📦 Assembling dashboard data...');
      const dashboardData = this.assembler.assemble(
        fusionResult,
        textAnalysis!,
        audioFeatures,
        visualFeatures,
        input.checkInId,
        input.userId
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`[CheckinEnrichment] ✅ Enrichment complete in ${processingTime}ms`);
      console.log(`[CheckinEnrichment] Score: ${dashboardData.mindMeasureScore}, Direction: ${dashboardData.directionOfChange}`);
      
      return {
        success: true,
        dashboardData,
        warnings,
        errors,
        processingTimeMs: processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[CheckinEnrichment] ❌ Enrichment failed:', error);
      
      errors.push(error instanceof Error ? error.message : String(error));
      
      throw error; // Let caller handle the error
    }
  }
}

// Export convenience function
export async function enrichCheckIn(
  input: CheckinEnrichmentInput
): Promise<CheckinEnrichmentResult> {
  const service = new CheckinEnrichmentService();
  return service.enrichCheckIn(input);
}


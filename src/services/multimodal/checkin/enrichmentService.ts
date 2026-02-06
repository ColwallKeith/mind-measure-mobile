/**
 * Check-in Enrichment Service - checkin23_bounded mode
 * 
 * Bounded sampling with hard timeouts:
 * - Audio: 3 × 10s windows (start, middle, end) = 30s max, timeout ≤6s
 * - Visual: max 20 frames evenly spaced, timeout ≤4s
 * - Weighting: 70% text + 15% audio + 15% visual (auto-renormalize on dropout)
 * - No GPT/Lambda/Insight during check-in - only returns: final_score, uncertainty, themes, summary, drivers
 */

import { analyzeTextWithBedrock } from './analyzers/bedrockTextAnalyzer';
import { CheckinAudioExtractor } from './extractors/audioFeatures';
import { CheckinVisualExtractor } from './extractors/visualFeatures';
import { CheckinFusionEngine } from './fusion/fusionEngine';
import type { TextAnalysisContext } from './analyzers/bedrockTextAnalyzer';
import type { CapturedMedia } from '../types';
import type { CheckinTextAnalysis } from './types';

export interface CheckinEnrichmentInput {
  userId: string;
  transcript: string;
  audioBlob?: Blob;
  videoFrames?: ImageData[];
  duration: number;
  sessionId?: string;
  // Context from previous check-ins
  previousThemes?: string[];
  previousScore?: number;
  previousDirection?: string;
  studentFirstName?: string;
}

export interface CheckinEnrichmentResult {
  // Final scores
  mind_measure_score: number;
  finalScore: number;
  
  // Explicit mood rating from user (1-10 scale, extracted from conversation)
  mood_score: number;
  
  // Uncertainty from text analysis (0-1, lower is more confident)
  uncertainty: number;
  
  // Text analysis
  themes: string[];
  keywords: string[];
  risk_level: string;
  direction_of_change: string;
  conversation_summary: string;
  drivers_positive: string[];
  drivers_negative: string[];
  
  // Multimodal features
  audio_features?: any;
  visual_features?: any;
  
  // Modality breakdown
  modalities: {
    text: {
      score: number;
      confidence: number;
    };
    audio?: {
      score: number;
      confidence: number;
    };
    visual?: {
      score: number;
      confidence: number;
    };
  };
  
  // Metadata
  assessment_type: string;
  session_id?: string;
  transcript_length: number;
  duration: number;
  processing_time_ms: number;
  warnings: string[];
}

// Enrichment mode flag
export const ENRICHMENT_MODE = 'checkin23_bounded';

export class CheckinEnrichmentService {
  private audioExtractor: CheckinAudioExtractor;
  private visualExtractor: CheckinVisualExtractor;
  private fusionEngine: CheckinFusionEngine;
  
  // Hard timeouts for checkin23_bounded mode
  private static readonly AUDIO_TIMEOUT_MS = 6000;  // 6 seconds max
  private static readonly VISUAL_TIMEOUT_MS = 4000; // 4 seconds max
  
  constructor() {
    this.audioExtractor = new CheckinAudioExtractor();
    this.visualExtractor = new CheckinVisualExtractor();
    this.fusionEngine = new CheckinFusionEngine();
  }
  
  async enrichCheckIn(input: CheckinEnrichmentInput): Promise<CheckinEnrichmentResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // 1. Text Analysis via Bedrock
      const textContext: TextAnalysisContext = {
        checkinId: input.sessionId || 'unknown',
        studentFirstName: input.studentFirstName,
        previousTextThemes: input.previousThemes,
        previousMindMeasureScore: input.previousScore,
        previousDirectionOfChange: input.previousDirection as any
      };
      
      const textResult = await analyzeTextWithBedrock(input.transcript, textContext);
      
      // 2. Audio/Visual Feature Extraction (checkin23_bounded mode with hard timeouts)
      let audioScore: number | null = null;
      let visualScore: number | null = null;
      let audioConfidence = 0;
      let visualConfidence = 0;
      let audioFeatures: any = null;
      let visualFeatures: any = null;
      let audioSecondsProcessed = 0;
      let framesAnalyzed = 0;
      let modalitiesUsed: string[] = ['text'];
      
      // Create captured media object
      const capturedMedia: CapturedMedia = {
        audio: input.audioBlob,
        videoFrames: input.videoFrames as any,
        duration: input.duration,
        startTime: Date.now() - (input.duration * 1000),
        endTime: Date.now()
      };
      
      // Extract audio features with hard 6s timeout
      if (input.audioBlob) {
        try {
          const audioStartTime = Date.now();
          audioFeatures = await Promise.race([
            this.audioExtractor.extract(capturedMedia),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), CheckinEnrichmentService.AUDIO_TIMEOUT_MS)
            )
          ]) as any;
          
          if (audioFeatures) {
            audioScore = this.fusionEngine['normalizeAudioFeatures'](audioFeatures, undefined);
            audioConfidence = audioFeatures.quality || 0.6;
            audioSecondsProcessed = 30; // 3 × 10s windows
            modalitiesUsed.push('audio');
          }
        } catch {
          // Graceful degradation - no error logging
        }
      }
      
      // Extract visual features with hard 4s timeout
      if (input.videoFrames && input.videoFrames.length > 0) {
        try {
          const visualStartTime = Date.now();
          visualFeatures = await Promise.race([
            this.visualExtractor.extract(capturedMedia),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), CheckinEnrichmentService.VISUAL_TIMEOUT_MS)
            )
          ]) as any;
          
          if (visualFeatures) {
            visualScore = this.fusionEngine['normalizeVisualFeatures'](visualFeatures, undefined);
            visualConfidence = visualFeatures.overallQuality || 0.6;
            framesAnalyzed = Math.min(input.videoFrames.length, 20);
            modalitiesUsed.push('visual');
          }
        } catch {
          // Graceful degradation - no error logging
        }
      }
      
      // 3. Dynamic Fusion: 70/15/15 with auto-renormalization
      const hasAudio = audioScore !== null && audioConfidence > 0;
      const hasVisual = visualScore !== null && visualConfidence > 0;
      
      let rawScore: number;
      if (hasAudio && hasVisual) {
        // All three: 70% text + 15% audio + 15% visual
        rawScore = (textResult.text_score * 0.70) + (audioScore! * 0.15) + (visualScore! * 0.15);
      } else if (hasAudio && !hasVisual) {
        // Text + audio: renormalize to 80% text + 20% audio
        rawScore = (textResult.text_score * 0.80) + (audioScore! * 0.20);
      } else if (!hasAudio && hasVisual) {
        // Text + visual: renormalize to 80% text + 20% visual
        rawScore = (textResult.text_score * 0.80) + (visualScore! * 0.20);
      } else {
        // Text only: 100% text
        rawScore = textResult.text_score;
      }
      
      const finalScore = Math.round(rawScore);
      
      // 4. Minimal logging: timings and modalities
      const processingTime = Date.now() - startTime;
      
      // 5. Assemble result
      
      const result: CheckinEnrichmentResult = {
        mind_measure_score: finalScore,
        finalScore: finalScore,
        
        // Explicit mood rating from user (1-10 scale, extracted from conversation)
        mood_score: textResult.mood_score,
        
        // Pass through Bedrock uncertainty (NOT overwritten with 0.5)
        uncertainty: textResult.uncertainty,
        
        // Text analysis
        themes: textResult.themes,
        keywords: textResult.keywords,
        risk_level: textResult.risk_level,
        direction_of_change: textResult.direction_of_change,
        conversation_summary: textResult.conversation_summary,
        drivers_positive: textResult.drivers_positive,
        drivers_negative: textResult.drivers_negative,
        
        // Multimodal features (actual extracted features, not from fake clinical score)
        audio_features: audioFeatures,
        visual_features: visualFeatures,
        
        // Modality breakdown
        modalities: {
          text: {
            score: textResult.text_score,
            confidence: 1 - textResult.uncertainty
          },
          audio: hasAudio ? {
            score: audioScore!,
            confidence: audioConfidence
          } : { score: 50, confidence: 0 },
          visual: hasVisual ? {
            score: visualScore!,
            confidence: visualConfidence
          } : { score: 50, confidence: 0 }
        },
        
        // Metadata
        assessment_type: 'checkin',
        session_id: input.sessionId,
        transcript_length: input.transcript.length,
        duration: input.duration,
        processing_time_ms: processingTime,
        warnings
      };
      
      return result;
      
    } catch (error: any) {
      console.error('[CheckinEnrichment] ❌ Enrichment failed:', error);
      throw error;
    }
  }
}

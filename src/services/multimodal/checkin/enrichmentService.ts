/**
 * Check-in Enrichment Service - V2 Calibration
 * 
 * Scoring weights (text-heavy, with sanity floor):
 * - If all modalities work: 70% text + 15% audio + 15% visual
 * - If audio fails: 80% text + 20% visual
 * - If visual fails: 80% text + 20% audio  
 * - If both fail: 100% text
 * 
 * Sanity Floor:
 * - If text_score >= 75 AND risk_level = 'none' AND quality >= 0.8
 * - Floor final score at 60 (prevents audio/visual dragging down obviously positive check-ins)
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

export class CheckinEnrichmentService {
  private audioExtractor: CheckinAudioExtractor;
  private visualExtractor: CheckinVisualExtractor;
  private fusionEngine: CheckinFusionEngine;
  
  // Timeout budget: 30 seconds total for audio+visual extraction
  private static readonly EXTRACTION_TIMEOUT_MS = 30000;
  
  constructor() {
    this.audioExtractor = new CheckinAudioExtractor();
    this.visualExtractor = new CheckinVisualExtractor();
    this.fusionEngine = new CheckinFusionEngine();
  }
  
  async enrichCheckIn(input: CheckinEnrichmentInput): Promise<CheckinEnrichmentResult> {
    console.log('[CheckinEnrichment] 🎯 Starting check-in enrichment (Bedrock + Baseline)...');
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // 1. Text Analysis via Bedrock (50% weight)
      console.log('[CheckinEnrichment] 📝 Running Bedrock text analysis...');
      const textContext: TextAnalysisContext = {
        checkinId: input.sessionId || 'unknown',
        studentFirstName: input.studentFirstName,
        previousTextThemes: input.previousThemes,
        previousMindMeasureScore: input.previousScore,
        previousDirectionOfChange: input.previousDirection as any
      };
      
      const textResult = await analyzeTextWithBedrock(input.transcript, textContext);
      console.log('[CheckinEnrichment] ✅ Text analysis complete:', {
        score: textResult.text_score,
        uncertainty: textResult.uncertainty,
        themes: textResult.themes
      });
      
      // 2. Audio/Visual Feature Extraction (checkin-23 mode with sampling)
      console.log('[CheckinEnrichment] 🎙️📹 Extracting audio and visual features (checkin-23 mode)...');
      let audioScore: number | null = null;
      let visualScore: number | null = null;
      let audioConfidence = 0;
      let visualConfidence = 0;
      let audioFeatures: any = null;
      let visualFeatures: any = null;
      let audioSecondsProcessed = 0;
      let framesAnalyzed = 0;
      let extractionMode: 'checkin23' | 'text-only' | 'baseline10' = 'checkin23';
      
      // Timeout budget: if extraction exceeds 30s, fall back to text-only
      const extractionStartTime = Date.now();
      const extractionTimeout = setTimeout(() => {
        console.warn('[CheckinEnrichment] ⏱️ Extraction timeout - falling back to text-only');
        extractionMode = 'text-only';
      }, CheckinEnrichmentService.EXTRACTION_TIMEOUT_MS);
      
      try {
        // Create captured media object
        const capturedMedia: CapturedMedia = {
          audio: input.audioBlob,
          videoFrames: input.videoFrames as any,
          duration: input.duration,
          startTime: Date.now() - (input.duration * 1000),
          endTime: Date.now()
        };
        
        // Extract audio features (with timeout protection)
        if (input.audioBlob && extractionMode !== 'text-only') {
          try {
            const audioStartTime = Date.now();
            audioFeatures = await Promise.race([
              this.audioExtractor.extract(capturedMedia),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Audio extraction timeout')), 15000)
              )
            ]) as any;
            
            // Audio features extracted - score will be computed by fusion engine
            if (audioFeatures) {
              audioConfidence = audioFeatures.quality || 0.6;
              audioSecondsProcessed = Math.min(input.duration, 30); // Max 30s processed
              console.log('[CheckinEnrichment] ✅ Audio features extracted');
            }
          } catch (audioError: any) {
            console.warn('[CheckinEnrichment] ⚠️ Audio extraction failed:', audioError?.message);
            warnings.push('Audio features not available');
          }
        }
        
        // Extract visual features (with timeout protection)
        if (input.videoFrames && input.videoFrames.length > 0 && extractionMode !== 'text-only') {
          try {
            const visualStartTime = Date.now();
            visualFeatures = await Promise.race([
              this.visualExtractor.extract(capturedMedia),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Visual extraction timeout')), 15000)
              )
            ]) as any;
            
            // Visual features extracted - score will be computed by fusion engine
            if (visualFeatures) {
              visualConfidence = visualFeatures.overallQuality || 0.6;
              framesAnalyzed = Math.min(input.videoFrames.length, 25); // Max 25 frames
              console.log('[CheckinEnrichment] ✅ Visual features extracted');
            }
          } catch (visualError: any) {
            console.warn('[CheckinEnrichment] ⚠️ Visual extraction failed:', visualError?.message);
            warnings.push('Visual features not available');
          }
        }
        
        clearTimeout(extractionTimeout);
        
        // Check if we hit timeout - fall back to text-only
        const extractionTime = Date.now() - extractionStartTime;
        if (extractionTime > CheckinEnrichmentService.EXTRACTION_TIMEOUT_MS) {
          extractionMode = 'text-only';
          warnings.push('Extraction timeout - using text-only mode');
        } else if (!audioFeatures && !visualFeatures) {
          extractionMode = 'text-only';
        }
        
      } catch (multimodalError: any) {
        clearTimeout(extractionTimeout);
        console.warn('[CheckinEnrichment] ⚠️ Multimodal extraction failed:', multimodalError?.message);
        extractionMode = 'text-only';
        warnings.push('Multimodal features unavailable');
      }
      
      // 3. Compute scores from features using fusion engine normalization
      console.log('[CheckinEnrichment] 🧠 Computing scores from features (checkin-23 mode)...');
      
      // Compute audio score from features using fusion engine normalization
      if (audioFeatures) {
        try {
          audioScore = this.fusionEngine['normalizeAudioFeatures'](audioFeatures, undefined);
        } catch {
          // Fallback: simple scoring from features
          audioScore = 50 + (audioFeatures.meanPitch > 150 ? 10 : -10) + 
                      (audioFeatures.speakingRate > 100 && audioFeatures.speakingRate < 150 ? 10 : 0);
          audioScore = Math.max(0, Math.min(100, audioScore));
        }
      }
      
      // Compute visual score from features using fusion engine normalization
      if (visualFeatures) {
        try {
          visualScore = this.fusionEngine['normalizeVisualFeatures'](visualFeatures, undefined);
        } catch {
          // Fallback: simple scoring from features
          visualScore = 50 + (visualFeatures.smileFrequency * 20) + 
                       (visualFeatures.eyeContact * 10) + 
                       (visualFeatures.emotionalValence * 20);
          visualScore = Math.max(0, Math.min(100, visualScore));
        }
      }
      
      // 4. Dynamic Fusion: Weight based on what succeeded (V2: 70/15/15)
      console.log('[CheckinEnrichment] 🧠 Fusing scores with V2 weighting...');
      
      let rawScore: number;
      const hasAudio = audioScore !== null && audioConfidence > 0;
      const hasVisual = visualScore !== null && visualConfidence > 0;
      
      if (hasAudio && hasVisual) {
        // All three modalities: 70% text + 15% audio + 15% visual
        console.log('[CheckinEnrichment] Using 70% text + 15% audio + 15% visual');
        rawScore = (textResult.text_score * 0.70) + 
                   (audioScore! * 0.15) + 
                   (visualScore! * 0.15);
      } else if (hasAudio && !hasVisual) {
        // Text + audio only: 80% text + 20% audio
        console.log('[CheckinEnrichment] Using 80% text + 20% audio (no visual)');
        rawScore = (textResult.text_score * 0.80) + 
                   (audioScore! * 0.20);
      } else if (!hasAudio && hasVisual) {
        // Text + visual only: 80% text + 20% visual
        console.log('[CheckinEnrichment] Using 80% text + 20% visual (no audio)');
        rawScore = (textResult.text_score * 0.80) + 
                   (visualScore! * 0.20);
      } else {
        // Text only: 100% text
        console.log('[CheckinEnrichment] Using 100% text (no audio/visual)');
        rawScore = textResult.text_score;
        warnings.push('Using text-only score - no multimodal data available');
      }
      
      // 5. Sanity Floor: Prevent obviously positive check-ins from scoring too low
      const avgQuality = ((hasAudio ? audioConfidence : 0) + (hasVisual ? visualConfidence : 0)) / 
                         ((hasAudio ? 1 : 0) + (hasVisual ? 1 : 0) || 1);
      const shouldApplyFloor = textResult.text_score >= 75 && 
                               textResult.risk_level === 'none' && 
                               avgQuality >= 0.6;
      
      let finalScore = Math.round(rawScore);
      if (shouldApplyFloor && finalScore < 60) {
        console.log('[CheckinEnrichment] 🛡️ Applying sanity floor: raw', finalScore, '→ floored to 60');
        finalScore = 60;
        warnings.push('Sanity floor applied - text analysis indicates positive state');
      }
      
      console.log('[CheckinEnrichment] 📊 Final score breakdown:', {
        text: textResult.text_score,
        audio: audioScore ?? 'N/A',
        visual: visualScore ?? 'N/A',
        hasAudio,
        hasVisual,
        rawScore: Math.round(rawScore),
        sanityFloor: shouldApplyFloor ? 60 : 'N/A',
        final: finalScore
      });
      
      // 4. Log concise enrichment summary
      const processingTime = Date.now() - startTime;
      console.log(`[CheckinEnrichment] 📊 Enrichment: mode=${extractionMode}, audio=${audioSecondsProcessed.toFixed(1)}s, frames=${framesAnalyzed}, time=${processingTime}ms`);
      
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
      
      console.log('[CheckinEnrichment] ✅ Enrichment complete in', processingTime, 'ms');
      return result;
      
    } catch (error: any) {
      console.error('[CheckinEnrichment] ❌ Enrichment failed:', error);
      throw error;
    }
  }
}

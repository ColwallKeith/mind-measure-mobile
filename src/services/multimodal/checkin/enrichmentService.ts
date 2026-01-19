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
import { BaselineEnrichmentService } from '../baseline/enrichmentService';
import type { TextAnalysisContext } from './analyzers/bedrockTextAnalyzer';

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
  private baselineEnrichment: BaselineEnrichmentService;
  
  constructor() {
    this.baselineEnrichment = new BaselineEnrichmentService();
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
      
      // 2. Direct Audio/Visual Feature Extraction (no fake clinical score)
      console.log('[CheckinEnrichment] 🎙️📹 Extracting audio and visual features...');
      let audioScore: number | null = null;
      let visualScore: number | null = null;
      let audioConfidence = 0;
      let visualConfidence = 0;
      let audioFeatures: any = null;
      let visualFeatures: any = null;
      
      try {
        // Use baseline enrichment for feature extraction
        // We'll compute our own score without relying on its fake clinical placeholder
        const multimodalResult = await this.baselineEnrichment.enrichBaseline({
          userId: input.userId,
          fusionOutputId: input.sessionId || 'checkin-temp', // Not used for check-ins
          clinicalScore: 50, // Still needed by baseline service, but we use raw scores
          audioBlob: input.audioBlob,
          videoFrames: input.videoFrames as any, // Type coercion for now
          duration: input.duration
        });
        
        // Extract the REAL audio/visual scores from scoringBreakdown
        const breakdown = multimodalResult.scoringBreakdown;
        
        if (multimodalResult.audioFeatures && breakdown.audioScore !== 50) {
          audioScore = breakdown.audioScore;
          audioConfidence = multimodalResult.audioFeatures.quality || 0.6;
          audioFeatures = multimodalResult.audioFeatures;
          console.log('[CheckinEnrichment] ✅ Audio features extracted, score:', audioScore);
        } else {
          console.log('[CheckinEnrichment] ⚠️ Audio features not available');
          warnings.push('Audio features not available');
        }
        
        if (multimodalResult.visualFeatures && breakdown.visualScore !== 50) {
          visualScore = breakdown.visualScore;
          visualConfidence = multimodalResult.visualFeatures.overallQuality || 0.6;
          visualFeatures = multimodalResult.visualFeatures;
          console.log('[CheckinEnrichment] ✅ Visual features extracted, score:', visualScore);
        } else {
          console.log('[CheckinEnrichment] ⚠️ Visual features not available');
          warnings.push('Visual features not available');
        }
        
      } catch (multimodalError: any) {
        console.warn('[CheckinEnrichment] ⚠️ Multimodal extraction failed:', multimodalError?.message);
        warnings.push('Multimodal features unavailable');
      }
      
      // 3. Dynamic Fusion: Weight based on what succeeded
      // V2: Text-heavy weighting (70/15/15) with sanity floor
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
      
      // 4. Sanity Floor: Prevent obviously positive check-ins from scoring too low
      // If text is high (>= 75), risk is none, and quality is good (>= 0.8), floor at 60
      const avgQuality = ((hasAudio ? audioConfidence : 0) + (hasVisual ? visualConfidence : 0)) / 
                         ((hasAudio ? 1 : 0) + (hasVisual ? 1 : 0) || 1);
      const shouldApplyFloor = textResult.text_score >= 75 && 
                               textResult.risk_level === 'none' && 
                               avgQuality >= 0.6; // Lowered from 0.8 since audio quality is typically 0.6
      
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
      
      // 4. Assemble result
      const processingTime = Date.now() - startTime;
      
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

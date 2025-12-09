/**
 * Simplified Check-in Enrichment Service
 * 
 * Uses:
 * - 50% Bedrock text analysis
 * - 50% Baseline multimodal (audio + visual from baseline enrichment)
 */

import { BedrockTextAnalyzer } from './analyzers/bedrockTextAnalyzer';
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
  
  // Text analysis (50%)
  themes: string[];
  keywords: string[];
  risk_level: string;
  direction_of_change: string;
  conversation_summary: string;
  drivers_positive: string[];
  drivers_negative: string[];
  
  // Multimodal (50%)
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
  private textAnalyzer: BedrockTextAnalyzer;
  private baselineEnrichment: BaselineEnrichmentService;
  
  constructor() {
    this.textAnalyzer = new BedrockTextAnalyzer();
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
      
      const textResult = await this.textAnalyzer.analyzeText(input.transcript, textContext);
      console.log('[CheckinEnrichment] ✅ Text analysis complete:', {
        score: textResult.text_score,
        uncertainty: textResult.uncertainty,
        themes: textResult.themes
      });
      
      // 2. Multimodal Analysis via Baseline Enrichment (50% weight)
      console.log('[CheckinEnrichment] 🎙️📹 Running baseline multimodal (audio + visual)...');
      let multimodalResult = null;
      let audioScore = 50;
      let visualScore = 50;
      let audioConfidence = 0;
      let visualConfidence = 0;
      
      try {
        multimodalResult = await this.baselineEnrichment.enrichBaseline({
          userId: input.userId,
          clinicalScore: 50, // No clinical questions in check-in
          audioBlob: input.audioBlob,
          videoFrames: input.videoFrames,
          duration: input.duration
        });
        
        console.log('[CheckinEnrichment] ✅ Multimodal complete:', {
          audioScore: multimodalResult.audioScore,
          visualScore: multimodalResult.visualScore
        });
        
        audioScore = multimodalResult.audioScore || 50;
        visualScore = multimodalResult.visualScore || 50;
        audioConfidence = multimodalResult.audioQuality || 0;
        visualConfidence = multimodalResult.visualQuality || 0;
        
      } catch (multimodalError: any) {
        console.warn('[CheckinEnrichment] ⚠️ Multimodal enrichment failed:', multimodalError?.message);
        warnings.push('Multimodal features unavailable');
      }
      
      // 3. Fusion: Dynamic weighting based on what succeeded
      console.log('[CheckinEnrichment] 🧠 Fusing scores with dynamic weighting...');
      
      let finalScore: number;
      let textWeight: number;
      let multimodalWeight: number;
      
      if (!multimodalResult) {
        // Text only (audio/visual failed)
        console.log('[CheckinEnrichment] Using text-only scoring (100% text)');
        textWeight = 1.0;
        multimodalWeight = 0;
        finalScore = Math.round(textResult.text_score);
        warnings.push('Multimodal features unavailable - using text-only score');
      } else {
        // Normal 50/50 split
        console.log('[CheckinEnrichment] Using 50% text, 50% multimodal');
        textWeight = 0.5;
        multimodalWeight = 0.5;
        
        const audioScore = multimodalResult.audioScore || 50;
        const visualScore = multimodalResult.visualScore || 50;
        
        // Within multimodal: equal weight to audio and visual
        const multimodalScore = (audioScore * 0.5) + (visualScore * 0.5);
        finalScore = Math.round((textResult.text_score * textWeight) + (multimodalScore * multimodalWeight));
      }
      
      console.log('[CheckinEnrichment] 📊 Final score breakdown:', {
        text: textResult.text_score,
        textWeight,
        audio: multimodalResult?.audioScore || 'N/A',
        visual: multimodalResult?.visualScore || 'N/A',
        multimodalWeight,
        final: finalScore
      });
      
      // 4. Assemble result
      const processingTime = Date.now() - startTime;
      
      const result: CheckinEnrichmentResult = {
        mind_measure_score: finalScore,
        finalScore: finalScore,
        
        // Text analysis
        themes: textResult.themes,
        keywords: textResult.keywords,
        risk_level: textResult.risk_level,
        direction_of_change: textResult.direction_of_change,
        conversation_summary: textResult.conversation_summary,
        drivers_positive: textResult.drivers_positive,
        drivers_negative: textResult.drivers_negative,
        
        // Multimodal features
        audio_features: multimodalResult?.audio_features,
        visual_features: multimodalResult?.visual_features,
        
        // Modality breakdown
        modalities: {
          text: {
            score: textResult.text_score,
            confidence: 1 - textResult.uncertainty
          },
          audio: multimodalResult ? {
            score: multimodalResult.audioScore || 50,
            confidence: multimodalResult.audioQuality || 0
          } : undefined,
          visual: multimodalResult ? {
            score: multimodalResult.visualScore || 50,
            confidence: multimodalResult.visualQuality || 0
          } : undefined
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

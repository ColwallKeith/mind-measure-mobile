/**
 * Check-in Fusion Engine
 * 
 * Combines audio, visual, and text features into a single Mind Measure score.
 * 
 * Algorithm:
 * 1. Normalize each modality to 0-100 scale
 * 2. Quality-weight each modality by confidence
 * 3. Compute weighted fusion score
 * 4. Compare against personal baseline (if available)
 * 5. Determine direction of change
 * 6. Identify contributing factors
 * 
 * Weighting strategy:
 * - All modalities available: Equal weights (33% each)
 * - One fails: Redistribute to remaining two (50% each)
 * - Two fail: Use single modality (100%)
 */

import type { 
  CheckinAudioFeatures,
  CheckinVisualFeatures,
  CheckinTextAnalysis,
  CheckinFusionResult,
  UserBaseline
} from '../types';
import { CheckinMultimodalError } from '../types';

interface FusionInput {
  audioFeatures: CheckinAudioFeatures | null;
  visualFeatures: CheckinVisualFeatures | null;
  textAnalysis: CheckinTextAnalysis;
  baseline?: UserBaseline;
}

export class CheckinFusionEngine {
  
  /**
   * Fuse multimodal features into final Mind Measure score
   */
  async fuse(input: FusionInput): Promise<CheckinFusionResult> {
    console.log('[FusionEngine] Starting fusion...');
    
    const startTime = Date.now();
    
    try {
      // Normalize each modality to 0-100 scale
      const audioScore = input.audioFeatures 
        ? this.normalizeAudioFeatures(input.audioFeatures, input.baseline)
        : null;
      
      const visualScore = input.visualFeatures
        ? this.normalizeVisualFeatures(input.visualFeatures, input.baseline)
        : null;
      
      const textScore = this.normalizeTextFeatures(input.textAnalysis, input.baseline);
      
      console.log('[FusionEngine] Normalized scores:', { audioScore, visualScore, textScore });
      
      // Get confidence scores
      const audioConfidence = input.audioFeatures?.quality || 0;
      const visualConfidence = input.visualFeatures?.overallQuality || 0;
      const textConfidence = input.textAnalysis.quality;
      
      // Determine fusion strategy based on available modalities
      const hasAudio = audioScore !== null && !isNaN(audioScore);
      const hasVisual = visualScore !== null && !isNaN(visualScore);
      const hasText = textScore !== null && !isNaN(textScore);
      
      let fusionMethod: 'quality-weighted' | 'equal' | 'text-only';
      let mindMeasureScore: number;
      let overallConfidence: number;
      
      if (hasAudio && hasVisual && hasText) {
        // All modalities available - quality-weighted fusion
        fusionMethod = 'quality-weighted';
        const result = this.qualityWeightedFusion(
          audioScore!, visualScore!, textScore!,
          audioConfidence, visualConfidence, textConfidence
        );
        mindMeasureScore = result.score;
        overallConfidence = result.confidence;
        
      } else if ((hasAudio || hasVisual) && hasText) {
        // Two modalities available - equal weights
        fusionMethod = 'equal';
        const scores = [
          hasAudio ? { score: audioScore!, conf: audioConfidence } : null,
          hasVisual ? { score: visualScore!, conf: visualConfidence } : null,
          { score: textScore!, conf: textConfidence }
        ].filter(s => s !== null) as Array<{ score: number; conf: number }>;
        
        mindMeasureScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        overallConfidence = scores.reduce((sum, s) => sum + s.conf, 0) / scores.length;
        
      } else if (hasText) {
        // Text only
        fusionMethod = 'text-only';
        mindMeasureScore = textScore!;
        overallConfidence = textConfidence;
        
      } else {
        throw new CheckinMultimodalError(
          'No valid modalities for fusion',
          'NO_VALID_MODALITIES',
          false,
          'fusion'
        );
      }
      
      // Clamp to 0-100
      mindMeasureScore = Math.max(0, Math.min(100, mindMeasureScore));
      
      // Round to whole number
      mindMeasureScore = Math.round(mindMeasureScore);
      
      // Determine direction of change (vs baseline)
      const directionOfChange = input.baseline
        ? this.determineDirectionOfChange(mindMeasureScore, input.baseline)
        : 'same';
      
      // Compute uncertainty
      const uncertainty = this.computeUncertainty(
        overallConfidence,
        hasAudio,
        hasVisual,
        hasText,
        !!input.baseline
      );
      
      // Identify contributing factors
      const contributingFactors = this.identifyContributingFactors(
        input,
        audioScore,
        visualScore,
        textScore,
        mindMeasureScore
      );
      
      // Identify improvement areas
      const improvementAreas = this.identifyImprovementAreas(
        input,
        audioScore,
        visualScore,
        textScore
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`[FusionEngine] ✅ Fusion complete: score=${mindMeasureScore}, direction=${directionOfChange}`);
      
      return {
        mindMeasureScore,
        directionOfChange,
        uncertainty,
        
        audioScore: audioScore !== null ? Math.round(audioScore) : audioScore,
        visualScore: visualScore !== null ? Math.round(visualScore) : visualScore,
        textScore: Math.round(textScore),
        
        audioConfidence,
        visualConfidence,
        textConfidence,
        overallConfidence,
        
        contributingFactors,
        improvementAreas,
        
        fusionMethod,
        processingTimeMs: processingTime
      };
      
    } catch (error) {
      console.error('[FusionEngine] ❌ Fusion failed:', error);
      
      if (error instanceof CheckinMultimodalError) {
        throw error;
      }
      
      throw new CheckinMultimodalError(
        `Fusion failed: ${error instanceof Error ? error.message : String(error)}`,
        'FUSION_FAILED',
        true
      );
    }
  }
  
  // ==========================================================================
  // MODALITY NORMALIZATION
  // ==========================================================================
  
  /**
   * Normalize audio features to 0-100 scale
   */
  private normalizeAudioFeatures(
    features: CheckinAudioFeatures,
    baseline?: UserBaseline
  ): number {
    // If we have baseline, compute z-scores
    if (baseline?.audioBaseline) {
      return this.computeZScoreBasedScore(features, baseline.audioBaseline);
    }
    
    // No baseline - use absolute scoring
    // Higher values = better wellbeing
    let score = 50; // Start neutral
    
    // Pitch features (variability is good - expressive)
    if (features.pitchVariability > 40 && features.pitchVariability < 80) {
      score += 10;
    }
    
    // Speaking rate (normal range is good)
    if (features.speakingRate > 100 && features.speakingRate < 150) {
      score += 10;
    } else if (features.speakingRate < 80 || features.speakingRate > 180) {
      score -= 10; // Too slow or too fast
    }
    
    // Pause patterns (moderate pausing is good)
    if (features.pauseFrequency > 5 && features.pauseFrequency < 20) {
      score += 5;
    }
    if (features.pauseDuration > 0.2 && features.pauseDuration < 0.5) {
      score += 5;
    }
    
    // Energy (consistent energy is good)
    if (features.voiceEnergy > 0.001 && features.voiceEnergy < 0.01) {
      score += 10;
    }
    if (features.energyVariability < 0.005) {
      score += 5; // Stable energy
    }
    
    // Voice quality (higher harmonic ratio = better)
    if (features.harmonicRatio > 0.05) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Normalize visual features to 0-100 scale
   */
  private normalizeVisualFeatures(
    features: CheckinVisualFeatures,
    baseline?: UserBaseline
  ): number {
    if (baseline?.visualBaseline) {
      return this.computeZScoreBasedScore(features, baseline.visualBaseline);
    }
    
    // No baseline - use absolute scoring
    let score = 50; // Start neutral
    
    // Positive facial expressions
    if (features.smileFrequency > 0.1) {
      score += 15 * features.smileFrequency; // More smiling = better
    }
    if (features.smileIntensity > 0.5) {
      score += 10 * features.smileIntensity;
    }
    
    // Engagement indicators
    if (features.eyeContact > 0.5) {
      score += 10; // Good eye contact
    }
    if (features.gazeStability > 0.5) {
      score += 5; // Stable gaze
    }
    
    // Movement (moderate is good)
    if (features.headStability > 0.5) {
      score += 10; // Not fidgeting excessively
    }
    
    // Emotional state
    if (features.emotionalValence > 0) {
      score += 15 * features.emotionalValence; // Positive emotion
    } else {
      score += 15 * features.emotionalValence; // Negative emotion (subtracts)
    }
    
    // Emotional stability (consistency is good)
    if (features.emotionalStability > 0.5) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Normalize text features to 0-100 scale
   */
  private normalizeTextFeatures(
    analysis: CheckinTextAnalysis,
    baseline?: UserBaseline
  ): number {
    if (baseline?.textBaseline) {
      return this.computeZScoreBasedScore(analysis, baseline.textBaseline);
    }
    
    // No baseline - use absolute scoring
    let score = 50; // Start neutral
    
    // Sentiment is the strongest signal
    score += analysis.sentimentScore * 30; // -30 to +30
    
    // Positive/negative word ratios
    score += (analysis.positiveWordRatio - analysis.negativeWordRatio) * 100;
    
    // Engagement and expressivity are positive
    score += analysis.engagementScore * 10;
    score += analysis.expressivityScore * 5;
    
    // Coherence is positive
    score += analysis.coherenceScore * 5;
    
    // Certainty is mildly positive
    score += analysis.certaintyScore * 5;
    
    // Negation and absolutism are negative
    score -= analysis.negationFrequency * 50;
    score -= (analysis.absolutismWords / analysis.transcriptLength) * 100;
    
    // Risk level impact
    if (analysis.riskLevel === 'high') {
      score -= 30;
    } else if (analysis.riskLevel === 'moderate') {
      score -= 15;
    } else if (analysis.riskLevel === 'mild') {
      score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // ==========================================================================
  // QUALITY-WEIGHTED FUSION
  // ==========================================================================
  
  private qualityWeightedFusion(
    audioScore: number,
    visualScore: number,
    textScore: number,
    audioConf: number,
    visualConf: number,
    textConf: number
  ): { score: number; confidence: number } {
    // Normalize confidences
    const totalConf = audioConf + visualConf + textConf;
    
    if (totalConf === 0) {
      // Equal weights if no confidence info
      return {
        score: (audioScore + visualScore + textScore) / 3,
        confidence: 0.5
      };
    }
    
    const audioWeight = audioConf / totalConf;
    const visualWeight = visualConf / totalConf;
    const textWeight = textConf / totalConf;
    
    const score = (
      audioScore * audioWeight +
      visualScore * visualWeight +
      textScore * textWeight
    );
    
    const confidence = (audioConf + visualConf + textConf) / 3;
    
    return { score, confidence };
  }
  
  // ==========================================================================
  // BASELINE COMPARISON
  // ==========================================================================
  
  private computeZScoreBasedScore(
    features: any,
    baseline: Record<string, { mu: number; sigma: number }>
  ): number {
    // Compute z-scores for each feature
    const zScores: number[] = [];
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number' && baseline[key]) {
        const { mu, sigma } = baseline[key];
        if (sigma > 0) {
          const zScore = (value - mu) / sigma;
          zScores.push(zScore);
        }
      }
    }
    
    if (zScores.length === 0) {
      return 50; // Neutral if no baseline data
    }
    
    // Average z-score
    const avgZScore = zScores.reduce((sum, z) => sum + z, 0) / zScores.length;
    
    // Convert z-score to 0-100 scale
    // z-score of 0 = 50 (at baseline)
    // z-score of +2 = 100 (much better)
    // z-score of -2 = 0 (much worse)
    const score = 50 + (avgZScore * 25);
    
    return Math.max(0, Math.min(100, score));
  }
  
  private determineDirectionOfChange(
    currentScore: number,
    baseline: UserBaseline
  ): 'better' | 'same' | 'worse' {
    // Compute baseline average score (rough estimate)
    // In production, would store baseline score directly
    const baselineScore = 50; // Default neutral
    
    const diff = currentScore - baselineScore;
    
    if (diff > 5) return 'better';
    if (diff < -5) return 'worse';
    return 'same';
  }
  
  // ==========================================================================
  // UNCERTAINTY & INSIGHTS
  // ==========================================================================
  
  private computeUncertainty(
    confidence: number,
    hasAudio: boolean,
    hasVisual: boolean,
    hasText: boolean,
    hasBaseline: boolean
  ): number {
    let uncertainty = 1 - confidence;
    
    // Fewer modalities = higher uncertainty
    const modalityCount = [hasAudio, hasVisual, hasText].filter(Boolean).length;
    if (modalityCount < 3) {
      uncertainty += 0.1 * (3 - modalityCount);
    }
    
    // No baseline = higher uncertainty
    if (!hasBaseline) {
      uncertainty += 0.1;
    }
    
    return Math.max(0, Math.min(1, uncertainty));
  }
  
  private identifyContributingFactors(
    input: FusionInput,
    audioScore: number | null,
    visualScore: number | null,
    textScore: number | null,
    finalScore: number
  ): string[] {
    const factors: string[] = [];
    
    // Text analysis provides the clearest signals
    const text = input.textAnalysis;
    
    if (text.positiveDrivers.length > 0) {
      factors.push(`Positive factors: ${text.positiveDrivers.slice(0, 2).join(', ')}`);
    }
    
    if (text.negativeDrivers.length > 0) {
      factors.push(`Challenges: ${text.negativeDrivers.slice(0, 2).join(', ')}`);
    }
    
    // Audio signals
    if (audioScore !== null) {
      if (audioScore > 60) {
        factors.push('Energetic and expressive speech');
      } else if (audioScore < 40) {
        factors.push('Low vocal energy or monotone speech');
      }
    }
    
    // Visual signals
    if (visualScore !== null) {
      const visual = input.visualFeatures!;
      if (visual.smileFrequency > 0.2) {
        factors.push('Frequent smiling');
      }
      if (visual.emotionalValence < -0.2) {
        factors.push('Negative facial expressions');
      }
    }
    
    // Sentiment
    if (text.sentimentScore > 0.1) {
      factors.push('Positive language and sentiment');
    } else if (text.sentimentScore < -0.1) {
      factors.push('Negative language patterns');
    }
    
    return factors.slice(0, 5); // Top 5
  }
  
  private identifyImprovementAreas(
    input: FusionInput,
    audioScore: number | null,
    visualScore: number | null,
    textScore: number | null
  ): string[] {
    const areas: string[] = [];
    const text = input.textAnalysis;
    
    // Risk-based suggestions
    if (text.riskLevel === 'high' || text.riskLevel === 'moderate') {
      areas.push('Consider reaching out to a mental health professional');
    }
    
    // Specific challenges
    if (text.negativeDrivers.includes('sleep problems')) {
      areas.push('Focus on sleep hygiene and routine');
    }
    if (text.negativeDrivers.includes('stress/pressure')) {
      areas.push('Explore stress management techniques');
    }
    if (text.negativeDrivers.includes('loneliness')) {
      areas.push('Prioritize social connections');
    }
    
    // Low engagement
    if (text.engagementScore < 0.3) {
      areas.push('Share more about your experiences in check-ins');
    }
    
    // High negativity
    if (text.negativeWordRatio > 0.1) {
      areas.push('Notice and acknowledge positive moments');
    }
    
    return areas.slice(0, 3); // Top 3
  }
}










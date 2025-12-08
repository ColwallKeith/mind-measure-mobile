/**
 * Baseline Scoring Module
 * 
 * Computes final baseline score as:
 * - 70% Clinical (PHQ-2 + GAD-2 + mood scale)
 * - 30% Multimodal (audio + visual features)
 */

import type { 
  BaselineAudioFeatures, 
  BaselineVisualFeatures, 
  BaselineScoringBreakdown 
} from '../types';

export class BaselineScoring {
  
  /**
   * Compute final baseline score from clinical and multimodal components
   * 
   * @param clinicalScore - Score from PHQ-2/GAD-2/mood (0-100)
   * @param audioFeatures - Extracted audio features
   * @param visualFeatures - Extracted visual features
   * @returns Scoring breakdown with final weighted score
   */
  static computeScore(
    clinicalScore: number,
    audioFeatures: BaselineAudioFeatures,
    visualFeatures: BaselineVisualFeatures
  ): BaselineScoringBreakdown {
    
    console.log('[BaselineScoring] Computing 70/30 weighted score');
    console.log('[BaselineScoring] Clinical score:', clinicalScore);
    
    // Normalize audio features to 0-100 scale
    const audioScore = this.normalizeAudioFeatures(audioFeatures);
    console.log('[BaselineScoring] Audio score:', audioScore);
    
    // Normalize visual features to 0-100 scale
    const visualScore = this.normalizeVisualFeatures(visualFeatures);
    console.log('[BaselineScoring] Visual score:', visualScore);
    
    // Check for NaN values
    if (isNaN(audioScore) || isNaN(visualScore)) {
      console.error('[BaselineScoring] ❌ NaN detected in multimodal scores - falling back to clinical only');
      return {
        clinicalScore: Math.round(clinicalScore),
        clinicalWeight: 1.0,
        audioScore: null,
        visualScore: null,
        multimodalScore: null,
        multimodalWeight: 0,
        finalScore: Math.round(clinicalScore),
        confidence: 0.5
      };
    }
    
    // Combine audio and visual into single multimodal score
    const multimodalScore = (audioScore + visualScore) / 2;
    console.log('[BaselineScoring] Multimodal score:', multimodalScore);
    
    // Compute final weighted score: 70% clinical + 30% multimodal
    const finalScore = (clinicalScore * 0.7) + (multimodalScore * 0.3);
    console.log('[BaselineScoring] Final score:', finalScore);
    
    // Validate final score
    if (isNaN(finalScore) || !isFinite(finalScore)) {
      console.error('[BaselineScoring] ❌ Invalid final score - falling back to clinical only');
      return {
        clinicalScore: Math.round(clinicalScore),
        clinicalWeight: 1.0,
        audioScore: Math.round(audioScore),
        visualScore: Math.round(visualScore),
        multimodalScore: Math.round(multimodalScore),
        multimodalWeight: 0,
        finalScore: Math.round(clinicalScore),
        confidence: 0.5
      };
    }
    
    // Assess overall confidence
    const confidence = this.computeConfidence(
      audioFeatures,
      visualFeatures,
      clinicalScore
    );
    console.log('[BaselineScoring] Confidence:', confidence);
    
    return {
      clinicalScore: Math.round(clinicalScore),
      clinicalWeight: 0.7,
      audioScore: Math.round(audioScore),
      visualScore: Math.round(visualScore),
      multimodalScore: Math.round(multimodalScore),
      multimodalWeight: 0.3,
      finalScore: Math.round(finalScore), // Round to whole number
      confidence
    };
  }

  /**
   * Normalize audio features to 0-100 scale
   * 
   * Strategy: Each feature contributes equally, normalized to expected ranges
   * Handles null/undefined values gracefully
   */
  private static normalizeAudioFeatures(features: BaselineAudioFeatures): number {
    const scores: number[] = [];

    // Pitch features (higher pitch variability = potential stress)
    // Mean pitch: 85-300 Hz range, optimal around 150-180 Hz
    if (features.meanPitch != null && !isNaN(features.meanPitch)) {
      const pitchScore = 100 - Math.abs(features.meanPitch - 165) / 2;
      scores.push(this.clamp(pitchScore, 0, 100));
    }

    // Pitch variability: 0-50 Hz typical, lower is better (more stable)
    if (features.pitchVariability != null && !isNaN(features.pitchVariability)) {
      const pitchVarScore = 100 - (features.pitchVariability * 2);
      scores.push(this.clamp(pitchVarScore, 0, 100));
    }

    // Speaking rate: 80-200 wpm typical, optimal around 140-160 wpm
    if (features.speakingRate != null && !isNaN(features.speakingRate)) {
      const rateScore = 100 - Math.abs(features.speakingRate - 150) / 2;
      scores.push(this.clamp(rateScore, 0, 100));
    }

    // Pause frequency: 2-8 per minute typical, optimal around 4-6
    if (features.pauseFrequency != null && !isNaN(features.pauseFrequency)) {
      const pauseFreqScore = 100 - Math.abs(features.pauseFrequency - 5) * 10;
      scores.push(this.clamp(pauseFreqScore, 0, 100));
    }

    // Pause duration: 0.3-1.0s typical, optimal around 0.5s
    if (features.pauseDuration != null && !isNaN(features.pauseDuration)) {
      const pauseDurScore = 100 - Math.abs(features.pauseDuration - 0.5) * 100;
      scores.push(this.clamp(pauseDurScore, 0, 100));
    }

    // Voice energy: higher is generally better (more engaged)
    if (features.voiceEnergy != null && !isNaN(features.voiceEnergy)) {
      const energyScore = features.voiceEnergy * 100;
      scores.push(this.clamp(energyScore, 0, 100));
    }

    // Jitter: lower is better (more stable voice) - OPTIONAL
    if (features.jitter != null && !isNaN(features.jitter)) {
      const jitterScore = (1 - features.jitter) * 100;
      scores.push(this.clamp(jitterScore, 0, 100));
    }

    // Shimmer: lower is better (better voice quality)
    if (features.shimmer != null && !isNaN(features.shimmer)) {
      const shimmerScore = (1 - features.shimmer) * 100;
      scores.push(this.clamp(shimmerScore, 0, 100));
    }

    // Harmonic ratio: higher is better (clearer voice)
    if (features.harmonicRatio != null && !isNaN(features.harmonicRatio)) {
      const harmonicScore = features.harmonicRatio * 100;
      scores.push(this.clamp(harmonicScore, 0, 100));
    }

    // If no valid features, return neutral score
    if (scores.length === 0) {
      console.warn('[BaselineScoring] No valid audio features - returning neutral score');
      return 50;
    }

    // Weight by quality
    const weightedScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return weightedScore * (features.quality || 0.5);
  }

  /**
   * Normalize visual features to 0-100 scale
   * 
   * Strategy: Positive indicators increase score, negative indicators decrease
   */
  private static normalizeVisualFeatures(features: BaselineVisualFeatures): number {
    const scores: number[] = [];

    // Smile frequency: more smiling = better mood
    scores.push(features.smileFrequency * 100);

    // Smile intensity: stronger smiles = better mood
    scores.push(features.smileIntensity * 100);

    // Eye contact: more eye contact = more engaged
    scores.push(features.eyeContact * 100);

    // Eyebrow position: neutral is best, high = surprise/concern
    // 0.3-0.5 is neutral range
    const eyebrowScore = 100 - Math.abs(features.eyebrowPosition - 0.4) * 100;
    scores.push(this.clamp(eyebrowScore, 0, 100));

    // Facial tension: lower is better (more relaxed)
    scores.push((1 - features.facialTension) * 100);

    // Blink rate: 15-20 blinks/min is normal, too high = fatigue, too low = alert/stressed
    const blinkScore = 100 - Math.abs(features.blinkRate - 17) * 3;
    scores.push(this.clamp(blinkScore, 0, 100));

    // Head movement: moderate is good (engaged), too much or too little is concerning
    const movementScore = 100 - Math.abs(features.headMovement - 0.5) * 100;
    scores.push(this.clamp(movementScore, 0, 100));

    // Overall affect: map -1 to 1 → 0 to 100
    const affectScore = (features.affect + 1) * 50;
    scores.push(this.clamp(affectScore, 0, 100));

    // Weight by quality
    const weightedScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return weightedScore * features.overallQuality;
  }

  /**
   * Compute overall confidence in the score
   */
  private static computeConfidence(
    audioFeatures: BaselineAudioFeatures,
    visualFeatures: BaselineVisualFeatures,
    clinicalScore: number
  ): number {
    let confidence = 1.0;

    // Factor in audio quality
    confidence *= audioFeatures.quality;

    // Factor in visual quality
    confidence *= visualFeatures.overallQuality;

    // Factor in face presence
    confidence *= visualFeatures.facePresenceQuality;

    // Penalize if clinical score is extreme (might indicate inaccurate responses)
    if (clinicalScore < 20 || clinicalScore > 95) {
      confidence *= 0.9;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Clamp value to range
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}


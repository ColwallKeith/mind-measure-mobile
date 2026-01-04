/**
 * Dashboard Assembler
 * 
 * Packages fusion results and text analysis into dashboard-ready format.
 * Combines all multimodal insights into a single cohesive data structure
 * for UI display and database storage.
 */

import type {
  CheckinAudioFeatures,
  CheckinVisualFeatures,
  CheckinTextAnalysis,
  CheckinFusionResult,
  CheckinDashboardData
} from '../types';

export class DashboardAssembler {
  
  /**
   * Assemble all components into dashboard-ready data
   */
  assemble(
    fusionResult: CheckinFusionResult,
    textAnalysis: CheckinTextAnalysis,
    audioFeatures: CheckinAudioFeatures | null,
    visualFeatures: CheckinVisualFeatures | null,
    checkInId: string,
    userId: string
  ): CheckinDashboardData {
    console.log('[DashboardAssembler] Assembling dashboard data...');
    
    return {
      // Core identifiers
      checkInId,
      userId,
      timestamp: new Date(),
      
      // Primary score
      mindMeasureScore: fusionResult.mindMeasureScore,
      directionOfChange: fusionResult.directionOfChange,
      
      // User-facing text (from text analysis)
      summary: textAnalysis.summary,
      keywords: textAnalysis.keywords,
      positiveDrivers: textAnalysis.positiveDrivers,
      negativeDrivers: textAnalysis.negativeDrivers,
      
      // Risk assessment
      riskLevel: textAnalysis.riskLevel,
      riskReasons: textAnalysis.riskReasons,
      
      // Insights (from fusion)
      contributingFactors: fusionResult.contributingFactors,
      improvementAreas: fusionResult.improvementAreas,
      
      // Confidence & uncertainty
      uncertainty: fusionResult.uncertainty,
      confidence: fusionResult.overallConfidence,
      
      // Full analysis (for database storage)
      fullAnalysis: {
        audioFeatures: audioFeatures || this.createPlaceholderAudioFeatures(),
        visualFeatures: visualFeatures || this.createPlaceholderVisualFeatures(),
        textAnalysis,
        fusionResult
      }
    };
  }
  
  /**
   * Create placeholder audio features when not available
   */
  private createPlaceholderAudioFeatures(): CheckinAudioFeatures {
    return {
      meanPitch: 0,
      pitchRange: 0,
      pitchVariability: 0,
      pitchContourSlope: 0,
      jitter: null,
      shimmer: 0,
      harmonicRatio: 0,
      pitchDynamics: 0,
      speakingRate: 0,
      articulationRate: 0,
      pauseFrequency: 0,
      pauseDuration: 0,
      speechRatio: 0,
      filledPauseRate: 0,
      silenceDuration: 0,
      voiceEnergy: 0,
      energyVariability: 0,
      energyContour: 0,
      dynamicRange: 0,
      stressPatterns: 0,
      spectralCentroid: 0,
      spectralFlux: 0,
      voicedRatio: 0,
      quality: 0,
      duration: 0
    };
  }
  
  /**
   * Create placeholder visual features when not available
   */
  private createPlaceholderVisualFeatures(): CheckinVisualFeatures {
    return {
      smileFrequency: 0,
      smileIntensity: 0,
      eyebrowRaiseFrequency: 0,
      eyebrowFurrowFrequency: 0,
      mouthTension: 0,
      facialSymmetry: 0,
      eyeContact: 0,
      gazeStability: 0,
      headMovement: 0,
      headStability: 0,
      emotionalValence: 0,
      emotionalArousal: 0,
      emotionalStability: 0,
      facePresenceQuality: 0,
      overallQuality: 0,
      framesAnalyzed: 0
    };
  }
}










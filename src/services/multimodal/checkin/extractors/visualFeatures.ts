/**
 * Check-in Visual Feature Extractor
 * 
 * Extracts 18 visual features from video frames using AWS Rekognition:
 * - 7 facial expression features
 * - 3 gaze/attention features
 * - 5 movement/behavior features
 * - 3 affect/emotion features
 * 
 * Key difference from baseline: Temporal analysis (frequency, duration, stability)
 * and behavioral indicators (fidgeting, gestures, posture shifts).
 */

import type { CapturedMedia } from '../../types';
import type { CheckinVisualFeatures } from '../types';
import { CheckinMultimodalError } from '../types';

interface RekognitionFaceDetails {
  Confidence?: number;
  BoundingBox?: { Width: number; Height: number; Left: number; Top: number };
  Landmarks?: Array<{ Type: string; X: number; Y: number }>;
  Pose?: { Roll?: number; Yaw?: number; Pitch?: number };
  Quality?: { Brightness?: number; Sharpness?: number };
  Smile?: { Value: boolean; Confidence: number };
  Eyeglasses?: { Value: boolean; Confidence: number };
  Sunglasses?: { Value: boolean; Confidence: number };
  Emotions?: Array<{ Type: string; Confidence: number }>;
  EyesOpen?: { Value: boolean; Confidence: number };
  MouthOpen?: { Value: boolean; Confidence: number };
  FaceOccluded?: { Value: boolean; Confidence: number };
}

interface RekognitionResponse {
  success: boolean;
  totalFrames: number;
  analyzedFrames: number;
  analyses: Array<{
    frameIndex: number;
    faceDetails: RekognitionFaceDetails | null;
  }>;
}

export class CheckinVisualExtractor {
  
  /**
   * Extract all 18 visual features from video frames
   */
  async extract(media: CapturedMedia): Promise<CheckinVisualFeatures> {
    console.log('[CheckinVisualExtractor] Starting extraction...');
    
    if (!media.videoFrames || media.videoFrames.length === 0) {
      throw new CheckinMultimodalError(
        'No video frames provided',
        'NO_VIDEO_DATA',
        false,
        'visual'
      );
    }
    
    const startTime = Date.now();
    
    try {
      // Call Rekognition API
      const rekognitionData = await this.analyzeFramesWithRekognition(media.videoFrames);
      
      console.log(`[CheckinVisualExtractor] Rekognition analyzed ${rekognitionData.analyzedFrames}/${rekognitionData.totalFrames} frames`);
      
      if (rekognitionData.analyzedFrames === 0) {
        throw new CheckinMultimodalError(
          'Rekognition failed to analyze any frames',
          'REKOGNITION_NO_FACES',
          true,
          'visual'
        );
      }
      
      // Extract feature groups
      const facialExpressionFeatures = this.extractFacialExpressionFeatures(rekognitionData);
      const gazeAttentionFeatures = this.extractGazeAttentionFeatures(rekognitionData);
      const movementBehaviorFeatures = this.extractMovementBehaviorFeatures(rekognitionData);
      const affectEmotionFeatures = this.extractAffectEmotionFeatures(rekognitionData);
      
      // Compute quality metrics
      const facePresenceQuality = rekognitionData.analyzedFrames / rekognitionData.totalFrames;
      const overallQuality = this.computeOverallQuality(rekognitionData);
      
      const processingTime = Date.now() - startTime;
      console.log(`[CheckinVisualExtractor] ✅ Extraction complete in ${processingTime}ms`);
      
      return {
        ...facialExpressionFeatures,
        ...gazeAttentionFeatures,
        ...movementBehaviorFeatures,
        ...affectEmotionFeatures,
        facePresenceQuality,
        overallQuality,
        framesAnalyzed: rekognitionData.analyzedFrames
      };
      
    } catch (error) {
      console.error('[CheckinVisualExtractor] ❌ Extraction failed:', error);
      
      if (error instanceof CheckinMultimodalError) {
        throw error;
      }
      
      throw new CheckinMultimodalError(
        `Visual extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        'VISUAL_EXTRACTION_FAILED',
        true,
        'visual'
      );
    }
  }
  
  // ==========================================================================
  // REKOGNITION API CALL
  // ==========================================================================
  
  private async analyzeFramesWithRekognition(frames: Blob[]): Promise<RekognitionResponse> {
    // Convert frames to base64
    const framesBase64: string[] = [];
    
    for (const frame of frames) {
      const arrayBuffer = await frame.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      framesBase64.push(base64);
    }
    
    const payloadSize = JSON.stringify({ frames: framesBase64 }).length;
    console.log(`[CheckinVisualExtractor] Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB for ${frames.length} frames`);
    
    if (payloadSize > 4.5 * 1024 * 1024) {
      console.warn('[CheckinVisualExtractor] ⚠️ Large payload detected, may cause timeout');
    }
    
    // Call API endpoint
    console.log('[CheckinVisualExtractor] 📡 Calling Rekognition API...');
    
    const response = await fetch('/api/rekognition/analyze-frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        frames: framesBase64
      })
    });
    
    if (!response.ok) {
      let errorDetails = `Status: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorDetails += `, Details: ${JSON.stringify(errorData)}`;
      } catch (jsonError) {
        errorDetails += `, Could not parse error response as JSON`;
      }
      throw new Error(`Rekognition API failed: ${errorDetails}`);
    }
    
    const result: RekognitionResponse = await response.json();
    console.log(`[CheckinVisualExtractor] ✅ Rekognition analyzed ${result.analyzedFrames} / ${result.totalFrames} frames`);
    
    return result;
  }
  
  // ==========================================================================
  // FACIAL EXPRESSION FEATURES (7 features)
  // ==========================================================================
  
  private extractFacialExpressionFeatures(data: RekognitionResponse) {
    const validFrames = data.analyses.filter(a => a.faceDetails);
    
    if (validFrames.length === 0) {
      return {
        smileFrequency: 0,
        smileIntensity: 0,
        smileDuration: 0,
        eyebrowRaiseFrequency: 0,
        eyebrowFurrowFrequency: 0,
        mouthTension: 0,
        facialSymmetry: 0
      };
    }
    
    // Smile analysis
    const smilingFrames = validFrames.filter(f => 
      f.faceDetails?.Smile?.Value && f.faceDetails.Smile.Confidence > 50
    );
    const smileFrequency = smilingFrames.length / validFrames.length;
    
    const smileIntensities = smilingFrames.map(f => 
      (f.faceDetails?.Smile?.Confidence || 0) / 100
    );
    const smileIntensity = smileIntensities.length > 0
      ? smileIntensities.reduce((sum, i) => sum + i, 0) / smileIntensities.length
      : 0;
    
    // Smile duration (average continuous smile length)
    const smileDuration = this.computeEventDuration(
      validFrames.map(f => f.faceDetails?.Smile?.Value || false)
    );
    
    // Eyebrow analysis (from emotions/landmarks)
    const eyebrowRaiseFrames = validFrames.filter(f => {
      const emotions = f.faceDetails?.Emotions || [];
      return emotions.some(e => e.Type === 'SURPRISED' && e.Confidence > 30);
    });
    const eyebrowRaiseFrequency = eyebrowRaiseFrames.length / validFrames.length;
    
    const eyebrowFurrowFrames = validFrames.filter(f => {
      const emotions = f.faceDetails?.Emotions || [];
      return emotions.some(e => 
        (e.Type === 'ANGRY' || e.Type === 'CONFUSED') && e.Confidence > 30
      );
    });
    const eyebrowFurrowFrequency = eyebrowFurrowFrames.length / validFrames.length;
    
    // Mouth tension (inverse of mouth open)
    const mouthOpenFrames = validFrames.filter(f => 
      f.faceDetails?.MouthOpen?.Value && f.faceDetails.MouthOpen.Confidence > 50
    );
    const mouthTension = 1 - (mouthOpenFrames.length / validFrames.length);
    
    // Facial symmetry (from pose/landmarks)
    const symmetryScores = validFrames.map(f => {
      const pose = f.faceDetails?.Pose;
      if (!pose || pose.Roll === undefined) return 1.0;
      
      // Higher roll = less symmetric
      const rollDeviation = Math.abs(pose.Roll) / 30; // Normalize to 0-1
      return Math.max(0, 1 - rollDeviation);
    });
    const facialSymmetry = symmetryScores.reduce((sum, s) => sum + s, 0) / symmetryScores.length;
    
    return {
      smileFrequency,
      smileIntensity,
      smileDuration,
      eyebrowRaiseFrequency,
      eyebrowFurrowFrequency,
      mouthTension,
      facialSymmetry
    };
  }
  
  // ==========================================================================
  // GAZE/ATTENTION FEATURES (3 features)
  // ==========================================================================
  
  private extractGazeAttentionFeatures(data: RekognitionResponse) {
    const validFrames = data.analyses.filter(a => a.faceDetails);
    
    if (validFrames.length === 0) {
      return {
        eyeContact: 0,
        gazeStability: 0,
        blinkRate: 0
      };
    }
    
    // Eye contact (facing camera directly)
    const eyeContactFrames = validFrames.filter(f => {
      const pose = f.faceDetails?.Pose;
      if (!pose) return false;
      
      // Good eye contact: Yaw and Pitch close to 0
      const yaw = Math.abs(pose.Yaw || 0);
      const pitch = Math.abs(pose.Pitch || 0);
      
      return yaw < 15 && pitch < 15; // Within 15 degrees
    });
    const eyeContact = eyeContactFrames.length / validFrames.length;
    
    // Gaze stability (consistency of head pose)
    const yawValues = validFrames
      .map(f => f.faceDetails?.Pose?.Yaw)
      .filter((y): y is number => y !== undefined);
    
    const pitchValues = validFrames
      .map(f => f.faceDetails?.Pose?.Pitch)
      .filter((p): p is number => p !== undefined);
    
    const yawStd = this.computeStdDev(yawValues);
    const pitchStd = this.computeStdDev(pitchValues);
    const averageStd = (yawStd + pitchStd) / 2;
    
    // Lower std = higher stability
    const gazeStability = Math.max(0, 1 - (averageStd / 30)); // Normalize
    
    // Blink rate (estimate from eyes closed)
    const eyesClosedFrames = validFrames.filter(f => 
      f.faceDetails?.EyesOpen?.Value === false && 
      f.faceDetails.EyesOpen.Confidence > 50
    );
    
    // Approximate blinks per minute (assuming 0.5fps, 2 seconds per frame)
    const frameDuration = 2; // seconds (0.5 fps)
    const totalMinutes = (validFrames.length * frameDuration) / 60;
    const blinkRate = totalMinutes > 0 ? eyesClosedFrames.length / totalMinutes : 0;
    
    return {
      eyeContact,
      gazeStability,
      blinkRate
    };
  }
  
  // ==========================================================================
  // MOVEMENT/BEHAVIOR FEATURES (5 features)
  // ==========================================================================
  
  private extractMovementBehaviorFeatures(data: RekognitionResponse) {
    const validFrames = data.analyses.filter(a => a.faceDetails);
    
    if (validFrames.length === 0) {
      return {
        headMovement: 0,
        headStability: 0,
        fidgetingRate: 0,
        gestureFrequency: 0,
        postureShift: 0
      };
    }
    
    // Head movement (change in pose between frames)
    const poseChanges: number[] = [];
    for (let i = 1; i < validFrames.length; i++) {
      const prev = validFrames[i - 1].faceDetails?.Pose;
      const curr = validFrames[i].faceDetails?.Pose;
      
      if (prev && curr && prev.Yaw !== undefined && curr.Yaw !== undefined) {
        const yawChange = Math.abs(curr.Yaw - prev.Yaw);
        const pitchChange = Math.abs((curr.Pitch || 0) - (prev.Pitch || 0));
        const rollChange = Math.abs((curr.Roll || 0) - (prev.Roll || 0));
        
        poseChanges.push(yawChange + pitchChange + rollChange);
      }
    }
    
    const headMovement = poseChanges.length > 0
      ? poseChanges.reduce((sum, c) => sum + c, 0) / poseChanges.length
      : 0;
    
    // Head stability (inverse of movement)
    const headStability = Math.max(0, 1 - (headMovement / 30)); // Normalize
    
    // Fidgeting rate (small rapid movements)
    const fidgetingMoves = poseChanges.filter(c => c > 2 && c < 10).length;
    const frameDuration = 2; // seconds (0.5 fps)
    const totalMinutes = (validFrames.length * frameDuration) / 60;
    const fidgetingRate = totalMinutes > 0 ? fidgetingMoves / totalMinutes : 0;
    
    // Gesture frequency (larger movements)
    const gestureMoves = poseChanges.filter(c => c > 10).length;
    const gestureFrequency = totalMinutes > 0 ? gestureMoves / totalMinutes : 0;
    
    // Posture shift (change in face position in frame)
    const positionChanges: number[] = [];
    for (let i = 1; i < validFrames.length; i++) {
      const prev = validFrames[i - 1].faceDetails?.BoundingBox;
      const curr = validFrames[i].faceDetails?.BoundingBox;
      
      if (prev && curr) {
        const xChange = Math.abs((curr.Left || 0) - (prev.Left || 0));
        const yChange = Math.abs((curr.Top || 0) - (prev.Top || 0));
        positionChanges.push(xChange + yChange);
      }
    }
    
    const postureShift = positionChanges.length > 0
      ? positionChanges.reduce((sum, c) => sum + c, 0) / positionChanges.length
      : 0;
    
    return {
      headMovement,
      headStability,
      fidgetingRate,
      gestureFrequency,
      postureShift
    };
  }
  
  // ==========================================================================
  // AFFECT/EMOTION FEATURES (3 features)
  // ==========================================================================
  
  private extractAffectEmotionFeatures(data: RekognitionResponse) {
    const validFrames = data.analyses.filter(a => a.faceDetails);
    
    if (validFrames.length === 0) {
      return {
        emotionalValence: 0,
        emotionalArousal: 0,
        emotionalStability: 0
      };
    }
    
    // Extract dominant emotions across all frames
    const emotionScores: Record<string, number[]> = {};
    
    for (const frame of validFrames) {
      const emotions = frame.faceDetails?.Emotions || [];
      
      for (const emotion of emotions) {
        if (!emotionScores[emotion.Type]) {
          emotionScores[emotion.Type] = [];
        }
        emotionScores[emotion.Type].push(emotion.Confidence / 100);
      }
    }
    
    // Compute average emotion scores
    const avgEmotions: Record<string, number> = {};
    for (const [emotion, scores] of Object.entries(emotionScores)) {
      avgEmotions[emotion] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
    
    // Emotional valence (positive/negative, -1 to 1)
    const positiveEmotions = (avgEmotions['HAPPY'] || 0) + (avgEmotions['CALM'] || 0);
    const negativeEmotions = (avgEmotions['SAD'] || 0) + (avgEmotions['ANGRY'] || 0) + 
                             (avgEmotions['DISGUSTED'] || 0) + (avgEmotions['FEAR'] || 0);
    
    const emotionalValence = positiveEmotions - negativeEmotions;
    
    // Emotional arousal (intensity, 0 to 1)
    const highArousalEmotions = (avgEmotions['ANGRY'] || 0) + (avgEmotions['FEAR'] || 0) + 
                                 (avgEmotions['SURPRISED'] || 0) + (avgEmotions['HAPPY'] || 0);
    const lowArousalEmotions = (avgEmotions['CALM'] || 0) + (avgEmotions['SAD'] || 0);
    
    const emotionalArousal = highArousalEmotions / (highArousalEmotions + lowArousalEmotions + 0.001);
    
    // Emotional stability (consistency across frames)
    const valencePerFrame = validFrames.map(f => {
      const emotions = f.faceDetails?.Emotions || [];
      const framePositive = emotions
        .filter(e => e.Type === 'HAPPY' || e.Type === 'CALM')
        .reduce((sum, e) => sum + e.Confidence, 0) / 100;
      const frameNegative = emotions
        .filter(e => ['SAD', 'ANGRY', 'DISGUSTED', 'FEAR'].includes(e.Type))
        .reduce((sum, e) => sum + e.Confidence, 0) / 100;
      return framePositive - frameNegative;
    });
    
    const valenceStd = this.computeStdDev(valencePerFrame);
    const emotionalStability = Math.max(0, 1 - valenceStd); // Lower std = higher stability
    
    return {
      emotionalValence: Math.max(-1, Math.min(1, emotionalValence)),
      emotionalArousal: Math.max(0, Math.min(1, emotionalArousal)),
      emotionalStability: Math.max(0, Math.min(1, emotionalStability))
    };
  }
  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  /**
   * Compute average duration of continuous events
   */
  private computeEventDuration(events: boolean[]): number {
    if (events.length === 0) return 0;
    
    const durations: number[] = [];
    let currentDuration = 0;
    
    for (const event of events) {
      if (event) {
        currentDuration++;
      } else if (currentDuration > 0) {
        durations.push(currentDuration);
        currentDuration = 0;
      }
    }
    
    if (currentDuration > 0) {
      durations.push(currentDuration);
    }
    
    if (durations.length === 0) return 0;
    
    const avgFrames = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const frameDuration = 2; // 0.5 fps = 2 seconds per frame
    
    return avgFrames * frameDuration;
  }
  
  /**
   * Compute standard deviation of a series
   */
  private computeStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Compute overall visual quality score
   */
  private computeOverallQuality(data: RekognitionResponse): number {
    const validFrames = data.analyses.filter(a => a.faceDetails);
    
    if (validFrames.length === 0) return 0;
    
    // Face presence quality
    const presenceQuality = validFrames.length / data.totalFrames;
    
    // Average face confidence
    const confidences = validFrames.map(f => (f.faceDetails?.Confidence || 0) / 100);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Average image quality (brightness, sharpness)
    const qualities = validFrames.map(f => {
      const quality = f.faceDetails?.Quality;
      if (!quality) return 0.5;
      
      const brightness = (quality.Brightness || 50) / 100;
      const sharpness = (quality.Sharpness || 50) / 100;
      
      return (brightness + sharpness) / 2;
    });
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    
    // Combined quality score
    return (presenceQuality * 0.4) + (avgConfidence * 0.3) + (avgQuality * 0.3);
  }
}


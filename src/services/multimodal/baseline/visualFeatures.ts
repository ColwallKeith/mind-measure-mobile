/**
 * Visual Feature Extraction - Baseline (AWS Rekognition)
 * 
 * Extracts 10 core visual features for baseline using AWS Rekognition.
 * 
 * Features:
 * 1. Smile frequency - % of frames smiling
 * 2. Smile intensity - Average smile confidence
 * 3. Eye contact - % of frames with eyes open and forward gaze
 * 4. Eyebrow position - Average eyebrow raise (surprise/concern)
 * 5. Facial tension - Derived from mouth/jaw tension
 * 6. Blink rate - Blinks per minute
 * 7. Head movement - Head pose variance
 * 8. Overall affect - Composite emotion score
 * 9. Face presence quality - % of frames with face detected
 * 10. Overall quality - Average detection confidence
 * 
 * Note: These same features will be extracted for check-ins (Phase 2) to ensure
 * consistent comparison against baseline.
 */

import type { BaselineVisualFeatures, CapturedMedia } from '../types';
import { MultimodalError, MultimodalErrorCode } from '../types';

interface RekognitionFrame {
  frameIndex: number;
  confidence: number;
  emotions: Array<{ type: string; confidence: number }>;
  smile: { value: boolean; confidence: number };
  eyesOpen: { value: boolean; confidence: number };
  mouthOpen: { value: boolean; confidence: number };
  pose: { roll: number; yaw: number; pitch: number };
  brightness: number;
  sharpness: number;
}

export class BaselineVisualExtractor {
  /**
   * Maximum number of frames to analyze with Rekognition
   * 
   * Rationale:
   * - Facial expressions don't change rapidly (0.5fps is sufficient)
   * - Longer conversations are richer in voice/text patterns
   * - GPT analysis adds additional visual context
   * - Processing 20-30 frames provides good coverage without excessive latency
   */
  private static readonly MAX_FRAMES_TO_ANALYZE = 25;
  
  /**
   * Extract visual features from captured video frames using AWS Rekognition
   */
  async extract(media: CapturedMedia): Promise<BaselineVisualFeatures> {
    if (!media.videoFrames || media.videoFrames.length === 0) {
      throw new MultimodalError(
        'No video frames available',
        MultimodalErrorCode.INSUFFICIENT_DATA,
        false
      );
    }

    try {
      // Cap and sample frames evenly across the conversation
      const framesToAnalyze = this.sampleFramesEvenly(
        media.videoFrames,
        BaselineVisualExtractor.MAX_FRAMES_TO_ANALYZE
      );
      

      // Convert video frames to base64 for API transmission
      const framesBase64 = await Promise.all(
        framesToAnalyze.map(blob => this.blobToBase64(blob))
      );

      // Calculate payload size for debugging
      const payloadSize = JSON.stringify({ frames: framesBase64 }).length;

      // Warn if payload is large
      if (payloadSize > 6 * 1024 * 1024) { // 6MB limit for most APIs
        console.warn('[VisualExtractor] ⚠️ Large payload detected, may cause timeout');
      }

      // Call Rekognition API
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
        console.error('[VisualExtractor] API returned error status:', response.status);
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('[VisualExtractor] Could not parse error response as JSON');
        }
        throw new Error(`Rekognition API failed (${response.status}): ${errorMessage}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('[VisualExtractor] Failed to parse response as JSON:', e);
        throw new Error('Rekognition API returned invalid JSON response');
      }

      if (!result || !result.analyses) {
        console.error('[VisualExtractor] Invalid response structure:', result);
        throw new Error('Rekognition API returned invalid response structure');
      }

      const analyses: RekognitionFrame[] = result.analyses;


      if (analyses.length === 0) {
        throw new MultimodalError(
          'No faces detected in video frames',
          MultimodalErrorCode.INSUFFICIENT_DATA,
          false
        );
      }

      // Extract features from Rekognition results
      const features: BaselineVisualFeatures = {
        smileFrequency: this.extractSmileFrequency(analyses),
        smileIntensity: this.extractSmileIntensity(analyses),
        eyeContact: this.extractEyeContact(analyses),
        eyebrowPosition: this.extractEyebrowPosition(analyses),
        facialTension: this.extractFacialTension(analyses),
        blinkRate: this.extractBlinkRate(analyses, media.duration),
        headMovement: this.extractHeadMovement(analyses),
        affect: this.extractAffect(analyses),
        facePresenceQuality: analyses.length / framesToAnalyze.length, // Use sampled frames, not all frames
        overallQuality: this.extractOverallQuality(analyses)
      };

      return features;

    } catch (error) {
      console.error('[VisualExtractor] ❌ Feature extraction failed:', error);
      
      if (error instanceof MultimodalError) {
        throw error;
      }
      
      throw new MultimodalError(
        'Failed to extract visual features: ' + (error instanceof Error ? error.message : 'Unknown error'),
        MultimodalErrorCode.FEATURE_EXTRACTION_FAILED,
        true
      );
    }
  }

  /**
   * Convert Blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Extract smile frequency (% of frames smiling)
   */
  private extractSmileFrequency(analyses: RekognitionFrame[]): number {
    const smilingFrames = analyses.filter(a => a.smile?.value === true).length;
    return smilingFrames / analyses.length;
  }

  /**
   * Extract average smile intensity
   */
  private extractSmileIntensity(analyses: RekognitionFrame[]): number {
    const smileConfidences = analyses
      .filter(a => a.smile?.value === true)
      .map(a => a.smile.confidence / 100);
    
    return smileConfidences.length > 0
      ? this.mean(smileConfidences)
      : 0;
  }

  /**
   * Extract eye contact ratio (eyes open + forward gaze)
   */
  private extractEyeContact(analyses: RekognitionFrame[]): number {
    const eyeContactFrames = analyses.filter(a => {
      const eyesOpen = a.eyesOpen?.value === true;
      const yaw = a.pose?.yaw || 0;
      const pitch = a.pose?.pitch || 0;
      
      // Consider "eye contact" if eyes open and head relatively straight
      // Yaw (left-right): -15 to +15 degrees
      // Pitch (up-down): -10 to +10 degrees
      const lookingStraight = Math.abs(yaw) < 15 && Math.abs(pitch) < 10;
      
      return eyesOpen && lookingStraight;
    }).length;
    
    return eyeContactFrames / analyses.length;
  }

  /**
   * Extract eyebrow position (stress/concern indicator)
   * Derived from "SURPRISED" emotion
   */
  private extractEyebrowPosition(analyses: RekognitionFrame[]): number {
    const surpriseScores = analyses.map(a => {
      const surprised = a.emotions?.find(e => e.type === 'SURPRISED');
      return surprised ? surprised.confidence / 100 : 0;
    });
    
    return this.mean(surpriseScores);
  }

  /**
   * Extract facial tension
   * Derived from mouth closed + negative emotions
   */
  private extractFacialTension(analyses: RekognitionFrame[]): number {
    const tensionScores = analyses.map(a => {
      const mouthClosed = a.mouthOpen?.value === false;
      const angry = a.emotions?.find(e => e.type === 'ANGRY')?.confidence || 0;
      const confused = a.emotions?.find(e => e.type === 'CONFUSED')?.confidence || 0;
      
      // Tension score: combination of closed mouth and negative emotions
      let tension = 0;
      if (mouthClosed) tension += 0.3;
      tension += (angry / 100) * 0.4;
      tension += (confused / 100) * 0.3;
      
      return Math.min(1, tension);
    });
    
    return this.mean(tensionScores);
  }

  /**
   * Extract blink rate (blinks per minute)
   * Detect transitions from eyes open to eyes closed
   */
  private extractBlinkRate(analyses: RekognitionFrame[], duration: number): number {
    let blinks = 0;
    let previousEyesOpen = true;

    for (const analysis of analyses) {
      const currentEyesOpen = analysis.eyesOpen?.value === true;
      
      // Detect blink (transition from open to closed)
      if (!currentEyesOpen && previousEyesOpen) {
        blinks++;
      }
      
      previousEyesOpen = currentEyesOpen;
    }

    // Convert to blinks per minute
    return (blinks / duration) * 60;
  }

  /**
   * Extract head movement (variance in pose)
   */
  private extractHeadMovement(analyses: RekognitionFrame[]): number {
    const yawValues = analyses.map(a => a.pose?.yaw || 0);
    const pitchValues = analyses.map(a => a.pose?.pitch || 0);
    const rollValues = analyses.map(a => a.pose?.roll || 0);
    
    const yawVariance = this.variance(yawValues);
    const pitchVariance = this.variance(pitchValues);
    const rollVariance = this.variance(rollValues);
    
    // Combine variances and normalize to 0-1
    const totalMovement = (yawVariance + pitchVariance + rollVariance) / 3;
    return Math.min(1, totalMovement / 100); // Normalize (typical variance 0-100 degrees²)
  }

  /**
   * Extract overall affect (-1 to +1)
   * Composite of emotions weighted by type
   */
  private extractAffect(analyses: RekognitionFrame[]): number {
    const affectScores = analyses.map(a => {
      if (!a.emotions || a.emotions.length === 0) return 0;
      
      let affect = 0;
      
      // Positive emotions (add to affect)
      const happy = a.emotions.find(e => e.type === 'HAPPY')?.confidence || 0;
      const calm = a.emotions.find(e => e.type === 'CALM')?.confidence || 0;
      affect += (happy / 100) * 1.0;
      affect += (calm / 100) * 0.5;
      
      // Negative emotions (subtract from affect)
      const sad = a.emotions.find(e => e.type === 'SAD')?.confidence || 0;
      const angry = a.emotions.find(e => e.type === 'ANGRY')?.confidence || 0;
      const disgusted = a.emotions.find(e => e.type === 'DISGUSTED')?.confidence || 0;
      const fear = a.emotions.find(e => e.type === 'FEAR')?.confidence || 0;
      affect -= (sad / 100) * 1.0;
      affect -= (angry / 100) * 0.8;
      affect -= (disgusted / 100) * 0.7;
      affect -= (fear / 100) * 0.9;
      
      return affect;
    });
    
    const avgAffect = this.mean(affectScores);
    return Math.max(-1, Math.min(1, avgAffect));
  }

  /**
   * Extract overall quality of visual data
   */
  private extractOverallQuality(analyses: RekognitionFrame[]): number {
    const confidences = analyses.map(a => a.confidence / 100);
    const brightnesses = analyses.map(a => a.brightness / 100);
    const sharpnesses = analyses.map(a => a.sharpness / 100);
    
    const avgConfidence = this.mean(confidences);
    const avgBrightness = this.mean(brightnesses);
    const avgSharpness = this.mean(sharpnesses);
    
    // Overall quality is weighted combination
    return (avgConfidence * 0.5) + (avgBrightness * 0.25) + (avgSharpness * 0.25);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Sample frames evenly across the conversation
   * 
   * If we have fewer frames than the max, use all.
   * If we have more, sample evenly to get a representative distribution.
   * 
   * @param frames - All captured frames
   * @param maxFrames - Maximum number of frames to return
   * @returns Sampled frames array
   */
  private sampleFramesEvenly(frames: Blob[], maxFrames: number): Blob[] {
    if (frames.length <= maxFrames) {
      return frames; // Use all frames if we're under the limit
    }
    
    // Sample evenly across the conversation
    const sampled: Blob[] = [];
    const step = frames.length / maxFrames;
    
    // Always include first frame
    sampled.push(frames[0]);
    
    // Sample middle frames (skip first and last since we'll add last separately)
    for (let i = 1; i < maxFrames - 1; i++) {
      const index = Math.floor(i * step);
      // Avoid duplicate first frame
      if (index > 0) {
        sampled.push(frames[index]);
      }
    }
    
    // Always include last frame (if different from first)
    const lastFrame = frames[frames.length - 1];
    if (lastFrame !== frames[0] && sampled.length < maxFrames) {
      sampled.push(lastFrame);
    }
    
    // Ensure we don't exceed maxFrames
    return sampled.slice(0, maxFrames);
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }
}

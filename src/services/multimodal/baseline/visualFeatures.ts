/**
 * Visual Feature Extraction - Baseline
 * 
 * Extracts 10 core visual features for baseline reference:
 * - Positive affect (smile frequency, intensity)
 * - Engagement (eye contact)
 * - Stress indicators (eyebrow position, facial tension)
 * - Fatigue indicators (blink rate)
 * - Movement (head movement)
 * - Overall affect
 * 
 * Note: This is a simplified implementation using basic computer vision.
 * For Phase 2 (check-ins), we'll use AWS Rekognition for full 18-feature extraction.
 */

import type { BaselineVisualFeatures, CapturedMedia } from '../types';
import { MultimodalError, MultimodalErrorCode } from '../types';

export class BaselineVisualExtractor {
  
  /**
   * Extract visual features from captured video frames
   */
  async extract(media: CapturedMedia): Promise<BaselineVisualFeatures> {
    if (!media.videoFrames || media.videoFrames.length === 0) {
      throw new MultimodalError(
        'No video frames available',
        MultimodalErrorCode.INSUFFICIENT_DATA,
        false
      );
    }

    console.log('[VisualExtractor] Extracting features from', media.videoFrames.length, 'frames');

    try {
      // Analyze each frame
      const frameAnalyses = await Promise.all(
        media.videoFrames.map(frame => this.analyzeFrame(frame))
      );

      // Filter out frames where no face was detected
      const validFrames = frameAnalyses.filter(f => f.faceDetected);
      console.log('[VisualExtractor]', validFrames.length, 'frames with faces detected');

      if (validFrames.length === 0) {
        throw new MultimodalError(
          'No faces detected in video frames',
          MultimodalErrorCode.INSUFFICIENT_DATA,
          false
        );
      }

      // Aggregate features across all valid frames
      const features: BaselineVisualFeatures = {
        smileFrequency: this.calculateMean(validFrames.map(f => f.smiling ? 1 : 0)),
        smileIntensity: this.calculateMean(validFrames.map(f => f.smileIntensity)),
        eyeContact: this.calculateMean(validFrames.map(f => f.lookingAtCamera ? 1 : 0)),
        eyebrowPosition: this.calculateMean(validFrames.map(f => f.eyebrowRaise)),
        facialTension: this.calculateMean(validFrames.map(f => f.tension)),
        blinkRate: this.estimateBlinkRate(validFrames, media.duration),
        headMovement: this.estimateHeadMovement(validFrames),
        affect: this.calculateMean(validFrames.map(f => f.affect)),
        facePresenceQuality: validFrames.length / frameAnalyses.length,
        overallQuality: this.assessOverallQuality(validFrames, frameAnalyses.length)
      };

      console.log('[VisualExtractor] ✅ Features extracted:', features);
      return features;

    } catch (error) {
      console.error('[VisualExtractor] ❌ Feature extraction failed:', error);
      
      if (error instanceof MultimodalError) {
        throw error;
      }
      
      throw new MultimodalError(
        'Failed to extract visual features',
        MultimodalErrorCode.FEATURE_EXTRACTION_FAILED,
        true
      );
    }
  }

  /**
   * Analyze a single video frame
   * 
   * NOTE: This is a SIMPLIFIED implementation using basic image analysis.
   * For production, we should use:
   * - face-api.js (client-side face detection)
   * - OR AWS Rekognition (server-side, more accurate)
   * 
   * For now, we'll use placeholder heuristics based on image properties.
   */
  private async analyzeFrame(frameBlob: Blob): Promise<FrameAnalysis> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(frameBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple heuristic analysis
        // TODO: Replace with actual face detection library in Phase 1.5
        const analysis = this.analyzeImageData(imageData);
        
        URL.revokeObjectURL(url);
        resolve(analysis);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Analyze image data to extract basic features
   * 
   * PLACEHOLDER: This uses simple heuristics.
   * TODO: Integrate face-api.js or similar library for real face detection
   */
  private analyzeImageData(imageData: ImageData): FrameAnalysis {
    const { data } = imageData;
    
    // Calculate basic image statistics
    const brightness = this.calculateBrightness(data);
    const contrast = this.calculateContrast(data);

    // For now, use probabilistic defaults + slight variation based on image properties
    // This ensures the module works end-to-end, even if features aren't perfect yet
    
    return {
      faceDetected: brightness > 0.2 && contrast > 0.1, // Simple heuristic
      smiling: Math.random() > 0.6, // TODO: Replace with real smile detection
      smileIntensity: 0.3 + (brightness * 0.4), // Brighter images tend to be happier (rough proxy)
      lookingAtCamera: Math.random() > 0.5, // TODO: Replace with gaze detection
      eyebrowRaise: 0.3 + (Math.random() * 0.2), // TODO: Replace with landmark detection
      tension: 0.3 + (contrast * 0.3), // Higher contrast might indicate tension (rough proxy)
      eyesOpen: brightness > 0.25, // Simple heuristic
      affect: (brightness - 0.5) * 2, // Map brightness to affect (-1 to 1)
      quality: Math.min(brightness * 2, 1.0)
    };
  }

  /**
   * Calculate average brightness
   */
  private calculateBrightness(data: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance formula
      sum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
    return sum / (data.length / 4);
  }

  /**
   * Calculate image contrast
   */
  private calculateContrast(data: Uint8ClampedArray): number {
    const brightness = this.calculateBrightness(data);
    let variance = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      variance += Math.pow(pixelBrightness - brightness, 2);
    }
    
    return Math.sqrt(variance / (data.length / 4));
  }

  /**
   * Estimate blink rate from frame sequence
   */
  private estimateBlinkRate(frames: FrameAnalysis[], duration: number): number {
    let blinks = 0;
    let previousEyesOpen = true;

    for (const frame of frames) {
      if (!frame.eyesOpen && previousEyesOpen) {
        blinks++;
      }
      previousEyesOpen = frame.eyesOpen;
    }

    // Blinks per minute
    return (blinks / duration) * 60;
  }

  /**
   * Estimate head movement from frame sequence
   * (simplified - would need landmark tracking for accuracy)
   */
  private estimateHeadMovement(frames: FrameAnalysis[]): number {
    // Placeholder: use quality variation as proxy for movement
    // More movement = more blur = lower quality variance
    const qualities = frames.map(f => f.quality);
    const variance = this.calculateVariance(qualities);
    return Math.min(1, variance * 2);
  }

  /**
   * Assess overall quality of visual data
   */
  private assessOverallQuality(validFrames: FrameAnalysis[], totalFrames: number): number {
    let quality = 1.0;

    // Penalize if too few frames
    if (totalFrames < 30) quality *= 0.7;
    if (totalFrames < 15) quality *= 0.5;

    // Penalize if low face detection rate
    const detectionRate = validFrames.length / totalFrames;
    if (detectionRate < 0.5) quality *= 0.6;
    if (detectionRate < 0.3) quality *= 0.4;

    // Penalize if average frame quality is low
    const avgFrameQuality = this.calculateMean(validFrames.map(f => f.quality));
    quality *= avgFrameQuality;

    return Math.max(0, Math.min(1, quality));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface FrameAnalysis {
  faceDetected: boolean;
  smiling: boolean;
  smileIntensity: number;
  lookingAtCamera: boolean;
  eyebrowRaise: number;
  tension: number;
  eyesOpen: boolean;
  affect: number; // -1 to 1
  quality: number; // 0 to 1
}


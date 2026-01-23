/**
 * Audio Feature Extraction - Baseline
 * 
 * Extracts 10 core audio features for baseline reference:
 * - Pitch (mean, variability)
 * - Speaking rate
 * - Pauses (frequency, duration)
 * - Voice quality (energy, jitter, shimmer, harmonic ratio)
 */

import type { BaselineAudioFeatures, CapturedMedia } from '../types';
import { MultimodalError, MultimodalErrorCode } from '../types';

export class BaselineAudioExtractor {
  /**
   * Maximum duration of audio to process (in seconds)
   * 
   * Rationale:
   * - Voice patterns are consistent across a conversation
   * - Processing full 2+ minute conversations is computationally expensive
   * - Sampling 30-60 seconds provides representative voice features
   * - Similar to video frame capping - we don't need every millisecond
   */
  private static readonly MAX_AUDIO_DURATION_SECONDS = 30; // Reduced from 60s to 30s for faster processing
  
  /**
   * Extract audio features from captured media
   */
  async extract(media: CapturedMedia): Promise<BaselineAudioFeatures> {
    if (!media.audio) {
      throw new MultimodalError(
        'No audio data available',
        MultimodalErrorCode.INSUFFICIENT_DATA,
        false
      );
    }

    console.log('[AudioExtractor] Extracting features from audio:', 
      (media.audio.size / 1024).toFixed(2), 'KB');

    try {
      // Decode audio blob to AudioBuffer
      const audioContext = new AudioContext();
      const arrayBuffer = await media.audio.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get full audio channel data
      const fullChannelData = audioBuffer.getChannelData(0); // Mono or first channel
      const sampleRate = audioBuffer.sampleRate;
      const fullDuration = audioBuffer.duration;

      console.log('[AudioExtractor] Audio decoded:', fullDuration.toFixed(2), 's,', sampleRate, 'Hz');

      // Sample audio chunks if duration exceeds max
      const channelData = this.sampleAudioChunks(
        fullChannelData,
        sampleRate,
        fullDuration,
        BaselineAudioExtractor.MAX_AUDIO_DURATION_SECONDS
      );
      const duration = channelData.length / sampleRate;
      
      console.log(`[AudioExtractor] Processing ${duration.toFixed(2)}s of audio from ${fullDuration.toFixed(2)}s total (${(channelData.length / 1000).toFixed(0)}k samples, max: ${BaselineAudioExtractor.MAX_AUDIO_DURATION_SECONDS}s)`);

      // Extract features with timing
      const extractionStartTime = Date.now();
      const features: BaselineAudioFeatures = {
        meanPitch: await this.extractMeanPitch(channelData, sampleRate),
        pitchVariability: await this.extractPitchVariability(channelData, sampleRate),
        speakingRate: this.estimateSpeakingRate(channelData, sampleRate, duration),
        pauseFrequency: this.extractPauseFrequency(channelData, sampleRate, duration),
        pauseDuration: this.extractPauseDuration(channelData, sampleRate),
        voiceEnergy: this.extractVoiceEnergy(channelData),
        jitter: this.extractJitter(channelData, sampleRate),
        shimmer: this.extractShimmer(channelData),
        harmonicRatio: this.extractHarmonicRatio(channelData, sampleRate),
        quality: this.assessQuality(channelData, duration)
      };
      const extractionTime = Date.now() - extractionStartTime;

      console.log('[AudioExtractor] ✅ Features extracted:', features);
      console.log(`[AudioExtractor] ⏱️ Audio extraction time: ${extractionTime}ms (processed ${duration.toFixed(1)}s from ${fullDuration.toFixed(1)}s total)`);
      await audioContext.close();

      return features;

    } catch (error) {
      console.error('[AudioExtractor] ❌ Feature extraction failed:', error);
      throw new MultimodalError(
        'Failed to extract audio features',
        MultimodalErrorCode.FEATURE_EXTRACTION_FAILED,
        true
      );
    }
  }

  /**
   * Extract mean pitch (F0) using autocorrelation
   * OPTIMIZED: Downsampled to 8kHz and increased hop size to reduce computation
   */
  private async extractMeanPitch(data: Float32Array, sampleRate: number): Promise<number> {
    // Downsample to 8kHz for pitch analysis (sufficient for human voice)
    const targetSampleRate = 8000;
    const downsampleRatio = sampleRate / targetSampleRate;
    const downsampledLength = Math.floor(data.length / downsampleRatio);
    const downsampled = new Float32Array(downsampledLength);
    
    for (let i = 0; i < downsampledLength; i++) {
      const srcIndex = Math.floor(i * downsampleRatio);
      downsampled[i] = data[srcIndex];
    }
    
    const effectiveSampleRate = targetSampleRate;
    const pitches: number[] = [];
    const frameSize = Math.floor(effectiveSampleRate * 0.04); // 40ms frames (was 30ms)
    const hopSize = Math.floor(frameSize * 0.75); // 75% overlap (was 50%, now fewer frames)

    // Process every 3rd frame to further reduce computation
    for (let i = 0; i < downsampled.length - frameSize; i += hopSize * 3) {
      const frame = downsampled.slice(i, i + frameSize);
      const pitch = this.estimatePitchAutocorrelation(frame, effectiveSampleRate);
      
      // Filter out unrealistic pitches (human voice typically 85-300 Hz)
      if (pitch >= 85 && pitch <= 300) {
        pitches.push(pitch);
      }
    }

    const validPitches = pitches.filter(p => p > 0);
    return validPitches.length > 0 
      ? validPitches.reduce((a, b) => a + b, 0) / validPitches.length 
      : 150; // Default if no valid pitch detected
  }

  /**
   * Estimate pitch using autocorrelation
   */
  private estimatePitchAutocorrelation(frame: Float32Array, sampleRate: number): number {
    const minLag = Math.floor(sampleRate / 300); // Max 300 Hz
    const maxLag = Math.floor(sampleRate / 85);  // Min 85 Hz
    
    let maxCorrelation = -1;
    let bestLag = 0;

    for (let lag = minLag; lag < maxLag && lag < frame.length / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < frame.length - lag; i++) {
        correlation += frame[i] * frame[i + lag];
      }
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    return bestLag > 0 ? sampleRate / bestLag : 0;
  }

  /**
   * Extract pitch variability (standard deviation)
   * OPTIMIZED: Uses same downsampling and frame skipping as extractMeanPitch
   */
  private async extractPitchVariability(data: Float32Array, sampleRate: number): Promise<number> {
    // Downsample to 8kHz (same as extractMeanPitch)
    const targetSampleRate = 8000;
    const downsampleRatio = sampleRate / targetSampleRate;
    const downsampledLength = Math.floor(data.length / downsampleRatio);
    const downsampled = new Float32Array(downsampledLength);
    
    for (let i = 0; i < downsampledLength; i++) {
      const srcIndex = Math.floor(i * downsampleRatio);
      downsampled[i] = data[srcIndex];
    }
    
    const effectiveSampleRate = targetSampleRate;
    const pitches: number[] = [];
    const frameSize = Math.floor(effectiveSampleRate * 0.04);
    const hopSize = Math.floor(frameSize * 0.75);

    // Process every 3rd frame (same as extractMeanPitch)
    for (let i = 0; i < downsampled.length - frameSize; i += hopSize * 3) {
      const frame = downsampled.slice(i, i + frameSize);
      const pitch = this.estimatePitchAutocorrelation(frame, effectiveSampleRate);
      if (pitch >= 85 && pitch <= 300) {
        pitches.push(pitch);
      }
    }

    if (pitches.length < 2) return 0;

    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pitches.length;
    return Math.sqrt(variance);
  }

  /**
   * Estimate speaking rate (simplified - words per minute)
   * Uses voice activity detection based on energy
   */
  private estimateSpeakingRate(data: Float32Array, sampleRate: number, duration: number): number {
    const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    const hopSize = frameSize / 2;
    let voiceFrames = 0;

    const energyThreshold = this.calculateEnergyThreshold(data);

    for (let i = 0; i < data.length - frameSize; i += hopSize) {
      const frame = data.slice(i, i + frameSize);
      const energy = this.calculateEnergy(frame);
      
      if (energy > energyThreshold) {
        voiceFrames++;
      }
    }

    const voiceDuration = (voiceFrames * hopSize) / sampleRate;
    // Rough estimation: average person speaks 2-3 words per second
    const estimatedWords = voiceDuration * 2.5;
    const wordsPerMinute = (estimatedWords / duration) * 60;

    return Math.min(200, Math.max(80, wordsPerMinute)); // Clamp to realistic range
  }

  /**
   * Extract pause frequency (pauses per minute)
   */
  private extractPauseFrequency(data: Float32Array, sampleRate: number, duration: number): number {
    const frameSize = Math.floor(sampleRate * 0.02);
    const hopSize = frameSize / 2;
    const energyThreshold = this.calculateEnergyThreshold(data);
    
    let pauseCount = 0;
    let inPause = false;
    let pauseFrames = 0;
    const minPauseFrames = Math.floor((sampleRate * 0.2) / hopSize); // Min 200ms pause

    for (let i = 0; i < data.length - frameSize; i += hopSize) {
      const frame = data.slice(i, i + frameSize);
      const energy = this.calculateEnergy(frame);
      
      if (energy < energyThreshold) {
        pauseFrames++;
        if (!inPause && pauseFrames >= minPauseFrames) {
          inPause = true;
          pauseCount++;
        }
      } else {
        inPause = false;
        pauseFrames = 0;
      }
    }

    return (pauseCount / duration) * 60; // Pauses per minute
  }

  /**
   * Extract average pause duration
   */
  private extractPauseDuration(data: Float32Array, sampleRate: number): number {
    const frameSize = Math.floor(sampleRate * 0.02);
    const hopSize = frameSize / 2;
    const energyThreshold = this.calculateEnergyThreshold(data);
    
    const pauseDurations: number[] = [];
    let pauseFrames = 0;

    for (let i = 0; i < data.length - frameSize; i += hopSize) {
      const frame = data.slice(i, i + frameSize);
      const energy = this.calculateEnergy(frame);
      
      if (energy < energyThreshold) {
        pauseFrames++;
      } else if (pauseFrames > 0) {
        const pauseDuration = (pauseFrames * hopSize) / sampleRate;
        if (pauseDuration >= 0.2) { // Min 200ms
          pauseDurations.push(pauseDuration);
        }
        pauseFrames = 0;
      }
    }

    return pauseDurations.length > 0
      ? pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length
      : 0.5; // Default 500ms
  }

  /**
   * Extract voice energy (average amplitude)
   */
  private extractVoiceEnergy(data: Float32Array): number {
    const energy = this.calculateEnergy(data);
    return Math.min(1, energy * 10); // Normalize to 0-1
  }

  /**
   * Extract jitter (voice stability)
   * Simplified: pitch period variability
   */
  private extractJitter(data: Float32Array, sampleRate: number): number {
    // Simplified jitter: we use pitch variability as a proxy
    // Real jitter requires cycle-to-cycle period analysis
    const pitchVar = this.extractPitchVariability(data, sampleRate);
    // Normalize to 0-1 (higher = more unstable)
    return Math.min(1, pitchVar / 50);
  }

  /**
   * Extract shimmer (voice quality)
   * Simplified: amplitude variability
   */
  private extractShimmer(data: Float32Array): number {
    const frameSize = 1024;
    const amplitudes: number[] = [];

    for (let i = 0; i < data.length - frameSize; i += frameSize) {
      const frame = data.slice(i, i + frameSize);
      const amplitude = Math.sqrt(this.calculateEnergy(frame));
      amplitudes.push(amplitude);
    }

    if (amplitudes.length < 2) return 0;

    const mean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const variance = amplitudes.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amplitudes.length;
    
    // Normalize to 0-1
    return Math.min(1, Math.sqrt(variance) * 10);
  }

  /**
   * Extract harmonic-to-noise ratio (voice clarity)
   * Simplified approach
   */
  private extractHarmonicRatio(data: Float32Array, sampleRate: number): number {
    // Simplified HNR: ratio of periodic to aperiodic energy
    // Real HNR requires autocorrelation analysis
    const frameSize = 2048;
    let periodicEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < data.length - frameSize; i += frameSize) {
      const frame = data.slice(i, i + frameSize);
      const energy = this.calculateEnergy(frame);
      totalEnergy += energy;
      
      // Detect periodicity through autocorrelation peak
      const maxCorr = this.getMaxAutocorrelation(frame);
      periodicEnergy += energy * maxCorr;
    }

    const ratio = totalEnergy > 0 ? periodicEnergy / totalEnergy : 0;
    return Math.min(1, Math.max(0, ratio));
  }

  /**
   * Assess overall audio quality
   */
  private assessQuality(data: Float32Array, duration: number): number {
    let qualityScore = 1.0;

    // Penalize if too short
    if (duration < 30) qualityScore *= 0.7;
    if (duration < 15) qualityScore *= 0.5;

    // Penalize if too quiet
    const energy = this.calculateEnergy(data);
    if (energy < 0.01) qualityScore *= 0.6;

    // Penalize if too much clipping
    const clippingRatio = this.calculateClippingRatio(data);
    if (clippingRatio > 0.01) qualityScore *= 0.8;

    return Math.max(0, Math.min(1, qualityScore));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateEnergy(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return sum / data.length;
  }

  private calculateEnergyThreshold(data: Float32Array): number {
    const energies: number[] = [];
    const frameSize = 512;
    
    for (let i = 0; i < data.length - frameSize; i += frameSize) {
      const frame = data.slice(i, i + frameSize);
      energies.push(this.calculateEnergy(frame));
    }
    
    energies.sort((a, b) => a - b);
    // Threshold at 25th percentile
    return energies[Math.floor(energies.length * 0.25)] || 0.001;
  }

  private getMaxAutocorrelation(data: Float32Array): number {
    const maxLag = Math.floor(data.length / 4);
    let maxCorr = 0;

    for (let lag = 1; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < data.length - lag; i++) {
        corr += data[i] * data[i + lag];
      }
      maxCorr = Math.max(maxCorr, Math.abs(corr));
    }

    return maxCorr / (data.length * 0.5);
  }

  private calculateClippingRatio(data: Float32Array): number {
    let clipped = 0;
    const threshold = 0.95;
    
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) {
        clipped++;
      }
    }
    
    return clipped / data.length;
  }

  /**
   * Sample audio chunks evenly across the conversation
   * 
   * If audio is longer than max duration, samples evenly distributed chunks
   * to get representative voice patterns without processing the entire file.
   * 
   * @param fullChannelData - Complete audio channel data
   * @param sampleRate - Audio sample rate
   * @param fullDuration - Full audio duration in seconds
   * @param maxDurationSeconds - Maximum duration to process
   * @returns Sampled audio channel data
   */
  private sampleAudioChunks(
    fullChannelData: Float32Array,
    sampleRate: number,
    fullDuration: number,
    maxDurationSeconds: number
  ): Float32Array {
    if (fullDuration <= maxDurationSeconds) {
      return fullChannelData; // Use all audio if under limit
    }
    
    // Calculate chunk size and spacing
    const chunkDuration = 2; // 2-second chunks
    const numChunks = Math.floor(maxDurationSeconds / chunkDuration);
    const chunkSamples = Math.floor(chunkDuration * sampleRate);
    const totalSamples = fullChannelData.length;
    const step = totalSamples / numChunks;
    
    // Sample evenly distributed chunks
    const sampledSamples: number[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startIndex = Math.floor(i * step);
      const endIndex = Math.min(startIndex + chunkSamples, totalSamples);
      const chunk = fullChannelData.slice(startIndex, endIndex);
      sampledSamples.push(...Array.from(chunk));
    }
    
    // Always include first and last 2 seconds for context
    const firstChunk = fullChannelData.slice(0, chunkSamples);
    const lastChunk = fullChannelData.slice(totalSamples - chunkSamples, totalSamples);
    
    // Combine: first chunk + sampled chunks + last chunk (avoid duplicates)
    const result = new Float32Array([
      ...Array.from(firstChunk),
      ...sampledSamples.slice(chunkSamples), // Skip first chunk if already included
      ...Array.from(lastChunk)
    ]);
    
    return result;
  }
}










/**
 * Check-in Audio Feature Extractor
 * 
 * Extracts 23 audio features from conversational speech:
 * - 8 pitch/prosody features
 * - 7 timing/rhythm features
 * - 5 energy/intensity features
 * - 3 voice quality features
 * 
 * Key difference from baseline: Calibrated for natural conversation,
 * not structured one-word Q&A responses.
 */

import type { CapturedMedia } from '../../types';
import type { CheckinAudioFeatures } from '../types';
import { CheckinMultimodalError } from '../types';

/** Target sample rate for all post-decode processing. Reduces 48kHz→8kHz for ≤6s extraction. */
const TARGET_SAMPLE_RATE = 8000;

/** Frame length (ms) for energy/segmentation. */
const FRAME_MS = 20;

/** Hop length (ms) for energy frames. */
const HOP_MS = 20;

export class CheckinAudioExtractor {
  /**
   * Maximum duration of audio to process (in seconds)
   * checkin23_bounded mode: 3 × 10s windows (start, middle, end) = 30s total
   */
  private static readonly MAX_AUDIO_DURATION_SECONDS = 30;
  
  /**
   * Window duration for checkin23_bounded mode
   */
  private static readonly WINDOW_DURATION_SECONDS = 10;
  
  /**
   * Extract all 23 audio features from conversational speech
   */
  async extract(media: CapturedMedia): Promise<CheckinAudioFeatures> {
    console.log('[CheckinAudioExtractor] Starting extraction...');
    
    if (!media.audio) {
      throw new CheckinMultimodalError(
        'No audio data provided',
        'NO_AUDIO_DATA',
        false,
        'audio'
      );
    }
    
    const startTime = Date.now();
    
    try {
      // Decode audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await media.audio.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log(`[CheckinAudioExtractor] Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz`);
      
      // Extract raw audio data
      const fullChannelData = audioBuffer.getChannelData(0);
      const sourceRate = audioBuffer.sampleRate;
      const fullDuration = audioBuffer.duration;
      
      // 1. Slice to 30s max (3×10s windows), then downsample to 8kHz immediately.
      //    All downstream work runs on 8kHz (~240k samples for 30s) instead of 48kHz (~1.44M).
      const trimmed = this.sampleAudioChunks(
        fullChannelData,
        sourceRate,
        fullDuration,
        CheckinAudioExtractor.MAX_AUDIO_DURATION_SECONDS
      );
      const channelData = this.downsample(trimmed, sourceRate, TARGET_SAMPLE_RATE);
      const duration = channelData.length / TARGET_SAMPLE_RATE;
      
      console.log(`[CheckinAudioExtractor] Processing ${duration.toFixed(2)}s @ ${TARGET_SAMPLE_RATE}Hz (${(channelData.length / 1000).toFixed(0)}k samples, downsampled from ${sourceRate}Hz)`);
      
      // 2. Pitch: middle 10s @ 8kHz, 100ms hop
      console.log(`[CheckinAudioExtractor] Extracting pitch features (F0 series, fast mode: middle 10s only)...`);
      const f0StartTime = Date.now();
      const f0Series = this.extractF0SeriesFast(channelData, duration);
      console.log(`[CheckinAudioExtractor] Pitch extraction complete in ${Date.now() - f0StartTime}ms`);
      
      // 3. Energy + segmentation: frame-level only (20ms frames, 20ms hop). No per-sample work.
      console.log(`[CheckinAudioExtractor] Extracting energy features...`);
      const energySeries = this.extractEnergySeriesFrames(channelData);
      
      console.log(`[CheckinAudioExtractor] Detecting speech segments...`);
      const segments = this.detectSpeechSegments(energySeries);
      
      // 4. Feature groups (all use downsampled signal and/or frame-level data)
      console.log(`[CheckinAudioExtractor] Computing feature groups...`);
      const pitchFeatures = this.extractPitchFeatures(f0Series, TARGET_SAMPLE_RATE);
      const timingFeatures = this.extractTimingFeatures(segments, duration, channelData, TARGET_SAMPLE_RATE);
      const energyFeatures = this.extractEnergyFeatures(energySeries, segments);
      const voiceQualityFeatures = this.extractVoiceQualityFeatures(channelData, TARGET_SAMPLE_RATE, f0Series);
      
      // Compute overall quality
      const quality = this.computeQuality(
        pitchFeatures,
        timingFeatures,
        energyFeatures,
        segments
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`[CheckinAudioExtractor] ✅ Extraction complete in ${processingTime}ms`);
      
      return {
        ...pitchFeatures,
        ...timingFeatures,
        ...energyFeatures,
        ...voiceQualityFeatures,
        quality,
        duration
      };
      
    } catch (error) {
      console.error('[CheckinAudioExtractor] ❌ Extraction failed:', error);
      throw new CheckinMultimodalError(
        `Audio extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        'AUDIO_EXTRACTION_FAILED',
        true,
        'audio'
      );
    }
  }
  
  // ==========================================================================
  // PITCH/PROSODY FEATURES (8 features)
  // ==========================================================================
  
  private extractPitchFeatures(f0Series: number[], sampleRate: number) {
    const validF0 = f0Series.filter(f0 => f0 > 0 && f0 < 500);
    
    if (validF0.length === 0) {
      return {
        meanPitch: 0,
        pitchRange: 0,
        pitchVariability: 0,
        pitchContourSlope: 0,
        jitter: null,
        shimmer: 0,
        harmonicRatio: 0,
        pitchDynamics: 0
      };
    }
    
    const meanPitch = validF0.reduce((sum, f0) => sum + f0, 0) / validF0.length;
    const minPitch = Math.min(...validF0);
    const maxPitch = Math.max(...validF0);
    const pitchRange = maxPitch - minPitch;
    
    // Pitch variability (standard deviation)
    const variance = validF0.reduce((sum, f0) => sum + Math.pow(f0 - meanPitch, 2), 0) / validF0.length;
    const pitchVariability = Math.sqrt(variance);
    
    // Pitch contour slope (overall trend)
    const pitchContourSlope = this.computeLinearTrend(validF0);
    
    // Jitter (pitch perturbation) - short-term variability
    const jitter = this.computeJitter(validF0);
    
    // Shimmer computed separately in voice quality
    const shimmer = 0; // Placeholder, computed in voice quality section
    
    // Harmonic ratio computed separately
    const harmonicRatio = 0; // Placeholder
    
    // Pitch dynamics (rate of pitch change)
    const pitchDynamics = this.computePitchDynamics(validF0);
    
    return {
      meanPitch,
      pitchRange,
      pitchVariability,
      pitchContourSlope,
      jitter,
      shimmer,
      harmonicRatio,
      pitchDynamics
    };
  }
  
  // ==========================================================================
  // TIMING/RHYTHM FEATURES (7 features)
  // ==========================================================================
  
  private extractTimingFeatures(
    segments: Array<{ start: number; end: number; isSpeech: boolean }>,
    duration: number,
    channelData: Float32Array,
    sampleRate: number
  ) {
    const speechSegments = segments.filter(s => s.isSpeech);
    const pauseSegments = segments.filter(s => !s.isSpeech);
    
    // Total speech time
    const totalSpeechTime = speechSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
    const speechRatio = totalSpeechTime / duration;
    
    // Speaking rate (words per minute) - FAST: estimate from speech ratio and duration
    // Skip expensive syllable counting - use simple heuristic
    const estimatedSyllables = Math.max(1, Math.floor(totalSpeechTime * 2.5)); // ~2.5 syllables/sec average
    const speakingRate = (estimatedSyllables / totalSpeechTime) * 60; // syllables/min
    
    // Articulation rate (syllables per second, excluding pauses)
    const articulationRate = totalSpeechTime > 0 ? estimatedSyllables / totalSpeechTime : 0;
    
    // Pause frequency (pauses per minute)
    const pauseFrequency = (pauseSegments.length / duration) * 60;
    
    // Average pause duration
    const pauseDurations = pauseSegments.map(s => s.end - s.start);
    const pauseDuration = pauseDurations.length > 0
      ? pauseDurations.reduce((sum, d) => sum + d, 0) / pauseDurations.length
      : 0;
    
    // Filled pause rate (um, uh, er) - estimate from short speech bursts
    const filledPauseRate = this.estimateFilledPauses(segments);
    
    // Total silence duration
    const silenceDuration = pauseSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
    
    return {
      speakingRate,
      articulationRate,
      pauseFrequency,
      pauseDuration,
      speechRatio,
      filledPauseRate,
      silenceDuration
    };
  }
  
  // ==========================================================================
  // ENERGY/INTENSITY FEATURES (5 features)
  // ==========================================================================
  
  private extractEnergyFeatures(
    energySeries: number[],
    segments: Array<{ start: number; end: number; isSpeech: boolean }>
  ) {
    const frameTime = FRAME_MS / 1000;
    const speechEnergy = energySeries.filter((_, i) => {
      const time = i * frameTime;
      return segments.some(s => s.isSpeech && time >= s.start && time <= s.end);
    });
    
    if (speechEnergy.length === 0) {
      return {
        voiceEnergy: 0,
        energyVariability: 0,
        energyContour: 0,
        dynamicRange: 0,
        stressPatterns: 0
      };
    }
    
    // Mean voice energy
    const voiceEnergy = speechEnergy.reduce((sum, e) => sum + e, 0) / speechEnergy.length;
    
    // Energy variability (standard deviation)
    const variance = speechEnergy.reduce((sum, e) => sum + Math.pow(e - voiceEnergy, 2), 0) / speechEnergy.length;
    const energyVariability = Math.sqrt(variance);
    
    // Energy contour (overall trend)
    const energyContour = this.computeLinearTrend(speechEnergy);
    
    // Dynamic range
    const minEnergy = Math.min(...speechEnergy);
    const maxEnergy = Math.max(...speechEnergy);
    const dynamicRange = maxEnergy - minEnergy;
    
    // Stress patterns (local energy peaks indicating emphasis)
    const stressPatterns = this.detectStressPatterns(speechEnergy);
    
    return {
      voiceEnergy,
      energyVariability,
      energyContour,
      dynamicRange,
      stressPatterns
    };
  }
  
  // ==========================================================================
  // VOICE QUALITY FEATURES (3 features)
  // ==========================================================================
  
  private extractVoiceQualityFeatures(
    channelData: Float32Array,
    sampleRate: number,
    f0Series: number[]
  ) {
    // Spectral centroid (brightness of voice)
    const spectralCentroid = this.computeSpectralCentroid(channelData, sampleRate);
    
    // Spectral flux (rate of spectral change)
    const spectralFlux = this.computeSpectralFlux(channelData, sampleRate);
    
    // Voiced ratio (proportion of voiced frames)
    const voicedFrames = f0Series.filter(f0 => f0 > 0).length;
    const voicedRatio = f0Series.length > 0 ? voicedFrames / f0Series.length : 0;
    
    return {
      spectralCentroid,
      spectralFlux,
      voicedRatio
    };
  }
  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  /**
   * Downsample to target rate (e.g. 48kHz → 8kHz). Applied immediately after decode/slice.
   */
  private downsample(
    data: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate <= toRate) return data;
    const factor = fromRate / toRate;
    const outLen = Math.floor(data.length / factor);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = Math.floor(i * factor);
      out[i] = data[src];
    }
    return out;
  }
  
  /**
   * Sample audio in 3 × 10s windows (start, middle, end) - checkin23_bounded mode
   * 
   * @param fullChannelData - Complete audio channel data
   * @param sampleRate - Audio sample rate
   * @param duration - Full audio duration in seconds
   * @param maxDurationSeconds - Maximum duration to process (30s)
   * @returns Sampled audio channel data (3 × 10s windows)
   */
  private sampleAudioChunks(
    fullChannelData: Float32Array,
    sampleRate: number,
    duration: number,
    maxDurationSeconds: number
  ): Float32Array {
    if (duration <= maxDurationSeconds) {
      return fullChannelData; // Use all audio if under limit
    }
    
    const windowSamples = Math.floor(CheckinAudioExtractor.WINDOW_DURATION_SECONDS * sampleRate);
    const totalSamples = fullChannelData.length;
    
    // 3 windows: start (0-10s), middle (center-5s to center+5s), end (last 10s)
    const startWindow = fullChannelData.slice(0, windowSamples);
    const middleStart = Math.floor((totalSamples - windowSamples) / 2);
    const middleWindow = fullChannelData.slice(middleStart, middleStart + windowSamples);
    const endWindow = fullChannelData.slice(totalSamples - windowSamples, totalSamples);
    
    // Combine: start + middle + end (30s total)
    const result = new Float32Array([
      ...Array.from(startWindow),
      ...Array.from(middleWindow),
      ...Array.from(endWindow)
    ]);
    
    return result;
  }
  
  /**
   * Extract fundamental frequency (F0) series using autocorrelation - FAST VERSION
   * Expects already-downsampled 8kHz signal. Uses middle 10s only, 100ms hop.
   */
  private extractF0SeriesFast(channelData: Float32Array, duration: number): number[] {
    const sr = TARGET_SAMPLE_RATE;
    const windowDuration = 10;
    const middleStart = Math.max(0, (duration - windowDuration) / 2);
    const middleStartSample = Math.floor(middleStart * sr);
    const windowSamples = Math.floor(windowDuration * sr);
    const middleWindow = channelData.slice(middleStartSample, middleStartSample + windowSamples);
    
    const frameSize = Math.floor(sr * 0.03);  // 30ms frames
    const hopSize = Math.floor(sr * 0.1);     // 100ms hop
    const f0Series: number[] = [];
    
    for (let i = 0; i < middleWindow.length - frameSize; i += hopSize) {
      const frame = middleWindow.slice(i, i + frameSize);
      const f0 = this.estimateF0Autocorrelation(frame, sr);
      f0Series.push(f0);
    }
    
    return f0Series;
  }
  
  /**
   * Extract fundamental frequency (F0) series using autocorrelation (legacy, kept for fallback)
   */
  private extractF0Series(channelData: Float32Array, sampleRate: number): number[] {
    const frameSize = Math.floor(sampleRate * 0.03); // 30ms frames
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
    const f0Series: number[] = [];
    
    for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
      const frame = channelData.slice(i, i + frameSize);
      const f0 = this.estimateF0Autocorrelation(frame, sampleRate);
      f0Series.push(f0);
    }
    
    return f0Series;
  }
  
  /**
   * Estimate F0 using autocorrelation method
   */
  private estimateF0Autocorrelation(frame: Float32Array, sampleRate: number): number {
    const minLag = Math.floor(sampleRate / 500); // 500 Hz max
    const maxLag = Math.floor(sampleRate / 80);  // 80 Hz min
    
    let maxCorr = 0;
    let bestLag = 0;
    
    for (let lag = minLag; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < frame.length - lag; i++) {
        corr += frame[i] * frame[i + lag];
      }
      
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0;
  }
  
  /**
   * Extract energy series from frame-level RMS. Uses 20ms frames, 20ms hop.
   * Input must be downsampled (8kHz). Iterates over frames only, no per-sample scan.
   */
  private extractEnergySeriesFrames(channelData: Float32Array): number[] {
    const frameSamples = Math.floor((TARGET_SAMPLE_RATE * FRAME_MS) / 1000);
    const hopSamples = Math.floor((TARGET_SAMPLE_RATE * HOP_MS) / 1000);
    const energySeries: number[] = [];
    
    for (let i = 0; i <= channelData.length - frameSamples; i += hopSamples) {
      const frame = channelData.slice(i, i + frameSamples);
      let sumSq = 0;
      for (let j = 0; j < frame.length; j++) sumSq += frame[j] * frame[j];
      const rms = Math.sqrt(sumSq / frame.length);
      energySeries.push(rms);
    }
    
    return energySeries;
  }
  
  /**
   * Detect speech vs pause segments from frame-level energy. Iterates over frames only.
   */
  private detectSpeechSegments(
    energySeries: number[]
  ): Array<{ start: number; end: number; isSpeech: boolean }> {
    const frameTime = FRAME_MS / 1000;
    const threshold = this.computeEnergyThreshold(energySeries);
    
    const segments: Array<{ start: number; end: number; isSpeech: boolean }> = [];
    let currentSegment: { start: number; isSpeech: boolean } | null = null;
    
    for (let i = 0; i < energySeries.length; i++) {
      const time = i * frameTime;
      const isSpeech = energySeries[i] > threshold;
      
      if (!currentSegment) {
        currentSegment = { start: time, isSpeech };
      } else if (currentSegment.isSpeech !== isSpeech) {
        segments.push({ ...currentSegment, end: time });
        currentSegment = { start: time, isSpeech };
      }
    }
    
    if (currentSegment) {
      segments.push({ ...currentSegment, end: energySeries.length * frameTime });
    }
    
    return this.mergeShortSegments(segments, 0.2);
  }
  
  /**
   * Compute energy threshold for speech detection
   */
  private computeEnergyThreshold(energySeries: number[]): number {
    const sortedEnergy = [...energySeries].sort((a, b) => a - b);
    const percentile40 = sortedEnergy[Math.floor(sortedEnergy.length * 0.4)];
    return percentile40 * 1.5; // 1.5x 40th percentile
  }
  
  /**
   * Merge segments shorter than minDuration
   */
  private mergeShortSegments(
    segments: Array<{ start: number; end: number; isSpeech: boolean }>,
    minDuration: number
  ): Array<{ start: number; end: number; isSpeech: boolean }> {
    const merged: Array<{ start: number; end: number; isSpeech: boolean }> = [];
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const duration = seg.end - seg.start;
      
      if (duration >= minDuration) {
        merged.push(seg);
      } else if (merged.length > 0) {
        // Merge into previous segment
        merged[merged.length - 1].end = seg.end;
      }
    }
    
    return merged;
  }
  
  /**
   * Legacy energy series (20ms frames) for estimateSyllables. Frame-level only.
   */
  private extractEnergySeries(data: Float32Array, sampleRate: number): number[] {
    const frameSamples = Math.floor((sampleRate * FRAME_MS) / 1000);
    const out: number[] = [];
    for (let i = 0; i <= data.length - frameSamples; i += frameSamples) {
      const frame = data.slice(i, i + frameSamples);
      let sumSq = 0;
      for (let j = 0; j < frame.length; j++) sumSq += frame[j] * frame[j];
      out.push(Math.sqrt(sumSq / frame.length));
    }
    return out;
  }
  
  /**
   * Estimate syllable count from energy peaks (legacy; timing uses heuristic)
   */
  private estimateSyllables(
    channelData: Float32Array,
    sampleRate: number,
    speechSegments: Array<{ start: number; end: number }>
  ): number {
    let syllableCount = 0;
    
    for (const seg of speechSegments) {
      const startIdx = Math.floor(seg.start * sampleRate);
      const endIdx = Math.floor(seg.end * sampleRate);
      const segmentData = channelData.slice(startIdx, endIdx);
      
      const energySeries = this.extractEnergySeries(segmentData, sampleRate);
      const peaks = this.findPeaks(energySeries);
      syllableCount += peaks.length;
    }
    
    return Math.max(1, syllableCount);
  }
  
  /**
   * Find peaks in a series
   */
  private findPeaks(series: number[]): number[] {
    const peaks: number[] = [];
    const threshold = Math.max(...series) * 0.6; // 60% of max
    
    for (let i = 1; i < series.length - 1; i++) {
      if (series[i] > series[i - 1] && series[i] > series[i + 1] && series[i] > threshold) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }
  
  /**
   * Estimate filled pauses (um, uh, er) from short speech bursts
   */
  private estimateFilledPauses(
    segments: Array<{ start: number; end: number; isSpeech: boolean }>
  ): number {
    const shortBursts = segments.filter(s => {
      const duration = s.end - s.start;
      return s.isSpeech && duration > 0.1 && duration < 0.5; // 100-500ms
    });
    
    return shortBursts.length;
  }
  
  /**
   * Compute linear trend (slope) of a series
   */
  private computeLinearTrend(series: number[]): number {
    if (series.length < 2) return 0;
    
    const n = series.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = series.reduce((sum, val) => sum + val, 0);
    const sumXY = series.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
  
  /**
   * Compute jitter (pitch perturbation)
   */
  private computeJitter(f0Series: number[]): number | null {
    if (f0Series.length < 2) return null;
    
    let sumAbsDiff = 0;
    for (let i = 1; i < f0Series.length; i++) {
      sumAbsDiff += Math.abs(f0Series[i] - f0Series[i - 1]);
    }
    
    const avgAbsDiff = sumAbsDiff / (f0Series.length - 1);
    const avgF0 = f0Series.reduce((sum, f0) => sum + f0, 0) / f0Series.length;
    
    return avgF0 > 0 ? avgAbsDiff / avgF0 : null;
  }
  
  /**
   * Compute pitch dynamics (rate of pitch change)
   */
  private computePitchDynamics(f0Series: number[]): number {
    if (f0Series.length < 2) return 0;
    
    let sumAbsDiff = 0;
    for (let i = 1; i < f0Series.length; i++) {
      sumAbsDiff += Math.abs(f0Series[i] - f0Series[i - 1]);
    }
    
    return sumAbsDiff / (f0Series.length - 1);
  }
  
  /**
   * Detect stress patterns (local energy peaks)
   */
  private detectStressPatterns(energySeries: number[]): number {
    const peaks = this.findPeaks(energySeries);
    return peaks.length;
  }
  
  /**
   * Compute spectral centroid (voice brightness). Input: downsampled 8kHz.
   * Samples middle 2s only; frame-level FFT (2048).
   */
  private computeSpectralCentroid(channelData: Float32Array, sampleRate: number): number {
    const fftSize = 2048;
    const sampleStart = Math.floor((channelData.length - (sampleRate * 2)) / 2);
    const sampleEnd = sampleStart + (sampleRate * 2);
    const sample = channelData.slice(Math.max(0, sampleStart), Math.min(channelData.length, sampleEnd));
    const spectrum = this.computeFFT(sample.slice(0, Math.min(fftSize, sample.length)));
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < spectrum.length / 2; i++) {
      const frequency = (i * sampleRate) / fftSize;
      const magnitude = spectrum[i];
      numerator += frequency * magnitude;
      denominator += magnitude;
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  /**
   * Compute spectral flux (rate of spectral change). Input: downsampled 8kHz.
   * Middle 3s only; 2048 FFT, hop 1024 (fewer FFTs).
   */
  private computeSpectralFlux(channelData: Float32Array, sampleRate: number): number {
    const fftSize = 2048;
    const hopSize = 1024;
    const sampleDuration = 3;
    const sampleStart = Math.floor((channelData.length - (sampleRate * sampleDuration)) / 2);
    const sampleEnd = sampleStart + (sampleRate * sampleDuration);
    const sampleData = channelData.slice(Math.max(0, sampleStart), Math.min(channelData.length, sampleEnd));
    
    let totalFlux = 0;
    let frameCount = 0;
    let prevSpectrum: number[] | null = null;
    
    // Process only the sampled window
    for (let i = 0; i < sampleData.length - fftSize; i += hopSize) {
      const frame = sampleData.slice(i, i + fftSize);
      const spectrum = this.computeFFT(frame);
      
      if (prevSpectrum) {
        let flux = 0;
        for (let j = 0; j < spectrum.length / 2; j++) {
          const diff = spectrum[j] - prevSpectrum[j];
          flux += diff * diff;
        }
        totalFlux += Math.sqrt(flux);
        frameCount++;
      }
      
      prevSpectrum = spectrum;
    }
    
    return frameCount > 0 ? totalFlux / frameCount : 0;
  }
  
  /**
   * Simple FFT implementation (using Web Audio API would be better in production)
   */
  private computeFFT(frame: Float32Array): number[] {
    // Simplified magnitude spectrum
    // In production, use a proper FFT library or Web Audio AnalyserNode
    const n = frame.length;
    const spectrum = new Array(n).fill(0);
    
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += frame[t] * Math.cos(angle);
        imag -= frame[t] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }
  
  /**
   * Compute overall audio quality score
   */
  private computeQuality(
    pitchFeatures: any,
    timingFeatures: any,
    energyFeatures: any,
    segments: Array<{ start: number; end: number; isSpeech: boolean }>
  ): number {
    let quality = 1.0;
    
    if (pitchFeatures.meanPitch > 0) {
      if (pitchFeatures.meanPitch < 80 || pitchFeatures.meanPitch > 400) quality *= 0.7;
    } else {
      quality *= 0.9; // No pitch data
    }
    
    // Penalize if very low speech ratio
    if (timingFeatures.speechRatio < 0.3) {
      quality *= 0.8;
    }
    
    // Penalize if energy is very low
    if (energyFeatures.voiceEnergy < 0.001) {
      quality *= 0.7;
    }
    
    // Penalize if too few speech segments
    const speechSegments = segments.filter(s => s.isSpeech);
    if (speechSegments.length < 3) {
      quality *= 0.6;
    }
    
    return Math.max(0.3, Math.min(1.0, quality));
  }
}










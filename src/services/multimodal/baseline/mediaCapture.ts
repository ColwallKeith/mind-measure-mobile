/**
 * Media Capture Module
 * 
 * Handles audio and video recording during baseline assessment
 */

import type { MediaCaptureConfig, CapturedMedia } from '../types';
import { MultimodalError, MultimodalErrorCode } from '../types';

export class MediaCapture {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private videoFrames: Blob[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private frameIntervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private config: MediaCaptureConfig;

  constructor(config: MediaCaptureConfig) {
    this.config = {
      videoFrameRate: 0.5, // 0.5 fps (1 frame every 2 seconds) to stay under Vercel's 4.5MB limit
      audioSampleRate: 48000,
      ...config
    };
  }

  /**
   * Request permissions and start capturing media
   */
  async start(): Promise<void> {
    
    try {
      // Request permissions
      const constraints: MediaStreamConstraints = {
        audio: this.config.captureAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: this.config.audioSampleRate
        } : false,
        video: this.config.captureVideo ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Split into audio and video streams
      if (this.config.captureAudio && stream.getAudioTracks().length > 0) {
        this.audioStream = new MediaStream(stream.getAudioTracks());
        this.startAudioRecording();
      }
      
      if (this.config.captureVideo && stream.getVideoTracks().length > 0) {
        this.videoStream = new MediaStream(stream.getVideoTracks());
        this.startVideoCapture();
      }

      this.startTime = Date.now();
      
    } catch (error) {
      console.error('[MediaCapture] ❌ Failed to start capture:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new MultimodalError(
          'Camera/microphone permission denied',
          MultimodalErrorCode.PERMISSION_DENIED,
          false
        );
      }
      
      throw new MultimodalError(
        'Failed to start media capture',
        MultimodalErrorCode.MEDIA_CAPTURE_FAILED,
        true
      );
    }
  }

  /**
   * Start recording audio
   */
  private startAudioRecording(): void {
    if (!this.audioStream) return;

    try {
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      
    } catch (error) {
      console.error('[MediaCapture] ❌ Audio recording failed:', error);
    }
  }

  /**
   * Start capturing video frames at specified interval
   */
  private startVideoCapture(): void {
    if (!this.videoStream) return;

    try {
      // Create video element for frame capture
      const video = document.createElement('video');
      video.srcObject = this.videoStream;
      video.play();

      // Create canvas for frame extraction
      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Wait for video to be ready
      video.onloadedmetadata = () => {
        this.canvas!.width = video.videoWidth;
        this.canvas!.height = video.videoHeight;

        // Capture frames at specified rate
        const intervalMs = 1000 / (this.config.videoFrameRate || 1);
        this.frameIntervalId = setInterval(() => {
          this.captureFrame(video, ctx);
        }, intervalMs);

      };

    } catch (error) {
      console.error('[MediaCapture] ❌ Video capture failed:', error);
    }
  }

  /**
   * Capture a single video frame
   */
  private captureFrame(video: HTMLVideoElement, ctx: CanvasRenderingContext2D): void {
    try {
      ctx.drawImage(video, 0, 0);
      this.canvas!.toBlob((blob) => {
        if (blob) {
          this.videoFrames.push(blob);
        }
      }, 'image/jpeg', 0.6); // Reduced quality to 0.6 to minimize payload size
    } catch (error) {
      console.error('[MediaCapture] Failed to capture frame:', error);
    }
  }

  /**
   * Stop capturing and return collected media
   */
  async stop(): Promise<CapturedMedia> {
    const endTime = Date.now();

    // Stop audio recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        this.mediaRecorder!.onstop = () => resolve();
        this.mediaRecorder!.stop();
      });
    }

    // Stop video capture
    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
      this.frameIntervalId = null;
    }

    // Stop streams
    this.stopStreams();

    // Compile captured media
    const capturedMedia: CapturedMedia = {
      duration: (endTime - this.startTime) / 1000,
      startTime: this.startTime,
      endTime: endTime
    };

    if (this.audioChunks.length > 0) {
      capturedMedia.audio = new Blob(this.audioChunks, { type: 'audio/webm' });
    }

    if (this.videoFrames.length > 0) {
      capturedMedia.videoFrames = this.videoFrames;
    }

    // Cleanup
    this.cleanup();

    return capturedMedia;
  }

  /**
   * Stop all media streams
   */
  private stopStreams(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.videoFrames = [];
    this.canvas = null;
    this.frameIntervalId = null;
  }

  /**
   * Cancel capture and cleanup
   */
  cancel(): void {
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
    }
    
    this.stopStreams();
    this.cleanup();
  }
}


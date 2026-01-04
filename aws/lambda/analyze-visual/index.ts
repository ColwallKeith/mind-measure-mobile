/**
 * AWS Lambda: Analyze Visual
 * Processes visual data using AWS Rekognition for emotion detection
 * HIPAA-compliant visual analysis for Mind Measure scoring pipeline
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RekognitionClient, DetectFacesCommand, DetectFacesCommandInput } from '@aws-sdk/client-rekognition';
import { validateCognitoToken, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '../shared/auth';
import { insertRecord } from '../shared/database';

interface VisualAnalysis {
  session_id: string;
  user_id: string;
  emotion_timeline: Array<{
    timestamp: number;
    emotions: Array<{
      Type: string;
      Confidence: number;
    }>;
    face_confidence: number;
    pose: {
      Roll?: number;
      Yaw?: number;
      Pitch?: number;
    };
    quality: {
      Brightness?: number;
      Sharpness?: number;
    };
  }>;
  summary: {
    dominant_emotions: string[];
    emotional_stability: number;
    engagement_level: 'high' | 'medium' | 'low';
    average_confidence: number;
    total_frames_analyzed: number;
  };
  wellbeing_indicators: {
    positive_emotion_ratio: number;
    stress_indicators: string[];
    attention_level: 'focused' | 'moderate' | 'distracted';
  };
  created_at: string;
}

/**
 * Initialize AWS Rekognition client
 */
function createRekognitionClient(): RekognitionClient {
  return new RekognitionClient({
    region: process.env.AWS_REGION || 'eu-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
    }
  });
}

/**
 * Analyze a single frame using AWS Rekognition
 */
async function analyzeFrame(
  rekognition: RekognitionClient,
  frameData: { imageData: string; timestamp: number }
): Promise<any> {
  try {
    // Convert base64 image data to buffer
    const imageBuffer = Buffer.from(frameData.imageData, 'base64');
    
    const input: DetectFacesCommandInput = {
      Image: {
        Bytes: imageBuffer
      },
      Attributes: ['ALL'] // Include emotions, pose, quality, etc.
    };
    
    const command = new DetectFacesCommand(input);
    const result = await rekognition.send(command);
    
    if (result.FaceDetails && result.FaceDetails.length > 0) {
      const face = result.FaceDetails[0];
      
      return {
        timestamp: frameData.timestamp,
        emotions: face.Emotions || [],
        face_confidence: face.Confidence || 0,
        pose: {
          Roll: face.Pose?.Roll,
          Yaw: face.Pose?.Yaw,
          Pitch: face.Pose?.Pitch
        },
        quality: {
          Brightness: face.Quality?.Brightness,
          Sharpness: face.Quality?.Sharpness
        }
      };
    } else {
      // No face detected in this frame
      return {
        timestamp: frameData.timestamp,
        emotions: [],
        face_confidence: 0,
        pose: {},
        quality: {}
      };
    }
  } catch (error) {
    console.warn(`⚠️ Frame analysis failed for timestamp ${frameData.timestamp}:`, error);
    return {
      timestamp: frameData.timestamp,
      emotions: [],
      face_confidence: 0,
      pose: {},
      quality: {},
      error: 'analysis_failed'
    };
  }
}

/**
 * Calculate dominant emotions from timeline
 */
function calculateDominantEmotions(emotionTimeline: any[]): string[] {
  const emotionCounts: { [key: string]: number } = {};
  
  emotionTimeline.forEach(frame => {
    frame.emotions.forEach((emotion: any) => {
      if (emotion.Confidence > 50) { // Only count high-confidence emotions
        emotionCounts[emotion.Type] = (emotionCounts[emotion.Type] || 0) + emotion.Confidence;
      }
    });
  });
  
  // Sort by total confidence and return top 3
  return Object.entries(emotionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([emotion]) => emotion);
}

/**
 * Calculate emotional stability (consistency over time)
 */
function calculateEmotionalStability(emotionTimeline: any[]): number {
  if (emotionTimeline.length < 2) return 0.5;
  
  // Calculate variance in dominant emotion confidence
  const dominantEmotionConfidences = emotionTimeline.map(frame => {
    if (frame.emotions.length === 0) return 0;
    return Math.max(...frame.emotions.map((e: any) => e.Confidence));
  });
  
  const mean = dominantEmotionConfidences.reduce((sum, conf) => sum + conf, 0) / dominantEmotionConfidences.length;
  const variance = dominantEmotionConfidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / dominantEmotionConfidences.length;
  
  // Convert variance to stability score (lower variance = higher stability)
  const stability = Math.max(0, 1 - (variance / 1000)); // Normalize variance
  return Math.min(1, stability);
}

/**
 * Determine engagement level from visual cues
 */
function calculateEngagementLevel(emotionTimeline: any[]): 'high' | 'medium' | 'low' {
  const framesWithFaces = emotionTimeline.filter(frame => frame.face_confidence > 50).length;
  const totalFrames = emotionTimeline.length;
  const faceDetectionRatio = totalFrames > 0 ? framesWithFaces / totalFrames : 0;
  
  // Calculate average attention based on pose (looking at camera)
  const attentiveFrames = emotionTimeline.filter(frame => {
    const pose = frame.pose;
    return pose.Yaw !== undefined && Math.abs(pose.Yaw) < 30 && // Looking roughly at camera
           pose.Pitch !== undefined && Math.abs(pose.Pitch) < 20;
  }).length;
  
  const attentionRatio = framesWithFaces > 0 ? attentiveFrames / framesWithFaces : 0;
  
  // Combine face detection and attention ratios
  const engagementScore = (faceDetectionRatio * 0.6) + (attentionRatio * 0.4);
  
  if (engagementScore > 0.7) return 'high';
  if (engagementScore > 0.4) return 'medium';
  return 'low';
}

/**
 * Analyze wellbeing indicators from emotions
 */
function analyzeWellbeingIndicators(emotionTimeline: any[]): any {
  const positiveEmotions = ['HAPPY', 'CALM', 'SURPRISED'];
  const negativeEmotions = ['SAD', 'ANGRY', 'FEAR', 'DISGUSTED'];
  const stressEmotions = ['CONFUSED', 'ANGRY', 'FEAR'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let totalEmotions = 0;
  const stressIndicators: string[] = [];
  
  emotionTimeline.forEach(frame => {
    frame.emotions.forEach((emotion: any) => {
      if (emotion.Confidence > 50) {
        totalEmotions++;
        
        if (positiveEmotions.includes(emotion.Type)) {
          positiveCount++;
        } else if (negativeEmotions.includes(emotion.Type)) {
          negativeCount++;
        }
        
        if (stressEmotions.includes(emotion.Type) && emotion.Confidence > 70) {
          stressIndicators.push(emotion.Type.toLowerCase());
        }
      }
    });
  });
  
  const positiveRatio = totalEmotions > 0 ? positiveCount / totalEmotions : 0.5;
  
  // Determine attention level based on pose consistency
  const stableFrames = emotionTimeline.filter(frame => {
    return frame.pose.Yaw !== undefined && Math.abs(frame.pose.Yaw) < 45;
  }).length;
  
  const attentionLevel = stableFrames / emotionTimeline.length > 0.7 ? 'focused' :
                        stableFrames / emotionTimeline.length > 0.4 ? 'moderate' : 'distracted';
  
  return {
    positive_emotion_ratio: positiveRatio,
    stress_indicators: [...new Set(stressIndicators)], // Remove duplicates
    attention_level: attentionLevel
  };
}

/**
 * Main Lambda handler for visual analysis
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('👁️ Visual Analysis Lambda triggered');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: ''
    };
  }

  try {
    // 1. Validate Cognito JWT token
    const user = await validateCognitoToken(event.headers.Authorization || event.headers.authorization);
    if (!user) {
      console.warn('❌ Unauthorized access attempt');
      return createUnauthorizedResponse();
    }

    console.log(`✅ User authenticated: ${user.email}`);

    // 2. Parse and validate input
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const { sessionId, visualFrames } = JSON.parse(event.body);
    
    if (!sessionId) {
      return createErrorResponse(400, 'sessionId is required');
    }

    if (!visualFrames || !Array.isArray(visualFrames)) {
      return createErrorResponse(400, 'visualFrames array is required');
    }

    console.log(`🔍 Processing visual analysis for session: ${sessionId}, ${visualFrames.length} frames`);

    // 3. Initialize AWS Rekognition client
    const rekognition = createRekognitionClient();

    // 4. Analyze each frame with Rekognition
    console.log('🎭 Analyzing frames with AWS Rekognition...');
    
    const emotionTimeline = [];
    const maxFramesToProcess = Math.min(visualFrames.length, 20); // Limit to 20 frames for cost control
    
    for (let i = 0; i < maxFramesToProcess; i++) {
      const frame = visualFrames[i];
      if (frame.imageData) {
        const analysis = await analyzeFrame(rekognition, frame);
        emotionTimeline.push(analysis);
        
        // Add small delay to avoid rate limiting
        if (i < maxFramesToProcess - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`✅ Processed ${emotionTimeline.length} frames successfully`);

    // 5. Calculate summary metrics
    const dominantEmotions = calculateDominantEmotions(emotionTimeline);
    const emotionalStability = calculateEmotionalStability(emotionTimeline);
    const engagementLevel = calculateEngagementLevel(emotionTimeline);
    
    const averageConfidence = emotionTimeline.reduce((sum, frame) => {
      return sum + frame.face_confidence;
    }, 0) / emotionTimeline.length;

    // 6. Analyze wellbeing indicators
    const wellbeingIndicators = analyzeWellbeingIndicators(emotionTimeline);

    // 7. Build comprehensive visual analysis object
    const visualAnalysis: VisualAnalysis = {
      session_id: sessionId,
      user_id: user.id,
      emotion_timeline: emotionTimeline,
      summary: {
        dominant_emotions: dominantEmotions,
        emotional_stability: emotionalStability,
        engagement_level: engagementLevel,
        average_confidence: averageConfidence,
        total_frames_analyzed: emotionTimeline.length
      },
      wellbeing_indicators: wellbeingIndicators,
      created_at: new Date().toISOString()
    };

    // 8. Store analysis results in database
    console.log('💾 Storing visual analysis in database...');
    
    const insertedRecord = await insertRecord('visual_analysis', {
      session_id: sessionId,
      user_id: user.id,
      analysis_data: visualAnalysis,
      created_at: new Date()
    });

    console.log(`✅ Visual analysis completed and stored with ID: ${insertedRecord.id}`);

    // 9. Return success response
    return createSuccessResponse({
      success: true,
      visualAnalysis,
      analysisId: insertedRecord.id,
      summary: {
        dominant_emotions: dominantEmotions,
        emotional_stability: emotionalStability,
        engagement_level: engagementLevel,
        average_confidence: averageConfidence,
        frames_processed: emotionTimeline.length,
        positive_emotion_ratio: wellbeingIndicators.positive_emotion_ratio,
        attention_level: wellbeingIndicators.attention_level
      }
    });

  } catch (error) {
    console.error('❌ Visual analysis error:', error);
    return createErrorResponse(500, 'Visual analysis failed', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};






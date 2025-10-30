"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_rekognition_1 = require("@aws-sdk/client-rekognition");
const auth_1 = require("../shared/auth");
const database_1 = require("../shared/database");
function createRekognitionClient() {
    return new client_rekognition_1.RekognitionClient({
        region: process.env.AWS_REGION || 'eu-west-2',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
        }
    });
}
async function analyzeFrame(rekognition, frameData) {
    try {
        const imageBuffer = Buffer.from(frameData.imageData, 'base64');
        const input = {
            Image: {
                Bytes: imageBuffer
            },
            Attributes: ['ALL']
        };
        const command = new client_rekognition_1.DetectFacesCommand(input);
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
        }
        else {
            return {
                timestamp: frameData.timestamp,
                emotions: [],
                face_confidence: 0,
                pose: {},
                quality: {}
            };
        }
    }
    catch (error) {
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
function calculateDominantEmotions(emotionTimeline) {
    const emotionCounts = {};
    emotionTimeline.forEach(frame => {
        frame.emotions.forEach((emotion) => {
            if (emotion.Confidence > 50) {
                emotionCounts[emotion.Type] = (emotionCounts[emotion.Type] || 0) + emotion.Confidence;
            }
        });
    });
    return Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);
}
function calculateEmotionalStability(emotionTimeline) {
    if (emotionTimeline.length < 2)
        return 0.5;
    const dominantEmotionConfidences = emotionTimeline.map(frame => {
        if (frame.emotions.length === 0)
            return 0;
        return Math.max(...frame.emotions.map((e) => e.Confidence));
    });
    const mean = dominantEmotionConfidences.reduce((sum, conf) => sum + conf, 0) / dominantEmotionConfidences.length;
    const variance = dominantEmotionConfidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / dominantEmotionConfidences.length;
    const stability = Math.max(0, 1 - (variance / 1000));
    return Math.min(1, stability);
}
function calculateEngagementLevel(emotionTimeline) {
    const framesWithFaces = emotionTimeline.filter(frame => frame.face_confidence > 50).length;
    const totalFrames = emotionTimeline.length;
    const faceDetectionRatio = totalFrames > 0 ? framesWithFaces / totalFrames : 0;
    const attentiveFrames = emotionTimeline.filter(frame => {
        const pose = frame.pose;
        return pose.Yaw !== undefined && Math.abs(pose.Yaw) < 30 &&
            pose.Pitch !== undefined && Math.abs(pose.Pitch) < 20;
    }).length;
    const attentionRatio = framesWithFaces > 0 ? attentiveFrames / framesWithFaces : 0;
    const engagementScore = (faceDetectionRatio * 0.6) + (attentionRatio * 0.4);
    if (engagementScore > 0.7)
        return 'high';
    if (engagementScore > 0.4)
        return 'medium';
    return 'low';
}
function analyzeWellbeingIndicators(emotionTimeline) {
    const positiveEmotions = ['HAPPY', 'CALM', 'SURPRISED'];
    const negativeEmotions = ['SAD', 'ANGRY', 'FEAR', 'DISGUSTED'];
    const stressEmotions = ['CONFUSED', 'ANGRY', 'FEAR'];
    let positiveCount = 0;
    let negativeCount = 0;
    let totalEmotions = 0;
    const stressIndicators = [];
    emotionTimeline.forEach(frame => {
        frame.emotions.forEach((emotion) => {
            if (emotion.Confidence > 50) {
                totalEmotions++;
                if (positiveEmotions.includes(emotion.Type)) {
                    positiveCount++;
                }
                else if (negativeEmotions.includes(emotion.Type)) {
                    negativeCount++;
                }
                if (stressEmotions.includes(emotion.Type) && emotion.Confidence > 70) {
                    stressIndicators.push(emotion.Type.toLowerCase());
                }
            }
        });
    });
    const positiveRatio = totalEmotions > 0 ? positiveCount / totalEmotions : 0.5;
    const stableFrames = emotionTimeline.filter(frame => {
        return frame.pose.Yaw !== undefined && Math.abs(frame.pose.Yaw) < 45;
    }).length;
    const attentionLevel = stableFrames / emotionTimeline.length > 0.7 ? 'focused' :
        stableFrames / emotionTimeline.length > 0.4 ? 'moderate' : 'distracted';
    return {
        positive_emotion_ratio: positiveRatio,
        stress_indicators: [...new Set(stressIndicators)],
        attention_level: attentionLevel
    };
}
const handler = async (event) => {
    console.log('👁️ Visual Analysis Lambda triggered');
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
        const user = await (0, auth_1.validateCognitoToken)(event.headers.Authorization || event.headers.authorization);
        if (!user) {
            console.warn('❌ Unauthorized access attempt');
            return (0, auth_1.createUnauthorizedResponse)();
        }
        console.log(`✅ User authenticated: ${user.email}`);
        if (!event.body) {
            return (0, auth_1.createErrorResponse)(400, 'Request body is required');
        }
        const { sessionId, visualFrames } = JSON.parse(event.body);
        if (!sessionId) {
            return (0, auth_1.createErrorResponse)(400, 'sessionId is required');
        }
        if (!visualFrames || !Array.isArray(visualFrames)) {
            return (0, auth_1.createErrorResponse)(400, 'visualFrames array is required');
        }
        console.log(`🔍 Processing visual analysis for session: ${sessionId}, ${visualFrames.length} frames`);
        const rekognition = createRekognitionClient();
        console.log('🎭 Analyzing frames with AWS Rekognition...');
        const emotionTimeline = [];
        const maxFramesToProcess = Math.min(visualFrames.length, 20);
        for (let i = 0; i < maxFramesToProcess; i++) {
            const frame = visualFrames[i];
            if (frame.imageData) {
                const analysis = await analyzeFrame(rekognition, frame);
                emotionTimeline.push(analysis);
                if (i < maxFramesToProcess - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
        console.log(`✅ Processed ${emotionTimeline.length} frames successfully`);
        const dominantEmotions = calculateDominantEmotions(emotionTimeline);
        const emotionalStability = calculateEmotionalStability(emotionTimeline);
        const engagementLevel = calculateEngagementLevel(emotionTimeline);
        const averageConfidence = emotionTimeline.reduce((sum, frame) => {
            return sum + frame.face_confidence;
        }, 0) / emotionTimeline.length;
        const wellbeingIndicators = analyzeWellbeingIndicators(emotionTimeline);
        const visualAnalysis = {
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
        console.log('💾 Storing visual analysis in database...');
        const insertedRecord = await (0, database_1.insertRecord)('visual_analysis', {
            session_id: sessionId,
            user_id: user.id,
            analysis_data: visualAnalysis,
            created_at: new Date()
        });
        console.log(`✅ Visual analysis completed and stored with ID: ${insertedRecord.id}`);
        return (0, auth_1.createSuccessResponse)({
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
    }
    catch (error) {
        console.error('❌ Visual analysis error:', error);
        return (0, auth_1.createErrorResponse)(500, 'Visual analysis failed', {
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.handler = handler;

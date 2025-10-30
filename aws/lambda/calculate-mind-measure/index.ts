/**
 * AWS Lambda: Calculate Mind Measure Score
 * Multi-modal fusion algorithm for baseline assessment scoring
 * HIPAA-compliant scoring pipeline for Mind Measure
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateCognitoToken, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '../shared/auth';
import { selectRecords, insertRecord, updateRecords } from '../shared/database';

interface FusionOutput {
  session_id: string;
  user_id: string;
  score: number;
  final_score: number;
  score_smoothed: number;
  p_worse_fused: number;
  uncertainty: number;
  qc_overall: number;
  public_state: string;
  model_version: string;
  analysis: any;
  topics: string[];
  created_at: string;
}

/**
 * Calculate baseline score from PHQ-2, GAD-2, and mood scale
 * This is a provisional algorithm for baseline assessments
 */
function calculateBaselineScore(textAnalysis: any): number {
  if (!textAnalysis?.calculated_scores) {
    console.warn('⚠️ No calculated scores found, using fallback');
    return 50; // Neutral baseline
  }

  const { phq2_total, gad2_total, mood_self_report } = textAnalysis.calculated_scores;
  
  // PHQ-2 scoring (0-6 scale, higher = more depressive symptoms)
  // Convert to 0-100 scale where 100 = best wellbeing
  const phq2Score = Math.max(0, 100 - (phq2_total / 6) * 100);
  
  // GAD-2 scoring (0-6 scale, higher = more anxiety symptoms)  
  // Convert to 0-100 scale where 100 = best wellbeing
  const gad2Score = Math.max(0, 100 - (gad2_total / 6) * 100);
  
  // Mood self-report (1-10 scale, higher = better mood)
  // Convert to 0-100 scale
  const moodScore = mood_self_report ? (mood_self_report / 10) * 100 : 50;
  
  // Weighted fusion of the three components
  // PHQ-2: 35% weight (depression indicators)
  // GAD-2: 35% weight (anxiety indicators)  
  // Mood: 30% weight (self-reported wellbeing)
  const fusedScore = (phq2Score * 0.35) + (gad2Score * 0.35) + (moodScore * 0.30);
  
  // Ensure score is within valid range
  return Math.round(Math.max(0, Math.min(100, fusedScore)));
}

/**
 * Calculate quality score based on conversation completeness and engagement
 */
function calculateQualityScore(
  textAnalysis: any,
  audioAnalysis?: any,
  visualAnalysis?: any
): number {
  let qualityScore = 0.5; // Base quality
  
  // Text analysis quality (40% weight)
  if (textAnalysis?.conversation_quality) {
    const { completeness, clarity, engagement } = textAnalysis.conversation_quality;
    
    const completenessScore = completeness === 'complete' ? 1.0 : 
                             completeness === 'partial' ? 0.7 : 0.3;
    const clarityScore = clarity === 'high' ? 1.0 : 
                        clarity === 'medium' ? 0.7 : 0.4;
    const engagementScore = engagement === 'high' ? 1.0 : 
                           engagement === 'medium' ? 0.7 : 0.4;
    
    const textQuality = (completenessScore + clarityScore + engagementScore) / 3;
    qualityScore += textQuality * 0.4;
  }
  
  // Audio analysis quality (30% weight)
  if (audioAnalysis?.processing_metadata?.quality_score) {
    qualityScore += (audioAnalysis.processing_metadata.quality_score / 100) * 0.3;
  }
  
  // Visual analysis quality (30% weight)  
  if (visualAnalysis?.summary?.engagement_level) {
    const visualEngagement = visualAnalysis.summary.engagement_level === 'high' ? 1.0 :
                            visualAnalysis.summary.engagement_level === 'medium' ? 0.7 : 0.4;
    qualityScore += visualEngagement * 0.3;
  }
  
  return Math.max(0.1, Math.min(1.0, qualityScore));
}

/**
 * Calculate uncertainty based on data availability and quality
 */
function calculateUncertainty(
  textAnalysis: any,
  audioAnalysis?: any,
  visualAnalysis?: any
): number {
  let uncertainty = 0.5; // Base uncertainty
  
  // Reduce uncertainty based on available data modalities
  const hasText = textAnalysis && textAnalysis.conversation_quality?.completeness !== 'incomplete';
  const hasAudio = audioAnalysis && audioAnalysis.processing_metadata?.quality_score > 0.5;
  const hasVisual = visualAnalysis && visualAnalysis.summary?.engagement_level !== 'low';
  
  const modalityCount = [hasText, hasAudio, hasVisual].filter(Boolean).length;
  
  // More modalities = lower uncertainty
  if (modalityCount === 3) uncertainty = 0.2;
  else if (modalityCount === 2) uncertainty = 0.3;
  else if (modalityCount === 1) uncertainty = 0.4;
  
  // Adjust based on conversation quality
  if (textAnalysis?.conversation_quality?.completeness === 'complete') {
    uncertainty -= 0.1;
  }
  
  return Math.max(0.1, Math.min(0.8, uncertainty));
}

/**
 * Generate analysis summary for the fusion output
 */
function generateAnalysisSummary(
  score: number,
  textAnalysis: any,
  audioAnalysis?: any,
  visualAnalysis?: any
): any {
  const analysis = {
    overall_wellbeing: score >= 70 ? 'good' : score >= 40 ? 'moderate' : 'concerning',
    assessment_type: 'baseline',
    conversation_quality: textAnalysis?.conversation_quality?.completeness || 'unknown',
    
    // PHQ-2 and GAD-2 insights
    depression_indicators: {
      phq2_total: textAnalysis?.calculated_scores?.phq2_total || 0,
      level: textAnalysis?.calculated_scores?.phq2_total >= 3 ? 'elevated' : 'normal'
    },
    
    anxiety_indicators: {
      gad2_total: textAnalysis?.calculated_scores?.gad2_total || 0,
      level: textAnalysis?.calculated_scores?.gad2_total >= 3 ? 'elevated' : 'normal'
    },
    
    mood_self_report: {
      score: textAnalysis?.calculated_scores?.mood_self_report || null,
      level: textAnalysis?.calculated_scores?.mood_self_report >= 7 ? 'positive' :
             textAnalysis?.calculated_scores?.mood_self_report >= 4 ? 'neutral' : 'low'
    },
    
    risk_assessment: {
      flag: textAnalysis?.risk_assessment?.risk_flag || 'none',
      requires_followup: textAnalysis?.risk_assessment?.risk_flag === 'safeguarding_signal'
    }
  };
  
  // Add audio insights if available
  if (audioAnalysis) {
    (analysis as any).audio_insights = {
      speech_patterns: 'analyzed',
      vocal_indicators: 'processed'
    };
  }
  
  // Add visual insights if available
  if (visualAnalysis) {
    (analysis as any).visual_insights = {
      emotion_analysis: visualAnalysis.summary?.dominant_emotions || 'not_available',
      engagement: visualAnalysis.summary?.engagement_level || 'unknown'
    };
  }
  
  return analysis;
}

/**
 * Main Lambda handler for Mind Measure score calculation
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('🧠 Mind Measure Calculation Lambda triggered');
  
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

    const { sessionId } = JSON.parse(event.body);
    
    if (!sessionId) {
      return createErrorResponse(400, 'sessionId is required');
    }

    console.log(`🔍 Calculating Mind Measure score for session: ${sessionId}`);

    // 3. Retrieve analysis data from database
    console.log('📊 Retrieving analysis data from database...');
    
    const textAnalysisRecords = await selectRecords('text_analysis', { 
      session_id: sessionId, 
      user_id: user.id 
    });
    
    const audioAnalysisRecords = await selectRecords('audio_analysis', { 
      session_id: sessionId, 
      user_id: user.id 
    });
    
    const visualAnalysisRecords = await selectRecords('visual_analysis', { 
      session_id: sessionId, 
      user_id: user.id 
    });

    // Extract analysis data (may be null if not available)
    const textAnalysis = textAnalysisRecords[0]?.analysis_data;
    const audioAnalysis = audioAnalysisRecords[0]?.analysis_data;
    const visualAnalysis = visualAnalysisRecords[0]?.analysis_data;

    console.log(`📈 Analysis data retrieved - Text: ${!!textAnalysis}, Audio: ${!!audioAnalysis}, Visual: ${!!visualAnalysis}`);

    // 4. Calculate baseline score using available data
    let rawScore: number;
    
    if (textAnalysis) {
      rawScore = calculateBaselineScore(textAnalysis);
      console.log(`🎯 Baseline score calculated from text analysis: ${rawScore}`);
    } else {
      // Fallback scoring if no text analysis available
      rawScore = 50; // Neutral baseline
      console.warn('⚠️ No text analysis available, using neutral baseline score');
    }

    // 5. Calculate quality and uncertainty metrics
    const qualityScore = calculateQualityScore(textAnalysis, audioAnalysis, visualAnalysis);
    const uncertainty = calculateUncertainty(textAnalysis, audioAnalysis, visualAnalysis);
    
    // 6. Apply smoothing and final adjustments
    const finalScore = rawScore; // For baseline, no historical smoothing needed
    const smoothedScore = rawScore; // Same as final for baseline
    const pWorseFused = Math.max(0, Math.min(1, (100 - finalScore) / 100));

    // 7. Generate comprehensive analysis
    const analysis = generateAnalysisSummary(finalScore, textAnalysis, audioAnalysis, visualAnalysis);

    // 8. Create fusion output record
    const fusionOutput: FusionOutput = {
      session_id: sessionId,
      user_id: user.id,
      score: rawScore,
      final_score: finalScore,
      score_smoothed: smoothedScore,
      p_worse_fused: pWorseFused,
      uncertainty,
      qc_overall: qualityScore,
      public_state: 'report',
      model_version: 'mind-measure-lambda-v1.0',
      analysis,
      topics: ['wellbeing', 'baseline', 'initial_assessment'],
      created_at: new Date().toISOString()
    };

    // 9. Insert fusion output into database
    console.log('💾 Storing fusion output in database...');
    
    const insertedRecord = await insertRecord('fusion_outputs', {
      session_id: sessionId,
      user_id: user.id,
      score: rawScore,
      final_score: finalScore,
      score_smoothed: smoothedScore,
      p_worse_fused: pWorseFused,
      uncertainty,
      qc_overall: qualityScore,
      public_state: 'report',
      model_version: 'mind-measure-lambda-v1.0',
      analysis: JSON.stringify(analysis),
      topics: JSON.stringify(['wellbeing', 'baseline', 'initial_assessment']),
      created_at: new Date()
    });

    console.log(`✅ Fusion output stored with ID: ${insertedRecord.id}`);

    // 10. Update assessment session status to completed
    await updateRecords('assessment_sessions', 
      { status: 'completed', updated_at: new Date() },
      { id: sessionId, user_id: user.id }
    );

    // 11. Update user profile to mark baseline as established
    await updateRecords('profiles',
      { baseline_established: true, updated_at: new Date() },
      { user_id: user.id }
    );

    console.log('✅ Assessment session and user profile updated');

    // 12. Return success response
    return createSuccessResponse({
      success: true,
      fusionOutput,
      fusionId: insertedRecord.id,
      summary: {
        final_score: finalScore,
        quality_score: qualityScore,
        uncertainty,
        analysis_summary: {
          overall_wellbeing: analysis.overall_wellbeing,
          phq2_total: analysis.depression_indicators?.phq2_total,
          gad2_total: analysis.anxiety_indicators?.gad2_total,
          mood_self_report: analysis.mood_self_report?.score,
          risk_flag: analysis.risk_assessment?.flag
        }
      }
    });

  } catch (error) {
    console.error('❌ Mind Measure calculation error:', error);
    return createErrorResponse(500, 'Mind Measure calculation failed', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

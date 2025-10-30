"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const auth_1 = require("../shared/auth");
const database_1 = require("../shared/database");
function calculateBaselineScore(textAnalysis) {
    if (!textAnalysis?.calculated_scores) {
        console.warn('⚠️ No calculated scores found, using fallback');
        return 50;
    }
    const { phq2_total, gad2_total, mood_self_report } = textAnalysis.calculated_scores;
    const phq2Score = Math.max(0, 100 - (phq2_total / 6) * 100);
    const gad2Score = Math.max(0, 100 - (gad2_total / 6) * 100);
    const moodScore = mood_self_report ? (mood_self_report / 10) * 100 : 50;
    const fusedScore = (phq2Score * 0.35) + (gad2Score * 0.35) + (moodScore * 0.30);
    return Math.round(Math.max(0, Math.min(100, fusedScore)));
}
function calculateQualityScore(textAnalysis, audioAnalysis, visualAnalysis) {
    let qualityScore = 0.5;
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
    if (audioAnalysis?.processing_metadata?.quality_score) {
        qualityScore += (audioAnalysis.processing_metadata.quality_score / 100) * 0.3;
    }
    if (visualAnalysis?.summary?.engagement_level) {
        const visualEngagement = visualAnalysis.summary.engagement_level === 'high' ? 1.0 :
            visualAnalysis.summary.engagement_level === 'medium' ? 0.7 : 0.4;
        qualityScore += visualEngagement * 0.3;
    }
    return Math.max(0.1, Math.min(1.0, qualityScore));
}
function calculateUncertainty(textAnalysis, audioAnalysis, visualAnalysis) {
    let uncertainty = 0.5;
    const hasText = textAnalysis && textAnalysis.conversation_quality?.completeness !== 'incomplete';
    const hasAudio = audioAnalysis && audioAnalysis.processing_metadata?.quality_score > 0.5;
    const hasVisual = visualAnalysis && visualAnalysis.summary?.engagement_level !== 'low';
    const modalityCount = [hasText, hasAudio, hasVisual].filter(Boolean).length;
    if (modalityCount === 3)
        uncertainty = 0.2;
    else if (modalityCount === 2)
        uncertainty = 0.3;
    else if (modalityCount === 1)
        uncertainty = 0.4;
    if (textAnalysis?.conversation_quality?.completeness === 'complete') {
        uncertainty -= 0.1;
    }
    return Math.max(0.1, Math.min(0.8, uncertainty));
}
function generateAnalysisSummary(score, textAnalysis, audioAnalysis, visualAnalysis) {
    const analysis = {
        overall_wellbeing: score >= 70 ? 'good' : score >= 40 ? 'moderate' : 'concerning',
        assessment_type: 'baseline',
        conversation_quality: textAnalysis?.conversation_quality?.completeness || 'unknown',
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
    if (audioAnalysis) {
        analysis.audio_insights = {
            speech_patterns: 'analyzed',
            vocal_indicators: 'processed'
        };
    }
    if (visualAnalysis) {
        analysis.visual_insights = {
            emotion_analysis: visualAnalysis.summary?.dominant_emotions || 'not_available',
            engagement: visualAnalysis.summary?.engagement_level || 'unknown'
        };
    }
    return analysis;
}
const handler = async (event) => {
    console.log('🧠 Mind Measure Calculation Lambda triggered');
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
        const { sessionId } = JSON.parse(event.body);
        if (!sessionId) {
            return (0, auth_1.createErrorResponse)(400, 'sessionId is required');
        }
        console.log(`🔍 Calculating Mind Measure score for session: ${sessionId}`);
        console.log('📊 Retrieving analysis data from database...');
        const textAnalysisRecords = await (0, database_1.selectRecords)('text_analysis', {
            session_id: sessionId,
            user_id: user.id
        });
        const audioAnalysisRecords = await (0, database_1.selectRecords)('audio_analysis', {
            session_id: sessionId,
            user_id: user.id
        });
        const visualAnalysisRecords = await (0, database_1.selectRecords)('visual_analysis', {
            session_id: sessionId,
            user_id: user.id
        });
        const textAnalysis = textAnalysisRecords[0]?.analysis_data;
        const audioAnalysis = audioAnalysisRecords[0]?.analysis_data;
        const visualAnalysis = visualAnalysisRecords[0]?.analysis_data;
        console.log(`📈 Analysis data retrieved - Text: ${!!textAnalysis}, Audio: ${!!audioAnalysis}, Visual: ${!!visualAnalysis}`);
        let rawScore;
        if (textAnalysis) {
            rawScore = calculateBaselineScore(textAnalysis);
            console.log(`🎯 Baseline score calculated from text analysis: ${rawScore}`);
        }
        else {
            rawScore = 50;
            console.warn('⚠️ No text analysis available, using neutral baseline score');
        }
        const qualityScore = calculateQualityScore(textAnalysis, audioAnalysis, visualAnalysis);
        const uncertainty = calculateUncertainty(textAnalysis, audioAnalysis, visualAnalysis);
        const finalScore = rawScore;
        const smoothedScore = rawScore;
        const pWorseFused = Math.max(0, Math.min(1, (100 - finalScore) / 100));
        const analysis = generateAnalysisSummary(finalScore, textAnalysis, audioAnalysis, visualAnalysis);
        const fusionOutput = {
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
        console.log('💾 Storing fusion output in database...');
        const insertedRecord = await (0, database_1.insertRecord)('fusion_outputs', {
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
        await (0, database_1.updateRecords)('assessment_sessions', { status: 'completed', updated_at: new Date() }, { id: sessionId, user_id: user.id });
        await (0, database_1.updateRecords)('profiles', { baseline_established: true, updated_at: new Date() }, { user_id: user.id });
        console.log('✅ Assessment session and user profile updated');
        return (0, auth_1.createSuccessResponse)({
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
    }
    catch (error) {
        console.error('❌ Mind Measure calculation error:', error);
        return (0, auth_1.createErrorResponse)(500, 'Mind Measure calculation failed', {
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.handler = handler;

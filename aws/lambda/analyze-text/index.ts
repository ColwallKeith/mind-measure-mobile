/**
 * AWS Lambda: Analyze Text
 * Extracts structured data from baseline assessment conversations
 * HIPAA-compliant text analysis for Mind Measure scoring pipeline
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateCognitoToken, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '../shared/auth';
import { insertRecord } from '../shared/database';

interface BaselineTextAnalysis {
  session_id: string;
  user_id: string;
  structured_responses: {
    phq2_responses: Array<{ question: string; response: string; score: number }>;
    gad2_responses: Array<{ question: string; response: string; score: number }>;
    mood_scale: number | null;
    open_response: string | null;
  };
  calculated_scores: {
    phq2_total: number;
    gad2_total: number;
    mood_self_report: number | null;
  };
  conversation_quality: {
    completeness: 'complete' | 'partial' | 'incomplete';
    clarity: 'high' | 'medium' | 'low';
    engagement: 'high' | 'medium' | 'low';
  };
  risk_assessment: {
    risk_flag: 'none' | 'safeguarding_signal';
    keywords_detected: string[];
  };
  created_at: string;
}

/**
 * Extract structured data from baseline conversation text
 * Based on the 6-question baseline assessment script
 */
function extractStructuredData(conversationText: string) {
  const data: any = {};
  
  // For baseline assessments: Extract PHQ-2, GAD-2, mood scale, and open response
  if (conversationText.includes('Question one') || conversationText.includes('Question two') || 
      conversationText.includes('baseline') || conversationText.includes('initial assessment')) {
    
    // PHQ-2 Questions (Questions 1-2)
    const phq2Responses = [];
    
    // Question 1: "little interest or pleasure in doing things"
    const q1Match = conversationText.match(/Question one.*?(?:Not at all|Several days|More than half the days|Nearly every day)/is);
    if (q1Match) {
      const response = q1Match[0].match(/(Not at all|Several days|More than half the days|Nearly every day)/i)?.[1];
      if (response) {
        const score = response.toLowerCase().includes('not at all') ? 0 :
                     response.toLowerCase().includes('several days') ? 1 :
                     response.toLowerCase().includes('more than half') ? 2 : 3;
        phq2Responses.push({ question: 'phq2_1', response, score });
      }
    }
    
    // Question 2: "felt down, depressed, or hopeless"
    const q2Match = conversationText.match(/Question two.*?(?:Not at all|Several days|More than half the days|Nearly every day)/is);
    if (q2Match) {
      const response = q2Match[0].match(/(Not at all|Several days|More than half the days|Nearly every day)/i)?.[1];
      if (response) {
        const score = response.toLowerCase().includes('not at all') ? 0 :
                     response.toLowerCase().includes('several days') ? 1 :
                     response.toLowerCase().includes('more than half') ? 2 : 3;
        phq2Responses.push({ question: 'phq2_2', response, score });
      }
    }
    
    // GAD-2 Questions (Questions 3-4)
    const gad2Responses = [];
    
    // Question 3: "nervous, anxious, or on edge"
    const q3Match = conversationText.match(/Question three.*?(?:Not at all|Several days|More than half the days|Nearly every day)/is);
    if (q3Match) {
      const response = q3Match[0].match(/(Not at all|Several days|More than half the days|Nearly every day)/i)?.[1];
      if (response) {
        const score = response.toLowerCase().includes('not at all') ? 0 :
                     response.toLowerCase().includes('several days') ? 1 :
                     response.toLowerCase().includes('more than half') ? 2 : 3;
        gad2Responses.push({ question: 'gad2_1', response, score });
      }
    }
    
    // Question 4: "unable to stop or control worrying"
    const q4Match = conversationText.match(/Question four.*?(?:Not at all|Several days|More than half the days|Nearly every day)/is);
    if (q4Match) {
      const response = q4Match[0].match(/(Not at all|Several days|More than half the days|Nearly every day)/i)?.[1];
      if (response) {
        const score = response.toLowerCase().includes('not at all') ? 0 :
                     response.toLowerCase().includes('several days') ? 1 :
                     response.toLowerCase().includes('more than half') ? 2 : 3;
        gad2Responses.push({ question: 'gad2_2', response, score });
      }
    }
    
    // Question 5: Mood scale (1-10)
    const q5Match = conversationText.match(/Question five.*?([1-9]|10)/is);
    if (q5Match) {
      data.mood_scale = parseInt(q5Match[1]);
    }
    
    // Question 6: Open response ("main thing on your mind today")
    const q6Match = conversationText.match(/Question six.*?describe the main thing.*?([^.!?]+[.!?])/is);
    if (q6Match) {
      data.open_response = q6Match[1].trim();
    }
    
    // Calculate PHQ-2 and GAD-2 total scores
    if (phq2Responses.length === 2) {
      data.phq2_total = phq2Responses.reduce((sum, r) => sum + r.score, 0);
      data.phq2_responses = phq2Responses;
    }
    
    if (gad2Responses.length === 2) {
      data.gad2_total = gad2Responses.reduce((sum, r) => sum + r.score, 0);
      data.gad2_responses = gad2Responses;
    }
    
    data.assessment_type = 'baseline';
  } else {
    // This is a check-in conversation - extract mood score and anchor
    
    // Extract mood score (1-10)
    const moodMatch = conversationText.match(/(?:mood|feeling|rate)[^0-9]*([1-9]|10)(?:\s|$|\.)/i);
    if (moodMatch) {
      data.mood_score = parseInt(moodMatch[1]);
    }
    
    // Extract anchor comparison
    const anchorMatch = conversationText.match(/\b(better|same|worse)\b/i);
    if (anchorMatch) {
      data.anchor = anchorMatch[1].toLowerCase();
    }
    
    data.assessment_type = 'checkin';
  }
  
  // Check for risk flags (applies to both baseline and check-ins)
  const riskKeywords = ['harm', 'hurt', 'kill', 'suicide', 'end it', 'dangerous'];
  const detectedKeywords = riskKeywords.filter(keyword => 
    conversationText.toLowerCase().includes(keyword)
  );
  data.risk_flag = detectedKeywords.length > 0 ? 'safeguarding_signal' : 'none';
  data.keywords_detected = detectedKeywords;
  
  return data;
}

/**
 * Assess conversation completeness based on extracted data
 */
function assessCompletion(structuredData: any): 'complete' | 'partial' | 'incomplete' {
  if (structuredData.assessment_type === 'baseline') {
    const hasPhq2 = structuredData.phq2_responses && structuredData.phq2_responses.length === 2;
    const hasGad2 = structuredData.gad2_responses && structuredData.gad2_responses.length === 2;
    const hasMood = structuredData.mood_scale !== null && structuredData.mood_scale !== undefined;
    const hasOpen = structuredData.open_response && structuredData.open_response.length > 10;
    
    const completedSections = [hasPhq2, hasGad2, hasMood, hasOpen].filter(Boolean).length;
    
    if (completedSections === 4) return 'complete';
    if (completedSections >= 2) return 'partial';
    return 'incomplete';
  } else {
    // Check-in assessment
    const hasMood = structuredData.mood_score !== null && structuredData.mood_score !== undefined;
    const hasAnchor = structuredData.anchor !== null && structuredData.anchor !== undefined;
    
    if (hasMood && hasAnchor) return 'complete';
    if (hasMood || hasAnchor) return 'partial';
    return 'incomplete';
  }
}

/**
 * Assess conversation clarity based on text analysis
 */
function assessClarity(conversationText: string): 'high' | 'medium' | 'low' {
  const wordCount = conversationText.split(/\s+/).length;
  const sentenceCount = conversationText.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / sentenceCount;
  
  // Simple heuristics for clarity assessment
  if (avgWordsPerSentence > 20 || wordCount < 50) return 'low';
  if (avgWordsPerSentence > 15 || wordCount < 100) return 'medium';
  return 'high';
}

/**
 * Assess conversation engagement based on response patterns
 */
function assessEngagement(conversationText: string): 'high' | 'medium' | 'low' {
  const responseCount = (conversationText.match(/User:|Student:|Response:/gi) || []).length;
  const wordCount = conversationText.split(/\s+/).length;
  const avgWordsPerResponse = responseCount > 0 ? wordCount / responseCount : 0;
  
  if (avgWordsPerResponse > 15 && responseCount > 5) return 'high';
  if (avgWordsPerResponse > 8 && responseCount > 3) return 'medium';
  return 'low';
}

/**
 * Main Lambda handler for text analysis
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('🔍 Text Analysis Lambda triggered');
  
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

    const { sessionId, conversationTranscript, assessmentType } = JSON.parse(event.body);
    
    if (!sessionId || !conversationTranscript) {
      return createErrorResponse(400, 'sessionId and conversationTranscript are required');
    }

    console.log(`🔍 Processing text analysis for session: ${sessionId}`);

    // 3. Extract structured data from conversation
    const structuredData = extractStructuredData(conversationTranscript);
    
    // 4. Assess conversation quality
    const completeness = assessCompletion(structuredData);
    const clarity = assessClarity(conversationTranscript);
    const engagement = assessEngagement(conversationTranscript);

    // 5. Build comprehensive text analysis object
    const textAnalysis: BaselineTextAnalysis = {
      session_id: sessionId,
      user_id: user.id,
      structured_responses: {
        phq2_responses: structuredData.phq2_responses || [],
        gad2_responses: structuredData.gad2_responses || [],
        mood_scale: structuredData.mood_scale || null,
        open_response: structuredData.open_response || null
      },
      calculated_scores: {
        phq2_total: structuredData.phq2_total || 0,
        gad2_total: structuredData.gad2_total || 0,
        mood_self_report: structuredData.mood_scale || null
      },
      conversation_quality: {
        completeness,
        clarity,
        engagement
      },
      risk_assessment: {
        risk_flag: structuredData.risk_flag || 'none',
        keywords_detected: structuredData.keywords_detected || []
      },
      created_at: new Date().toISOString()
    };

    // 6. Store analysis results in database
    console.log('💾 Storing text analysis in database...');
    
    const insertedRecord = await insertRecord('text_analysis', {
      session_id: sessionId,
      user_id: user.id,
      analysis_data: textAnalysis,
      created_at: new Date()
    });

    console.log(`✅ Text analysis completed and stored with ID: ${insertedRecord.id}`);

    // 7. Return success response
    return createSuccessResponse({
      success: true,
      textAnalysis,
      analysisId: insertedRecord.id,
      summary: {
        assessment_type: structuredData.assessment_type,
        completeness,
        phq2_total: textAnalysis.calculated_scores.phq2_total,
        gad2_total: textAnalysis.calculated_scores.gad2_total,
        mood_scale: textAnalysis.structured_responses.mood_scale,
        risk_flag: textAnalysis.risk_assessment.risk_flag
      }
    });

  } catch (error) {
    console.error('❌ Text analysis error:', error);
    return createErrorResponse(500, 'Text analysis failed', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};






// ==========================================================================
// TYPES
// ==========================================================================

export type RiskLevel = "none" | "mild" | "moderate" | "high";
export type DirectionOfChange = "better" | "worse" | "same" | "unclear";

export interface TextAnalysisResult {
  version: string; // "v1.0"
  themes: string[]; // ["sleep", "work", "mood"]
  keywords: string[]; // shorter, more concrete phrases
  risk_level: RiskLevel;
  direction_of_change: DirectionOfChange;
  
  // Explicit mood rating from user (1-10 scale, extracted from conversation)
  mood_score: number;
  
  // 0–100 score for text modality only
  text_score: number;
  
  // 0–1, higher means "less sure"
  uncertainty: number;
  
  drivers_positive: string[];
  drivers_negative: string[];
  
  conversation_summary: string;
  notable_quotes: string[];
}

export interface TextAnalysisContext {
  checkinId: string;
  studentFirstName?: string;
  previousTextThemes?: string[];
  previousMindMeasureScore?: number;
  previousDirectionOfChange?: DirectionOfChange;
}

// ==========================================================================
// BEDROCK TEXT ANALYZER (API-based)
// ==========================================================================

/**
 * Analyzes check-in transcript using AWS Bedrock (Claude) via API endpoint.
 * This calls a server-side API to avoid exposing AWS credentials in the browser.
 */
export async function analyzeTextWithBedrock(
  transcript: string,
  context: TextAnalysisContext
): Promise<TextAnalysisResult> {
  console.log('[BedrockTextAnalyzer] Starting analysis...');
  
  // Handle empty/short transcripts
  if (!transcript || transcript.trim().length < 10) {
    console.warn('[BedrockTextAnalyzer] Transcript too short, returning high uncertainty result');
    return getEmptyResult("There was not enough information in this check in to understand how the student is feeling.");
  }
  
  try {
    console.log('[BedrockTextAnalyzer] Calling Bedrock API...');
    
    // Call server-side API
    const response = await fetch('/api/bedrock/analyze-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        context
      })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('[BedrockTextAnalyzer] ❌ API returned unsuccessful result:', result);
      return getEmptyResult("Text analysis did not return usable content for this check in.");
    }
    
    console.log('[BedrockTextAnalyzer] ✅ Analysis complete:', {
      score: result.data.text_score,
      uncertainty: result.data.uncertainty,
      risk_level: result.data.risk_level,
      themes: result.data.themes.length
    });
    
    return result.data as TextAnalysisResult;
    
  } catch (error: any) {
    console.error('[BedrockTextAnalyzer] ❌ API call failed:', error);
    console.error('[BedrockTextAnalyzer] Error details:', error?.message || String(error));
    
    // Fallback with high uncertainty
    return getEmptyResult("Text analysis was not available for this check in.");
  }
}

function getEmptyResult(summary: string): TextAnalysisResult {
  return {
    version: "v1.0",
    themes: [],
    keywords: [],
    risk_level: "none",
    direction_of_change: "unclear",
    text_score: 50,
    uncertainty: 0.9,
    drivers_positive: [],
    drivers_negative: [],
    conversation_summary: summary,
    notable_quotes: [],
  };
}


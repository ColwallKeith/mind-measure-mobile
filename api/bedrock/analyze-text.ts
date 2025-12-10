/**
 * Bedrock Text Analysis API
 * 
 * Server-side endpoint that uses AWS Bedrock (Claude) to analyze
 * check-in conversation transcripts for wellbeing assessment.
 * 
 * Endpoint: POST /api/bedrock/analyze-text
 * Auth: Required (via Cognito token)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Types
export type RiskLevel = "none" | "mild" | "moderate" | "high";
export type DirectionOfChange = "better" | "worse" | "same" | "unclear";

export interface TextAnalysisResult {
  version: string; // "v1.0"
  themes: string[]; // ["sleep", "work", "mood"]
  keywords: string[]; // shorter, more concrete phrases
  risk_level: RiskLevel;
  direction_of_change: DirectionOfChange;
  
  // 0–100 score for text modality only
  text_score: number;
  
  // 0–1, higher means "less sure"
  uncertainty: number;
  
  drivers_positive: string[];
  drivers_negative: string[];
  
  conversation_summary: string;
  notable_quotes: string[];
}

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const SYSTEM_PROMPT = `You are the Mind Measure Text Assessment model.

Your job is to read a short conversational transcript from a wellbeing check in and return a structured JSON analysis of what the student said.

You are not a therapist and you must not give advice, reassurance, or instructions. You only analyse the text and turn it into labels, scores and a short neutral summary.

Return your answer as valid JSON only. Do not include any other text. The JSON must match exactly this TypeScript interface:

interface TextAnalysisResult {
  version: string; // "v1.0"
  themes: string[];
  keywords: string[];
  risk_level: "none" | "mild" | "moderate" | "high";
  direction_of_change: "better" | "worse" | "same" | "unclear";
  text_score: number; // integer 0 to 100
  uncertainty: number; // number between 0 and 1, where 0 is very certain and 1 is very uncertain
  drivers_positive: string[];
  drivers_negative: string[];
  conversation_summary: string;
  notable_quotes: string[];
}

Guidance:

- "themes" are 2 to 6 broad areas mentioned, for example "sleep", "work", "mood", "family", "money", "health", "relationships", "deadlines".
- "keywords" are 3 to 10 concrete terms or short phrases that look important in this specific conversation, for example "software platform", "time pressure", "exams next week".
- "risk_level":
  - "none" if there is no sign of self harm, suicidal thoughts, feeling unsafe, or harming others.
  - "mild" if the student sounds low, stressed, or worried but without any language about self harm or being unsafe.
  - "moderate" if there are clear signs of distress, hopelessness, or wanting to escape, but no clear self harm or suicide language.
  - "high" if there is any mention or clear implication of self harm, wanting to die, suicidal thinking, or being unsafe.

- "direction_of_change" compares how they sound today with "a usual day" based only on this conversation:
  - "better" if they say they feel a bit better, lighter, more positive or more stable than usual.
  - "worse" if they say they feel lower, more stressed, more anxious or more overwhelmed than usual.
  - "same" if they say they feel similar to usual or give no reason to think it is better or worse.
  - "unclear" if the direction is not obvious.

- "text_score" is an overall 0 to 100 wellbeing score for this conversation only, based only on what they said in the text:
  - 70 to 100 for mainly positive, calm, manageable days with no risk language.
  - 40 to 69 for mixed, stretched, or stressed but coping.
  - 10 to 39 for clearly low, very stressed, overwhelmed or struggling.
  - 0 to 9 for very severe distress or strong risk language.
  Use the full range when appropriate. It is fine to give high scores when the person sounds genuinely okay.

- "uncertainty" should be:
  - near 0.1 when the transcript is clear and there is enough detail
  - near 0.5 when answers are brief or vague
  - near 0.8 or higher if there is very little information to work with

- "drivers_positive" are short phrases that describe what helped them cope or feel okay, for example "sense of purpose", "good sleep", "time with friends".
- "drivers_negative" are short phrases that describe what pulled their mood down, for example "deadlines", "money worries", "feeling isolated".
- "conversation_summary" is 1 or 2 plain sentences in UK English, past tense, neutral in tone. Do not give advice. Example:
  "You talked about a busy but steady work day, feeling a bit better than usual and having a sense of purpose."
- "notable_quotes" are 1 to 3 short direct phrases copied from the transcript that capture the tone or content. Do not add quotation marks inside the strings.

Do not mention Mind Measure, scoring systems, models, or analysis in the summary. Just describe what the student talked about.`;

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

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

function validateAndSanitize(parsed: any): TextAnalysisResult {
  // Validate text_score
  if (
    typeof parsed.text_score !== "number" ||
    Number.isNaN(parsed.text_score) ||
    parsed.text_score < 0 ||
    parsed.text_score > 100
  ) {
    console.warn('[Bedrock API] Invalid text_score, defaulting to 50');
    parsed.text_score = 50;
    parsed.uncertainty = Math.max(parsed.uncertainty ?? 0.5, 0.6);
  }
  
  // Validate uncertainty
  if (
    typeof parsed.uncertainty !== "number" ||
    parsed.uncertainty < 0 ||
    parsed.uncertainty > 1
  ) {
    console.warn('[Bedrock API] Invalid uncertainty, defaulting to 0.5');
    parsed.uncertainty = 0.5;
  }
  
  // Ensure required arrays exist
  parsed.themes = Array.isArray(parsed.themes) ? parsed.themes : [];
  parsed.keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
  parsed.drivers_positive = Array.isArray(parsed.drivers_positive) ? parsed.drivers_positive : [];
  parsed.drivers_negative = Array.isArray(parsed.drivers_negative) ? parsed.drivers_negative : [];
  parsed.notable_quotes = Array.isArray(parsed.notable_quotes) ? parsed.notable_quotes : [];
  
  // Ensure required strings exist
  parsed.version = parsed.version || "v1.0";
  parsed.conversation_summary = parsed.conversation_summary || "Check-in completed.";
  parsed.risk_level = parsed.risk_level || "none";
  parsed.direction_of_change = parsed.direction_of_change || "unclear";
  
  return parsed as TextAnalysisResult;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Bedrock API] Starting text analysis...');

    // Get transcript and context from request body
    const { transcript, context } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    // Handle empty/short transcripts
    if (transcript.trim().length < 10) {
      console.warn('[Bedrock API] Transcript too short, returning high uncertainty result');
      return res.status(200).json({
        success: true,
        data: getEmptyResult("There was not enough information in this check in to understand how the student is feeling.")
      });
    }

    console.log('[Bedrock API] Transcript length:', transcript.length);

    // Build user context
    const userContext = {
      checkin_id: context?.checkinId || 'unknown',
      student_first_name: context?.studentFirstName ?? null,
      previous_text_themes: context?.previousTextThemes ?? [],
      previous_mind_measure_score: context?.previousMindMeasureScore ?? null,
      previous_direction_of_change: context?.previousDirectionOfChange ?? null,
    };

    // Build user prompt
    const userPrompt = `
Here is the context for this check in:

${JSON.stringify(userContext, null, 2)}

Here is the transcript of the conversation between the student and the check in companion.

Use only what is actually written here. Do not invent information.

TRANSCRIPT START
${transcript}
TRANSCRIPT END

Now produce a single valid JSON object that matches the TextAnalysisResult schema described in the system prompt.
`.trim();

    // Prepare Bedrock request
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 800,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            }
          ]
        }
      ]
    };

    console.log('[Bedrock API] Calling Bedrock with model:', MODEL_ID);

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await bedrockClient.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decoded);

    console.log('[Bedrock API] ✅ Bedrock response received');

    // Extract text from Claude response (defensive)
    const responseText: string | undefined = responseBody?.content?.[0]?.text;
    if (!responseText) {
      console.error('[Bedrock API] ❌ No text content in Bedrock response', responseBody);
      return res.status(200).json({
        success: true,
        data: getEmptyResult("Text analysis did not return usable content for this check in."),
        warning: "Analysis returned no content, using fallback"
      });
    }

    console.log('[Bedrock API] Response preview:', responseText.substring(0, 200));

    // Parse JSON from response (defensive)
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Bedrock API] ❌ Failed to parse JSON from model response', parseError);
      return res.status(200).json({
        success: true,
        data: getEmptyResult("Text analysis output was not valid JSON for this check in."),
        warning: "Analysis JSON parse failed, using fallback"
      });
    }

    // Validate and sanitize
    const result = validateAndSanitize(parsed);

    console.log('[Bedrock API] ✅ Analysis complete:', {
      score: result.text_score,
      uncertainty: result.uncertainty,
      risk_level: result.risk_level,
      themes: result.themes.length
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('[Bedrock API] ❌ Error:', error);
    console.error('[Bedrock API] Error message:', error?.message);

    // Return graceful fallback even on error
    return res.status(200).json({
      success: true,
      data: getEmptyResult("Text analysis was not available for this check in."),
      warning: "Analysis failed, using fallback"
    });
  }
}


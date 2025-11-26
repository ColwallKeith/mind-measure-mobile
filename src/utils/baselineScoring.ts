/**
 * Baseline Assessment Scoring Utilities
 * 
 * This module provides robust extraction and scoring for the baseline assessment.
 * It operates on the full conversation transcript to derive PHQ-2, GAD-2, and mood scores.
 */

export type PhqResponses = {
  phq2_q1?: number; // 0–3
  phq2_q2?: number; // 0–3
  gad2_q1?: number; // 0–3
  gad2_q2?: number; // 0–3
};

export type ClinicalScores = {
  phq2_total: number;
  gad2_total: number;
  mood_scale: number;
  phq2_positive_screen: boolean;
  gad2_positive_screen: boolean;
};

export type MindMeasureComposite = {
  score: number;
  phq2_component: number;
  gad2_component: number;
  mood_component: number;
};

export type ExtractedAssessment = {
  phqResponses: PhqResponses;
  moodScore: number | null;
};

export type AssessmentState = {
  transcript: string;
  phqResponses: PhqResponses;
  moodScore: number | null;
  startedAt: number | null;
  endedAt: number | null;
};

/**
 * Extract PHQ-2, GAD-2, and mood responses from the full conversation transcript.
 * This is called once at the end of the conversation.
 * 
 * The transcript format is:
 * agent: [Jodie's message]
 * user: [User's response]
 * agent: [Next question]
 * user: [User's response]
 * ...
 */
export function extractAssessmentFromTranscript(
  transcript: string
): ExtractedAssessment {
  const lines = transcript.split('\n');
  
  // Extract all user responses (lines starting with "user:")
  const userResponses: string[] = [];
  for (const line of lines) {
    if (line.trim().startsWith('user:')) {
      const response = line.replace(/^user:\s*/i, '').trim().toLowerCase();
      userResponses.push(response);
    }
  }
  
  console.log('[SDK] 📋 User responses extracted:', userResponses);
  
  // The assessment follows a specific order:
  // Response 0: "Yes" (ready confirmation)
  // Response 1: PHQ-2 Q1 (little interest or pleasure)
  // Response 2: PHQ-2 Q2 (down, depressed, hopeless)
  // Response 3: GAD-2 Q1 (nervous, anxious, on edge)
  // Response 4: GAD-2 Q2 (unable to stop worrying)
  // Response 5: Mood (1-10 scale)
  
  function parseFrequencyResponse(response: string): number | null {
    if (response.includes('not at all')) return 0;
    if (response.includes('several days') || response.includes('several day')) return 1;
    if (response.includes('more than half')) return 2;
    if (response.includes('nearly every day')) return 3;
    return null;
  }
  
  const phq2_q1 = userResponses[1] ? parseFrequencyResponse(userResponses[1]) : null;
  const phq2_q2 = userResponses[2] ? parseFrequencyResponse(userResponses[2]) : null;
  const gad2_q1 = userResponses[3] ? parseFrequencyResponse(userResponses[3]) : null;
  const gad2_q2 = userResponses[4] ? parseFrequencyResponse(userResponses[4]) : null;
  
  // Mood: Extract from response 5
  let moodScore: number | null = null;
  if (userResponses[5]) {
    const moodResponse = userResponses[5];
    
    // Map of word numbers to numeric values
    const wordNumbers: Record<string, number> = {
      "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
    };
    
    // First try to find a numeric digit (handles "7", "7.", "10", etc.)
    const digitMatch = moodResponse.match(/\b(10|[1-9])\b/);
    if (digitMatch) {
      moodScore = parseInt(digitMatch[1], 10);
    } else {
      // Otherwise look for a word number (handles "seven", "six", etc.)
      for (const [word, value] of Object.entries(wordNumbers)) {
        if (moodResponse.includes(word)) {
          moodScore = value;
          break;
        }
      }
    }
  }

  const phqResponses: PhqResponses = {
    phq2_q1: phq2_q1 ?? 0,
    phq2_q2: phq2_q2 ?? 0,
    gad2_q1: gad2_q1 ?? 0,
    gad2_q2: gad2_q2 ?? 0,
  };

  console.log("[SDK] 📝 Extracted from transcript:", { phqResponses, moodScore });

  return { phqResponses, moodScore };
}

/**
 * Calculate clinical scores (PHQ-2, GAD-2, mood) and positive screens.
 */
export function calculateClinicalScores(
  phqResponses: PhqResponses,
  moodScore: number | null
): ClinicalScores {
  const phq2_q1 = phqResponses.phq2_q1 ?? 0;
  const phq2_q2 = phqResponses.phq2_q2 ?? 0;
  const gad2_q1 = phqResponses.gad2_q1 ?? 0;
  const gad2_q2 = phqResponses.gad2_q2 ?? 0;

  const phq2_total = phq2_q1 + phq2_q2; // 0–6
  const gad2_total = gad2_q1 + gad2_q2; // 0–6
  const mood_scale = typeof moodScore === "number" ? moodScore : 5;

  const phq2_positive_screen = phq2_total >= 3;
  const gad2_positive_screen = gad2_total >= 3;

  return {
    phq2_total,
    gad2_total,
    mood_scale,
    phq2_positive_screen,
    gad2_positive_screen,
  };
}

/**
 * Calculate Mind Measure composite score (Updated spec):
 * - 25% PHQ-2 (0–6 → 100–0, inverted: lower symptoms = higher score)
 * - 25% GAD-2 (0–6 → 100–0, inverted: lower symptoms = higher score)
 * - 50% mood (1–10 → 10–100, scaled: higher mood = higher score)
 * 
 * Formula from docs/BASELINE_ASSESSMENT_STATUS.md
 */
export function calculateMindMeasureComposite(
  clinical: ClinicalScores
): MindMeasureComposite {
  const { phq2_total, gad2_total, mood_scale } = clinical;

  // PHQ-2: Invert (0-6 scale where 0=no symptoms → 100=best wellbeing)
  const phq2Score = Math.max(0, 100 - (phq2_total / 6) * 100);
  
  // GAD-2: Invert (0-6 scale where 0=no symptoms → 100=best wellbeing)
  const gad2Score = Math.max(0, 100 - (gad2_total / 6) * 100);
  
  // Mood: Scale (1-10 scale → 10-100)
  const mood_clamped = Math.max(1, Math.min(10, mood_scale));
  const moodScore = (mood_clamped / 10) * 100;

  // Weighted fusion: 25% PHQ-2, 25% GAD-2, 50% mood
  const fusedScore = (phq2Score * 0.25) + (gad2Score * 0.25) + (moodScore * 0.50);
  
  const score = Math.round(Math.max(0, Math.min(100, fusedScore)));

  // Calculate individual components (for display/debugging)
  const phq2_component = Math.round(phq2Score * 0.25);
  const gad2_component = Math.round(gad2Score * 0.25);
  const mood_component = Math.round(moodScore * 0.50);

  return {
    score,
    phq2_component,
    gad2_component,
    mood_component,
  };
}

/**
 * Validate that we have all required assessment data.
 * IMPORTANT: 0 is a valid response for PHQ/GAD questions.
 */
export function validateAssessmentData(state: AssessmentState) {
  const { transcript, phqResponses, moodScore, startedAt, endedAt } = state;

  const hasTranscript =
    typeof transcript === "string" && transcript.trim().length > 0;

  const hasDuration =
    typeof startedAt === "number" &&
    typeof endedAt === "number" &&
    endedAt > startedAt;

  const requiredKeys: (keyof PhqResponses)[] = [
    "phq2_q1",
    "phq2_q2",
    "gad2_q1",
    "gad2_q2",
  ];

  const hasAllQuestions = requiredKeys.every((key) => {
    const value = phqResponses[key];
    return typeof value === "number" && !Number.isNaN(value);
  });

  const hasMood =
    typeof moodScore === "number" && !Number.isNaN(moodScore);

  const isValid =
    hasTranscript && hasDuration && hasAllQuestions && hasMood;

  console.log("[SDK] ✅ Validation result:", {
    isValid,
    details: { hasAllQuestions, hasMood, hasTranscript, hasDuration },
  });

  return {
    isValid,
    details: { hasAllQuestions, hasMood, hasTranscript, hasDuration },
  };
}



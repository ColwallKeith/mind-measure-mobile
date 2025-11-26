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
 */
export function extractAssessmentFromTranscript(
  transcript: string
): ExtractedAssessment {
  const lower = transcript.toLowerCase();

  function findFrequencyAnswer(questionCue: string): number | null {
    const idx = lower.indexOf(questionCue);
    if (idx === -1) return null;
    
    // Look at 400 chars after the question cue – enough to catch the user's answer
    const slice = lower.slice(idx, idx + 400);
    
    if (slice.includes("not at all")) return 0;
    if (slice.includes("several days")) return 1;
    if (slice.includes("more than half the days")) return 2;
    if (slice.includes("nearly every day")) return 3;
    
    return null;
  }

  const phq2_q1 = findFrequencyAnswer("little interest or pleasure");
  const phq2_q2 = findFrequencyAnswer("down, depressed, or hopeless");
  const gad2_q1 = findFrequencyAnswer("nervous, anxious, or on edge");
  const gad2_q2 = findFrequencyAnswer("unable to stop or control worrying");

  // Mood: look for "rate your current mood" followed by a digit 1–10
  let moodScore: number | null = null;
  const moodMatch = lower.match(/rate your current mood[^0-9]*(10|[1-9])/);
  if (moodMatch) {
    moodScore = parseInt(moodMatch[1], 10);
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
 * Calculate Mind Measure composite score (v1.0 spec):
 * - 25% PHQ-2 (0–6 → 0–50)
 * - 25% GAD-2 (0–6 → 0–25)
 * - 50% mood (1–10 → 0–50)
 */
export function calculateMindMeasureComposite(
  clinical: ClinicalScores
): MindMeasureComposite {
  const { phq2_total, gad2_total, mood_scale } = clinical;

  const phq2_component_raw = (phq2_total / 6) * 50;
  const gad2_component_raw = (gad2_total / 6) * 25;
  const mood_clamped = Math.max(0, Math.min(10, mood_scale));
  const mood_component_raw = (mood_clamped / 10) * 50;

  const phq2_component = Math.round(phq2_component_raw);
  const gad2_component = Math.round(gad2_component_raw);
  const mood_component = Math.round(mood_component_raw);

  const score = Math.round(
    phq2_component_raw + gad2_component_raw + mood_component_raw
  );

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


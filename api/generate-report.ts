import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

interface RequestBody {
  userId: string;
  periodDays: number; // 14, 30, or 90
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, periodDays }: RequestBody = req.body;

    if (!userId || !periodDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get database connection from environment
    const databaseEndpoint = process.env.DATABASE_API_URL || 'https://mobile.mindmeasure.app/api/database';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch user data (sessions with analysis and scores)
    const sessionsResponse = await fetch(`${databaseEndpoint}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'fusion_outputs',
        filters: {
          user_id: userId,
          created_at: { gte: startDate.toISOString() }
        },
        orderBy: [{ column: 'created_at', ascending: true }],
        select: 'id, final_score, analysis, created_at'
      })
    });

    const sessions = await sessionsResponse.json();

    if (!sessions.data || sessions.data.length === 0) {
      return res.status(404).json({ error: 'No data found for this period' });
    }

    // Aggregate data for the report
    const reportData = prepareReportData(sessions.data, periodDays);

    // Generate AI summary using Claude 3 Haiku (cost-effective for 500-1000 words)
    const aiSummary = await generateAISummary(reportData, periodDays);

    // Compile the full report
    const report = compileReport(reportData, aiSummary, periodDays);

    return res.status(200).json({ 
      success: true,
      report,
      metadata: {
        periodDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        checkInCount: sessions.data.length
      }
    });

  } catch (error: any) {
    console.error('Report generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate report',
      details: error.message 
    });
  }
}

function prepareReportData(sessions: any[], periodDays: number) {
  const scores: number[] = [];
  const moodScores: number[] = [];
  const themes: Record<string, number> = {};
  const pleasures: string[] = [];
  const concerns: string[] = [];
  const transcriptSnippets: string[] = [];

  sessions.forEach((session) => {
    // Scores
    if (session.final_score) {
      scores.push(session.final_score);
    }

    // Parse analysis
    try {
      const analysis = typeof session.analysis === 'string' 
        ? JSON.parse(session.analysis) 
        : session.analysis;

      if (analysis) {
        // Mood scores
        if (analysis.moodScore) {
          moodScores.push(analysis.moodScore);
        }

        // Themes
        if (analysis.themes && Array.isArray(analysis.themes)) {
          analysis.themes.forEach((theme: string) => {
            themes[theme] = (themes[theme] || 0) + 1;
          });
        }

        // Pleasures (positive drivers)
        if (analysis.driverPositive && Array.isArray(analysis.driverPositive)) {
          pleasures.push(...analysis.driverPositive);
        }

        // Concerns (negative drivers)
        if (analysis.driverNegative && Array.isArray(analysis.driverNegative)) {
          concerns.push(...analysis.driverNegative);
        }

        // Summary for AI context
        if (analysis.summary) {
          transcriptSnippets.push(analysis.summary);
        }
      }
    } catch (e) {
      // Skip invalid analysis
    }
  });

  return {
    scores,
    moodScores,
    themes,
    pleasures,
    concerns,
    transcriptSnippets,
    checkInCount: sessions.length,
    dateRange: {
      start: sessions[0]?.created_at,
      end: sessions[sessions.length - 1]?.created_at
    }
  };
}

async function generateAISummary(data: any, periodDays: number): Promise<string> {
  // Prepare context for Claude
  const topThemes = Object.entries(data.themes)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([theme]) => theme);

  const avgScore = data.scores.length > 0 
    ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length)
    : 0;

  const avgMood = data.moodScores.length > 0
    ? Math.round((data.moodScores.reduce((a: number, b: number) => a + b, 0) / data.moodScores.length) * 10) / 10
    : 0;

  const prompt = `You are a professional wellbeing analyst creating an objective, factual summary report for a student.

**Data Summary:**
- Period: Last ${periodDays} days
- Check-ins: ${data.checkInCount}
- Average Mind Measure Score: ${avgScore}/100
- Average Mood Score: ${avgMood}/10
- Top Themes: ${topThemes.join(', ')}
- Positive Factors: ${data.pleasures.slice(0, 10).join(', ')}
- Concerns: ${data.concerns.slice(0, 10).join(', ')}

**Conversation Summaries:**
${data.transcriptSnippets.slice(0, 15).join('\n- ')}

Please write a 500-750 word professional wellbeing report with the following sections:

1. **Overview**: Brief summary of the period and check-in engagement
2. **Wellbeing Patterns**: Analysis of scores and mood trends
3. **Key Themes**: Discussion of recurring topics and their significance
4. **Positive Indicators**: What's going well (based on positive drivers)
5. **Areas of Concern**: Challenges identified (based on negative drivers and themes)
6. **Observations**: Objective insights from the patterns

**Tone**: Professional, objective, supportive but not medical
**Style**: Third-person or neutral ("The data shows..." not "You are...")
**Quotes**: You may include brief sanitized quotes from summaries if helpful (e.g., "Conversations frequently mentioned 'feeling stressed about assignments'")
**Avoid**: Medical diagnoses, prescriptive advice, subjective judgments

Write the report now:`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return 'AI summary generation temporarily unavailable. Please try again later.';
  }
}

function compileReport(data: any, aiSummary: string, periodDays: number): string {
  const avgScore = data.scores.length > 0 
    ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length)
    : 0;

  const avgMood = data.moodScores.length > 0
    ? Math.round((data.moodScores.reduce((a: number, b: number) => a + b, 0) / data.moodScores.length) * 10) / 10
    : 0;

  const topThemes = Object.entries(data.themes)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 15)
    .map(([theme, count]) => `${theme} (${count})`);

  const startDate = new Date(data.dateRange.start).toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const endDate = new Date(data.dateRange.end).toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });

  return `
═══════════════════════════════════════════════════════════════
                   MIND MEASURE WELLBEING REPORT
═══════════════════════════════════════════════════════════════

Report Period: ${startDate} to ${endDate} (${periodDays} days)
Generated: ${new Date().toLocaleString('en-GB')}

───────────────────────────────────────────────────────────────
SUMMARY STATISTICS
───────────────────────────────────────────────────────────────

Total Check-ins:                ${data.checkInCount}
Average Mind Measure Score:     ${avgScore}/100
Average Mood Score:             ${avgMood}/10

───────────────────────────────────────────────────────────────
KEY THEMES
───────────────────────────────────────────────────────────────

${topThemes.join('\n')}

───────────────────────────────────────────────────────────────
POSITIVE FACTORS (Top 10)
───────────────────────────────────────────────────────────────

${data.pleasures.slice(0, 10).map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

───────────────────────────────────────────────────────────────
AREAS OF CONCERN (Top 10)
───────────────────────────────────────────────────────────────

${data.concerns.slice(0, 10).map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

───────────────────────────────────────────────────────────────
PROFESSIONAL ANALYSIS
───────────────────────────────────────────────────────────────

${aiSummary}

───────────────────────────────────────────────────────────────
NOTES
───────────────────────────────────────────────────────────────

This report is generated from your Mind Measure check-in data and
is intended for personal reflection, sharing with healthcare 
professionals, or keeping as part of your wellness records.

This report does not constitute medical advice or diagnosis. If you
are experiencing mental health concerns, please consult with a
qualified healthcare professional.

───────────────────────────────────────────────────────────────
                    © Mind Measure ${new Date().getFullYear()}
═══════════════════════════════════════════════════════════════
`.trim();
}


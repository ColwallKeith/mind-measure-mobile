import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

interface RequestBody {
  userId: string;
  userEmail: string;
  userName?: string;
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
    const { userId, userEmail, userName, periodDays }: RequestBody = req.body;

    if (!userId || !userEmail || !periodDays) {
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

    // Send email with the report
    await sendReportEmail(userEmail, userName || 'there', report, periodDays);

    return res.status(200).json({ 
      success: true,
      message: `Report successfully sent to ${userEmail}`,
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

async function sendReportEmail(
  toEmail: string, 
  userName: string, 
  reportText: string, 
  periodDays: number
): Promise<void> {
  const subject = `Your Mind Measure Wellbeing Report (${periodDays} Days)`;
  
  // Create HTML version of the report
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #5B8FED, #6BA3FF); color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .section h2 { margin-top: 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #5B8FED; padding-bottom: 8px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #5B8FED; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 5px 0; }
    .themes { display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; }
    .theme-tag { background: #E8F0FE; color: #1a1a1a; padding: 6px 12px; border-radius: 16px; font-size: 13px; }
    .list { padding-left: 20px; }
    .list li { margin-bottom: 8px; }
    .analysis { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; line-height: 1.8; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; margin-top: 30px; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 Your Mind Measure Wellbeing Report</h1>
    <p>Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>

  <p>Hi ${userName},</p>
  <p>Your ${periodDays}-day wellbeing report is ready. This professional summary includes your check-in data, key themes, and AI-generated insights.</p>

  <div class="section">
    <h2>📊 Summary Statistics</h2>
    <div class="stats">
      ${extractStatsHTML(reportText)}
    </div>
  </div>

  <div class="section">
    <h2>🔍 Key Themes</h2>
    <div class="themes">
      ${extractThemesHTML(reportText)}
    </div>
  </div>

  <div class="section">
    <h2>✨ Positive Factors</h2>
    <ul class="list">
      ${extractListHTML(reportText, 'POSITIVE FACTORS')}
    </ul>
  </div>

  <div class="section">
    <h2>⚠️ Areas of Concern</h2>
    <ul class="list">
      ${extractListHTML(reportText, 'AREAS OF CONCERN')}
    </ul>
  </div>

  <div class="section">
    <h2>📝 Professional Analysis</h2>
    <div class="analysis">
      ${extractAnalysisHTML(reportText)}
    </div>
  </div>

  <div class="footer">
    <p><strong>Note:</strong> This report is for personal reflection and does not constitute medical advice.</p>
    <p>A text version of this report is attached for your records.</p>
    <p>© Mind Measure ${new Date().getFullYear()} • <a href="https://mobile.mindmeasure.app">mobile.mindmeasure.app</a></p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Hi ${userName},

Your ${periodDays}-day Mind Measure wellbeing report is attached.

This professional summary includes:
- Your check-in statistics and scores
- Key themes from your conversations
- Positive factors and areas of concern  
- AI-generated insights and analysis

You can use this report for personal reflection or share it with healthcare professionals.

Best regards,
The Mind Measure Team

---
This is an automated email from Mind Measure.
Visit https://mobile.mindmeasure.app to manage your account.
  `.trim();

  try {
    const command = new SendEmailCommand({
      Source: 'Mind Measure <noreply@mindmeasure.co.uk>',
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          },
          Html: {
            Data: htmlReport,
            Charset: 'UTF-8'
          }
        }
      }
    });

    await sesClient.send(command);
    console.log(`Report email sent successfully to ${toEmail}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send report email');
  }
}

// Helper functions for HTML extraction
function extractStatsHTML(report: string): string {
  const lines = report.split('\n');
  let html = '';
  
  for (const line of lines) {
    if (line.includes('Total Check-ins:')) {
      const value = line.split(':')[1]?.trim();
      html += `<div class="stat-card"><div class="stat-label">Total Check-ins</div><div class="stat-value">${value}</div></div>`;
    }
    if (line.includes('Average Mind Measure Score:')) {
      const value = line.split(':')[1]?.trim();
      html += `<div class="stat-card"><div class="stat-label">Avg Score</div><div class="stat-value">${value}</div></div>`;
    }
    if (line.includes('Average Mood Score:')) {
      const value = line.split(':')[1]?.trim();
      html += `<div class="stat-card"><div class="stat-label">Avg Mood</div><div class="stat-value">${value}</div></div>`;
    }
  }
  
  return html || '<p>Statistics unavailable</p>';
}

function extractThemesHTML(report: string): string {
  const lines = report.split('\n');
  const themesStart = lines.findIndex(l => l.includes('KEY THEMES'));
  const themesEnd = lines.findIndex((l, i) => i > themesStart && l.includes('─────'));
  
  if (themesStart === -1 || themesEnd === -1) return '<span class="theme-tag">No themes</span>';
  
  return lines
    .slice(themesStart + 3, themesEnd)
    .filter(l => l.trim())
    .map(theme => `<span class="theme-tag">${theme.trim()}</span>`)
    .join('');
}

function extractListHTML(report: string, section: string): string {
  const lines = report.split('\n');
  const sectionStart = lines.findIndex(l => l.includes(section));
  const sectionEnd = lines.findIndex((l, i) => i > sectionStart && l.includes('─────'));
  
  if (sectionStart === -1 || sectionEnd === -1) return '<li>None listed</li>';
  
  return lines
    .slice(sectionStart + 3, sectionEnd)
    .filter(l => l.trim() && l.match(/^\d+\./))
    .map(item => `<li>${item.replace(/^\d+\.\s*/, '')}</li>`)
    .join('');
}

function extractAnalysisHTML(report: string): string {
  const lines = report.split('\n');
  const analysisStart = lines.findIndex(l => l.includes('PROFESSIONAL ANALYSIS'));
  const analysisEnd = lines.findIndex((l, i) => i > analysisStart && l.includes('NOTES'));
  
  if (analysisStart === -1 || analysisEnd === -1) return '<p>Analysis unavailable</p>';
  
  const analysisText = lines
    .slice(analysisStart + 3, analysisEnd)
    .filter(l => !l.includes('─────'))
    .join('\n')
    .trim();
  
  return analysisText
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}


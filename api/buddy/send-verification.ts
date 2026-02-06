import { createHash, randomBytes } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.AWS_AURORA_HOST,
  port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE,
  user: process.env.AWS_AURORA_USERNAME,
  password: process.env.AWS_AURORA_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

interface SendVerificationRequest {
  buddyContactId: string;
  userId: string;
}

/**
 * POST /api/buddy/send-verification
 * 
 * Sends a verification email to a buddy contact
 * Generates a unique token and creates a verification link
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { buddyContactId, userId }: SendVerificationRequest = req.body;

    if (!buddyContactId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Fetch buddy contact details
    const buddyResult = await pool.query(
      `SELECT bc.*, p.first_name as user_first_name, p.display_name as user_display_name
       FROM buddy_contacts bc
       JOIN profiles p ON bc.user_id = p.user_id
       WHERE bc.id = $1 AND bc.user_id = $2 AND bc.is_active = true`,
      [buddyContactId, userId]
    );

    if (buddyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Buddy contact not found' });
    }

    const buddy = buddyResult.rows[0];

    // 2. Check if already verified
    if (buddy.verified) {
      return res.status(400).json({ error: 'Buddy already verified' });
    }

    // 3. Check rate limiting on verification emails (max 1 per hour)
    if (buddy.last_verification_sent_at) {
      const hoursSinceLastSend = (Date.now() - new Date(buddy.last_verification_sent_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSend < 1) {
        return res.status(429).json({ 
          error: 'Please wait before resending verification email',
          retryAfter: Math.ceil(60 - (hoursSinceLastSend * 60))
        });
      }
    }

    // 4. Generate secure verification token (64 characters, URL-safe)
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 5. Update buddy contact with verification token
    await pool.query(
      `UPDATE buddy_contacts
       SET verification_token = $1,
           verification_token_expires_at = $2,
           last_verification_sent_at = NOW(),
           verification_attempts = verification_attempts + 1
       WHERE id = $3`,
      [token, expiresAt, buddyContactId]
    );

    // 6. Log the verification event
    const eventType = buddy.verification_attempts > 0 ? 'verification_resent' : 'verification_sent';
    await pool.query(
      `INSERT INTO buddy_verification_audit 
       (buddy_contact_id, user_id, event_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        buddyContactId,
        userId,
        eventType,
        JSON.stringify({ email: buddy.email, attempt: buddy.verification_attempts + 1 })
      ]
    );

    // 7. Build verification links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mobile.mindmeasure.app';
    const acceptUrl = `${baseUrl}/buddy/verify?token=${token}&action=accept`;
    const declineUrl = `${baseUrl}/buddy/verify?token=${token}&action=decline`;

    // 8. Send verification email via AWS SES
    // TODO: Implement actual email sending
    // For now, return the verification details for testing

    // 9. In production, call AWS SES here
    const emailContent = {
      to: buddy.email,
      subject: `${buddy.user_display_name || buddy.user_first_name} has added you as a support buddy`,
      body: generateEmailTemplate({
        buddyName: buddy.name,
        userName: buddy.user_display_name || buddy.user_first_name,
        relationship: buddy.relationship,
        acceptUrl,
        declineUrl,
        expiresAt: expiresAt.toLocaleDateString('en-GB')
      })
    };

    // Placeholder: In production, send email via AWS SES
    // await sendEmail(emailContent);

    return res.status(200).json({
      success: true,
      message: 'Verification email sent',
      // For development/testing only - remove in production:
      debug: {
        email: buddy.email,
        acceptUrl,
        declineUrl,
        expiresAt
      }
    });

  } catch (error: any) {
    console.error('Error sending buddy verification:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification email',
      details: error.message 
    });
  }
}

/**
 * Generate email template for buddy verification
 * TODO: Replace placeholders with final copy from user
 */
function generateEmailTemplate(data: {
  buddyName: string;
  userName: string;
  relationship?: string;
  acceptUrl: string;
  declineUrl: string;
  expiresAt: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mind Measure - Support Buddy Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F5F5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <h1 style="color: #5B8FED; margin: 0; font-size: 28px; font-weight: 600;">Mind Measure</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td>
              <h2 style="color: #0F172A; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">
                Hi ${data.buddyName},
              </h2>
              
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>${data.userName}</strong> has added you as a support buddy on Mind Measure, 
                a wellbeing platform that helps university students monitor and improve their mental health.
              </p>

              ${data.relationship ? `
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                They've listed you as their <strong>${data.relationship}</strong>.
              </p>
              ` : ''}

              <div style="background-color: #EFF6FF; border-left: 4px solid #5B8FED; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <h3 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                  What does this mean?
                </h3>
                <p style="color: #1E40AF; font-size: 15px; line-height: 1.6; margin: 0;">
                  [PLACEHOLDER: User to provide content about what being a support buddy means, 
                  including expectations, frequency of contact, and types of requests they might receive]
                </p>
              </div>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <h3 style="color: #92400E; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                  Your Privacy & Data
                </h3>
                <p style="color: #92400E; font-size: 15px; line-height: 1.6; margin: 0;">
                  [PLACEHOLDER: User to provide content about data handling, privacy policy, 
                  GDPR compliance, and how buddy information is stored and used]
                </p>
              </div>

              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                If you're happy to be a support buddy for ${data.userName}, please click Accept below. 
                If you'd prefer not to, that's absolutely fine – just click Decline.
              </p>

              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.acceptUrl}" 
                       style="display: inline-block; background-color: #5B8FED; color: white; 
                              text-decoration: none; padding: 14px 32px; border-radius: 12px; 
                              font-size: 16px; font-weight: 600; margin: 0 8px;">
                      ✓ Accept
                    </a>
                    <a href="${data.declineUrl}" 
                       style="display: inline-block; background-color: #F1F5F9; color: #475569; 
                              text-decoration: none; padding: 14px 32px; border-radius: 12px; 
                              font-size: 16px; font-weight: 600; margin: 0 8px;">
                      ✗ Decline
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748B; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
                This invitation expires on <strong>${data.expiresAt}</strong>.
                <br><br>
                If you have any questions, please contact <a href="mailto:support@mindmeasure.co.uk" style="color: #5B8FED;">support@mindmeasure.co.uk</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 32px; border-top: 1px solid #E2E8F0; margin-top: 32px;">
              <p style="color: #94A3B8; font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} Mind Measure. All rights reserved.
                <br>
                <a href="https://mindmeasure.co.uk/privacy" style="color: #94A3B8; text-decoration: underline;">Privacy Policy</a> • 
                <a href="https://mindmeasure.co.uk/terms" style="color: #94A3B8; text-decoration: underline;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}


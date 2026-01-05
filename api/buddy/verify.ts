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

/**
 * GET /api/buddy/verify?token=xxx&action=accept|decline
 * 
 * Handles buddy verification responses (Accept or Decline)
 * This is the endpoint that links in the verification email point to
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, action, reason } = req.query;

    if (!token || typeof token !== 'string') {
      return renderErrorPage(res, 'Invalid or missing verification token');
    }

    if (!action || (action !== 'accept' && action !== 'decline')) {
      return renderErrorPage(res, 'Invalid action');
    }

    // 1. Find buddy contact by verification token
    const buddyResult = await pool.query(
      `SELECT bc.*, p.first_name as user_first_name, p.display_name as user_display_name, p.email as user_email
       FROM buddy_contacts bc
       JOIN profiles p ON bc.user_id = p.user_id
       WHERE bc.verification_token = $1 AND bc.is_active = true`,
      [token]
    );

    if (buddyResult.rows.length === 0) {
      return renderErrorPage(res, 'Verification link not found or has expired');
    }

    const buddy = buddyResult.rows[0];

    // 2. Check if token has expired
    if (new Date() > new Date(buddy.verification_token_expires_at)) {
      await pool.query(
        `INSERT INTO buddy_verification_audit 
         (buddy_contact_id, user_id, event_type, ip_address, user_agent, metadata)
         VALUES ($1, $2, 'verification_expired', $3, $4, $5)`,
        [
          buddy.id,
          buddy.user_id,
          req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
          req.headers['user-agent'] || null,
          JSON.stringify({ expired_at: buddy.verification_token_expires_at })
        ]
      );

      return renderExpiredPage(res, buddy);
    }

    // 3. Check if already verified
    if (buddy.verified) {
      return renderAlreadyVerifiedPage(res, buddy);
    }

    // 4. Process the action
    if (action === 'accept') {
      // Accept: Mark as verified
      await pool.query(
        `UPDATE buddy_contacts
         SET verified = true,
             verified_at = NOW(),
             verification_token = NULL,
             verification_token_expires_at = NULL
         WHERE id = $1`,
        [buddy.id]
      );

      // Log acceptance
      await pool.query(
        `INSERT INTO buddy_verification_audit 
         (buddy_contact_id, user_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, 'verification_accepted', $3, $4)`,
        [
          buddy.id,
          buddy.user_id,
          req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
          req.headers['user-agent'] || null
        ]
      );

      // TODO: Send notification to user that buddy accepted

      return renderSuccessPage(res, buddy, 'accepted');

    } else {
      // Decline: Mark as declined and deactivate
      await pool.query(
        `UPDATE buddy_contacts
         SET is_active = false,
             declined_at = NOW(),
             decline_reason = $1,
             verification_token = NULL,
             verification_token_expires_at = NULL
         WHERE id = $2`,
        [reason || 'No reason provided', buddy.id]
      );

      // Log declination
      await pool.query(
        `INSERT INTO buddy_verification_audit 
         (buddy_contact_id, user_id, event_type, ip_address, user_agent, metadata)
         VALUES ($1, $2, 'verification_declined', $3, $4, $5)`,
        [
          buddy.id,
          buddy.user_id,
          req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
          req.headers['user-agent'] || null,
          JSON.stringify({ reason: reason || null })
        ]
      );

      // TODO: Send notification to user that buddy declined

      return renderSuccessPage(res, buddy, 'declined');
    }

  } catch (error: any) {
    console.error('Error handling buddy verification:', error);
    return renderErrorPage(res, 'An error occurred while processing your response');
  }
}

function renderSuccessPage(res: VercelResponse, buddy: any, action: 'accepted' | 'declined') {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mind Measure - ${action === 'accepted' ? 'Thank You' : 'Response Received'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F5F5;">
  <div style="max-width: 600px; margin: 80px auto; padding: 40px; background-color: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center;">
    
    ${action === 'accepted' ? `
      <div style="width: 80px; height: 80px; background-color: #D1FAE5; border-radius: 50%; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      
      <h1 style="color: #0F172A; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">
        Thank You, ${buddy.name}!
      </h1>
      
      <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
        You've confirmed that you're happy to be a support buddy for <strong>${buddy.user_display_name || buddy.user_first_name}</strong>.
      </p>
      
      <div style="background-color: #EFF6FF; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h2 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
          What happens next?
        </h2>
        <p style="color: #1E40AF; font-size: 15px; line-height: 1.6; margin: 0;">
          ${buddy.user_first_name} has been notified. You may receive occasional check-in requests via SMS 
          if they need support or if Mind Measure detects concerning wellbeing patterns.
        </p>
      </div>
    ` : `
      <div style="width: 80px; height: 80px; background-color: #FEE2E2; border-radius: 50%; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      
      <h1 style="color: #0F172A; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">
        Response Received
      </h1>
      
      <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
        We've let ${buddy.user_first_name} know that you're unable to be a support buddy at this time.
      </p>
      
      <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">
        You won't receive any further messages from Mind Measure about this request.
      </p>
    `}
    
    <p style="color: #94A3B8; font-size: 14px; margin: 32px 0 0 0;">
      You can safely close this window.
    </p>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}

function renderErrorPage(res: VercelResponse, message: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mind Measure - Error</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F5F5;">
  <div style="max-width: 600px; margin: 80px auto; padding: 40px; background-color: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center;">
    
    <div style="width: 80px; height: 80px; background-color: #FEE2E2; border-radius: 50%; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 48px;">⚠️</span>
    </div>
    
    <h1 style="color: #0F172A; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">
      Oops!
    </h1>
    
    <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
      ${message}
    </p>
    
    <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 0;">
      If you think this is a mistake, please contact 
      <a href="mailto:support@mindmeasure.co.uk" style="color: #5B8FED;">support@mindmeasure.co.uk</a>
    </p>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(400).send(html);
}

function renderExpiredPage(res: VercelResponse, buddy: any) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mind Measure - Link Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F5F5;">
  <div style="max-width: 600px; margin: 80px auto; padding: 40px; background-color: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center;">
    
    <div style="width: 80px; height: 80px; background-color: #FEF3C7; border-radius: 50%; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 48px;">⏰</span>
    </div>
    
    <h1 style="color: #0F172A; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">
      This Link Has Expired
    </h1>
    
    <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
      This verification link expired on ${new Date(buddy.verification_token_expires_at).toLocaleDateString('en-GB')}.
    </p>
    
    <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 0;">
      Please ask ${buddy.user_first_name} to resend the invitation from their Mind Measure app.
    </p>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(410).send(html);
}

function renderAlreadyVerifiedPage(res: VercelResponse, buddy: any) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mind Measure - Already Verified</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F5F5;">
  <div style="max-width: 600px; margin: 80px auto; padding: 40px; background-color: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center;">
    
    <div style="width: 80px; height: 80px; background-color: #D1FAE5; border-radius: 50%; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 48px;">✓</span>
    </div>
    
    <h1 style="color: #0F172A; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">
      Already Verified
    </h1>
    
    <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0;">
      You've already verified your support buddy status for ${buddy.user_display_name || buddy.user_first_name}.
    </p>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}


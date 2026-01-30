/**
 * Buddy invite and nudge email templates. SES via shared _lib/ses.
 * All buddy emails must state "This isn't an emergency."
 */

import { sendEmail } from '../../_lib/ses';

const BASE_URL = process.env.BUDDY_BASE_URL || 'https://buddy.mindmeasure.app';

export async function sendInviteEmail(p: {
  to: string;
  inviteeName: string;
  inviterName: string;
  personalMessage: string | null;
  consentUrl: string;
}): Promise<void> {
  const { to, inviteeName, inviterName, personalMessage, consentUrl } = p;
  const subject = `${inviterName} has invited you to be a Buddy`;
  const extra = personalMessage
    ? `\n\nThey added a personal message:\n\n"${personalMessage}"\n\n`
    : '\n\n';
  const textBody = `Hi ${inviteeName},

${inviterName} uses Mind Measure to keep track of their wellbeing and has asked if you'd be willing to be a Buddy.

Being a Buddy means you may occasionally receive an email encouraging you to check in with them. You will not see their check-ins or scores.

This isn't an emergency service, and you're not expected to provide support beyond what feels comfortable.
${extra}To accept or decline, please visit this link (it expires in 14 days):

${consentUrl}

If you'd rather not, you can decline. No explanation needed.

Thanks,
Mind Measure
https://mobile.mindmeasure.app

You're receiving this because ${inviterName} entered your email address to invite you to be a Buddy. If you think this was a mistake, you can decline on the next page.`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F9FAFB; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.email-body { background: #ffffff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.personal-message { background: #F9FAFB; border: 1px solid #E5E7EB; border-left: 4px solid #8B5CF6; border-radius: 8px; padding: 20px; margin: 0 0 32px 0; }
.message-label { font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; }
.footer { padding: 24px 0; text-align: center; font-size: 12px; color: #9CA3AF; line-height: 1.5; }
</style>
</head>
<body>
<div class="container">
<div class="email-body">
<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Hi ${escapeHtml(inviteeName)},</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;"><strong>${escapeHtml(inviterName)}</strong> uses Mind Measure to keep track of their wellbeing and has asked if you'd be willing to be a Buddy.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Being a Buddy means you may occasionally receive an email encouraging you to check in with them. You will not see their check-ins or scores.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 32px 0;">This isn't an emergency service, and you're not expected to provide support beyond what feels comfortable.</p>

${personalMessage ? `<div class="personal-message">
<div class="message-label">Personal message from ${escapeHtml(inviterName)}</div>
<p style="font-size: 15px; color: #1F2937; line-height: 1.6; margin: 0; font-style: italic;">"${escapeHtml(personalMessage)}"</p>
</div>` : ''}

<div style="text-align: center; margin: 32px 0;">
<a href="${consentUrl}" class="cta-button">Review and respond</a>
</div>

<p style="font-size: 15px; color: #64748B; line-height: 1.6; margin: 32px 0 0 0;">If you'd rather not, you can decline. No explanation needed.</p>

<p style="font-size: 16px; color: #1F2937; margin: 32px 0 0 0;">Thanks,<br>Mind Measure</p>
</div>

<div class="footer">
<p>You're receiving this because ${escapeHtml(inviterName)} entered your email address to invite you to be a Buddy. If you think this was a mistake, you can decline on the next page.</p>
</div>
</div>
</body>
</html>`;

  await sendEmail({ to, subject, textBody, htmlBody });
}

export async function sendNudgeEmail(p: {
  to: string;
  buddyName: string;
  inviterName: string;
  optOutUrl: string;
}): Promise<void> {
  const { to, buddyName, inviterName, optOutUrl } = p;
  const subject = `A gentle check-in reminder for ${inviterName}`;
  const optOutBlock = optOutUrl
    ? `\n\nIf you'd prefer not to receive these reminders, you can opt out here: ${optOutUrl}\n`
    : '';
  const textBody = `Hi ${buddyName},

${inviterName} uses Mind Measure and might be finding things a bit harder than usual.

A quick message or check-in could help.

You don't need to be a therapist or fix anything—just being there matters.

Remember: This isn't an emergency alert. If you think ${inviterName} is in immediate danger, please contact emergency services or their university support team.${optOutBlock}
Thanks for being a Buddy,
Mind Measure
https://mobile.mindmeasure.app`;

  const optOutHtml = optOutUrl
    ? `<p style="font-size: 13px; color: #9CA3AF; margin: 0; text-align: center;"><a href="${optOutUrl}" style="color: #8B5CF6; text-decoration: none;">Opt out of Buddy emails</a></p>`
    : '';
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F9FAFB; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.email-body { background: #ffffff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.warning-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 0 0 32px 0; }
.footer { padding: 24px 0; text-align: center; }
</style>
</head>
<body>
<div class="container">
<div class="email-body">
<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Hi ${escapeHtml(buddyName)},</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;"><strong>${escapeHtml(inviterName)}</strong> uses Mind Measure and might be finding things a bit harder than usual.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">A quick message or check-in could help.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 32px 0;">You don't need to be a therapist or fix anything—just being there matters.</p>

<div class="warning-box">
<p style="font-size: 14px; color: #92400E; line-height: 1.5; margin: 0;"><strong>Remember:</strong> This isn't an emergency alert. If you think ${escapeHtml(inviterName)} is in immediate danger, please contact emergency services or their university support team.</p>
</div>

<p style="font-size: 16px; color: #1F2937; margin: 32px 0 0 0;">Thanks for being a Buddy,<br>Mind Measure</p>
</div>

${optOutHtml ? `<div class="footer">${optOutHtml}</div>` : ''}
</div>
</body>
</html>`;

  await sendEmail({ to, subject, textBody, htmlBody });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function consentUrl(token: string): string {
  return `${BASE_URL}/buddies/invite?token=${encodeURIComponent(token)}`;
}

export function optOutUrl(optOutSlug: string): string {
  return `${BASE_URL}/buddies/optout?token=${encodeURIComponent(optOutSlug)}`;
}

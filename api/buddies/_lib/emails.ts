/**
 * Buddy invite and nudge email templates. SES via shared _lib/ses.
 * All buddy emails must state "This isn't an emergency."
 */

import { sendEmail } from '../../_lib/ses';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mobile.mindmeasure.app';

export async function sendInviteEmail(p: {
  to: string;
  inviteeName: string;
  inviterName: string;
  personalMessage: string | null;
  consentUrl: string;
}): Promise<void> {
  const { to, inviteeName, inviterName, personalMessage, consentUrl } = p;
  const subject = `${inviterName} has invited you to be a Buddy on Mind Measure`;
  const extra = personalMessage
    ? `\n\nThey added a personal message:\n\n"${personalMessage}"\n\n`
    : '\n\n';
  const textBody = `Hi ${inviteeName},

${inviterName} has invited you to be a Buddy on Mind Measure.

A Buddy is someone they trust who may occasionally get a gentle reminder to check in with them when things feel harder than usual.
${extra}This isn't an emergency. Mind Measure does not alert Buddies in emergencies. You won't see their scores, check-ins, or activity.

To accept or decline, please visit this link (it expires in 14 days):

${consentUrl}

You can opt out at any time without explaining why.

—
Mind Measure
https://mobile.mindmeasure.app`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;} a{color:#6366f1;}</style></head>
<body>
<p>Hi ${escapeHtml(inviteeName)},</p>
<p><strong>${escapeHtml(inviterName)}</strong> has invited you to be a Buddy on Mind Measure.</p>
<p>A Buddy is someone they trust who may occasionally get a gentle reminder to check in with them when things feel harder than usual.</p>
${personalMessage ? `<p>They added a personal message:</p><p><em>${escapeHtml(personalMessage)}</em></p>` : ''}
<p><strong>This isn't an emergency.</strong> Mind Measure does not alert Buddies in emergencies. You won't see their scores, check-ins, or activity.</p>
<p>To accept or decline, please visit this link (it expires in 14 days):</p>
<p><a href="${consentUrl}">${consentUrl}</a></p>
<p>You can opt out at any time without explaining why.</p>
<p>—<br>Mind Measure<br><a href="https://mobile.mindmeasure.app">mobile.mindmeasure.app</a></p>
</body>
</html>`;

  await sendEmail({ to, subject, textBody, htmlBody });
}

export async function sendNudgeEmail(p: {
  to: string;
  buddyName: string;
  optOutUrl: string;
}): Promise<void> {
  const { to, buddyName, optOutUrl } = p;
  const subject = 'A gentle check-in reminder';
  const optOutBlock = optOutUrl
    ? `\n\nIf you'd prefer not to receive these reminders, you can opt out here: ${optOutUrl}\n`
    : '';
  const textBody = `Hi ${buddyName},

This is a gentle reminder to check in with your friend who uses Mind Measure. They've asked you to be a Buddy, and an occasional nudge like this can make a real difference.

This isn't an emergency. We don't share any scores, check-ins, or activity with you.${optOutBlock}
—
Mind Measure
https://mobile.mindmeasure.app`;

  const optOutHtml = optOutUrl
    ? `<p>If you'd prefer not to receive these reminders, you can <a href="${optOutUrl}">opt out here</a>.</p>`
    : '';
  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;} a{color:#6366f1;}</style></head>
<body>
<p>Hi ${escapeHtml(buddyName)},</p>
<p>This is a gentle reminder to check in with your friend who uses Mind Measure. They've asked you to be a Buddy, and an occasional nudge like this can make a real difference.</p>
<p><strong>This isn't an emergency.</strong> We don't share any scores, check-ins, or activity with you.</p>
${optOutHtml}
<p>—<br>Mind Measure<br><a href="https://mobile.mindmeasure.app">mobile.mindmeasure.app</a></p>
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

/**
 * Shared AWS SES email helper. Used by generate-report, buddies invite/nudge.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const FROM = 'Mind Measure <noreply@mindmeasure.co.uk>';
const region = process.env.AWS_REGION || 'eu-west-2';

const sesClient = new SESClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
}

/** Inbound/reply address; From remains noreply@mindmeasure.co.uk */
const REPLY_TO = 'info@mindmeasure.co.uk';

export async function sendEmail({ to, subject, textBody, htmlBody }: SendEmailOptions): Promise<void> {
  const command = new SendEmailCommand({
    Source: FROM,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: [REPLY_TO],
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: textBody, Charset: 'UTF-8' },
        ...(htmlBody ? { Html: { Data: htmlBody, Charset: 'UTF-8' } } : {}),
      },
    },
  });
  await sesClient.send(command);
}

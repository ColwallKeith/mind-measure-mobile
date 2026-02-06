// API endpoint for AWS Cognito email confirmation (POST version for client calls)
// Vercel serverless function
// After confirm: create minimal profile in Aurora (user_id, email, first_name, last_name).
// On profile insert failure we still return 200 so flow is not interrupted; lazy create can fix later.

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { Client } from 'pg';

const cognitoConfig = {
  region: (process.env.AWS_REGION || 'eu-west-2').trim(),
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  }
};

const client = new CognitoIdentityProviderClient(cognitoConfig);
const clientId = (process.env.AWS_COGNITO_CLIENT_ID || '').trim();
const userPoolId = (process.env.AWS_COGNITO_USER_POOL_ID || '').trim();

function getDbConfig() {
  return {
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
    user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
    password: process.env.AWS_AURORA_PASSWORD || '',
    ssl: { rejectUnauthorized: false }
  };
}

function getAttr(attrs: Array<{ Name?: string; Value?: string }>, name: string): string {
  const a = attrs.find((x) => x.Name === name);
  return (a?.Value != null ? a.Value : '') || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!trimmedEmail || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const confirmCmd = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: trimmedEmail,
      ConfirmationCode: code
    });
    await client.send(confirmCmd);

    // Create minimal profile: fetch Cognito user then insert into Aurora.
    try {
      if (!userPoolId) {
        console.warn('[confirm-signup] AWS_COGNITO_USER_POOL_ID missing, skipping profile create');
      } else {
        const getUserCmd = new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: trimmedEmail
        });
        const getUserRes = await client.send(getUserCmd);
        const attrs = getUserRes.UserAttributes || [];
        const sub = getAttr(attrs, 'sub');
        const givenName = getAttr(attrs, 'given_name');
        const familyName = getAttr(attrs, 'family_name');
        const displayName = [givenName, familyName].filter(Boolean).join(' ') || trimmedEmail;

        if (!sub) {
          console.warn('[confirm-signup] No sub from Cognito, skipping profile create');
        } else {
          const pg = new Client(getDbConfig());
          await pg.connect();
          await pg.query(
            `INSERT INTO profiles (user_id, email, first_name, last_name, display_name, streak_count, baseline_established)
             VALUES ($1, $2, $3, $4, $5, 0, false)
             ON CONFLICT (email) DO NOTHING`,
            [sub, trimmedEmail, givenName || null, familyName || null, displayName]
          );
          await pg.end();
        }
      }
    } catch (profileErr: any) {
      console.error('[confirm-signup] Profile create failed (continuing):', profileErr?.message || profileErr);
      // Still return 200 – do not interrupt flow; lazy create can fix later.
    }

    res.status(200).json({ error: null });
  } catch (error: any) {
    console.error('Cognito confirm sign up error:', error);

    let errorMessage = 'Email confirmation failed';
    if (error.name === 'CodeMismatchException') {
      errorMessage = 'Invalid confirmation code. Please check the code and try again.';
    } else if (error.name === 'ExpiredCodeException') {
      errorMessage = 'Confirmation code has expired. Please request a new code.';
    } else if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({ error: errorMessage });
  }
}


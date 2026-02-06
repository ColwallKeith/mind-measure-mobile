/**
 * Public API: check whether an email already exists (profile OR Cognito).
 * No auth required - used by mobile app before sign-in/registration to route
 * returning users to sign-in vs new users to registration.
 * Checks profiles table first, then Cognito (users who started auth but never
 * completed can use sign-in / Lost password? instead of being stranded).
 * Returns { exists: boolean } only; no profile data.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

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

async function existsInCognito(email: string): Promise<boolean> {
  const userPoolId = (process.env.AWS_COGNITO_USER_POOL_ID || '').trim();
  const region = (process.env.AWS_REGION || 'eu-west-2').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

  if (!userPoolId || !accessKeyId || !secretAccessKey) {
    console.warn('[check-email] Cognito config missing (USER_POOL_ID or credentials) – skipping Cognito check');
    return false;
  }

  const client = new CognitoIdentityProviderClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  try {
    await client.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email
      })
    );
    return true;
  } catch (e: any) {
    if (e?.name === 'UserNotFoundException') return false;
    console.error('[check-email] Cognito check failed:', e?.message || e);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = (req.method === 'POST' ? req.body?.email : req.query?.email) as string | undefined;
  const trimmed = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmed || !trimmed.includes('@')) {
    return res.status(400).json({ error: 'Valid email required', exists: false });
  }

  let existsInProfiles = false;
  const pg = new Client(getDbConfig());
  try {
    await pg.connect();
    const r = await pg.query(
      'SELECT 1 FROM profiles WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
      [trimmed]
    );
    existsInProfiles = (r.rowCount ?? 0) > 0;
  } catch (e: any) {
    console.error('[check-email]', e?.message);
    return res.status(500).json({ error: 'Check failed', exists: false });
  } finally {
    await pg.end();
  }

  if (existsInProfiles) {
    return res.status(200).json({ exists: true });
  }

  const existsInCognitoUserPool = await existsInCognito(trimmed);
  const exists = existsInProfiles || existsInCognitoUserPool;
  return res.status(200).json({ exists });
}

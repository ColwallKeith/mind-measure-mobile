// API endpoint for AWS Cognito sign out
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';

// AWS Cognito configuration
const cognitoConfig = {
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

const client = new CognitoIdentityProviderClient(cognitoConfig);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session } = req.body;

  if (!session?.AccessToken) {
    return res.status(400).json({ error: 'Valid session with access token is required' });
  }

  try {
    const command = new GlobalSignOutCommand({
      AccessToken: session.AccessToken
    });

    await client.send(command);

    res.status(200).json({
      success: true,
      error: null
    });

  } catch (error: any) {
    console.error('Cognito sign out error:', error);
    res.status(500).json({
      error: error.message || 'Sign out failed'
    });
  }
}

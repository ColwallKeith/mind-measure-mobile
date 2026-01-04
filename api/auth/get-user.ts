// API endpoint for getting current AWS Cognito user
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  GetUserCommand
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

  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    const command = new GetUserCommand({
      AccessToken: accessToken
    });

    const result = await client.send(command);

    // Extract user attributes
    const attributes: Record<string, string> = {};
    result.UserAttributes?.forEach(attr => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    res.status(200).json({
      username: result.Username,
      attributes,
      error: null
    });

  } catch (error: any) {
    console.error('Cognito get user error:', error);
    
    let errorMessage = 'Failed to get user';
    if (error.name === 'NotAuthorizedException') {
      errorMessage = 'Invalid or expired token';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(401).json({ error: errorMessage });
  }
}


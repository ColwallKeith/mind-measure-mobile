// API endpoint for AWS Cognito email confirmation (POST version for client calls)
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand
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
const clientId = process.env.AWS_COGNITO_CLIENT_ID || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code
    });

    await client.send(command);

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


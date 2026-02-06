// API endpoint for confirming AWS Cognito password reset
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand
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

  const rawEmail = (req.body?.email ?? '').toString().trim();
  const email = rawEmail.toLowerCase().replace(/\s/g, '');
  const code = (req.body?.code ?? '').toString().trim();
  const newPassword = (req.body?.newPassword ?? '').toString();

  if (!email || !email.includes('@') || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });

    await client.send(command);

    res.status(200).json({ error: null });

  } catch (error: any) {
    console.error('Cognito confirm forgot password error:', error);
    
    let errorMessage = 'Failed to reset password';
    if (error.name === 'CodeMismatchException') {
      errorMessage = 'Invalid reset code. Please check the code and try again.';
    } else if (error.name === 'ExpiredCodeException') {
      errorMessage = 'Reset code has expired. Please request a new code.';
    } else if (error.name === 'InvalidPasswordException') {
      errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers';
    } else if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
}


// API endpoint for AWS Cognito sign in
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get environment variables and trim whitespace/newlines
    const region = (process.env.AWS_REGION || 'eu-west-2').trim();
    const clientId = process.env.AWS_COGNITO_CLIENT_ID?.trim();
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

    if (!clientId || !accessKeyId || !secretAccessKey) {
      console.error('❌ Missing required environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Cognito client inside handler
    const client = new CognitoIdentityProviderClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });

    const command = new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const result = await client.send(command);

    // Check if additional steps are required
    if (result.ChallengeName) {
      // Handle confirmation required case
      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return res.status(200).json({
          needsNewPassword: true,
          session: result.Session,
          error: null
        });
      }
      
      return res.status(200).json({
        challengeName: result.ChallengeName,
        session: result.Session,
        error: 'Additional verification required'
      });
    }

    // Successful sign in
    res.status(200).json({
      accessToken: result.AuthenticationResult?.AccessToken,
      idToken: result.AuthenticationResult?.IdToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
      tokenType: result.AuthenticationResult?.TokenType,
      error: null
    });

  } catch (error: any) {
    console.error('Cognito sign in error:', error);
    
    let errorMessage = 'Sign in failed';
    let needsVerification = false;
    
    if (error.name === 'NotAuthorizedException') {
      errorMessage = 'Incorrect email or password';
    } else if (error.name === 'UserNotConfirmedException') {
      errorMessage = 'Email not verified';
      needsVerification = true;
    } else if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found';
    } else if (error.name === 'TooManyRequestsException') {
      errorMessage = 'Too many failed attempts. Please wait a few minutes.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(401).json({
      error: errorMessage,
      needsVerification
    });
  }
}

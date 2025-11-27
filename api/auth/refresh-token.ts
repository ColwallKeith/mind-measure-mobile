import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const region = process.env.AWS_REGION?.trim() || 'eu-west-2';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || '';
  const clientId = process.env.AWS_COGNITO_CLIENT_ID?.trim() || '';

  if (!clientId || !accessKeyId || !secretAccessKey) {
    console.error('Server configuration error: Missing AWS Cognito credentials or client ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const client = new CognitoIdentityProviderClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('No authentication result returned');
    }

    const { AccessToken, IdToken, ExpiresIn } = response.AuthenticationResult;

    res.status(200).json({
      session: {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: refreshToken, // Refresh token stays the same
        expiresIn: ExpiresIn || 3600,
        tokenType: 'Bearer'
      },
      error: null
    });

  } catch (error: any) {
    console.error('Cognito refresh token error:', error);
    res.status(400).json({ error: error.message || 'Token refresh failed' });
  }
}


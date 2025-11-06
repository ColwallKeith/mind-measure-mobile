// Multi-Factor Authentication Service
// Medical-grade security implementation for HIPAA compliance
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SetUserMFAPreferenceCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  ConfirmSignUpCommand,
  SignUpCommand,
  GetUserCommand,
  AdminSetUserMFAPreferenceCommand
} from '@aws-sdk/client-cognito-identity-provider';
export interface MFASetupResult {
  success: boolean;
  secretCode?: string;
  qrCodeUrl?: string;
  error?: string;
}
export interface MFAVerificationResult {
  success: boolean;
  session?: string;
  challengeName?: string;
  error?: string;
}
export interface MFAAuthResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  challengeName?: string;
  session?: string;
  error?: string;
}
export class MFAService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private clientSecret?: string;
  constructor(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    userPoolId: string;
    clientId: string;
    clientSecret?: string;
  }) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.userPoolId = config.userPoolId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }
  /**
   * Generate secret hash for Cognito client secret
   */
  private generateSecretHash(username: string): string {
    if (!this.clientSecret) return '';
    // Browser compatibility check
    if (typeof window !== 'undefined') {
      throw new Error('MFAService cannot be used in browser environment. Use API endpoints for MFA operations.');
    }
    const crypto = require('crypto');
    const message = username + this.clientId;
    return crypto.createHmac('SHA256', this.clientSecret).update(message).digest('base64');
  }
  /**
   * Sign up user with MFA requirement
   */
  async signUpWithMFA(email: string, password: string, phoneNumber?: string): Promise<MFAAuthResult> {
    try {
      const userAttributes = [
        { Name: 'email', Value: email },
      ];
      if (phoneNumber) {
        userAttributes.push({ Name: 'phone_number', Value: phoneNumber });
      }
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
        SecretHash: this.generateSecretHash(email),
      });
      const result = await this.cognitoClient.send(command);
      return {
        success: true,
        session: result.Session,
      };
    } catch (error: any) {
      console.error('MFA Sign Up failed:', error);
      return {
        success: false,
        error: error.message || 'Sign up failed',
      };
    }
  }
  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(email: string, confirmationCode: string): Promise<MFAAuthResult> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        SecretHash: this.generateSecretHash(email),
      });
      await this.cognitoClient.send(command);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Confirm Sign Up failed:', error);
      return {
        success: false,
        error: error.message || 'Confirmation failed',
      };
    }
  }
  /**
   * Initiate authentication with MFA
   */
  async initiateAuth(email: string, password: string): Promise<MFAAuthResult> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: this.generateSecretHash(email),
        },
      });
      const result = await this.cognitoClient.send(command);
      if (result.ChallengeName) {
        // MFA challenge required
        return {
          success: true,
          challengeName: result.ChallengeName,
          session: result.Session,
        };
      }
      // Authentication successful without MFA (shouldn't happen with MFA ON)
      return {
        success: true,
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
        refreshToken: result.AuthenticationResult?.RefreshToken,
      };
    } catch (error: any) {
      console.error('MFA Auth initiation failed:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }
  /**
   * Respond to MFA challenge (SMS or TOTP)
   */
  async respondToMFAChallenge(
    challengeName: string,
    session: string,
    challengeResponse: string,
    email: string
  ): Promise<MFAAuthResult> {
    try {
      const challengeResponses: Record<string, string> = {
        USERNAME: email,
        SECRET_HASH: this.generateSecretHash(email),
      };
      // Set the appropriate challenge response based on challenge type
      if (challengeName === 'SMS_MFA') {
        challengeResponses.SMS_MFA_CODE = challengeResponse;
      } else if (challengeName === 'SOFTWARE_TOKEN_MFA') {
        challengeResponses.SOFTWARE_TOKEN_MFA_CODE = challengeResponse;
      } else {
        challengeResponses[challengeName] = challengeResponse;
      }
      const command = new RespondToAuthChallengeCommand({
        ClientId: this.clientId,
        ChallengeName: challengeName as any,
        Session: session,
        ChallengeResponses: challengeResponses,
      });
      const result = await this.cognitoClient.send(command);
      if (result.ChallengeName) {
        // Another challenge required
        return {
          success: true,
          challengeName: result.ChallengeName,
          session: result.Session,
        };
      }
      // Authentication successful
      return {
        success: true,
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
        refreshToken: result.AuthenticationResult?.RefreshToken,
      };
    } catch (error: any) {
      console.error('MFA Challenge response failed:', error);
      return {
        success: false,
        error: error.message || 'MFA verification failed',
      };
    }
  }
  /**
   * Set up TOTP (Time-based One-Time Password) for a user
   */
  async setupTOTP(accessToken: string): Promise<MFASetupResult> {
    try {
      const command = new AssociateSoftwareTokenCommand({
        AccessToken: accessToken,
      });
      const result = await this.cognitoClient.send(command);
      if (result.SecretCode) {
        // Generate QR code URL for authenticator apps
        const qrCodeUrl = this.generateQRCodeUrl(result.SecretCode);
        return {
          success: true,
          secretCode: result.SecretCode,
          qrCodeUrl,
        };
      }
      return {
        success: false,
        error: 'Failed to generate TOTP secret',
      };
    } catch (error: any) {
      console.error('TOTP setup failed:', error);
      return {
        success: false,
        error: error.message || 'TOTP setup failed',
      };
    }
  }
  /**
   * Verify TOTP setup
   */
  async verifyTOTP(accessToken: string, totpCode: string): Promise<MFAVerificationResult> {
    try {
      const command = new VerifySoftwareTokenCommand({
        AccessToken: accessToken,
        UserCode: totpCode,
      });
      const result = await this.cognitoClient.send(command);
      return {
        success: result.Status === 'SUCCESS',
        session: result.Session,
      };
    } catch (error: any) {
      console.error('TOTP verification failed:', error);
      return {
        success: false,
        error: error.message || 'TOTP verification failed',
      };
    }
  }
  /**
   * Set user MFA preferences
   */
  async setMFAPreference(
    accessToken: string,
    preferences: {
      smsEnabled?: boolean;
      totpEnabled?: boolean;
      preferredMFA?: 'SMS' | 'TOTP';
    }
  ): Promise<MFAVerificationResult> {
    try {
      const command = new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SMSMfaSettings: preferences.smsEnabled ? {
          Enabled: true,
          PreferredMfa: preferences.preferredMFA === 'SMS',
        } : undefined,
        SoftwareTokenMfaSettings: preferences.totpEnabled ? {
          Enabled: true,
          PreferredMfa: preferences.preferredMFA === 'TOTP',
        } : undefined,
      });
      await this.cognitoClient.send(command);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Set MFA preference failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to set MFA preferences',
      };
    }
  }
  /**
   * Generate QR code URL for TOTP setup
   */
  private generateQRCodeUrl(secretCode: string): string {
    const issuer = 'Mind Measure';
    const accountName = 'user@mindmeasure.co.uk'; // This should be the user's email
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secretCode}&issuer=${encodeURIComponent(issuer)}`;
    // Generate QR code URL using a QR code service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
  }
  /**
   * Get user MFA status
   */
  async getUserMFAStatus(accessToken: string): Promise<{
    mfaEnabled: boolean;
    mfaMethods: string[];
    preferredMFA?: string;
  }> {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });
      const result = await this.cognitoClient.send(command);
      const mfaOptions = result.MFAOptions || [];
      const userMFASettingList = result.UserMFASettingList || [];
      return {
        mfaEnabled: mfaOptions.length > 0 || userMFASettingList.length > 0,
        mfaMethods: [...mfaOptions.map(opt => opt.DeliveryMedium || ''), ...userMFASettingList],
        preferredMFA: result.PreferredMfaSetting,
      };
    } catch (error: any) {
      console.error('Get MFA status failed:', error);
      return {
        mfaEnabled: false,
        mfaMethods: [],
      };
    }
  }
}
// Factory function to create MFA service
export function createMFAService(): MFAService {
  const config = {
    region: process.env.VITE_AWS_REGION || 'eu-west-2',
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    userPoolId: process.env.VITE_AWS_COGNITO_USER_POOL_ID || '',
    clientId: process.env.VITE_AWS_COGNITO_CLIENT_ID || '',
    clientSecret: process.env.VITE_AWS_COGNITO_CLIENT_SECRET,
  };
  return new MFAService(config);
}
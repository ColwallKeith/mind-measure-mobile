/**
 * Cognito Deep Link Service
 * 
 * AWS Cognito doesn't support custom deep links directly, but we can implement
 * a workaround using a web endpoint that redirects to the mobile app.
 */

import { amplifyAuth } from './amplify-auth';

export interface CognitoDeepLinkService {
  generateConfirmationLink: (email: string, code: string) => string;
  handleConfirmationLink: (url: string) => Promise<boolean>;
  setupWebRedirectEndpoint: () => void;
}

class CognitoDeepLinkServiceImpl implements CognitoDeepLinkService {
  
  /**
   * Generate a web link that will confirm the email and redirect to the app
   * This link can be included in custom email templates
   */
  generateConfirmationLink(email: string, code: string): string {
    const baseUrl = 'https://mobile.mindmeasure.app';
    const params = new URLSearchParams({
      action: 'confirm-email',
      email: email,
      code: code,
      redirect: 'mindmeasure://confirmed'
    });
    
    return `${baseUrl}/auth/confirm?${params.toString()}`;
  }

  /**
   * Handle a confirmation link by extracting the code and confirming the email
   */
  async handleConfirmationLink(url: string): Promise<boolean> {
    try {
      console.log('🔗 Handling Cognito confirmation link:', url);
      
      const urlObj = new URL(url);
      const email = urlObj.searchParams.get('email');
      const code = urlObj.searchParams.get('code');
      
      if (!email || !code) {
        console.error('❌ Missing email or code in confirmation link');
        return false;
      }

      console.log('📧 Confirming email:', email, 'with code:', code);
      
      // Use our amplify auth service to confirm the email
      const { error } = await amplifyAuth.confirmSignUp(email, code);
      
      if (error) {
        console.error('❌ Email confirmation failed:', error);
        return false;
      }

      console.log('✅ Email confirmed successfully via deep link');
      return true;
      
    } catch (error) {
      console.error('❌ Error handling confirmation link:', error);
      return false;
    }
  }

  /**
   * Setup a web endpoint handler for email confirmations
   * This would typically be implemented as a Vercel serverless function
   */
  setupWebRedirectEndpoint(): void {
    console.log('🔗 Web redirect endpoint should be implemented as /api/auth/confirm');
    console.log('📝 This endpoint should:');
    console.log('   1. Extract email and code from query params');
    console.log('   2. Call AWS Cognito confirmSignUp API');
    console.log('   3. Redirect to mindmeasure://confirmed on success');
    console.log('   4. Show error page on failure');
  }
}

export const cognitoDeepLinkService = new CognitoDeepLinkServiceImpl();

/**
 * Vercel API endpoint implementation (should be created as /api/auth/confirm.ts)
 * 
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   const { email, code, redirect } = req.query;
 *   
 *   if (!email || !code) {
 *     return res.status(400).json({ error: 'Missing email or code' });
 *   }
 *   
 *   try {
 *     // Confirm with Cognito
 *     const result = await amplifyAuth.confirmSignUp(email as string, code as string);
 *     
 *     if (result.error) {
 *       return res.status(400).json({ error: result.error });
 *     }
 *     
 *     // Success - redirect to app
 *     const redirectUrl = redirect || 'mindmeasure://confirmed';
 *     return res.redirect(302, redirectUrl);
 *     
 *   } catch (error) {
 *     return res.status(500).json({ error: 'Confirmation failed' });
 *   }
 * }
 */

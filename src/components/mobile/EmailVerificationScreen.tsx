import { useState, useEffect } from 'react';
import { ChevronLeft, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationScreenProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerificationScreen({ email, onVerified, onBack }: EmailVerificationScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { signIn } = useAuth();

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { confirmSignUp } = await import('aws-amplify/auth');
      
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });

      if (isSignUpComplete) {
        console.log('✅ Email verified successfully');
        
        // After verification, proceed to baseline - user will sign in there if needed
        // OR: Take them to a sign-in screen first
        console.log('📧 Email verified - user can now sign in');
        onVerified();
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      
      if (err.name === 'CodeMismatchException') {
        setError('Invalid code. Please check and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Code expired. Please request a new one.');
      } else if (err.name === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const { resendSignUpCode } = await import('aws-amplify/auth');
      
      await resendSignUpCode({
        username: email
      });

      console.log('✅ Verification code resent');
      setResendCooldown(60); // 60 second cooldown
      setError('New code sent! Check your email.');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        if (error === 'New code sent! Check your email.') {
          setError(null);
        }
      }, 3000);
    } catch (err: any) {
      console.error('❌ Resend error:', err);
      
      if (err.name === 'LimitExceededException') {
        setError('Too many requests. Please try again later.');
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits, max 6 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isLoading) {
      handleVerify();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header with proper iOS safe area padding */}
      <div className="bg-white border-b border-gray-100" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Verify Email</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto" style={{ paddingBottom: 'max(20rem, calc(env(safe-area-inset-bottom) + 20rem))' }}>
        <div className="max-w-md mx-auto">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Check your email
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-8">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>

          {/* Code Input */}
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="000000"
              className="w-full h-14 px-4 text-2xl text-center font-mono tracking-widest border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-gray-500 text-center mt-2">
              Enter the 6-digit code from your email
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-4 rounded-lg ${
              error === 'New code sent! Check your email.' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || isLoading}
            style={{
              background: (code.length !== 6 || isLoading) ? '#d1d5db' : 'linear-gradient(to right, #9333ea, #2563eb)',
              color: 'white',
              width: '100%',
              height: '3.5rem',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: 'none',
              cursor: (code.length !== 6 || isLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s',
              marginBottom: '1.5rem'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span style={{ color: 'white' }}>Verifying...</span>
              </>
            ) : (
              <span style={{ color: 'white' }}>Verify Email</span>
            )}
          </button>

          {/* Resend Code Section */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="w-full h-12 bg-purple-100 text-purple-700 font-semibold rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> The verification email may take a few minutes to arrive. 
              Check your spam folder if you don't see it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


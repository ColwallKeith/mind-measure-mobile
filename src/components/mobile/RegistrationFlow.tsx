/**
 * Unified auth flow (sign-in, welcome, password, verify) using the designed UI.
 * Wired to AuthContext, check-email API, and confirm/resend.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

function getCheckEmailUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api')).replace(/\/database\/?$/, '');
  return `${base}/auth/check-email`;
}

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type RegistrationStep =
  | 'signin'
  | 'welcome'
  | 'password'
  | 'verify'
  | 'forgot-password'
  | 'reset-verify'
  | 'reset-new-password';

export interface RegistrationFlowProps {
  /** Called after successful sign-in. Optional userId for saving to device. */
  onSignInSuccess?: (userId?: string) => void;
  onRegistrationComplete?: () => void;
  onBack?: () => void;
  /** Prefill sign-in email (e.g. from check-email intercept). */
  prefilledEmail?: string;
}

export function RegistrationFlow({
  onSignInSuccess,
  onRegistrationComplete,
  onBack,
  prefilledEmail = ''
}: RegistrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('signin');
  const [userData, setUserData] = useState<UserRegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResendMessage, setResetResendMessage] = useState('');
  const [resetCodeDelivery, setResetCodeDelivery] = useState<{
    DeliveryMedium?: string;
    Destination?: string;
  } | null>(null);

  const { signIn, signUp, confirmEmail, resendConfirmation, forgotPassword, confirmForgotPassword } = useAuth();

  useEffect(() => {
    if (prefilledEmail.trim()) {
      setSignInEmail(prefilledEmail.trim());
    }
  }, [prefilledEmail]);

  const updateUserData = (field: keyof UserRegistrationData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const passwordRequirements = {
    minLength: userData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(userData.password),
    hasLowercase: /[a-z]/.test(userData.password),
    hasNumber: /[0-9]/.test(userData.password),
    passwordsMatch: userData.password === confirmPassword && confirmPassword !== ''
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSignIn = async () => {
    if (!signIn || !signInEmail.trim() || !signInPassword) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(signInEmail.trim(), signInPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      if ((result as { needsVerification?: boolean }).needsVerification) {
        setUserData(prev => ({ ...prev, email: signInEmail.trim() }));
        setVerificationCode(['', '', '', '', '', '']);
        setCurrentStep('verify');
        setError("Please verify your email first. We've sent you a code.");
        return;
      }
      const userId = (result as { user?: { id?: string } }).user?.id;
      onSignInSuccess?.(userId);
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeContinue = async () => {
    const email = userData.email.trim().toLowerCase();
    if (!userData.firstName.trim() || !userData.lastName.trim() || !email || !email.includes('@')) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(getCheckEmailUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      const exists = res.ok && data.exists === true;
      if (exists) {
        setSignInEmail(email);
        setSignInPassword('');
        setCurrentStep('signin');
        setError('We have an account for this email. Please sign in.');
      } else {
        setError(null);
        setCurrentStep('password');
      }
    } catch {
      setError("We couldn't check that email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordContinue = async () => {
    if (!allRequirementsMet || !signUp) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signUp({
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.trim(),
        password: userData.password
      });
      if (err) {
        const msg = (err && String(err)).toLowerCase();
        const isAlreadyExists =
          msg.includes('already exists') || msg.includes('usernamesexistsexception');
        if (isAlreadyExists) {
          setSignInEmail(userData.email.trim());
          setSignInPassword('');
          setCurrentStep('signin');
          setError('We have an account for this email. Please sign in.');
          return;
        }
        setError(err);
        return;
      }
      setVerificationCode(['', '', '', '', '', '']);
      setCurrentStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6 || !confirmEmail) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await confirmEmail(userData.email.trim(), code);
      if (err) {
        setError(err);
        return;
      }
      onRegistrationComplete?.();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!resendConfirmation || isResending) return;
    setIsResending(true);
    setResendMessage('');
    setError(null);
    try {
      const { error: err } = await resendConfirmation(userData.email.trim());
      if (err) {
        setError(err);
      } else {
        setResendMessage('New code sent! Check your email.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) {
      const next = document.getElementById(`code-input-${index + 1}`);
      if (next) (next as HTMLInputElement).focus();
    }
  };

  const handleVerificationKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prev = document.getElementById(`code-input-${index - 1}`);
      if (prev) (prev as HTMLInputElement).focus();
    }
  };

  const isVerificationCodeComplete = verificationCode.every(d => d !== '');

  const handleResetCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;
    const next = [...resetCode];
    next[index] = value;
    setResetCode(next);
    if (value && index < 5) {
      const el = document.getElementById(`reset-code-input-${index + 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
  };

  const handleResetCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      const prev = document.getElementById(`reset-code-input-${index - 1}`);
      if (prev) (prev as HTMLInputElement).focus();
    }
  };

  const isResetCodeComplete = resetCode.every(d => d !== '');

  const resetPasswordRequirements = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    passwordsMatch: newPassword === confirmNewPassword && confirmNewPassword !== ''
  };

  const resetPasswordRequirementsMet = Object.values(resetPasswordRequirements).every(Boolean);

  const normalizeEmail = (raw: string) => raw.trim().toLowerCase().replace(/\s/g, '');

  const handleSendResetCode = async () => {
    const email = normalizeEmail(resetEmail);
    if (!email || !email.includes('@') || !forgotPassword) return;
    setError(null);
    setResetCodeDelivery(null);
    setResetLoading(true);
    try {
      const { error: err, codeDeliveryDetails } = await forgotPassword(email);
      if (err) {
        const msg = err === 'UNVERIFIED_EMAIL_RESET'
          ? 'This account has no verified email. Please sign in or use an account that has verified its email.'
          : err;
        setError(msg);
        return;
      }
      setResetEmail(email);
      setResetCode(['', '', '', '', '', '']);
      setResetCodeDelivery(codeDeliveryDetails ?? null);
      setCurrentStep('reset-verify');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetResendCode = async () => {
    const email = normalizeEmail(resetEmail);
    if (!email || !forgotPassword || isResending) return;
    setIsResending(true);
    setResetResendMessage('');
    setError(null);
    try {
      const { error: err, codeDeliveryDetails } = await forgotPassword(email);
      if (err) {
        setError(err);
        return;
      }
      setResetCodeDelivery(codeDeliveryDetails ?? null);
      const medium = codeDeliveryDetails?.DeliveryMedium?.toLowerCase();
      const where = medium === 'sms' ? 'phone' : 'email';
      setResetResendMessage(`New code sent by ${where}! Check your ${medium === 'sms' ? 'messages' : 'inbox'}.`);
    } finally {
      setIsResending(false);
    }
  };

  const handleResetVerifyContinue = () => {
    if (!isResetCodeComplete) return;
    setError(null);
    setCurrentStep('reset-new-password');
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordRequirementsMet || !confirmForgotPassword) return;
    const email = normalizeEmail(resetEmail);
    const code = resetCode.join('');
    setError(null);
    setResetLoading(true);
    try {
      const { error: err } = await confirmForgotPassword(email, code, newPassword);
      if (err) {
        setError(err);
        return;
      }
      setResetEmail('');
      setResetCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCodeDelivery(null);
      setCurrentStep('signin');
    } finally {
      setResetLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    padding: '20px',
    paddingBottom: '40px'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginBottom: '20px'
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    transition: 'all 0.2s'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  };

  // Sign In
  if (currentStep === 'signin') {
    const isValid = !!signInEmail.trim() && !!signInPassword;

    return (
      <div style={containerStyle}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B5CF6',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: '32px', paddingTop: onBack ? 0 : '40px' }}>
          <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '100px', height: '100px', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '16px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
            Sign in to continue your wellbeing journey
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              value={signInEmail}
              onChange={(e) => { setSignInEmail(e.target.value); setError(null); }}
              placeholder="Your university email"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSignInPassword ? 'text' : 'password'}
                value={signInPassword}
                onChange={(e) => { setSignInPassword(e.target.value); setError(null); }}
                placeholder="Your password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
              <button
                type="button"
                onClick={() => setShowSignInPassword(!showSignInPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
              >
                {showSignInPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={!isValid || loading}
          style={{
            ...buttonPrimaryStyle,
            opacity: isValid && !loading ? 1 : 0.5,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            marginBottom: '16px'
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setResetEmail(signInEmail.trim() || '');
              setResetCode(['', '', '', '', '', '']);
              setNewPassword('');
              setConfirmNewPassword('');
              setResetResendMessage('');
              setResetCodeDelivery(null);
              setCurrentStep('forgot-password');
            }}
            style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: '15px', fontWeight: 600, cursor: 'pointer', padding: '8px 16px' }}
          >
            Lost password?
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 12px 0' }}>{"Don't have an account?"}</p>
          <button
            type="button"
            onClick={() => { setError(null); setCurrentStep('welcome'); }}
            style={{
              background: 'none',
              border: '2px solid #8B5CF6',
              color: '#8B5CF6',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '12px 32px',
              borderRadius: '12px',
              transition: 'all 0.2s'
            }}
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // Forgot Password (in-flow)
  if (currentStep === 'forgot-password') {
    const normalized = normalizeEmail(resetEmail);
    const isValid = !!normalized && normalized.includes('@');
    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => { setError(null); setCurrentStep('signin'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '80px', height: '80px', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Forgot Password?
          </h1>
          <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: 1.5, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
            {"Enter your email address and we'll send you a 6-digit code by email to reset your password."}
          </p>
        </div>
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}
        <div style={cardStyle}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Email</label>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => { setResetEmail(e.target.value); setError(null); }}
            placeholder="Your university email"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
          />
        </div>
        <button
          type="button"
          onClick={handleSendResetCode}
          disabled={!isValid || resetLoading}
          style={{
            ...buttonPrimaryStyle,
            opacity: isValid && !resetLoading ? 1 : 0.5,
            cursor: isValid && !resetLoading ? 'pointer' : 'not-allowed'
          }}
        >
          {resetLoading ? 'Sending…' : 'Send Reset Code'}
        </button>
      </div>
    );
  }

  // Reset Verify (enter code from email)
  if (currentStep === 'reset-verify') {
    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => { setError(null); setResetResendMessage(''); setResetCodeDelivery(null); setCurrentStep('forgot-password'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        {(() => {
          const medium = resetCodeDelivery?.DeliveryMedium?.toUpperCase();
          const dest = resetCodeDelivery?.Destination;
          const byEmail = medium !== 'SMS';
          const channel = byEmail ? 'email' : 'SMS';
          const to = (dest || resetEmail);
          return (
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '80px', height: '80px', margin: '0 auto 24px' }} />
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0', lineHeight: 1.2 }}>
                Enter reset code
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
                {"We've sent a 6-digit code by "}{channel}{" to "}<strong style={{ color: '#1a1a1a' }}>{to}</strong>
              </p>
            </div>
          );
        })()}
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}
        {resetResendMessage && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#D1FAE5', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#065F46' }}>{resetResendMessage}</p>
          </div>
        )}
        <div style={cardStyle}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px', textAlign: 'center' }}>
            Reset Code
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
            {resetCode.map((digit, i) => (
              <input
                key={i}
                id={`reset-code-input-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleResetCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleResetCodeKeyDown(i, e)}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '24px',
                  fontWeight: 600,
                  textAlign: 'center',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.select(); }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
            ))}
          </div>
          <p style={{ fontSize: '13px', color: '#999999', margin: 0, textAlign: 'center' }}>
            {resetCodeDelivery?.DeliveryMedium?.toUpperCase() === 'SMS'
              ? 'Enter the 6-digit code from your phone'
              : 'Enter the 6-digit code from your email'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetVerifyContinue}
          disabled={!isResetCodeComplete}
          style={{
            ...buttonPrimaryStyle,
            opacity: isResetCodeComplete ? 1 : 0.5,
            cursor: isResetCodeComplete ? 'pointer' : 'not-allowed',
            marginBottom: '16px'
          }}
        >
          Verify Code
        </button>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 8px 0' }}>{"Didn't receive the code?"}</p>
          <button
            type="button"
            onClick={handleResetResendCode}
            disabled={isResending}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B5CF6',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isResending ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
              opacity: isResending ? 0.5 : 1
            }}
          >
            {isResending ? 'Sending…' : resetCodeDelivery?.DeliveryMedium?.toUpperCase() === 'SMS' ? 'Resend code by SMS' : 'Resend code by email'}
          </button>
        </div>
        <div style={{ background: '#EEF2FF', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
            {resetCodeDelivery?.DeliveryMedium?.toUpperCase() === 'SMS' ? (
              <><strong>Note:</strong> The code may take a minute to arrive. Check your messages.</>
            ) : (
              <><strong>Note:</strong> The reset email may take a few minutes. Check your spam and promotions folders if you don&apos;t see it.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Reset New Password
  if (currentStep === 'reset-new-password') {
    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => { setError(null); setCurrentStep('reset-verify'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '80px', height: '80px', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0', lineHeight: 1.2 }}>
            Create new password
          </h1>
          <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
            Choose a strong password for your account
          </p>
        </div>
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}
        <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                placeholder="Create a strong password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => { setConfirmNewPassword(e.target.value); setError(null); }}
                placeholder="Re-enter your password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmNewPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0' }}>Your password must contain:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { met: resetPasswordRequirements.minLength, text: 'At least 8 characters' },
              { met: resetPasswordRequirements.hasUppercase, text: 'One uppercase letter' },
              { met: resetPasswordRequirements.hasLowercase, text: 'One lowercase letter' },
              { met: resetPasswordRequirements.hasNumber, text: 'One number' },
              { met: resetPasswordRequirements.passwordsMatch, text: 'Passwords match' }
            ].map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: req.met ? '#8B5CF6' : '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {req.met && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: req.met ? '#1a1a1a' : '#999999' }}>{req.text}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetPasswordSubmit}
          disabled={!resetPasswordRequirementsMet || resetLoading}
          style={{
            ...buttonPrimaryStyle,
            opacity: resetPasswordRequirementsMet && !resetLoading ? 1 : 0.5,
            cursor: resetPasswordRequirementsMet && !resetLoading ? 'pointer' : 'not-allowed'
          }}
        >
          {resetLoading ? 'Resetting…' : 'Reset Password'}
        </button>
      </div>
    );
  }

  // Welcome (name + email on one screen)
  if (currentStep === 'welcome') {
    const isValid = !!userData.firstName.trim() && !!userData.lastName.trim() && !!userData.email.trim() && userData.email.includes('@');

    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => { setError(null); setCurrentStep('signin'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '100px', height: '100px', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Welcome to Mind Measure
          </h1>
          <p style={{ fontSize: '16px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
            Your personal wellbeing companion
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>First Name</label>
            <input
              type="text"
              value={userData.firstName}
              onChange={(e) => updateUserData('firstName', e.target.value)}
              placeholder="e.g., Sarah"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Last Name</label>
            <input
              type="text"
              value={userData.lastName}
              onChange={(e) => updateUserData('lastName', e.target.value)}
              placeholder="e.g., Johnson"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Your University Email</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => updateUserData('email', e.target.value)}
              placeholder="e.g., sarah.j@student.ac.uk"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleWelcomeContinue}
          disabled={!isValid || loading}
          style={{
            ...buttonPrimaryStyle,
            opacity: isValid && !loading ? 1 : 0.5,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </div>
    );
  }

  // Password
  if (currentStep === 'password') {
    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => { setError(null); setCurrentStep('welcome'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '100px', height: '100px', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Create a secure password
          </h1>
          <p style={{ fontSize: '16px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
            Keep your wellness data safe and secure
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={userData.password}
                onChange={(e) => updateUserData('password', e.target.value)}
                placeholder="Create a secure password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 12px 0' }}>Password Requirements:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'At least 8 characters', met: passwordRequirements.minLength },
                { label: 'One uppercase letter (A-Z)', met: passwordRequirements.hasUppercase },
                { label: 'One lowercase letter (a-z)', met: passwordRequirements.hasLowercase },
                { label: 'One number (0-9)', met: passwordRequirements.hasNumber },
                { label: 'Passwords match', met: passwordRequirements.passwordsMatch }
              ].map((req, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${req.met ? '#10B981' : '#D1D5DB'}`,
                      background: req.met ? '#10B981' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {req.met && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: req.met ? '#374151' : '#9CA3AF' }}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePasswordContinue}
          disabled={!allRequirementsMet || loading}
          style={{
            ...buttonPrimaryStyle,
            opacity: allRequirementsMet && !loading ? 1 : 0.5,
            cursor: allRequirementsMet && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Creating account…' : 'Continue'}
        </button>
      </div>
    );
  }

  // Verify
  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={() => { setError(null); setResendMessage(''); setCurrentStep('password'); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#8B5CF6',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 0'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <img src={mindMeasureLogo} alt="Mind Measure" style={{ width: '80px', height: '80px', margin: '0 auto 24px' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0', lineHeight: 1.2 }}>
          Check your email
        </h1>
        <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
          {"We've sent a 6-digit verification code to "}<strong style={{ color: '#1a1a1a' }}>{userData.email}</strong>
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
        </div>
      )}
      {resendMessage && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#D1FAE5', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#065F46' }}>{resendMessage}</p>
        </div>
      )}

      <div style={cardStyle}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px', textAlign: 'center' }}>
          Verification Code
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
          {verificationCode.map((digit, i) => (
            <input
              key={i}
              id={`code-input-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleVerificationCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleVerificationKeyDown(i, e)}
              style={{
                width: '48px',
                height: '56px',
                fontSize: '24px',
                fontWeight: 600,
                textAlign: 'center',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.select(); }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />
          ))}
        </div>
        <p style={{ fontSize: '13px', color: '#999999', margin: 0, textAlign: 'center' }}>
          Enter the 6-digit code from your email
        </p>
      </div>

      <button
        type="button"
        onClick={handleVerifySubmit}
        disabled={!isVerificationCodeComplete || loading}
        style={{
          ...buttonPrimaryStyle,
          opacity: isVerificationCodeComplete && !loading ? 1 : 0.5,
          cursor: isVerificationCodeComplete && !loading ? 'pointer' : 'not-allowed',
          marginBottom: '16px'
        }}
      >
        {loading ? 'Verifying…' : 'Verify Email'}
      </button>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 8px 0' }}>{"Didn't receive the code?"}</p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B5CF6',
            fontSize: '15px',
            fontWeight: 600,
            cursor: isResending ? 'not-allowed' : 'pointer',
            padding: '8px 16px',
            opacity: isResending ? 0.5 : 1
          }}
        >
          {isResending ? 'Sending…' : 'Resend Code'}
        </button>
      </div>

      <div style={{ background: '#EEF2FF', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <p style={{ fontSize: '13px', color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
          <strong>Note:</strong> The verification email may take a few minutes to arrive. Check your spam folder if you don't see it.
        </p>
      </div>
    </div>
  );
}

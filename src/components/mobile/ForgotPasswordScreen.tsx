import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onComplete?: () => void;
  /** Prefill email when coming from RegistrationFlow "Lost password?" */
  prefilledEmail?: string;
}

export function ForgotPasswordScreen({ onBack, onComplete, prefilledEmail = '' }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (prefilledEmail.trim()) setEmail(prefilledEmail.trim());
  }, [prefilledEmail]);
  
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('🔐 Requesting password reset for:', email);
    const { error: forgotError } = await forgotPassword(email);

    if (forgotError) {
      console.error('❌ Forgot password failed:', forgotError);
      setError(forgotError);
      setIsLoading(false);
    } else {
      console.log('✅ Password reset code sent');
      setStep('code');
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('🔐 Confirming password reset for:', email);
    const { error: confirmError } = await confirmForgotPassword(email, code, newPassword);

    if (confirmError) {
      console.error('❌ Confirm password reset failed:', confirmError);
      setError(confirmError);
      setIsLoading(false);
    } else {
      console.log('✅ Password reset successful');
      setStep('success');
      setIsLoading(false);
      
      // Auto-navigate back after 2 seconds
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          onBack();
        }
      }, 2000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="font-medium text-base">Back</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {step === 'email' ? 'Reset Password' : step === 'code' ? 'Enter Code' : 'Success'}
          </h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="flex-1 px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ paddingBottom: 'max(20rem, calc(env(safe-area-inset-bottom) + 20rem))' }}
      >
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src={mindMeasureLogo}
                alt="Mind Measure"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>

          {step === 'email' && (
            <>
              <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 text-center mb-2">
                Forgot Password?
              </motion.h2>
              <motion.p variants={itemVariants} className="text-gray-600 text-center mb-8">
                Enter your email address and we'll send you a code to reset your password.
              </motion.p>

              <form onSubmit={handleSendCode} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@university.ac.uk"
                      className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                      style={{ paddingLeft: '2rem' }}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200"
                  >
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <motion.button
                  variants={itemVariants}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <span>Send Reset Code</span>
                  )}
                </motion.button>
              </form>
            </>
          )}

          {step === 'code' && (
            <>
              <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 text-center mb-2">
                Enter Reset Code
              </motion.h2>
              <motion.p variants={itemVariants} className="text-gray-600 text-center mb-8">
                We've sent a code to <strong>{email}</strong>. Enter it below along with your new password.
              </motion.p>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Reset Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all text-center text-2xl tracking-widest"
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200"
                  >
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <motion.button
                  variants={itemVariants}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Resetting password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  className="w-full text-center text-purple-600 font-medium hover:text-purple-700 transition-colors"
                  disabled={isLoading}
                >
                  Back to email entry
                </motion.button>
              </form>
            </>
          )}

          {step === 'success' && (
            <motion.div
              variants={itemVariants}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Password Reset Successful!</h2>
              <p className="text-gray-600">
                Your password has been reset. You can now sign in with your new password.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

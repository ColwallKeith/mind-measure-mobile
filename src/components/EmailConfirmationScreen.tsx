import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EmailConfirmationScreenProps {
  email: string;
  onBack: () => void;
  onConfirmed: () => void;
}

export function EmailConfirmationScreen({ email, onBack, onConfirmed }: EmailConfirmationScreenProps) {
  const [code, setCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  
  const { confirmEmail, resendConfirmation, refetchUser } = useAuth();

  // Auto-refresh user status every 10 seconds to detect email confirmation
  useEffect(() => {
    const pollConfirmationStatus = async () => {
      if (isPolling) return; // Prevent multiple polls
      
      setIsPolling(true);
      try {
        console.log('🔄 Polling user confirmation status...');
        await refetchUser();
        // The parent App.tsx will handle the user state change and redirect if confirmed
      } catch (error) {
        console.error('❌ Error polling confirmation status:', error);
      } finally {
        setIsPolling(false);
      }
    };

    // Start polling after 5 seconds, then every 10 seconds
    const initialDelay = setTimeout(() => {
      pollConfirmationStatus();
      
      const interval = setInterval(pollConfirmationStatus, 10000);
      
      // Cleanup interval on unmount
      return () => {
        clearInterval(interval);
        clearTimeout(initialDelay);
      };
    }, 5000);

    return () => clearTimeout(initialDelay);
  }, [refetchUser, isPolling]);

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the confirmation code');
      return;
    }

    setIsConfirming(true);
    setError('');

    try {
      const { error: confirmError } = await confirmEmail(email, code.trim());
      if (confirmError) {
        setError(confirmError);
        return;
      }

      console.log('✅ Email confirmed successfully');
      onConfirmed();
    } catch (error) {
      console.error('Confirmation error:', error);
      setError('Failed to confirm email. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setResendMessage('');
    setError('');

    try {
      const { error: resendError } = await resendConfirmation(email);
      if (resendError) {
        setError(resendError);
        return;
      }

      setResendMessage('New confirmation code sent! Please check your email.');
    } catch (error) {
      console.error('Resend error:', error);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
      {/* Background effects */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-200/30 rounded-full blur-3xl"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-pink-200/20 rounded-full blur-2xl"
        animate={{
          y: [0, 10, 0],
          x: [0, -8, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <motion.div
        className="relative z-10 min-h-screen flex flex-col justify-center px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <button
            onClick={onBack}
            className="text-gray-700 hover:text-gray-900 font-medium flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants} className="max-w-md mx-auto w-full">
          <Card className="p-8 shadow-2xl rounded-3xl border-0 bg-white/90 backdrop-blur-xl">
            <div className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Mail className="w-10 h-10 text-white" />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-800 mb-3">
                Check Your Email
              </h1>
              
              <p className="text-gray-600 mb-4 leading-relaxed">
                We've sent a confirmation code to:
                <br />
                <span className="font-semibold text-purple-600 text-lg">{email}</span>
              </p>

              {/* Auto-refresh indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="flex items-center text-blue-700 text-sm">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isPolling ? 'bg-blue-500 animate-pulse' : 'bg-blue-300'}`}></div>
                  {isPolling ? 'Checking confirmation status...' : 'Auto-checking every 10 seconds'}
                </div>
              </div>

              {/* Confirmation Form */}
              <form onSubmit={handleConfirmEmail} className="space-y-6">
                <div>
                  <Label htmlFor="code" className="text-base font-medium text-gray-700 mb-3 block text-left">
                    Confirmation Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="text-center text-xl font-mono tracking-widest h-16 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-gray-50/50"
                    maxLength={6}
                    required
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4"
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Success Message */}
                {resendMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-4"
                  >
                    <p className="text-green-600 text-sm flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {resendMessage}
                    </p>
                  </motion.div>
                )}

                {/* Confirm Button */}
                <Button
                  type="submit"
                  disabled={isConfirming || !code.trim()}
                  className="w-full h-16 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-400"
                >
                  {isConfirming ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirming...</span>
                    </div>
                  ) : (
                    'Confirm Email'
                  )}
                </Button>
              </form>

              {/* Resend Code */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 h-12 px-6 rounded-xl font-medium"
                >
                  {isResending ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Resend Code</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Check your spam folder if you don't see the email
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
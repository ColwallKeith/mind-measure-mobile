import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';
import {
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  Sparkles
} from 'lucide-react';

interface SignInScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onError: () => void; // New callback for errors
  onForgotPassword: () => void;
  onCreateAccount?: () => void; // Optional create account callback
  prefilledEmail?: string; // Optional pre-filled email
  onUnverifiedEmail?: (email: string) => void; // Handle unverified email
}

interface FormData {
  email: string;
  password: string;
}

export function SignInScreen({ onBack, onSuccess, onError, onForgotPassword, onCreateAccount, prefilledEmail, onUnverifiedEmail }: SignInScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: prefilledEmail || '', // Use pre-filled email if provided
    password: ''
  });
  
  const { signIn } = useAuth();

  // Update email when prefilledEmail changes
  useEffect(() => {
    if (prefilledEmail) {
      setFormData(prev => ({ ...prev, email: prefilledEmail }));
    }
  }, [prefilledEmail]);

  // Capacitor keyboard handling (same as registration screen)
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
    const hideListener = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Prevent iOS zoom on input focus (same as registration screen)
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport?.getAttribute('content') || '';
    
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    const style = document.createElement('style');
    style.textContent = `
      input, textarea, select {
        font-size: 16px !important;
        transform: translateZ(0);
      }
      * {
        -webkit-text-size-adjust: 100%;
        -moz-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
    `;
    document.head.appendChild(style);
    console.log('🔧 Applied sign-in zoom prevention');

    return () => {
      if (viewport && originalContent) {
        viewport.setAttribute('content', originalContent);
      } else if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      window.setTimeout(() => {
        if (window.visualViewport) {
          window.scrollTo(0, 0);
        }
      }, 100);
      console.log('🔄 Restored viewport settings after sign-in');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    setIsLoading(true);

    try {
      console.log('🔐 Attempting sign-in for:', formData.email);
      console.log('🔧 Environment check:', {
        userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
        clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
        region: import.meta.env.VITE_AWS_REGION
      });
      
      const result = await signIn(formData.email, formData.password);
      
      // Handle unverified email case
      if (result.needsVerification && result.email) {
        console.log('📧 Unverified email detected - redirecting to email confirmation');
        onUnverifiedEmail?.(result.email);
        return;
      }
      
      if (result.error) {
        console.error('❌ Sign-in error:', result.error);
        
        // Mark this device as used for future app launches
        try {
          await Preferences.set({ 
            key: 'mindmeasure_device_used', 
            value: 'true' 
          });
          console.log('📱 Device marked as used for future returning user detection');
        } catch (deviceError) {
          console.error('❌ Error tracking device:', deviceError);
        }
        
        // Show the error to the user
        console.log('🔴 Setting error message:', result.error);
        setError(result.error);
        onError(); // Notify parent about the error
        
        // Force a small delay to ensure error state is set before any re-renders
        setTimeout(() => {
          console.log('🔴 Error state after delay:', result.error);
        }, 100);
        
        return;
      }

      console.log('✅ Sign-in successful');
      onSuccess();
      
    } catch (err) {
      console.error('❌ Unexpected sign-in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    console.log('⬅️ Going back from sign-in');
    onBack();
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/20 to-pink-100/30" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-32 right-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
      <div className="absolute top-60 right-20 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />

      <motion.div
        className="relative z-10 min-h-screen flex flex-col"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="pt-20 pb-6 px-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="text-gray-700 hover:text-gray-900 font-medium flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          </div>

          {/* Logo and title */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogIn className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in to continue your wellness journey
            </p>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants} className="flex-1 px-6 pb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
            <div className="p-6 pt-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Email Field */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-gray-700 font-medium text-base block">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-12 pr-4 h-16 text-base rounded-2xl border-gray-200 focus:border-purple-400 focus:ring-purple-400 bg-white/60"
                      placeholder="your.email@university.edu"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-gray-700 font-medium text-base block">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-12 pr-12 h-16 text-base rounded-2xl border-gray-200 focus:border-purple-400 focus:ring-purple-400 bg-white/60"
                      placeholder="Enter your password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6"
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Forgot Password Link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Sign In Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.email || !formData.password}
                    className="w-full h-16 text-lg font-semibold rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <LogIn className="w-5 h-5" />
                        <span>Sign In</span>
                      </div>
                    )}
                  </Button>
                </div>

              {/* Create Account Link */}
              {onCreateAccount && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={onCreateAccount}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              )}

              {/* Debug: Clear All Storage Button (TEMPORARY) */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Clear all Capacitor Preferences (device storage)
                      await Preferences.clear();
                      console.log('🗑️ All device storage cleared');
                      
                      // Clear localStorage
                      localStorage.clear();
                      console.log('🗑️ LocalStorage cleared');
                      
                      // Clear sessionStorage
                      sessionStorage.clear();
                      console.log('🗑️ SessionStorage cleared');
                      
                      alert('✅ All storage cleared! App will reload to fresh state.');
                      window.location.reload();
                    } catch (error) {
                      console.error('❌ Error clearing storage:', error);
                      alert('❌ Error clearing storage');
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800 underline font-semibold"
                >
                  🧹 CLEAR ALL STORAGE & RESET (Debug)
                </button>
              </div>
              </form>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="px-6 pb-8">
          <div className="text-center">
            <Badge variant="outline" className="bg-white/50 text-gray-600 border-gray-200">
              <Sparkles className="w-3 h-3 mr-1" />
              Secure Authentication
            </Badge>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Shield,
  Sparkles
} from 'lucide-react';
interface RegistrationScreenProps {
  onBack: () => void;
  onComplete: (email: string, password: string) => void;
}
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export function RegistrationScreen({ onBack, onComplete }: RegistrationScreenProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const { signUp, signIn } = useAuth();
  // Prevent iOS zoom on input focus
  useEffect(() => {
    // Add viewport meta tag to prevent zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport?.getAttribute('content') || '';
    // Set zoom-preventing viewport
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    // Add CSS to prevent zoom
    const style = document.createElement('style');
    style.textContent = `
      /* Prevent zoom on input focus */
      input, textarea, select {
        font-size: 16px !important;
        transform: translateZ(0);
      }
      /* Ensure consistent scaling */
      * {
        -webkit-text-size-adjust: 100%;
        -moz-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
    `;
    document.head.appendChild(style);
    console.log('🔧 Applied registration zoom prevention');
    // Cleanup on unmount - restore original viewport
    return () => {
      if (viewport && originalContent) {
        viewport.setAttribute('content', originalContent);
      } else if (viewport) {
        // Reset to standard mobile viewport
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      // Force viewport reset
      window.setTimeout(() => {
        if (window.visualViewport) {
          window.scrollTo(0, 0);
        }
      }, 100);
      console.log('🔄 Restored viewport settings after registration');
    };
  }, []);
  const totalSteps = 3;
  const progressPercentage = (step / totalSteps) * 100;
  const validateStep = () => {
    switch (step) {
      case 1:
        return formData.firstName.trim() !== '' && formData.lastName.trim() !== '';
      case 2:
        return formData.email.trim() !== '' && formData.email.includes('@') && formData.email.includes('.');
      case 3:
        // AWS Cognito password requirements (CORRECTED - no special chars required)
        const hasMinLength = formData.password.length >= 8;
        const hasUppercase = /[A-Z]/.test(formData.password);
        const hasLowercase = /[a-z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
        
        return hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;
      default:
        return false;
    }
  };
  const handleNext = async () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(step + 1);
        setError(null); // Clear any previous errors
      } else {
        // Final step - create account with AWS
        setIsLoading(true);
        setError(null);
        try {
          console.log('🔐 Creating AWS Cognito user account...');
          const { error: signUpError } = await signUp({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password
          });
          
          if (signUpError) {
            console.error('❌ AWS signup error:', signUpError);
            
            // If user already exists, show helpful message
            if (signUpError.includes('already exists') || signUpError.includes('UsernameExistsException')) {
              setError('This email is already registered. Please close the app and sign in with your existing account.');
            } else {
              setError(signUpError);
            }
            setIsLoading(false);
            return;
          }
          
          console.log('✅ User account created successfully!');
          setTimeout(() => {
            onComplete(formData.email, formData.password);
          }, 50);
        } catch (error) {
          console.error('❌ Registration error:', error);
          setError('Failed to create account. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };
  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const getStepTitle = () => {
    switch (step) {
      case 1: return "Let's start with your name";
      case 2: return "Your university email";
      case 3: return "Create a secure password";
      default: return "";
    }
  };
  const getStepSubtitle = () => {
    switch (step) {
      case 1: return "We'll use this to personalise your experience";
      case 2: return "We'll detect your university automatically";
      case 3: return "Keep your wellness data safe and secure";
      default: return "";
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/20 to-pink-100/30" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-32 right-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
      <div className="absolute top-60 right-20 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
      <motion.div
        className="relative z-10 min-h-screen flex flex-col overflow-y-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ 
          paddingTop: 'max(3rem, env(safe-area-inset-top))',
          paddingBottom: 'env(safe-area-inset-bottom)' 
        }}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="pb-6 px-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="text-gray-700 hover:text-gray-900 font-medium flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src={mindMeasureLogo}
                  alt="Mind Measure"
                  className="w-full h-full object-contain opacity-80"
                />
              </div>
              <span className="text-gray-700 font-medium">Mind Measure</span>
            </div>
          </div>
        </motion.div>
        {/* Main Content - Scrollable */}
        <div className="flex-1 px-6 pb-8 overflow-y-auto" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom) + 1rem)' }}>
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/80 p-6 max-w-md mx-auto">
              {/* Step Header */}
              <div className="text-center mb-8">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  {step === 1 && <User className="w-8 h-8 text-white" />}
                  {step === 2 && <Mail className="w-8 h-8 text-white" />}
                  {step === 3 && <Lock className="w-8 h-8 text-white" />}
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {getStepTitle()}
                </h2>
                <p className="text-gray-600 text-sm">
                  {getStepSubtitle()}
                </p>
              </div>
              {/* Step 1: Name */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        placeholder="Enter first name"
                        className="bg-white/60 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        placeholder="Enter last name"
                        className="bg-white/60 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Step 2: Email */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">University Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="your.email@university.ac.uk"
                      className="bg-white/60 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-gray-600">
                        We'll automatically detect your university and local support services
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Step 3: Password */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Password Requirements - Show First */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">Password Requirements:</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${formData.password.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${formData.password.length >= 8 ? 'text-green-700' : 'text-gray-500'}`}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-700' : 'text-gray-500'}`}>
                          One uppercase letter (A-Z)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${/[a-z]/.test(formData.password) ? 'text-green-700' : 'text-gray-500'}`}>
                          One lowercase letter (a-z)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${/[0-9]/.test(formData.password) ? 'text-green-700' : 'text-gray-500'}`}>
                          One number (0-9)
                        </span>
                      </div>
                      {/* Removed special character requirement to match AWS Cognito default policy */}
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${formData.password === formData.confirmPassword && formData.confirmPassword !== '' ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${formData.password === formData.confirmPassword && formData.confirmPassword !== '' ? 'text-green-700' : 'text-gray-500'}`}>
                          Passwords match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          placeholder="Create a secure password"
                          className="bg-white/60 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          placeholder="Confirm your password"
                          className="bg-white/60 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              {/* Action Buttons */}
              <div className="mt-8">
                <Button
                  onClick={handleNext}
                  disabled={!validateStep() || isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 font-medium rounded-xl disabled:from-gray-300 disabled:to-gray-400"
                >
                  {isLoading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      {step === totalSteps ? 'Create Account' : 'Continue'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
          {/* Features Footer */}
          <motion.div
            variants={itemVariants}
            className="mt-8 max-w-md mx-auto"
          >
            <div className="flex justify-center gap-3">
              <Badge className="bg-white/60 text-gray-700 border-white/30 backdrop-blur-sm px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                Free to use
              </Badge>
              <Badge className="bg-white/60 text-gray-700 border-white/30 backdrop-blur-sm px-3 py-1">
                <Shield className="w-3 h-3 mr-1" />
                Your data is private
              </Badge>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

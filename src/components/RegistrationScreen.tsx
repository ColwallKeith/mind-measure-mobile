import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Eye, 
  EyeOff,
  GraduationCap
} from 'lucide-react';
import { Keyboard } from '@capacitor/keyboard';
import mindMeasureLogo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface RegistrationScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegistrationScreen({ onBack, onComplete }: RegistrationScreenProps) {
  const { signUp, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Capacitor keyboard handling
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
    const hideListener = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
    
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);



  // Form persistence during session
  useEffect(() => {
    const savedData = localStorage.getItem('mindMeasureRegistrationData');
    const savedStep = localStorage.getItem('mindMeasureRegistrationStep');
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch (error) {
        console.log('Error loading saved registration data:', error);
      }
    }
    
    if (savedStep) {
      const stepNumber = parseInt(savedStep);
      if (stepNumber >= 1 && stepNumber <= 3) {
        setStep(stepNumber);
      }
    }
  }, []);

  // Save registration data whenever it changes (for form persistence)
  useEffect(() => {
    localStorage.setItem('mindMeasureRegistrationData', JSON.stringify(formData));
  }, [formData]);

  // Save current step whenever it changes (for form persistence)
  useEffect(() => {
    localStorage.setItem('mindMeasureRegistrationStep', step.toString());
  }, [step]);

  const totalSteps = 3;
  const progressPercentage = (step / totalSteps) * 100;

  const validateStep = () => {
    switch (step) {
      case 1:
        return formData.firstName.trim() !== '' && formData.lastName.trim() !== '';
      case 2:
        return formData.email.trim() !== '' && formData.email.includes('@') && formData.email.includes('.');
      case 3:
        return formData.password.length >= 6 && formData.password === formData.confirmPassword;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) {
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step - create account with Supabase
      setRegistrationError(null);
      
      try {
        const { error } = await signUp({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });

        if (error) {
          setRegistrationError(error);
          return;
        }

        // Clear saved registration data on successful completion
        localStorage.removeItem('mindMeasureRegistrationData');
        localStorage.removeItem('mindMeasureRegistrationStep');
        
        // Registration successful - the AuthProvider will handle the user state
        onComplete();
        
      } catch (error) {
        console.error('Registration error:', error);
        setRegistrationError('Registration failed. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Clear saved data if user goes back to splash screen
      localStorage.removeItem('mindMeasureRegistrationData');
      localStorage.removeItem('mindMeasureRegistrationStep');
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
        className="relative z-10 min-h-screen flex flex-col"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Keyboard-aware container */}
        <div 
          className="flex-1 overflow-y-auto px-6"
          style={{ 
            paddingTop: '60px',
            paddingBottom: isKeyboardOpen ? '50px' : '32px'
          }}
        >
          <div className={`min-h-full flex flex-col ${isKeyboardOpen ? 'justify-start pt-4' : 'justify-center'}`}>
            <motion.div variants={itemVariants} className="w-full max-w-md mx-auto">
            {/* Header elements moved into body */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-gray-700 hover:bg-white/60"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
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

            {/* Progress bar - above registration card */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Step {step} of {totalSteps}</span>
                <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="relative w-full h-3 bg-white/60 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: '#8B5CF6'
                  }}
                />
              </div>
            </div>

            <Card className="border-0 shadow-xl backdrop-blur-xl bg-white/80 p-6">
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
                  className="space-y-4"
                >
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

                  {/* Password Requirements */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${formData.password.length >= 6 ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-xs ${formData.password.length >= 6 ? 'text-green-700' : 'text-gray-500'}`}>
                        At least 6 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${formData.password === formData.confirmPassword && formData.confirmPassword !== '' ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-xs ${formData.password === formData.confirmPassword && formData.confirmPassword !== '' ? 'text-green-700' : 'text-gray-500'}`}>
                        Passwords match
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {registrationError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{registrationError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8">
                <Button 
                  onClick={handleNext}
                  disabled={!validateStep() || loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 font-medium rounded-xl disabled:from-gray-300 disabled:to-gray-400"
                >
                  {loading ? 'Creating Account...' : (step === totalSteps ? 'Create Account' : 'Continue')}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
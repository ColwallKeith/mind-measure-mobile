import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, GraduationCap, Shield, CheckCircle, AlertCircle, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
interface UniversityRegistrationProps {
  onComplete: (userData: any) => void;
  onBack: () => void;
}
export const UniversityRegistration: React.FC<UniversityRegistrationProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'registration' | 'verification' | 'baseline-setup'>('welcome');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: 'University of Worcester',
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const universities = [
    'University of Worcester',
    'University of Birmingham',
    'University of Warwick',
    'University of Oxford',
    'University of Cambridge',
    'Other'
  ];
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!formData.email.endsWith('.ac.uk') && !formData.email.endsWith('.edu')) {
      newErrors.email = 'Please use your university email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service';
    }
    if (!formData.agreeToPrivacy) {
      newErrors.privacy = 'You must agree to the Privacy Policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleNext = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('registration');
    } else if (currentStep === 'registration') {
      if (validateForm()) {
        setCurrentStep('verification');
      }
    } else if (currentStep === 'verification') {
      setCurrentStep('baseline-setup');
    }
  };
  const handleComplete = () => {
    onComplete({
      ...formData,
      registrationComplete: true,
      baselineRequired: true
    });
  };
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        <img
          src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
          alt="Mind Measure"
          className="w-full h-full object-contain"
        />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Mind Measure</h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Your university has partnered with us to provide you with personalized mental health support and insights.
        </p>
      </div>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
        <div className="text-center space-y-4">
          <GraduationCap className="w-12 h-12 text-blue-600 mx-auto" />
          <h2 className="text-xl font-semibold text-blue-900">University Partnership</h2>
          <div className="space-y-2 text-sm text-blue-700">
            <p>✓ Free access to Mind Measure services</p>
            <p>✓ Confidential mental health assessments</p>
            <p>✓ Personalized wellness insights</p>
            <p>✓ University-specific resources</p>
          </div>
        </div>
      </Card>
      <Button
        onClick={handleNext}
        className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
      >
        Get Started
      </Button>
    </div>
  );
  const renderRegistration = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
        <p className="text-gray-600">Please provide your information to get started</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">University Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
              placeholder="your.name@university.ac.uk"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="university">University</Label>
          <select
            id="university"
            value={formData.university}
            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {universities.map((uni) => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
        </div>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <Label htmlFor="agreeToTerms" className="text-sm text-gray-700">
              I agree to the <span className="text-purple-600 underline">Terms of Service</span>
            </Label>
          </div>
          {errors.terms && <p className="text-red-500 text-xs ml-7">{errors.terms}</p>}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="agreeToPrivacy"
              checked={formData.agreeToPrivacy}
              onChange={(e) => setFormData({ ...formData, agreeToPrivacy: e.target.checked })}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <Label htmlFor="agreeToPrivacy" className="text-sm text-gray-700">
              I agree to the <span className="text-purple-600 underline">Privacy Policy</span>
            </Label>
          </div>
          {errors.privacy && <p className="text-red-500 text-xs ml-7">{errors.privacy}</p>}
        </div>
      </div>
      <div className="space-y-3">
        <Button
          onClick={handleNext}
          className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-2xl"
        >
          Continue
        </Button>
        <Button
          onClick={() => setCurrentStep('welcome')}
          variant="outline"
          className="w-full"
        >
          Back
        </Button>
      </div>
    </div>
  );
  const renderVerification = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-2xl">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Created!</h1>
        <p className="text-gray-600">
          We've sent a verification email to <strong>{formData.email}</strong>
        </p>
      </div>
      <Card className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="text-center space-y-3">
          <Mail className="w-8 h-8 text-blue-600 mx-auto" />
          <h2 className="text-lg font-semibold text-blue-900">Check Your Email</h2>
          <p className="text-blue-700 text-sm">
            Click the verification link in your email to activate your account and continue to your baseline assessment.
          </p>
        </div>
      </Card>
      <div className="space-y-3">
        <Button
          onClick={handleNext}
          className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-semibold rounded-2xl"
        >
          I've Verified My Email
        </Button>
        <p className="text-sm text-gray-500">
          Didn't receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  );
  const renderBaselineSetup = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-2xl">
        <Shield className="w-12 h-12 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Mind Measure!</h1>
        <p className="text-gray-600">
          Your account is now active. Let's set up your baseline assessment to personalize your experience.
        </p>
      </div>
      <Card className="bg-gradient-to-r from-purple-50 to-pink-100 rounded-2xl p-6 border border-purple-200">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-purple-900">Baseline Assessment</h2>
          <div className="space-y-2 text-sm text-purple-700">
            <p>✓ Takes about 10-15 minutes</p>
            <p>✓ Helps us understand your current wellness</p>
            <p>✓ Will be repeated every 90 days</p>
            <p>✓ Completely confidential and secure</p>
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        <Button
          onClick={handleComplete}
          className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          Start Baseline Assessment
        </Button>
        <p className="text-sm text-gray-500">
          You can complete this later from your dashboard if needed.
        </p>
      </div>
    </div>
  );
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'registration':
        return renderRegistration();
      case 'verification':
        return renderVerification();
      case 'baseline-setup':
        return renderBaselineSetup();
      default:
        return renderWelcome();
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/40 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-purple-200/20 via-pink-200/15 to-blue-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-12 w-96 h-96 bg-gradient-to-br from-blue-200/15 via-indigo-200/10 to-purple-200/15 rounded-full blur-3xl"></div>
      </div>
      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        {/* Header */}
        {currentStep !== 'welcome' && (
          <div className="flex items-center space-x-4 pt-6">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-white/50 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((['welcome', 'registration', 'verification', 'baseline-setup'].indexOf(currentStep) + 1) / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        {/* Step Content */}
        <div className="pt-8">
          {renderCurrentStep()}
        </div>
        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </div>
  );
};

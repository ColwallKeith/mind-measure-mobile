import { Button } from './ui/button';
import { Card } from './ui/card';
import { Play, Target, TrendingUp, Brain, Shield, Heart, Clock } from 'lucide-react';
import mindMeasureLogo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface BaselineAssessmentScreenProps {
  onStartAssessment: () => void;
}

export function BaselineAssessmentScreen({ onStartAssessment }: BaselineAssessmentScreenProps) {
  return (
    <div className="px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center pt-8">
        <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <img 
            src={mindMeasureLogo} 
            alt="Mind Measure" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl text-gray-900 mb-3">Welcome to Mind Measure!</h1>
        <p className="text-gray-600 leading-relaxed">
          Let's establish your personal wellness baseline with Jodie
        </p>
      </div>

      {/* Why Baseline Card */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-purple-50/70 to-pink-50/70 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-purple-900 mb-2">Why a Baseline Assessment?</h3>
            <p className="text-purple-700 text-sm leading-relaxed">
              This helps us understand your current wellness state, creating a personalised starting point for your mental health journey.
            </p>
          </div>
        </div>
      </Card>

      {/* Start Baseline Button */}
      <div className="text-center space-y-4">
        <Button 
          onClick={onStartAssessment}
          className="w-full h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-0 shadow-2xl text-lg backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl"
        >
          <Play className="w-6 h-6 mr-3" />
          Start Your Baseline Assessment
        </Button>
        <p className="text-gray-500 text-sm">
          Find a quiet, comfortable space where you can speak freely
        </p>
      </div>

      {/* What We'll Measure */}
      <div className="space-y-4">
        <h3 className="text-gray-900 text-center">What We'll Measure</h3>
        <div className="space-y-3">
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-blue-900 mb-1">Mental State</h4>
                <p className="text-blue-700 text-sm">Current emotional and cognitive patterns</p>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-green-900 mb-1">Wellness Trends</h4>
                <p className="text-green-700 text-sm">Sleep, energy, and mood patterns</p>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-lg backdrop-blur-xl bg-amber-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Heart className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-amber-900 mb-1">Stress Indicators</h4>
                <p className="text-amber-700 text-sm">Voice, expression, and language analysis</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Assessment Details */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-indigo-50/70 p-4 text-center">
          <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h4 className="text-indigo-900 mb-1">3-5 Minutes</h4>
          <p className="text-indigo-700 text-xs">Quick and comprehensive</p>
        </Card>

        <Card className="border-0 shadow-lg backdrop-blur-xl bg-teal-50/70 p-4 text-center">
          <Shield className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <h4 className="text-teal-900 mb-1">100% Private</h4>
          <p className="text-teal-700 text-xs">Encrypted and secure</p>
        </Card>
      </div>

      {/* Benefits */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-rose-50/70 p-6">
        <div className="text-center">
          <h4 className="text-rose-900 mb-3">After Your Baseline</h4>
          <div className="space-y-2">
            <p className="text-rose-700 text-sm">✓ Personalised wellness insights</p>
            <p className="text-rose-700 text-sm">✓ Tailored recommendations</p>
            <p className="text-rose-700 text-sm">✓ Progress tracking over time</p>
          </div>
        </div>
      </Card>



      {/* Mind Measure Branding */}
      <div className="text-center space-y-6 py-8">
        <div className="w-16 h-16 mx-auto flex items-center justify-center">
          <img 
            src={mindMeasureLogo} 
            alt="Mind Measure" 
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <div>
          <h3 className="text-gray-900 mb-3">Your Wellness Journey Starts Here</h3>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
            Mind Measure uses advanced AI to understand your unique wellness patterns and provide personalised support.
          </p>
        </div>
      </div>

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Eye, Mic, MessageCircle, Shield } from 'lucide-react';
import mindMeasureLogo from '@/assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface CheckInWelcomeProps {
  onStartCheckIn: () => void;
  userName?: string;
}

export function CheckInWelcome({ onStartCheckIn, userName = 'Alex' }: CheckInWelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center pt-8">
        <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <img 
            src={mindMeasureLogo} 
            alt="Mind Measure" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl text-gray-900 mb-3">Welcome back, {userName}</h1>
        <p className="text-gray-600 leading-relaxed">
          Ready for your daily mental wellness check-in?
        </p>
      </div>

      {/* Start Check-in Button */}
      <div className="text-center space-y-4">
        <Button 
          onClick={onStartCheckIn}
          className="w-full h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-0 shadow-2xl text-lg backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl"
        >
          <Play className="w-6 h-6 mr-3" />
          Start Check-in with Jodie
        </Button>
        <p className="text-gray-500 text-sm">
          Find a quiet, comfortable space where you can speak freely
        </p>
      </div>

      {/* What to Expect */}
      <div className="space-y-4">
        <h3 className="text-gray-900 text-center">What to Expect</h3>
        <div className="space-y-3">
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-blue-900 mb-1">Visual Analysis</h4>
                <p className="text-blue-700 text-sm">Facial expression insights</p>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Mic className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-green-900 mb-1">Voice Patterns</h4>
                <p className="text-green-700 text-sm">Speech and tone analysis</p>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-lg backdrop-blur-xl bg-purple-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-purple-900 mb-1">Conversation</h4>
                <p className="text-purple-700 text-sm">Natural dialogue with Jodie</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Private & Secure */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-indigo-50/70 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-indigo-900 mb-2">Private & Secure</h4>
            <p className="text-indigo-700 text-sm leading-relaxed">
              Your data is encrypted and confidential. This takes about 3 minutes.
            </p>
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
          <h3 className="text-gray-900 mb-3">Mind Measure</h3>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
            Your trusted companion for understanding and measuring your mental wellbeing through intelligent conversation and analysis.
          </p>
        </div>
      </div>

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}


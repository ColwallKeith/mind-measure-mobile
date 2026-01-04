import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/config/branding';
import { Heart, ArrowRight, Home, MessageSquare, BarChart3, HelpCircle } from 'lucide-react';
export const MobileLandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/40 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft, elegant background shapes */}
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-purple-200/20 via-pink-200/15 to-blue-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-12 w-96 h-96 bg-gradient-to-br from-blue-200/15 via-indigo-200/10 to-purple-200/15 rounded-full blur-3xl"></div>
        {/* Subtle accent elements */}
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-pink-200/20 to-purple-200/15 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-200/15 to-indigo-200/10 rounded-full blur-2xl"></div>
      </div>
      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <img
                src={BRAND.logoUrl}
                alt={BRAND.logoAlt}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg font-semibold text-gray-800">Mind Measure</span>
          </div>
          <button className="text-gray-700 font-medium hover:text-purple-600 transition-colors">
            Sign In
          </button>
        </div>
        {/* Hero Section */}
        <div className="text-center space-y-4 pt-8">
          {/* Main Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
            Mind Measure
          </h1>
          {/* Tagline */}
          <p className="text-base md:text-lg text-purple-600 font-medium tracking-wide">
            MEASURE, MONITOR, MANAGE
          </p>
          {/* Hero Image - Woman in light blue sweatshirt */}
          <div className="relative mx-auto w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/50">
            <img
              src="https://api.mindmeasure.co.uk/storage/marketing/young_asian_woman_cutout.png"
              alt="Young Asian woman representing Mind Measure users"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center top' }}
            />
            {/* Floating heart icon */}
            <div className="absolute bottom-4 right-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">
              <Heart className="w-6 h-6 text-white" />
            </div>
            {/* Subtle overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
          </div>
        </div>
        {/* App Description */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-800">
            Empowering your <span className="text-purple-600">mental wellness</span>
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Mind Measure makes it simple with just a few minutes each day to understand and measure your mood and stress levels.
          </p>
        </div>
        {/* Call to Action */}
        <div className="text-center space-y-4">
          <Button
            onClick={() => navigate('/mobile-app')}
            className="w-full max-w-sm h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
          >
            <span>Check-In</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        {/* Bottom spacing for navigation */}
        <div className="h-24"></div>
        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50">
          <div className="flex items-center justify-around py-4 px-6">
            <button className="flex flex-col items-center space-y-1 text-purple-600 transition-colors">
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors">
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs">Check-in</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Dashboard</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors">
              <HelpCircle className="w-6 h-6" />
              <span className="text-xs">Help</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Brain, Shield, Users, CheckCircle } from 'lucide-react';
export const WelcomeBack: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    // Animate content in
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowFeatures(true), 800);
    const timer3 = setTimeout(() => setRedirecting(true), 2000);
    const timer4 = setTimeout(() => navigate('/dashboard'), 3500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [navigate]);
  const features = [
    {
      icon: <Brain className="w-6 h-6 text-purple-600" />,
      title: "Track Progress",
      description: "Monitor your wellness journey"
    },
    {
      icon: <Heart className="w-6 h-6 text-pink-600" />,
      title: "Daily Check-ins",
      description: "Stay connected with yourself"
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-600" />,
      title: "Privacy First",
      description: "Your data is secure"
    },
    {
      icon: <Users className="w-6 h-6 text-green-600" />,
      title: "Community",
      description: "Join fellow students"
    }
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 flex flex-col items-center justify-center p-6">
      {/* Logo and Welcome */}
      <div className={`text-center mb-8 transition-all duration-1000 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
          Welcome back!
        </h1>
        <p className="text-lg text-gray-600">
          {user?.user_metadata?.first_name ? `Great to see you again, ${user.user_metadata.first_name}!` : 'Great to see you again!'}
        </p>
      </div>
      {/* Brand Message */}
      <div className={`text-center mb-8 transition-all duration-1000 delay-300 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Mind Measure
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Your personal mental wellness companion. Ready to continue your journey
            towards better mental health and wellbeing?
          </p>
        </div>
      </div>
      {/* Features Grid */}
      <div className={`grid grid-cols-2 gap-4 mb-8 max-w-md transition-all duration-1000 delay-500 ${
        showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-lg transition-all duration-500"
            style={{ transitionDelay: `${600 + index * 100}ms` }}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-gray-800 text-sm mb-1">
              {feature.title}
            </h3>
            <p className="text-xs text-gray-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
      {/* Redirect Message */}
      <div className={`text-center transition-all duration-500 delay-700 ${
        redirecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 max-w-sm">
          <div className="flex items-center justify-center space-x-2 text-purple-600 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Taking you to your dashboard</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
      {/* Bottom Branding */}
      <div className={`absolute bottom-8 text-center transition-all duration-1000 delay-1000 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <p className="text-sm text-gray-500">
          Empowering students to measure and improve their mental wellness
        </p>
      </div>
    </div>
  );
};
export default WelcomeBack;

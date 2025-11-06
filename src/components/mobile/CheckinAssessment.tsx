import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MessageCircle, Brain, Heart, TrendingUp } from 'lucide-react';
interface CheckinAssessmentProps {
  onBack?: () => void;
}
export function CheckinAssessment({ onBack }: CheckinAssessmentProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  // Load ElevenLabs script
  useEffect(() => {
    const id = 'elevenlabs-convai-embed-checkin';
    if (document.getElementById(id)) {
      setScriptLoaded(true);
      return;
    }
    console.log('Loading ElevenLabs script for check-in...');
    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.onload = () => {
      console.log('✅ ElevenLabs script loaded successfully for check-in');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load ElevenLabs script for check-in');
    };
    document.head.appendChild(script);
    return () => {
      const existingScript = document.getElementById(id);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);
  // Initialize widget when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !widgetRef.current) return;
    console.log('🚀 Initializing ElevenLabs check-in widget...');
    // Create widget element with check-in agent
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', 'agent_7501k3hpgd5gf8ssm3c3530jx8qx'); // Check-in agent
    // Style the widget
    widget.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      min-height: 600px !important;
      display: block !important;
      border: none !important;
    `;
    // Add event listeners
    widget.addEventListener('ready', () => {
      console.log('✅ ElevenLabs check-in widget ready');
      setWidgetReady(true);
    });
    widget.addEventListener('conversation-started', () => {
      console.log('🎙️ Check-in conversation started');
    });
    widget.addEventListener('conversation-ended', () => {
      console.log('🔚 Check-in conversation ended');
    });
    widget.addEventListener('error', (event) => {
      console.error('❌ Check-in widget error:', event);
    });
    // Append to container
    widgetRef.current.appendChild(widget);
    // Add custom dark theme CSS
    const style = document.createElement('style');
    style.textContent = `
      .elevenlabs-dark-theme elevenlabs-convai {
        --background: #1f2937 !important;
        --foreground: #f9fafb !important;
        --card: #374151 !important;
        --card-foreground: #f9fafb !important;
        --border: #4b5563 !important;
        --input: #374151 !important;
        --primary: #8b5cf6 !important;
        --primary-foreground: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (widgetRef.current && widgetRef.current.contains(widget)) {
        widgetRef.current.removeChild(widget);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [scriptLoaded]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 pt-8 pb-4">
        <div className="w-14 h-14 flex items-center justify-center">
          <img
            src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
            alt="Mind Measure"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Mind Measure
        </h1>
      </div>
      {/* Back Button */}
      {onBack && (
        <div className="flex justify-start mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="bg-white/60 border-white/30 backdrop-blur-sm hover:bg-white/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      )}
      {/* Widget Container */}
      <div className="flex-1 flex flex-col">
        {!scriptLoaded ? (
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/80 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Check-in...</h3>
            <p className="text-gray-600 text-sm">
              Preparing your wellness check-in with Mind Measure AI
            </p>
          </Card>
        ) : (
          <div className="w-full h-full min-h-[600px]" ref={widgetRef}>
            {/* ElevenLabs widget will be inserted here */}
          </div>
        )}
      </div>
      {/* Check-in Info */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6 mt-4">
        <h4 className="text-gray-900 mb-3 text-center">Your Wellness Check-in</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>Current mental state</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Heart className="w-5 h-5 text-pink-600" />
            <span>Emotional check-in</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span>Progress tracking</span>
          </div>
        </div>
      </Card>
      {/* Bottom spacing */}
      <div className="h-24" />
    </div>
  );
}

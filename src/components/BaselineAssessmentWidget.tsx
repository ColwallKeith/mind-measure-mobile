import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

interface BaselineAssessmentWidgetProps {
  onComplete: () => void;
}

export function BaselineAssessmentWidget({ onComplete }: BaselineAssessmentWidgetProps) {
  const [isActive, setIsActive] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetInitializedRef = useRef(false);

  // Load ElevenLabs script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => {
      console.log('🚀 ElevenLabs script loaded');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load ElevenLabs script');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://elevenlabs.io/convai-widget/index.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Initialize widget when script is loaded
  useEffect(() => {
    if (scriptLoaded && widgetRef.current && !widgetInitializedRef.current) {
      console.log('🎯 Initializing ElevenLabs widget...');
      
      const widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', 'agent_9301k22s8e94f7qs5e704ez02npe'); // Baseline agent ID
      widget.setAttribute('auto-start', 'false');
      widget.setAttribute('conversation-mode', 'voice');
      widget.setAttribute('language', 'en');
      
      // Apply custom styling to match design
      widget.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        min-height: 400px !important;
        border-radius: 16px !important;
        overflow: hidden !important;
        --background: #ffffff !important;
        --foreground: #1f2937 !important;
        --card: #f9fafb !important;
        --primary: #8b5cf6 !important;
      `;

      // Clear any existing content and add widget
      widgetRef.current.innerHTML = '';
      widgetRef.current.appendChild(widget);
      
      widgetInitializedRef.current = true;
      setIsActive(true);
      
      console.log('✅ ElevenLabs widget initialized');
    }
  }, [scriptLoaded]);

  const handleFinish = () => {
    console.log('🏁 Baseline assessment completed');
    setIsActive(false);
    onComplete();
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header - positioned 50px below Dynamic Island */}
      <div style={{ paddingTop: '50px' }} className="px-6 pb-4">
        {/* Mind Measure Branding */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-light text-gray-900 mb-2">
            Mind <span className="text-purple-600 font-medium">Measure</span>
          </h1>
          <p className="text-lg text-gray-600">Your Baseline Assessment</p>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Finish Button */}
          <Button
            onClick={handleFinish}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-xl"
          >
            Finish
          </Button>

          {/* Camera Active Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600 text-sm">Camera Active</span>
          </div>
        </div>
      </div>

      {/* Spacer to push widget to bottom */}
      <div className="flex-1"></div>

      {/* ElevenLabs Widget Container - Anchored to Bottom */}
      <div className="p-6 pb-8">
        <div 
          ref={widgetRef}
          className="w-full min-h-[400px] rounded-2xl bg-gray-50 border border-gray-200 shadow-lg"
          style={{ 
            contain: 'layout style paint',
            isolation: 'isolate'
          }}
        >
          {!scriptLoaded && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading assessment...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

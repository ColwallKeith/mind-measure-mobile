import React, { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '../ui/button';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";

interface BaselineAssessmentSDKProps {
  onBack?: () => void;
  onComplete?: () => void;
}

export function BaselineAssessmentSDK({ onBack, onComplete }: BaselineAssessmentSDKProps) {
  const [showConversation, setShowConversation] = useState(false);

  const conversation = useConversation({
    agentId: 'agent_9301k22s8e94f7qs5e704ez02npe',
  });

  const handleStartAssessment = async () => {
    console.log('[SDK] Starting assessment');
    setShowConversation(true);
    
    try {
      await conversation.startSession();
      console.log('[SDK] Session started');
    } catch (error) {
      console.error('[SDK] Failed to start session:', error);
    }
  };

  const handleFinish = async () => {
    console.log('[SDK] Finishing assessment');
    await conversation.endSession();
    
    if (onComplete) {
      onComplete();
    }
  };

  if (showConversation) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>Baseline Assessment</h1>
        </div>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Conversation Active - Status: {conversation.status}</p>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={handleFinish}>
            Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="backdrop-blur-sm bg-white/90 border-0 px-4 sm:px-6 py-6 sm:py-8 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mt-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                <span 
                  className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent"
                  style={{ 
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Mind Measure
                </span>
              </h1>
              <p className="text-lg text-gray-600">Your Baseline Assessment</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-lg p-8 border">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <img src={mindMeasureLogo} alt="Mind Measure" className="w-full h-full object-contain" />
              </div>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">What to expect</h3>
              
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <ul className="text-blue-800 space-y-3 text-left">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>Five questions from Jodie</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>3-5 minutes max</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleStartAssessment}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg font-medium rounded-xl shadow-lg"
              >
                Start Your Baseline Assessment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

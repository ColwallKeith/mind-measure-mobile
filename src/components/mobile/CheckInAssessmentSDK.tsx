import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '../ui/button';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";

interface CheckInAssessmentSDKProps {
  onBack?: () => void;
  onComplete?: () => void;
}

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
}

export function CheckInAssessmentSDK({ onBack, onComplete }: CheckInAssessmentSDKProps) {
  const [showConversation, setShowConversation] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize the ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[CheckIn SDK] ✅ Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('[CheckIn SDK] 🔌 Disconnected from ElevenLabs');
    },
    onMessage: (message) => {
      console.log('[CheckIn SDK] 📩 Message received:', message);
      
      const newMessage: Message = {
        role: message.source === 'ai' ? 'agent' : 'user',
        content: message.message,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('[CheckIn SDK] ❌ Conversation error:', error);
    }
  });

  // Load click sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyBzvLZiTYIGWi77eafTRAMUKfj8LZjHAY4ktfyy3ksBSR3yPDdkEALFF+06eunVRQKRZ/g8r5sIQUsgs/y2Yk1CBlouu3mn00QDFA=');
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleStartCheckIn = async () => {
    console.log('[CheckIn SDK] 🎯 Starting check-in conversation');
    setRequestingPermissions(true);

    try {
      console.log('[CheckIn SDK] 🎤 Requesting microphone permission...');
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[CheckIn SDK] ✅ Audio permission granted');

      setShowConversation(true);
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          console.log('[CheckIn SDK] 🚀 Starting ElevenLabs check-in conversation...');
          
          await conversation.startSession({
            agentId: 'agent_7501k3hpgd5gf8ssm3c3530jx8qx' // Check-in agent
          });

          console.log('[CheckIn SDK] ✅ Check-in session started');

        } catch (error) {
          console.error('[CheckIn SDK] ❌ Failed to start conversation:', error);
          alert('Failed to start conversation. Please try again.');
          setShowConversation(false);
        }
      }, 500);

    } catch (error) {
      console.error('[CheckIn SDK] ❌ Permission request failed:', error);
      alert('Microphone access is required for the check-in. Please check your browser settings and try again.');
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleFinish = async () => {
    console.log('[CheckIn SDK] 🏁 Finish button clicked');
    
    // Play click sound and haptics
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('[CheckIn SDK] Haptics/audio not available:', e);
    }

    // End the conversation
    try {
      await conversation.endSession();
      console.log('[CheckIn SDK] ✅ Conversation ended');
    } catch (error) {
      console.error('[CheckIn SDK] Error ending conversation:', error);
    }

    // Complete check-in and return to dashboard
    console.log('[CheckIn SDK] 🎉 Check-in completed!');
    onComplete?.();
  };

  // Show conversation UI
  if (showConversation) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(to bottom right, #eff6ff, #faf5ff, #fce7f3)'
      }}>
        {/* Header */}
        <div style={{ 
          paddingTop: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor: 'transparent',
          position: 'relative'
        }}>
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                position: 'absolute',
                left: '1rem',
                top: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
                zIndex: 10
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ color: '#6b7280' }}
              >
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <img
                src={mindMeasureLogo}
                alt="Mind Measure"
                style={{
                  width: '6rem',
                  height: '6rem',
                  margin: '0 auto',
                  objectFit: 'contain'
                }}
              />
            </div>
            <h1 style={{ 
              fontSize: '1.875rem', 
              fontWeight: '400',
              marginBottom: '0.75rem',
              color: '#111827'
            }}>
              Check-In
            </h1>
            <p style={{ 
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              How are you feeling today?
            </p>
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'transparent'
        }}>
          {/* Finish button */}
          <Button
            onClick={handleFinish}
            style={{
              background: 'linear-gradient(to right, #a855f7, #ec4899)',
              color: 'white',
              fontWeight: '600',
              fontSize: '1rem',
              padding: '0.625rem 1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Finish
          </Button>

          {/* Camera indicator */}
          {conversation.status === 'connected' && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '9999px',
              padding: '0.25rem 0.75rem'
            }}>
              <div style={{ 
                width: '0.5rem', 
                height: '0.5rem', 
                backgroundColor: '#22c55e', 
                borderRadius: '50%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
              <span style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: '500' }}>
                Camera Active
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '1rem',
          paddingBottom: 'max(8rem, calc(env(safe-area-inset-bottom, 0px) + 8rem))'
        }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'agent' ? 'flex-start' : 'flex-end',
                  marginBottom: '1rem'
                }}
              >
                {/* Jodie's messages - White card on LEFT */}
                {msg.role === 'agent' && (
                  <div 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e5e7eb', 
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: '1.5rem', 
                      borderTopLeftRadius: '0.25rem', 
                      padding: '1rem 1.25rem', 
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
                      maxWidth: '75%', 
                      lineHeight: '1.6' 
                    }}
                  >
                    <p style={{ color: '#1f2937', fontSize: '15px', margin: 0 }}>{msg.content}</p>
                  </div>
                )}
                
                {/* User's messages - Light blue card on RIGHT */}
                {msg.role === 'user' && (
                  <div 
                    style={{ 
                      backgroundColor: '#eff6ff', 
                      borderColor: '#e0f2fe',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: '1.5rem', 
                      borderTopRightRadius: '0.25rem', 
                      padding: '1rem 1.25rem', 
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
                      maxWidth: '75%', 
                      lineHeight: '1.6' 
                    }}
                  >
                    <p style={{ color: '#1f2937', fontSize: '15px', margin: 0 }}>{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen (shouldn't be shown as we'll use CheckInWelcome separately)
  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <Button
          onClick={handleStartCheckIn}
          disabled={requestingPermissions}
          className="w-full max-w-md h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg font-medium rounded-xl disabled:opacity-50 shadow-lg"
        >
          {requestingPermissions ? (
            <div className="flex items-center gap-2 justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Requesting Permissions...
            </div>
          ) : (
            'Start Check-in'
          )}
        </Button>
      </div>
    </div>
  );
}


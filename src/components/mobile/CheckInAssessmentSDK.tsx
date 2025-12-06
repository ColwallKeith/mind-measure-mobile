import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '../ui/button';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { assessmentEngineClient, type CheckInStatus } from '@/services/assessmentEngineClient';
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
  const { user } = useAuth();
  const [showConversation, setShowConversation] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userContext, setUserContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendServiceRef = useRef(
    BackendServiceFactory.createService(BackendServiceFactory.getEnvironmentConfig())
  );
  const latestContextRef = useRef<any>(null);

  // Assessment Engine state
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  const [finalResult, setFinalResult] = useState<CheckInStatus | null>(null);

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

  const formatContextForAgent = (context: any) => {
    if (!context) return '';

    const { user: userProfile, assessmentHistory = [], wellnessTrends = [] } = context;

    const formatDate = (isoString?: string) => {
      if (!isoString) return 'unknown date';
      return new Date(isoString).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      });
    };

    const assessmentsSummary = assessmentHistory.length
      ? assessmentHistory
          .map((assessment: any, index: number) => {
            const assessmentType = assessment.assessment_type || 'check-in';
            return `${index + 1}. ${assessmentType} on ${formatDate(assessment.created_at)}`;
          })
          .join('\n')
      : 'No previous check-ins recorded.';

    const trendSummary = wellnessTrends.length
      ? wellnessTrends
          .map((trend: any, index: number) => {
            const score = trend.score ?? trend.final_score ?? trend.mind_measure_score;
            const prefix = typeof score === 'number' ? `score ${score}` : 'score unavailable';
            return `${index + 1}. ${prefix} on ${formatDate(trend.created_at)}`;
          })
          .join('\n')
      : 'No trend data yet.';

    return [
      `You are speaking with ${userProfile?.fullName || userProfile?.name || 'the student'}.`,
      userProfile?.university ? `University: ${userProfile.university}` : null,
      userProfile?.course ? `Course: ${userProfile.course}` : null,
      userProfile?.yearOfStudy ? `Year of study: ${userProfile.yearOfStudy}` : null,
      context.isFirstTime ? 'This is their first check-in after baseline.' : 'They have previous check-ins recorded.',
      '',
      'Recent assessments:',
      assessmentsSummary,
      '',
      'Recent Mind Measure scores:',
      trendSummary,
      '',
      'Use this context to personalize the conversation, reference their journey so far, and ask empathetic follow-up questions.'
    ]
      .filter(Boolean)
      .join('\n');
  };

  const loadUserContext = useCallback(async () => {
    if (!user?.id) {
      return null;
    }

    try {
      const backendService = backendServiceRef.current;

      const [{ data: profile }, { data: recentAssessments }, { data: wellnessData }] =
        await Promise.all([
          backendService.database
            .select('profiles')
            .select('first_name, last_name, university, course, year_of_study')
            .eq('id', user.id)
            .single(),
          backendService.database
            .select('assessment_sessions')
            .select('assessment_type, created_at, meta')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3),
          backendService.database
            .select('fusion_outputs')
            .select('score, final_score, mind_measure_score, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

      const context = {
        user: {
          name: profile?.first_name || 'there',
          fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          university: profile?.university,
          course: profile?.course,
          yearOfStudy: profile?.year_of_study
        },
        assessmentHistory: recentAssessments || [],
        wellnessTrends: wellnessData || [],
        isFirstTime: !recentAssessments || recentAssessments.length === 0,
        platform: 'mobile'
      };

      latestContextRef.current = context;
      setUserContext(context);
      return context;
    } catch (error) {
      console.error('[CheckIn SDK] Failed to load user context:', error);
      return null;
    }
  }, [user?.id]);

  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  const handleStartCheckIn = async () => {
    console.log('[CheckIn SDK] 🎯 Starting check-in conversation');
    setRequestingPermissions(true);

    try {
      console.log('[CheckIn SDK] 🎤 Requesting microphone permission...');
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[CheckIn SDK] ✅ Audio permission granted');

      // Start Assessment Engine check-in
      console.log('[CheckIn SDK] 📡 Starting Assessment Engine check-in...');
      try {
        const result = await assessmentEngineClient.startCheckIn('daily');
        setCheckInId(result.checkInId);
        console.log('[CheckIn SDK] ✅ Assessment Engine check-in started:', result.checkInId);
      } catch (error) {
        console.error('[CheckIn SDK] ⚠️ Assessment Engine start failed (continuing anyway):', error);
        // Continue without Assessment Engine - graceful degradation
      }

      const latestContext = userContext || (await loadUserContext());

      setShowConversation(true);
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          console.log('[CheckIn SDK] 🚀 Starting ElevenLabs check-in conversation...');
          
          await conversation.startSession({
            agentId: 'agent_7501k3hpgd5gf8ssm3c3530jx8qx', // Check-in agent
            userId: user?.id
          });

          console.log('[CheckIn SDK] ✅ Check-in session started');

          const contextToSend = latestContextRef.current || latestContext;
          if (contextToSend) {
            const contextText = formatContextForAgent(contextToSend);
            if (contextText) {
              console.log('[CheckIn SDK] 📤 Sending contextual update to agent');
              conversation.sendContextualUpdate(contextText);
            }
          }

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

    // If Assessment Engine check-in was started, complete it
    if (checkInId) {
      setIsProcessing(true);
      setProcessingPhase('Completing check-in...');
      
      try {
        // Extract transcript from messages
        const transcript = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join(' ');

        console.log('[CheckIn SDK] 📝 Extracted transcript:', transcript.substring(0, 100) + '...');
        console.log('[CheckIn SDK] 📡 Completing Assessment Engine check-in...');

        await assessmentEngineClient.completeCheckIn(checkInId, {
          type: 'daily',
          hasAudio: true,
          hasVideo: false, // ElevenLabs SDK doesn't capture video
          transcript: transcript
        });

        console.log('[CheckIn SDK] ✅ Check-in marked complete, starting analysis...');
        setProcessingPhase('Analyzing your conversation...');

        // Poll for results
        const result = await assessmentEngineClient.pollCheckInStatus(
          checkInId,
          (status) => {
            console.log('[CheckIn SDK] Poll update:', status.status);
            if (status.status === 'PROCESSING') {
              setProcessingPhase('Processing multimodal data...');
            }
          }
        );

        console.log('[CheckIn SDK] 🎉 Analysis complete!', result);
        setFinalResult(result);
        setIsProcessing(false);

        // Show results briefly, then return to dashboard
        setTimeout(() => {
          onComplete?.();
        }, 3000);

      } catch (error) {
        console.error('[CheckIn SDK] ❌ Assessment Engine error:', error);
        setIsProcessing(false);
        // Still complete the check-in even if Assessment Engine fails
        onComplete?.();
      }
    } else {
      // No Assessment Engine check-in, complete immediately
      console.log('[CheckIn SDK] 🎉 Check-in completed!');
      onComplete?.();
    }
  };

  // Show processing screen
  if (isProcessing || finalResult) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #eff6ff, #faf5ff, #fce7f3)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          {/* Logo */}
          <img
            src={mindMeasureLogo}
            alt="Mind Measure"
            style={{
              width: '6rem',
              height: '6rem',
              margin: '0 auto 2rem',
              objectFit: 'contain'
            }}
          />

          {!finalResult ? (
            <>
              {/* Processing Animation */}
              <div style={{ 
                width: '4rem', 
                height: '4rem', 
                margin: '0 auto 1.5rem',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #a855f7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />

              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                Analyzing Your Check-In
              </h2>

              <p style={{ 
                fontSize: '1rem',
                color: '#6b7280',
                marginBottom: '2rem'
              }}>
                {processingPhase}
              </p>

              {/* Progress phases */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ 
                    width: '1.5rem', 
                    height: '1.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ color: '#6b7280' }}>Conversation recorded</span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ 
                    width: '1.5rem', 
                    height: '1.5rem',
                    borderRadius: '50%',
                    backgroundColor: processingPhase.includes('Analyzing') ? '#a855f7' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {processingPhase.includes('Analyzing') && (
                      <div style={{ 
                        width: '0.5rem', 
                        height: '0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                  <span style={{ color: '#6b7280' }}>Analyzing text patterns</span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem'
                }}>
                  <div style={{ 
                    width: '1.5rem', 
                    height: '1.5rem',
                    borderRadius: '50%',
                    backgroundColor: processingPhase.includes('multimodal') ? '#a855f7' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {processingPhase.includes('multimodal') && (
                      <div style={{ 
                        width: '0.5rem', 
                        height: '0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                  <span style={{ color: '#6b7280' }}>Calculating Mind Measure score</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Success - Show Score */}
              <div style={{ 
                width: '5rem', 
                height: '5rem',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M33.3333 10L15 28.3333L6.66666 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                Check-In Complete!
              </h2>

              {finalResult.score !== undefined && (
                <div style={{ 
                  fontSize: '3rem',
                  fontWeight: '700',
                  background: 'linear-gradient(to right, #a855f7, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '0.5rem'
                }}>
                  {Math.round(finalResult.score)}
                </div>
              )}

              <p style={{ 
                fontSize: '1rem',
                color: '#6b7280'
              }}>
                Your Mind Measure score has been recorded
              </p>
            </>
          )}
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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


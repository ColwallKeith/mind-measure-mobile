import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import {
  extractAssessmentFromTranscript,
  calculateClinicalScores,
  calculateMindMeasureComposite,
  validateAssessmentData,
  type AssessmentState,
  type PhqResponses
} from '../../utils/baselineScoring';

interface BaselineAssessmentSDKProps {
  onBack?: () => void;
  onComplete?: () => void;
}

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
}

export function BaselineAssessmentSDK({ onBack, onComplete }: BaselineAssessmentSDKProps) {
  const { user } = useAuth();
  const [showConversation, setShowConversation] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Assessment state - using the new simplified model
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    transcript: '',
    phqResponses: {},
    moodScore: null,
    startedAt: null,
    endedAt: null
  });

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize the ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[SDK] ✅ Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('[SDK] 🔌 Disconnected from ElevenLabs');
    },
    onMessage: (message) => {
      console.log('[SDK] 📩 Message received:', message);
      
      const newMessage: Message = {
        role: message.source === 'ai' ? 'agent' : 'user',
        content: message.message,
        timestamp: Date.now()
      };
      
      // Update messages for UI display
      setMessages(prev => [...prev, newMessage]);

      // Append to transcript using functional updater
      setAssessmentState(prev => ({
        ...prev,
        transcript: prev.transcript + `${message.source === 'ai' ? 'agent' : 'user'}: ${message.message}\n`
      }));
    },
    onError: (error) => {
      console.error('[SDK] ❌ Conversation error:', error);
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

  const handleStartAssessment = async () => {
    console.log('[SDK] 🎯 Starting ElevenLabs SDK baseline assessment');
    setRequestingPermissions(true);

    try {
      console.log('[SDK] 🎤 Requesting microphone permission...');
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[SDK] ✅ Audio permission granted');

      // Show conversation UI and initialize assessment state
      setShowConversation(true);
      const startedAt = Date.now();
      setAssessmentState({
        transcript: '',
        phqResponses: {},
        moodScore: null,
        startedAt,
        endedAt: null
      });
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          console.log('[SDK] 🚀 Starting ElevenLabs conversation session...');
          
          const sid = await conversation.startSession({
            agentId: 'agent_9301k22s8e94f7qs5e704ez02npe'
          });

          console.log('[SDK] ✅ Session started with ID:', sid);
          setSessionId(sid);

        } catch (error) {
          console.error('[SDK] ❌ Failed to start conversation:', error);
          alert('Failed to start conversation. Please try again.');
          setShowConversation(false);
        }
      }, 500);

    } catch (error) {
      console.error('[SDK] ❌ Permission request failed:', error);
      alert('Microphone access is required for the baseline assessment. Please check your browser settings and try again.');
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleFinish = async () => {
    console.log('[SDK] 🏁 Finish button clicked');
    
    // Play click sound and haptics
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('[SDK] Haptics/audio not available:', e);
    }

    // End the conversation
    try {
      await conversation.endSession();
      console.log('[SDK] ✅ Conversation ended');
    } catch (error) {
      console.error('[SDK] Error ending conversation:', error);
    }

    // Process assessment data
    await processAssessmentData();
  };

  const processAssessmentData = async () => {
    console.log('[SDK] 📊 Processing assessment data...');

    const endedAt = Date.now();

    // Extract PHQ/GAD/mood from the full transcript
    const { phqResponses, moodScore } = extractAssessmentFromTranscript(assessmentState.transcript);

    const updatedState: AssessmentState = {
      ...assessmentState,
      phqResponses,
      moodScore,
      endedAt
    };

    // Validate
    const validation = validateAssessmentData(updatedState);

    if (!validation.isValid) {
      console.error('[SDK] ❌ Incomplete assessment:', validation.details);
      alert(
        'Unable to Complete Baseline\n\n' +
        'We didn\'t capture enough data to create your baseline assessment. ' +
        'This can happen if you pressed Finish before answering all five questions.\n\n' +
        'Please try again and answer all questions from Jodie.'
      );
      
      if (onBack) {
        onBack();
      }
      return;
    }

    console.log('[SDK] ✅ Baseline validation passed');

    // Calculate scores
    const clinical = calculateClinicalScores(phqResponses, moodScore);
    const composite = calculateMindMeasureComposite(clinical);

    console.log('[SDK] 📊 Clinical scores:', clinical);
    console.log('[SDK] 📊 Mind Measure composite:', composite);

    // Get user ID
    let userId = user?.id;
    if (!userId) {
      try {
        const { value } = await Preferences.get({ key: 'mindmeasure_user' });
        if (value) {
          const userData = JSON.parse(value);
          userId = userData.userId;
        }
      } catch (error) {
        console.error('[SDK] Error reading user ID:', error);
      }
    }

    if (!userId) {
      console.error('[SDK] ❌ No user ID available');
      alert('Unable to save assessment. Please try logging in again.');
      return;
    }

    try {
      console.log('[SDK] 💾 Saving assessment to database...');
      
      const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Check/create profile
      const { data: existingProfiles, error: profileCheckError } = await backendService.database.select(
        'profiles',
        {
          columns: ['id', 'email', 'user_id'],
          filters: { user_id: userId }
        }
      );

      if (profileCheckError) {
        console.error('[SDK] ❌ Error checking profile:', profileCheckError);
        throw new Error('Failed to verify user profile');
      }

      if (!existingProfiles || existingProfiles.length === 0) {
        console.log('[SDK] Creating user profile...');
        
        const { resolveUniversityFromEmail } = await import('../../services/UniversityResolver');
        const userEmail = user?.email || '';
        const universityId = await resolveUniversityFromEmail(userEmail);
        
        const profileData = {
          user_id: userId,
          first_name: user?.user_metadata?.first_name || user?.user_metadata?.given_name || 'User',
          last_name: user?.user_metadata?.last_name || user?.user_metadata?.family_name || '',
          email: userEmail,
          display_name: user?.user_metadata?.display_name || `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`.trim() || 'User',
          university_id: universityId,
          baseline_established: false,
          streak_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: profileCreateError } = await backendService.database.insert('profiles', profileData);
        if (profileCreateError) {
          console.error('[SDK] ❌ Failed to create profile:', profileCreateError);
          throw new Error('Failed to create user profile');
        }
        console.log('[SDK] ✅ Profile created');
      } else {
        console.log('[SDK] ✅ Profile exists');
      }

      // Store raw transcript (optional - doesn't block baseline completion)
      const transcriptData = {
        user_id: userId,
        transcript_text: assessmentState.transcript,
        agent_id: 'agent_9301k22s8e94f7qs5e704ez02npe',
        duration_seconds: Math.round((endedAt - (assessmentState.startedAt || endedAt)) / 1000),
        created_at: new Date().toISOString()
      };

      const { error: transcriptError } = await backendService.database.insert('assessment_transcripts', transcriptData);
      if (transcriptError) {
        console.warn('[SDK] ⚠️ Failed to store transcript:', transcriptError);
        // Non-blocking - continue
      } else {
        console.log('[SDK] ✅ Transcript stored');
      }

      // Store individual assessment items (optional - doesn't block baseline completion)
      const items = [
        { question_id: 'phq2_q1', item_number: 1, response_value: phqResponses.phq2_q1 ?? 0 },
        { question_id: 'phq2_q2', item_number: 2, response_value: phqResponses.phq2_q2 ?? 0 },
        { question_id: 'gad2_q1', item_number: 3, response_value: phqResponses.gad2_q1 ?? 0 },
        { question_id: 'gad2_q2', item_number: 4, response_value: phqResponses.gad2_q2 ?? 0 },
        { question_id: 'mood', item_number: 5, response_value: moodScore ?? 5 },
      ];

      let itemsStored = 0;
      for (const item of items) {
        const { error: itemError } = await backendService.database.insert('assessment_items', {
          user_id: userId,
          ...item,
          created_at: new Date().toISOString()
        });
        if (itemError) {
          console.warn('[SDK] ⚠️ Failed to store assessment item:', item.question_id, itemError);
        } else {
          itemsStored++;
        }
      }
      if (itemsStored > 0) {
        console.log('[SDK] ✅ Assessment items stored:', itemsStored, '/', items.length);
      }

      // Save fusion output with clinical and composite scores (CRITICAL - this is what enables dashboard access)
      const fusionData = {
        user_id: userId,
        session_id: null, // ElevenLabs session ID stored in analysis JSON instead
        score: composite.score,
        score_smoothed: composite.score,
        final_score: composite.score,
        p_worse_fused: (100 - composite.score) / 100,
        uncertainty: 0.3,
        qc_overall: 0.8,
        public_state: 'report',
        model_version: 'v1.0',
        analysis: JSON.stringify({
          assessment_type: 'baseline',
          elevenlabs_session_id: sessionId,
          clinical_scores: {
            phq2_total: clinical.phq2_total,
            gad2_total: clinical.gad2_total,
            mood_scale: clinical.mood_scale,
            phq2_positive_screen: clinical.phq2_positive_screen,
            gad2_positive_screen: clinical.gad2_positive_screen
          },
          conversation_quality: 'complete',
          mind_measure_composite: {
            score: composite.score,
            phq2_component: composite.phq2_component,
            gad2_component: composite.gad2_component,
            mood_component: composite.mood_component
          }
        }),
        topics: JSON.stringify(['wellbeing', 'baseline', 'initial_assessment', 'phq2', 'gad2']),
        created_at: new Date().toISOString()
      };

      const { error: fusionError } = await backendService.database.insert('fusion_outputs', fusionData);
      if (fusionError) {
        console.error('[SDK] ❌ CRITICAL: Failed to save baseline assessment:', fusionError);
        throw new Error('Failed to save baseline assessment');
      }
      console.log('[SDK] ✅ Baseline assessment saved with score:', composite.score);

      // Update profile to mark baseline as established (CRITICAL - enables dashboard access)
      const { error: updateError } = await backendService.database.update(
        'profiles',
        { baseline_established: true, updated_at: new Date().toISOString() },
        { user_id: userId }
      );
      
      if (updateError) {
        console.error('[SDK] ❌ CRITICAL: Failed to update profile:', updateError);
        throw new Error('Failed to mark baseline as complete');
      }
      console.log('[SDK] ✅ Profile updated (baseline_established = true)');

      // Mark complete in device storage
      await Preferences.set({ 
        key: 'mindmeasure_baseline_complete', 
        value: 'true' 
      });
      console.log('[SDK] ✅ Device storage updated');

      console.log('[SDK] 🎉 Baseline assessment completed successfully!');

      // Reload the app to force useUserAssessmentHistory to re-query
      // This ensures the dashboard access gate sees the new baseline assessment
      window.location.reload();

    } catch (error) {
      console.error('[SDK] ❌ Error saving assessment:', error);
      alert('There was an error saving your assessment. Please try again or contact support.');
    }
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
        {/* Header - increased top padding for Dynamic Island */}
        <div style={{ 
          paddingTop: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              background: 'linear-gradient(to right, #9333ea, #a855f7, #2563eb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Baseline Assessment
            </h1>
            <p style={{ 
              fontSize: '1.125rem',
              color: '#6b7280',
              margin: 0
            }}>
              Start your wellness journey
            </p>
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)'
        }}>
          {/* Finish button - left */}
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
              transition: 'all 0.2s',
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Finish
          </Button>

          {/* Camera indicator - right */}
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

        {/* Messages - increased bottom padding */}
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
                {/* Jodie's messages - Light purple/pink card on LEFT */}
                {msg.role === 'agent' && (
                  <div 
                    style={{ 
                      backgroundColor: '#faf5ff', 
                      borderColor: '#f3e8ff', 
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: '1.5rem', 
                      borderTopLeftRadius: '0.25rem', 
                      padding: '1rem 1.25rem', 
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
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

  // Show welcome screen
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
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Mind Measure
                </span>
              </h1>
              <p className="text-lg text-gray-600">Start your wellness journey</p>
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
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>We use your camera so make sure you are looking at the screen</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>We analyse your voice to understand your mood</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>We delete any voice and images we collect as soon as we have analysed them</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleStartAssessment}
                disabled={requestingPermissions}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg font-medium rounded-xl disabled:opacity-50 shadow-lg"
              >
                {requestingPermissions ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Requesting Permissions...
                  </div>
                ) : (
                  'Start Your Baseline Assessment'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

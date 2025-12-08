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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage(
        'We didn\'t capture enough data to create your baseline assessment. ' +
        'This can happen if you pressed Finish before answering all five questions.'
      );
      setShowErrorModal(true);
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
        
        const firstName = user?.user_metadata?.first_name || 'User';
        const lastName = user?.user_metadata?.last_name || '';
        const profileData = {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
          display_name: `${firstName} ${lastName}`.trim() || 'User',
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

      const { data: fusionResult, error: fusionError } = await backendService.database.insert('fusion_outputs', fusionData);
      if (fusionError || !fusionResult) {
        console.error('[SDK] ❌ CRITICAL: Failed to save baseline assessment:', fusionError);
        throw new Error('Failed to save baseline assessment');
      }
      // Handle array or single object return - type the result properly
      const fusionOutputId = Array.isArray(fusionResult) 
        ? (fusionResult[0] as any)?.id 
        : (fusionResult as any)?.id;
      if (!fusionOutputId) {
        console.error('[SDK] ❌ CRITICAL: No fusion_output_id returned');
        throw new Error('Failed to get fusion_output_id');
      }
      console.log('[SDK] ✅ Baseline assessment saved with score:', composite.score, 'fusion_output_id:', fusionOutputId);

      // Store raw transcript (optional - doesn't block baseline completion)
      const transcriptLines = assessmentState.transcript.split('\n').filter(line => line.trim());
      const transcriptData = {
        fusion_output_id: fusionOutputId,
        user_id: userId,
        conversation_id: sessionId, // ElevenLabs session ID
        transcript: assessmentState.transcript,
        message_count: transcriptLines.length,
        word_count: assessmentState.transcript.split(/\s+/).length,
        duration_seconds: Math.round((endedAt - (assessmentState.startedAt || endedAt)) / 1000),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: transcriptError } = await backendService.database.insert('assessment_transcripts', transcriptData);
      if (transcriptError) {
        console.warn('[SDK] ⚠️ Failed to store transcript:', transcriptError);
        // Non-blocking - continue
      } else {
        console.log('[SDK] ✅ Transcript stored');
      }

      // Store individual assessment items (optional - doesn't block baseline completion)
      const questionTexts = {
        phq2_q1: 'Over the past two weeks, how often have you felt little interest or pleasure in doing things?',
        phq2_q2: 'Over the past two weeks, how often have you felt down, depressed, or hopeless?',
        gad2_q1: 'Over the past two weeks, how often have you felt nervous, anxious, or on edge?',
        gad2_q2: 'Over the past two weeks, how often have you been unable to stop or control worrying?',
        mood: 'On a scale of one to ten, how would you rate your current mood?'
      };

      const frequencyMap: { [key: number]: string } = {
        0: 'Not at all',
        1: 'Several days',
        2: 'More than half the days',
        3: 'Nearly every day'
      };

      const items = [
        { 
          item_code: 'phq2_q1', 
          instrument: 'PHQ-2',
          question_text: questionTexts.phq2_q1,
          response_score: phqResponses.phq2_q1 ?? 0,
          response_raw: frequencyMap[phqResponses.phq2_q1 ?? 0]
        },
        { 
          item_code: 'phq2_q2', 
          instrument: 'PHQ-2',
          question_text: questionTexts.phq2_q2,
          response_score: phqResponses.phq2_q2 ?? 0,
          response_raw: frequencyMap[phqResponses.phq2_q2 ?? 0]
        },
        { 
          item_code: 'gad2_q1', 
          instrument: 'GAD-2',
          question_text: questionTexts.gad2_q1,
          response_score: phqResponses.gad2_q1 ?? 0,
          response_raw: frequencyMap[phqResponses.gad2_q1 ?? 0]
        },
        { 
          item_code: 'gad2_q2', 
          instrument: 'GAD-2',
          question_text: questionTexts.gad2_q2,
          response_score: phqResponses.gad2_q2 ?? 0,
          response_raw: frequencyMap[phqResponses.gad2_q2 ?? 0]
        },
        { 
          item_code: 'mood_scale', 
          instrument: 'MOOD_SCALE',
          question_text: questionTexts.mood,
          response_score: moodScore ?? 5,
          response_raw: String(moodScore ?? 5)
        },
      ];

      let itemsStored = 0;
      for (const item of items) {
        const { error: itemError } = await backendService.database.insert('assessment_items', {
          fusion_output_id: fusionOutputId,
          user_id: userId,
          instrument: item.instrument,
          item_code: item.item_code,
          question_text: item.question_text,
          response_raw: item.response_raw,
          response_score: item.response_score,
          extraction_confidence: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        if (itemError) {
          console.warn('[SDK] ⚠️ Failed to store assessment item:', item.item_code, itemError);
        } else {
          itemsStored++;
        }
      }
      if (itemsStored > 0) {
        console.log('[SDK] ✅ Assessment items stored:', itemsStored, '/', items.length);
      }
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
        {/* Header - matching BaselineWelcome style */}
        <div style={{ 
          paddingTop: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor: 'transparent',
          position: 'relative'
        }}>
          {/* Back Button - Top Left */}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
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
            {/* Logo */}
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
            {/* Title */}
            <h1 style={{ 
              fontSize: '1.875rem', 
              fontWeight: '400',
              marginBottom: '0.75rem',
              color: '#111827'
            }}>
              Baseline Assessment
            </h1>
            {/* Subtitle */}
            <p style={{ 
              fontSize: '1rem',
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
          backgroundColor: 'transparent'
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

        <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12 pt-16">
          <div className="w-full max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <img src={mindMeasureLogo} alt="Mind Measure" className="w-full h-full object-contain" />
              </div>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">What to expect</h3>
              
              <div className="bg-blue-50 rounded-lg p-6">
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

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            maxWidth: '28rem',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Unable to Complete Baseline
              </h3>
            </div>

            {/* Body */}
            <div style={{
              padding: '1.5rem'
            }}>
              <p style={{
                color: '#6b7280',
                lineHeight: '1.6',
                margin: 0
              }}>
                {errorMessage}
              </p>
            </div>

            {/* Footer - Buttons */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f9fafb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setShowConversation(false);
                  setMessages([]);
                  setAssessmentState({
                    transcript: '',
                    phqResponses: {},
                    moodScore: null,
                    startedAt: null,
                    endedAt: null
                  });
                  // Navigate back to dashboard
                  if (onComplete) {
                    onComplete();
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setShowConversation(false);
                  setMessages([]);
                  setAssessmentState({
                    transcript: '',
                    phqResponses: {},
                    moodScore: null,
                    startedAt: null,
                    endedAt: null
                  });
                  // Go back to baseline welcome to try again
                  if (onBack) {
                    onBack();
                  }
                }}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(to right, #a855f7, #3b82f6)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

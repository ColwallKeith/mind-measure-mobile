import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";

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

  // Assessment data tracking
  const [assessmentData, setAssessmentData] = useState({
    phqResponses: {} as Record<string, number>,
    moodScore: null as number | null,
    transcript: [] as Message[],
    startTime: null as number | null,
    endTime: null as number | null,
    sessionId: null as string | null
  });

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
      
      // Update messages first
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      setAssessmentData(prev => ({
        ...prev,
        transcript: [...prev.transcript, newMessage]
      }));

      // Extract assessment data from user responses using UPDATED messages
      if (message.source === 'user') {
        extractAssessmentData(message.message, updatedMessages);
      }
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

      // Show conversation UI
      setShowConversation(true);
      setAssessmentData(prev => ({ ...prev, startTime: Date.now() }));
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          console.log('[SDK] 🚀 Starting ElevenLabs conversation session...');
          
          const sessionId = await conversation.startSession({
            agentId: 'agent_9301k22s8e94f7qs5e704ez02npe'
          });

          console.log('[SDK] ✅ Session started with ID:', sessionId);
          setAssessmentData(prev => ({ ...prev, sessionId }));

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

  const extractAssessmentData = (userMessage: string, conversationHistory: Message[]) => {
    console.log('[SDK] 🔍 Extracting assessment data from message:', userMessage);

    // Helper to find the last agent message before this user response
    const findLastAgentQuestion = () => {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        if (conversationHistory[i].role === 'agent') {
          return conversationHistory[i].content.toLowerCase();
        }
      }
      return '';
    };

    const lastQuestion = findLastAgentQuestion();
    const userResponse = userMessage.toLowerCase();

    // PHQ-2 Questions (Q1-Q2)
    if (lastQuestion.includes('little interest') || lastQuestion.includes('pleasure')) {
      const score = mapPHQResponse(userResponse);
      if (score !== null) {
        console.log('[SDK] PHQ-2 Q1 detected:', score);
        setAssessmentData(prev => ({
          ...prev,
          phqResponses: { ...prev.phqResponses, question_1: score }
        }));
      }
    }

    if (lastQuestion.includes('down') || lastQuestion.includes('depressed') || lastQuestion.includes('hopeless')) {
      const score = mapPHQResponse(userResponse);
      if (score !== null) {
        console.log('[SDK] PHQ-2 Q2 detected:', score);
        setAssessmentData(prev => ({
          ...prev,
          phqResponses: { ...prev.phqResponses, question_2: score }
        }));
      }
    }

    // GAD-2 Questions (Q3-Q4)
    if (lastQuestion.includes('nervous') || lastQuestion.includes('anxious') || lastQuestion.includes('on edge')) {
      const score = mapPHQResponse(userResponse);
      if (score !== null) {
        console.log('[SDK] GAD-2 Q1 detected:', score);
        setAssessmentData(prev => ({
          ...prev,
          phqResponses: { ...prev.phqResponses, question_3: score }
        }));
      }
    }

    if (lastQuestion.includes('unable to stop') || lastQuestion.includes('control worrying')) {
      const score = mapPHQResponse(userResponse);
      if (score !== null) {
        console.log('[SDK] GAD-2 Q2 detected:', score);
        setAssessmentData(prev => ({
          ...prev,
          phqResponses: { ...prev.phqResponses, question_4: score }
        }));
      }
    }

    // Mood Scale (Q5) - Handle both digit and word responses
    if (lastQuestion.includes('rate your current mood') || lastQuestion.includes('scale') || lastQuestion.includes('one to ten')) {
      // Map word numbers to digits
      const wordToNumber: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
      };

      // Try to extract a digit first
      const digitMatch = userResponse.match(/(\d+)/);
      if (digitMatch) {
        const mood = parseInt(digitMatch[1]);
        if (mood >= 1 && mood <= 10) {
          console.log('[SDK] Mood scale (digit) detected:', mood);
          setAssessmentData(prev => ({
            ...prev,
            moodScore: mood,
            phqResponses: { ...prev.phqResponses, question_5: mood }
          }));
        }
      } else {
        // Try to match a word number
        const words = userResponse.split(/\s+/);
        for (const word of words) {
          if (wordToNumber[word]) {
            const mood = wordToNumber[word];
            console.log('[SDK] Mood scale (word) detected:', mood);
            setAssessmentData(prev => ({
              ...prev,
              moodScore: mood,
              phqResponses: { ...prev.phqResponses, question_5: mood }
            }));
            break;
          }
        }
      }
    }
  };

  const mapPHQResponse = (response: string): number | null => {
    if (response.includes('not at all')) return 0;
    if (response.includes('several days')) return 1;
    if (response.includes('more than half')) return 2;
    if (response.includes('nearly every day')) return 3;
    return null;
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

    const endTime = Date.now();
    const duration = assessmentData.startTime ? (endTime - assessmentData.startTime) / 1000 : 0;

    // Validate data - STRICT: All 5 questions must be answered
    const validation = validateBaselineData(
      assessmentData,
      assessmentData.transcript.length,
      duration
    );

    console.log('[SDK] Validation result:', validation);

    if (!validation.isValid) {
      console.error('[SDK] ❌ Incomplete assessment:', validation.details);
      alert(
        'Unable to Complete Baseline\n\n' +
        'We didn\'t capture enough data to create your baseline assessment. ' +
        'This can happen if you pressed Finish before answering all five questions.\n\n' +
        'Please try again and answer all questions from Jodie.'
      );
      
      // Return to welcome screen
      if (onBack) {
        onBack();
      }
      return;
    }

    console.log('[SDK] ✅ Baseline validation passed');

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
        ['id', 'email', 'user_id'],
        { user_id: userId }
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

        await backendService.database.insert('profiles', profileData);
        console.log('[SDK] ✅ Profile created');
      }

      // Store raw transcript
      const transcriptText = assessmentData.transcript
        .map(m => `${m.role === 'agent' ? 'Jodie' : 'User'}: ${m.content}`)
        .join('\n');

      const transcriptData = {
        user_id: userId,
        assessment_type: 'baseline',
        transcript_text: transcriptText,
        session_id: assessmentData.sessionId,
        agent_id: 'agent_9301k22s8e94f7qs5e704ez02npe',
        duration_seconds: Math.round(duration),
        created_at: new Date().toISOString()
      };

      const { error: transcriptError } = await backendService.database.insert('assessment_transcripts', transcriptData);
      if (transcriptError) {
        console.error('[SDK] ⚠️ Failed to store transcript:', transcriptError);
      } else {
        console.log('[SDK] ✅ Transcript stored');
      }

      // Store individual assessment items
      const items = Object.entries(assessmentData.phqResponses).map(([questionKey, score], index) => ({
        user_id: userId,
        assessment_type: 'baseline',
        item_number: index + 1,
        question_id: questionKey,
        response_value: score,
        response_text: mapScoreToText(score, questionKey),
        created_at: new Date().toISOString()
      }));

      for (const item of items) {
        const { error: itemError } = await backendService.database.insert('assessment_items', item);
        if (itemError) {
          console.error('[SDK] ⚠️ Failed to store item:', itemError);
        }
      }
      console.log('[SDK] ✅ Assessment items stored');

      // Calculate provisional score
      const phqTotal = (assessmentData.phqResponses.question_1 || 0) + 
                       (assessmentData.phqResponses.question_2 || 0);
      const gadTotal = (assessmentData.phqResponses.question_3 || 0) + 
                       (assessmentData.phqResponses.question_4 || 0);
      const moodScore = assessmentData.moodScore || 5;
      
      const provisionalScore = Math.round(
        100 - ((phqTotal + gadTotal) * 5) - ((10 - moodScore) * 2)
      );
      const clampedScore = Math.max(0, Math.min(100, provisionalScore));

      const fusionData = {
        user_id: userId,
        session_id: null,
        score: clampedScore,
        score_smoothed: clampedScore,
        final_score: clampedScore,
        p_worse_fused: (100 - clampedScore) / 100,
        uncertainty: 0.3,
        qc_overall: 0.8,
        public_state: 'report',
        model_version: 'baseline_v1.0',
        analysis: JSON.stringify({
          mood: 'baseline_established',
          assessment_type: 'baseline',
          phq2_score: phqTotal,
          gad2_score: gadTotal,
          mood_rating: moodScore,
          wellbeing_score: clampedScore
        }),
        topics: JSON.stringify(['wellbeing', 'baseline', 'initial_assessment']),
        created_at: new Date().toISOString()
      };

      await backendService.database.insert('fusion_outputs', fusionData);
      console.log('[SDK] ✅ Baseline assessment saved with score:', clampedScore);

      // Update profile
      await backendService.database.update(
        'profiles',
        { baseline_established: true },
        { user_id: userId }
      );

      // Mark complete in device storage
      await Preferences.set({ 
        key: 'mindmeasure_baseline_complete', 
        value: 'true' 
      });

      console.log('[SDK] 🎉 Baseline assessment completed successfully!');

      // Navigate to dashboard
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('[SDK] ❌ Error saving assessment:', error);
      alert('There was an error saving your assessment. Please try again or contact support.');
    }
  };

  const validateBaselineData = (data: typeof assessmentData, transcriptLength: number, duration: number) => {
    // STRICT: Require all 5 questions to be answered
    const hasAllQuestions = ['question_1', 'question_2', 'question_3', 'question_4', 'question_5']
      .every(q => data.phqResponses[q] !== undefined);
    
    const hasMood = data.moodScore !== null;
    const hasTranscript = transcriptLength > 5;
    const hasDuration = duration > 30;

    // All conditions must be true
    const isValid = hasAllQuestions && hasMood && hasTranscript && hasDuration;

    return {
      isValid,
      details: { hasAllQuestions, hasMood, hasTranscript, hasDuration }
    };
  };

  const mapScoreToText = (score: number, questionKey: string): string => {
    if (questionKey === 'question_5') {
      return score.toString(); // Mood is 1-10
    }
    // PHQ/GAD responses
    const map = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
    return map[score] || 'Unknown';
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

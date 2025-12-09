import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import { MediaCapture } from '../../services/multimodal/baseline/mediaCapture';
import { CheckinEnrichmentService } from '../../services/multimodal/checkin';

interface CheckinAssessmentSDKProps {
  onBack?: () => void;
  onComplete?: () => void;
}

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
}

export function CheckinAssessmentSDK({ onBack, onComplete }: CheckinAssessmentSDKProps) {
  const { user } = useAuth();
  const [showConversation, setShowConversation] = useState(true); // Start directly in conversation mode
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'extracting' | 'analyzing' | 'saving'>('extracting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Multimodal capture
  const mediaCaptureRef = useRef<MediaCapture | null>(null);
  const captureStartTimeRef = useRef<number>(0);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<any>(null);

  // Load user context for personalized conversations
  const loadUserContext = async () => {
    if (!user?.id) return null;
    try {
      console.log('[CheckinSDK] Loading user context...');
      const { BackendServiceFactory } = await import('@/services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.getService();

      // Get user profile data - use maybeSingle() to handle no results gracefully
      const { data: profile } = await backendService.database
        .from('profiles')
        .select('first_name, last_name, university_id, course, year_of_study')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get recent assessments from fusion_outputs
      const { data: recentAssessments } = await backendService.database
        .from('fusion_outputs')
        .select('analysis, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Get wellness trends
      const { data: wellnessData } = await backendService.database
        .from('fusion_outputs')
        .select('score, final_score, analysis, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get user's first name from profile or auth metadata
      const firstName = profile?.first_name || user.user_metadata?.first_name || user.user_metadata?.given_name || 'there';
      const lastName = profile?.last_name || user.user_metadata?.last_name || user.user_metadata?.family_name || '';

      // Parse assessment types from analysis JSON
      const assessmentHistory = (recentAssessments || []).map((a: any) => {
        let analysisData: any = {};
        try {
          analysisData = typeof a.analysis === 'string' ? JSON.parse(a.analysis) : a.analysis || {};
        } catch (e) {}
        return {
          assessment_type: analysisData.assessment_type || 'unknown',
          created_at: a.created_at,
          themes: analysisData.themes || [],
          summary: analysisData.conversation_summary || ''
        };
      });

      const context = {
        user: {
          name: firstName,
          fullName: `${firstName} ${lastName}`.trim() || 'there',
          university: profile?.university_id,
          course: profile?.course,
          yearOfStudy: profile?.year_of_study
        },
        assessmentHistory: assessmentHistory,
        wellnessTrends: wellnessData || [],
        isFirstTime: !assessmentHistory || assessmentHistory.length === 0 || 
          assessmentHistory.every((a: any) => a.assessment_type === 'baseline'),
        platform: 'mobile'
      };

      console.log('[CheckinSDK] ✅ User context loaded:', {
        userName: context.user.name,
        assessmentCount: context.assessmentHistory.length,
        isFirstTime: context.isFirstTime
      });

      setUserContext(context);
      return context;
    } catch (error) {
      console.error('[CheckinSDK] Failed to load user context:', error);
      console.error('[CheckinSDK] Error details:', error instanceof Error ? error.message : JSON.stringify(error));
      
      // Fallback: use auth metadata if profile query fails
      const fallbackContext = {
        user: {
          name: user.user_metadata?.first_name || user.user_metadata?.given_name || 'there',
          fullName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'there'
        },
        assessmentHistory: [],
        wellnessTrends: [],
        isFirstTime: true,
        platform: 'mobile'
      };
      console.log('[CheckinSDK] ✅ Using fallback context with name:', fallbackContext.user.name);
      setUserContext(fallbackContext);
      return fallbackContext;
    }
  };

  // Format context for ElevenLabs agent
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

    // Get previous themes/topics if available
    const previousThemes = assessmentHistory
      .filter((a: any) => a.themes && a.themes.length > 0)
      .flatMap((a: any) => a.themes)
      .slice(0, 5);
    
    const previousTopics = previousThemes.length > 0
      ? `In previous conversations, they mentioned: ${previousThemes.join(', ')}.`
      : '';

    return [
      `IMPORTANT: The student's name is ${userProfile?.name || 'there'}. Address them by name naturally in conversation.`,
      '',
      `You are speaking with ${userProfile?.fullName || userProfile?.name || 'the student'}.`,
      userProfile?.university ? `University: ${userProfile.university}` : null,
      userProfile?.course ? `Course: ${userProfile.course}` : null,
      userProfile?.yearOfStudy ? `Year of study: ${userProfile.yearOfStudy}` : null,
      '',
      context.isFirstTime 
        ? 'This is their first check-in. Focus on making them comfortable and explaining how these check-ins work.'
        : 'They have checked in before. Reference their history naturally.',
      '',
      'RECENT ASSESSMENT HISTORY:',
      assessmentsSummary,
      '',
      'WELLNESS TREND:',
      trendSummary,
      '',
      previousTopics
    ].filter(Boolean).join('\n');
  };

  // Track if context has been sent
  const contextSentRef = useRef(false);
  const pendingContextRef = useRef<string | null>(null);

  // Initialize the ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[CheckinSDK] ✅ Connected to ElevenLabs');
      
      // Send pending context now that connection is established
      if (pendingContextRef.current && !contextSentRef.current) {
        console.log('[CheckinSDK] 📤 Sending pending context after connection');
        try {
          conversation.sendContextualUpdate(pendingContextRef.current);
          contextSentRef.current = true;
          console.log('[CheckinSDK] ✅ Context sent successfully after connection');
        } catch (error) {
          console.error('[CheckinSDK] ❌ Failed to send context after connection:', error);
        }
      }
    },
    onDisconnect: () => {
      console.log('[CheckinSDK] 🔌 Disconnected from ElevenLabs');
    },
    onMessage: (message) => {
      console.log('[CheckinSDK] 📩 Message received:', message);
      
      const newMessage: Message = {
        role: message.source === 'ai' ? 'agent' : 'user',
        content: message.message,
        timestamp: Date.now()
      };
      
      // Update messages for UI display
      setMessages(prev => [...prev, newMessage]);

      // Append to transcript
      setTranscript(prev => prev + `${message.source === 'ai' ? 'agent' : 'user'}: ${message.message}\n`);
    },
    onError: (error) => {
      console.error('[CheckinSDK] ❌ Conversation error:', error);
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

  // Auto-start conversation when component mounts
  useEffect(() => {
    handleStartAssessment();
  }, []);

  const handleStartAssessment = async () => {
    console.log('[CheckinSDK] 🎯 Starting ElevenLabs SDK check-in');
    setRequestingPermissions(true);

    try {
      console.log('[CheckinSDK] 🎤 Requesting microphone permission...');
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[CheckinSDK] ✅ Audio permission granted');

      // Start media capture for multimodal features
      try {
        console.log('[CheckinSDK] 📹 Starting multimodal media capture...');
        mediaCaptureRef.current = new MediaCapture({
          captureAudio: true,
          captureVideo: true,
          videoFrameRate: 0.5 // 0.5 frames per second (same as baseline)
        });
        await mediaCaptureRef.current.start();
        captureStartTimeRef.current = Date.now();
        console.log('[CheckinSDK] ✅ Media capture started');
      } catch (captureError) {
        console.warn('[CheckinSDK] ⚠️ Media capture failed, continuing anyway:', captureError);
        // Continue - we can still save a check-in without multimodal data
      }

      // Show conversation UI
      setShowConversation(true);
      setStartedAt(Date.now());
      setTranscript('');
      
      // Load user context FIRST (before starting session)
      console.log('[CheckinSDK] 📋 Loading user context before session...');
      const context = await loadUserContext();
      
      // Prepare context for sending after connection
      if (context) {
        const contextText = formatContextForAgent(context);
        if (contextText) {
          console.log('[CheckinSDK] ✅ Context prepared and ready');
          console.log('[CheckinSDK] 📋 Context preview:', contextText.substring(0, 200) + '...');
          pendingContextRef.current = contextText;
        }
      } else {
        console.warn('[CheckinSDK] ⚠️ No context available - will use fallback greeting');
      }
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          console.log('[CheckinSDK] 🚀 Starting ElevenLabs conversation session...');
          
          const sid = await conversation.startSession({
            agentId: 'agent_7501k3hpgd5gf8ssm3c3530jx8qx'
          });

          console.log('[CheckinSDK] ✅ Session started with ID:', sid);
          setSessionId(sid);

        } catch (error) {
          console.error('[CheckinSDK] ❌ Failed to start conversation:', error);
          alert('Failed to start conversation. Please try again.');
          setShowConversation(false);
          
          // Cleanup media capture
          if (mediaCaptureRef.current) {
            mediaCaptureRef.current.cancel();
            mediaCaptureRef.current = null;
          }
        }
      }, 500);

    } catch (error) {
      console.error('[CheckinSDK] ❌ Permission request failed:', error);
      alert('Microphone access is required for check-ins. Please check your browser settings and try again.');
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleFinish = async () => {
    console.log('[CheckinSDK] 🏁 Finish button clicked');
    
    // Show saving state immediately
    setIsSaving(true);
    
    // Play click sound and haptics
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('[CheckinSDK] Haptics/audio not available:', e);
    }

    // End the conversation
    try {
      await conversation.endSession();
      console.log('[CheckinSDK] ✅ Conversation ended');
    } catch (error) {
      console.error('[CheckinSDK] Error ending conversation:', error);
    }

    // Process check-in data (including multimodal enrichment)
    await processCheckinData();
  };

  const processCheckinData = async () => {
    console.log('[CheckinSDK] 📊 Processing check-in data...');

    // Phase 1: Extracting (3 seconds)
    setProcessingPhase('extracting');

    const endedAt = Date.now();
    const duration = startedAt ? (endedAt - startedAt) / 1000 : 0;

    console.log('[CheckinSDK] 📝 Transcript length:', transcript.length, 'Duration:', duration, 'seconds');

    // Validate we have a reasonable transcript
    if (transcript.length < 50) {
      console.error('[CheckinSDK] ❌ Transcript too short');
      setErrorMessage(
        'We didn\'t capture enough conversation data for this check-in. ' +
        'Please try again and make sure to have a conversation with Jodie.'
      );
      setShowErrorModal(true);
      setIsSaving(false);
      return;
    }

    // Phase 2: Analyzing (stop media capture + multimodal enrichment)
    setTimeout(() => setProcessingPhase('analyzing'), 3000);
    
    // Stop media capture and get blobs
    let capturedMedia: any = null;
    let enrichmentResult: any = null;
    
    if (mediaCaptureRef.current) {
      try {
        console.log('[CheckinSDK] 📹 Stopping media capture...');
        capturedMedia = await mediaCaptureRef.current.stop();
        console.log('[CheckinSDK] ✅ Media captured:', {
          audioSize: capturedMedia.audioBlob?.size,
          videoFrames: capturedMedia.videoFrames?.length
        });

        // Run the check-in multimodal enrichment pipeline
        console.log('[CheckinSDK] 🔬 Running check-in multimodal enrichment...');
        const enrichmentService = new CheckinEnrichmentService();
        
        enrichmentResult = await enrichmentService.enrichCheckin({
          audioBlob: capturedMedia.audioBlob,
          videoFrames: capturedMedia.videoFrames,
          transcript: transcript,
          duration: duration,
          userId: user?.id || ''
        });

        console.log('[CheckinSDK] ✅ Check-in enrichment complete:', {
          finalScore: enrichmentResult.dashboardData.mindMeasureScore,
          audioFeatures: enrichmentResult.audioFeatures ? 'extracted' : 'failed',
          visualFeatures: enrichmentResult.visualFeatures ? 'extracted' : 'failed',
          textFeatures: enrichmentResult.textFeatures ? 'extracted' : 'failed'
        });

      } catch (captureError) {
        console.error('[CheckinSDK] ⚠️ Media capture or enrichment failed:', captureError);
        // Continue without multimodal data
      }
    } else {
      console.warn('[CheckinSDK] ⚠️ No media capture available');
    }

    // Phase 3: Saving (2 seconds)
    setTimeout(() => setProcessingPhase('saving'), 6000);

    // Save to database
    try {
      console.log('[CheckinSDK] 💾 Saving check-in to database...');

      // Import BackendServiceFactory
      const { BackendServiceFactory } = await import('@/services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.getService();

      // Prepare check-in data
      const checkinData: any = {
        user_id: user?.id,
        session_id: sessionId,
        transcript: transcript,
        started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        duration_seconds: Math.round(duration)
      };

      // Add multimodal data if available
      if (enrichmentResult) {
        const { dashboardData, fusion, audioFeatures, visualFeatures, textFeatures, textAnalysis } = enrichmentResult;

        checkinData.score = dashboardData.mindMeasureScore;
        checkinData.final_score = dashboardData.mindMeasureScore;
        checkinData.direction_of_change = dashboardData.directionOfChange;
        checkinData.risk_level = dashboardData.riskLevel;
        
        // Store detailed analysis
        checkinData.analysis = JSON.stringify({
          // Fusion results
          fusion_scores: {
            audio_score: fusion.audioScore,
            visual_score: fusion.visualScore,
            text_score: fusion.textScore,
            audio_confidence: fusion.audioConfidence,
            visual_confidence: fusion.visualConfidence,
            text_confidence: fusion.textConfidence,
            fused_deviation: fusion.fusedDeviation,
            uncertainty: fusion.uncertainty
          },
          // Text analysis (user-facing)
          conversation_summary: textAnalysis.conversationSummary,
          keywords_positive: textAnalysis.keywordsPositive,
          keywords_negative: textAnalysis.keywordsNegative,
          risk_assessment: textAnalysis.riskAssessment,
          // Raw features
          audio_features: audioFeatures,
          visual_features: visualFeatures,
          text_features: textFeatures,
          // Dashboard data
          contributing_factors: dashboardData.contributingFactors,
          risk_reasons: dashboardData.riskReasons
        });

        // Store feature JSONs
        checkinData.audio_features_json = audioFeatures ? JSON.stringify(audioFeatures) : null;
        checkinData.visual_features_json = visualFeatures ? JSON.stringify(visualFeatures) : null;
        checkinData.text_features_json = textFeatures ? JSON.stringify(textFeatures) : null;
        checkinData.scoring_breakdown_json = JSON.stringify(fusion);
      }

      // Insert into check_ins table
      const { data: insertedCheckin, error: insertError } = await backendService.database
        .from('check_ins')
        .insert(checkinData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('[CheckinSDK] ✅ Check-in saved:', insertedCheckin);

      // Wait for saving phase to complete
      setTimeout(async () => {
        setIsSaving(false);
        
        // Show success and navigate back
        if (onComplete) {
          onComplete();
        }
      }, 8000); // Total 8 seconds (3 + 3 + 2)

    } catch (error) {
      console.error('[CheckinSDK] ❌ Failed to save check-in:', error);
      setErrorMessage('Failed to save your check-in. Please try again.');
      setShowErrorModal(true);
      setIsSaving(false);
    }
  };

  // If showing conversation, render the chat interface
  if (showConversation) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 flex flex-col">
        {/* Processing overlay */}
        {isSaving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 animate-gradient">
            {/* Animated gradient background */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-bl from-pink-500/20 via-transparent to-purple-500/20 animate-pulse delay-1000"></div>
            </div>

            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center space-y-8 px-8">
              {/* Glass-morphism card with logo */}
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
                <img 
                  src={mindMeasureLogo} 
                  alt="Mind Measure" 
                  className="w-24 h-24 mx-auto animate-pulse-slow"
                />
              </div>

              {/* Processing message */}
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-light text-white tracking-wide">
                  {processingPhase === 'extracting' && 'Extracting Features'}
                  {processingPhase === 'analyzing' && 'Analyzing Patterns'}
                  {processingPhase === 'saving' && 'Saving Your Check-in'}
                </h2>
                <p className="text-white/70 text-lg">
                  {processingPhase === 'extracting' && 'Capturing audio and visual features...'}
                  {processingPhase === 'analyzing' && 'Running multimodal analysis...'}
                  {processingPhase === 'saving' && 'Finalizing your results...'}
                </p>
              </div>

              {/* Progress indicator */}
              <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                />
              </div>
            </div>

            <style>{`
              @keyframes gradient {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
              @keyframes float {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(20px, 20px) scale(1.1); }
              }
              @keyframes float-delayed {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-20px, -20px) scale(1.1); }
              }
              @keyframes pulse-slow {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
              }
              .animate-gradient {
                background-size: 200% 200%;
                animation: gradient 3s ease infinite;
              }
              .animate-float {
                animation: float 6s ease-in-out infinite;
              }
              .animate-float-delayed {
                animation: float-delayed 6s ease-in-out infinite;
              }
              .animate-pulse-slow {
                animation: pulse-slow 2s ease-in-out infinite;
              }
              .delay-1000 {
                animation-delay: 1s;
              }
            `}</style>
          </div>
        )}

        {/* Error modal */}
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Check-in Incomplete</h3>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Button
                onClick={() => {
                  setShowErrorModal(false);
                  setShowConversation(false);
                  setMessages([]);
                  setTranscript('');
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Header - matching baseline with proper safe area padding */}
        <div style={{ 
          paddingTop: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))',
          paddingBottom: '0.75rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 className="text-lg font-medium text-gray-900">Daily Check-in</h1>
          <Button
            onClick={handleFinish}
            disabled={messages.length < 4} // Require at least 2 exchanges
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Finish
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white'
                    : 'bg-white/90 text-gray-900 shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Microphone indicator (always active during conversation) */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-4 py-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Listening...</span>
          </div>
        </div>
      </div>
    );
  }

  // Component auto-starts, no welcome screen needed
  return null;
}


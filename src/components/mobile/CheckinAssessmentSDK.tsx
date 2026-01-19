import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import { MediaCapture } from '../../services/multimodal/baseline/mediaCapture';
import { CheckinEnrichmentService } from '../../services/multimodal/checkin/enrichmentService';
import { ConversationScreen } from './ConversationScreen';

interface CheckinAssessmentSDKProps {
  onBack?: () => void;
  onComplete?: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  options?: string[];
}

export function CheckinAssessmentSDK({ onBack, onComplete }: CheckinAssessmentSDKProps) {
  const { user } = useAuth();
  const [showConversation, setShowConversation] = useState(true); // Start directly in conversation
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'extracting' | 'analyzing' | 'saving'>('extracting');
  const [processingMessage, setProcessingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Tech-focused processing messages for check-ins (9 seconds total, 1.5s each)
  const processingMessages = [
    'Analysing vocal pitch patterns',
    'Processing facial expressions',
    'Measuring speech rate dynamics',
    'Assessing emotional valence',
    'Computing multimodal fusion score',
    'Finalising your check-in'
  ];
  
  // Multimodal capture
  const mediaCaptureRef = useRef<MediaCapture | null>(null);
  const captureStartTimeRef = useRef<number>(0);
  const [isCapturingMedia, setIsCapturingMedia] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Context refs
  const pendingContextRef = useRef<string | null>(null);
  const contextSentRef = useRef(false);
  const backendServiceRef = useRef<any>(null);
  
  // Previous check-in context for Phase 2
  const [previousContext, setPreviousContext] = useState<{
    lastThemes: string;
    lastMood: string;
    daysSince: string;
    lastSummary: string;
  } | null>(null);

  // Initialize the ElevenLabs conversation hook - SAME AS BASELINE
  const conversation = useConversation({
    onConnect: () => {
      console.log('[CheckinSDK] ✅ Connected to ElevenLabs');
      console.log('[CheckinSDK] 📋 Context: user_name passed via dynamicVariables');
    },
    onDisconnect: () => {
      console.log('[CheckinSDK] 🔌 Disconnected from ElevenLabs');
    },
    onMessage: (message) => {
      console.log('[CheckinSDK] 📩 Message received:', message);
      
      const newMessage: Message = {
        id: crypto.randomUUID(),
        text: message.message,
        sender: message.source === 'ai' ? 'ai' : 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Update transcript
      const speaker = message.source === 'ai' ? 'Jodie' : 'User';
      setTranscript(prev => prev + `${speaker}: ${message.message}\n`);
    },
    onError: (error) => {
      console.error('[CheckinSDK] ❌ ElevenLabs error:', error);
    }
  });

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch previous check-in context for Phase 2
  const fetchPreviousContext = async (): Promise<{
    lastThemes: string;
    lastMood: string;
    daysSince: string;
    lastSummary: string;
  } | null> => {
    try {
      console.log('[CheckinSDK] 📋 Fetching previous check-in context...');
      const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      
      // Get the most recent check-in for this user (matches useDashboardData pattern)
      const { data: sessions, error } = await backendService.database.select(
        'fusion_outputs',
        {
          columns: ['id', 'score', 'analysis', 'created_at'],
          filters: { user_id: user!.id },
          orderBy: [{ column: 'created_at', ascending: false }]
        }
      ) as { data: any[] | null; error: any };
      
      if (error || !sessions || sessions.length === 0) {
        console.log('[CheckinSDK] 📋 No previous check-ins found');
        return null;
      }
      
      // Find the most recent CHECK-IN (not baseline)
      const lastCheckin = sessions.find((s: any) => {
        const analysis = typeof s.analysis === 'string' ? JSON.parse(s.analysis) : s.analysis;
        return analysis?.assessment_type === 'checkin';
      });
      
      if (!lastCheckin) {
        console.log('[CheckinSDK] 📋 No previous check-ins found (only baselines)');
        return null;
      }
      
      const analysis = typeof lastCheckin.analysis === 'string' 
        ? JSON.parse(lastCheckin.analysis) 
        : lastCheckin.analysis;
      
      // Calculate days since last check-in
      const lastDate = new Date(lastCheckin.created_at);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Extract context
      const context = {
        lastThemes: (analysis.themes || []).slice(0, 3).join(', ') || 'general wellbeing',
        lastMood: String(analysis.mood_score || ''),
        daysSince: String(diffDays),
        lastSummary: (analysis.conversation_summary || '').substring(0, 100) || ''
      };
      
      console.log('[CheckinSDK] ✅ Previous context loaded:', context);
      return context;
      
    } catch (err) {
      console.warn('[CheckinSDK] ⚠️ Could not fetch previous context:', err);
      return null;
    }
  };

  // Auto-start on mount - SAME AS BASELINE
  useEffect(() => {
    handleStartCheckIn();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
      if (mediaCaptureRef.current) {
        mediaCaptureRef.current.stop();
      }
    };
  }, []);

  const handleStartCheckIn = async () => {
    try {
      console.log('[CheckinSDK] 🎯 Starting ElevenLabs SDK check-in');
      
      // Request microphone permission
      console.log('[CheckinSDK] 🎤 Requesting microphone permission...');
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[CheckinSDK] ✅ Audio permission granted');
      } catch (err) {
        console.error('[CheckinSDK] ❌ Audio permission denied:', err);
        return;
      }

      // Start media capture for multimodal features
      try {
        console.log('[CheckinSDK] 📹 Starting multimodal media capture...');
        mediaCaptureRef.current = new MediaCapture({
          captureAudio: true,
          captureVideo: true,
          videoFrameRate: 0.5
        });
        await mediaCaptureRef.current.start();
        captureStartTimeRef.current = Date.now();
        setIsCapturingMedia(true);
        console.log('[CheckinSDK] ✅ Media capture started');
      } catch (captureError) {
        console.warn('[CheckinSDK] ⚠️ Media capture failed, continuing anyway:', captureError);
        setIsCapturingMedia(false);
      }

      // Show conversation UI
      setShowConversation(true);
      setStartedAt(Date.now());
      setTranscript('');
      
      // Wait a moment for UI to render, then start the conversation
      setTimeout(async () => {
        try {
          // Get user's first name for personalised greeting
          const firstName = user?.user_metadata?.first_name || 'there';
          console.log('[CheckinSDK] 🚀 Starting ElevenLabs conversation session...');
          console.log('[CheckinSDK] 👤 User name for context:', firstName);
          
          // Phase 2: Fetch previous check-in context
          const prevContext = await fetchPreviousContext();
          setPreviousContext(prevContext);
          
          // Build dynamic variables for agent
          const dynamicVars: Record<string, string> = {
            user_name: firstName
          };
          
          // Add previous context if available
          if (prevContext) {
            dynamicVars.last_themes = prevContext.lastThemes;
            dynamicVars.last_mood = prevContext.lastMood;
            dynamicVars.days_since_checkin = prevContext.daysSince;
            dynamicVars.last_summary = prevContext.lastSummary;
            console.log('[CheckinSDK] 📋 Previous context being passed:', dynamicVars);
          } else {
            // Provide defaults so placeholders don't show raw
            dynamicVars.last_themes = '';
            dynamicVars.last_mood = '';
            dynamicVars.days_since_checkin = '';
            dynamicVars.last_summary = '';
            console.log('[CheckinSDK] 📋 No previous context - first check-in');
          }
          
          // Pass user context via dynamicVariables
          // Agent prompt can include: {{user_name}}, {{last_themes}}, {{last_mood}}, {{days_since_checkin}}, {{last_summary}}
          const sid = await conversation.startSession({
            agentId: 'agent_7501k3hpgd5gf8ssm3c3530jx8qx', // Check-in agent
            dynamicVariables: dynamicVars
          } as any); // Type assertion needed for dynamicVariables

          console.log('[CheckinSDK] ✅ Session started with ID:', sid);
          setSessionId(sid);

        } catch (error) {
          console.error('[CheckinSDK] ❌ Failed to start ElevenLabs session:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('[CheckinSDK] ❌ Failed to start check-in:', error);
    }
  };

  const handleFinish = async () => {
    // Prevent double-clicking
    if (isSaving) {
      console.log('[CheckinSDK] ⚠️ Already processing, ignoring duplicate click');
      return;
    }

    try {
      console.log('[CheckinSDK] 🏁 Finish button clicked');
      
      // Try haptics, but don't fail if not supported (web browsers)
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (hapticsError) {
        console.log('[CheckinSDK] ℹ️ Haptics not supported (expected on web)');
      }
      
      // End ElevenLabs session
      if (conversation.status === 'connected') {
        await conversation.endSession();
        console.log('[CheckinSDK] ✅ Conversation ended');
      }

      const endedAt = Date.now();
      const duration = startedAt ? (endedAt - startedAt) / 1000 : 0;
      
      console.log('[CheckinSDK] 📊 Processing check-in data...');
      console.log('[CheckinSDK] 📝 Transcript length:', transcript.length, 'Duration:', duration, 'seconds');

      // Start smooth 9-second message roll (1.5s per message)
      setProcessingPhase('extracting');
      let messageIndex = 0;
      setProcessingMessage(processingMessages[0]);
      
      const messageInterval = setInterval(() => {
        messageIndex++;
        if (messageIndex < processingMessages.length) {
          setProcessingMessage(processingMessages[messageIndex]);
        }
      }, 1500); // 1.5 seconds per message
      
      // Visual phase transitions (for title changes only)
      setTimeout(() => setProcessingPhase('analyzing'), 3000);
      setTimeout(() => setProcessingPhase('saving'), 6000);
      
      // Stop message rotation after all messages shown
      setTimeout(() => clearInterval(messageInterval), 9000);

      // Stop media capture
      let capturedMedia: any = null;
      if (mediaCaptureRef.current) {
        console.log('[CheckinSDK] 📹 Stopping media capture...');
        capturedMedia = await mediaCaptureRef.current.stop();
        setIsCapturingMedia(false);
        console.log('[CheckinSDK] ✅ Media captured:', {
          audioSize: capturedMedia.audio?.size,  // Fixed: was audioBlob, MediaCapture returns 'audio'
          videoFrames: capturedMedia.videoFrames?.length
        });
      }

      // Show processing overlay
      setIsSaving(true);

      // Stop media capture
      let enrichmentResult = null;
      
      try {
        console.log('[CheckinSDK] 🔬 Running check-in enrichment (Bedrock + Multimodal)...');
        const enrichmentService = new CheckinEnrichmentService();
        enrichmentResult = await enrichmentService.enrichCheckIn({
          userId: user!.id,
          transcript,
          audioBlob: capturedMedia?.audio,  // Fixed: MediaCapture returns 'audio' not 'audioBlob'
          videoFrames: capturedMedia?.videoFrames,
          duration,
          sessionId: sessionId || undefined,
          studentFirstName: user?.user_metadata?.first_name || user?.user_metadata?.given_name
        });
        console.log('[CheckinSDK] ✅ Enrichment complete:', enrichmentResult);
      } catch (enrichmentError: any) {
        console.error('[CheckinSDK] ⚠️ Enrichment failed, continuing with basic save:', enrichmentError);
        console.error('[CheckinSDK] ⚠️ Error details:', enrichmentError?.message || String(enrichmentError));
        // Continue - we can still save a basic check-in without full enrichment
      }

      // Save to database
      console.log('[CheckinSDK] 💾 Saving check-in to database... [v3-dec10]');

      // Step 1: Import backend service
      console.log('[CheckinSDK] Step 1: Importing BackendServiceFactory...');
      const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
      console.log('[CheckinSDK] Step 1: ✅ Import successful');
      
      // Step 2: Get service instance (same pattern as BaselineAssessmentSDK)
      console.log('[CheckinSDK] Step 2: Getting backend service...');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      console.log('[CheckinSDK] Step 2: ✅ Got backend service');

      // Step 3: Build analysis object - normalize field names for DB compatibility
      console.log('[CheckinSDK] Step 3: Building analysis object...');
      const analysis = {
        assessment_type: 'checkin',
        mind_measure_score: enrichmentResult?.mind_measure_score ?? enrichmentResult?.finalScore ?? 50,
        
        // Explicit mood rating from user (1-10 scale, extracted from conversation by Bedrock)
        mood_score: enrichmentResult?.mood_score ?? 5,
        
        // Normalize to old field names for DB compatibility
        driver_positive: enrichmentResult?.drivers_positive ?? enrichmentResult?.driver_positive ?? [],
        driver_negative: enrichmentResult?.drivers_negative ?? enrichmentResult?.driver_negative ?? [],
        
        themes: enrichmentResult?.themes ?? [],
        keywords: enrichmentResult?.keywords ?? [],
        modalities: enrichmentResult?.modalities ?? {},
        
        risk_level: enrichmentResult?.risk_level ?? 'none',
        direction_of_change: enrichmentResult?.direction_of_change ?? 'same',
        uncertainty: enrichmentResult?.uncertainty ?? 0.5,  // Now passed through from Bedrock
        conversation_summary: enrichmentResult?.conversation_summary ?? '',
        
        // Session info - separate internal ID from provider ID
        check_in_id: crypto.randomUUID(),           // Our internal UUID
        session_id: sessionId,                       // ElevenLabs conv_xxx
        elevenlabs_session_id: sessionId,            // Explicit provider reference
        transcript_length: transcript.length,
        duration,
        processing_time_ms: enrichmentResult?.processing_time_ms,
        warnings: enrichmentResult?.warnings ?? []
      };
      console.log('[CheckinSDK] Step 3: ✅ Analysis built with keys:', Object.keys(analysis));

      // Step 4: Calculate final score
      console.log('[CheckinSDK] Step 4: Calculating final score...');
      const finalScore = Math.round(enrichmentResult?.finalScore ?? enrichmentResult?.mind_measure_score ?? 50);
      console.log('[CheckinSDK] Step 4: ✅ Final score:', finalScore);
      
      // Step 5: Stringify analysis
      console.log('[CheckinSDK] Step 5: Stringifying analysis...');
      let analysisJson: string;
      try {
        analysisJson = JSON.stringify(analysis);
        console.log('[CheckinSDK] Step 5: ✅ Analysis stringified, length:', analysisJson.length);
      } catch (stringifyError: any) {
        console.error('[CheckinSDK] Step 5: ❌ JSON.stringify failed:', stringifyError?.message);
        throw stringifyError;
      }
      
      // Step 6: Build fusion data payload
      console.log('[CheckinSDK] Step 6: Building fusion data...');
      const fusionData = {
        user_id: user!.id,
        score: finalScore,
        final_score: finalScore,  // Set same as score for consistency with baseline
        analysis: analysisJson,
        created_at: new Date().toISOString()
      };
      console.log('[CheckinSDK] Step 6: ✅ Fusion data built:', {
        user_id: fusionData.user_id,
        score: fusionData.score,
        final_score: fusionData.final_score,
        analysis_length: analysisJson.length
      });

      // Step 7: Insert into database
      console.log('[CheckinSDK] Step 7: 📡 Calling database insert...');
      const { data: fusionResult, error: fusionError } = await backendService.database.insert('fusion_outputs', fusionData);
      console.log('[CheckinSDK] Step 7: Insert returned:', { 
        hasData: !!fusionResult, 
        hasError: !!fusionError,
        errorType: typeof fusionError,
        errorValue: fusionError
      });
      
      if (fusionError || !fusionResult) {
        console.error('[CheckinSDK] ❌ Database insert failed');
        console.error('[CheckinSDK] ❌ Error value:', fusionError);
        console.error('[CheckinSDK] ❌ Error JSON:', JSON.stringify(fusionError));
        console.error('[CheckinSDK] ❌ Result:', fusionResult);
        throw new Error(typeof fusionError === 'string' ? fusionError : JSON.stringify(fusionError) || 'Database insert returned no data');
      }

      const savedId = Array.isArray(fusionResult) ? fusionResult[0]?.id : fusionResult?.id;
      console.log('[CheckinSDK] ✅ Check-in saved successfully with ID:', savedId);

      // Step 8: Save transcript to assessment_transcripts table (CRITICAL for reports)
      if (savedId && transcript.length > 0) {
        console.log('[CheckinSDK] Step 8: 📝 Saving transcript...');
        const transcriptData = {
          fusion_output_id: savedId,
          user_id: user!.id,
          conversation_id: sessionId || null,
          transcript: transcript,
          message_count: transcript.split('\n').filter(l => l.trim()).length,
          word_count: transcript.split(/\s+/).length,
          duration_seconds: Math.round(duration),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: transcriptError } = await backendService.database.insert('assessment_transcripts', transcriptData);
        if (transcriptError) {
          console.warn('[CheckinSDK] ⚠️ Failed to store transcript:', transcriptError);
          // Non-blocking - continue
        } else {
          console.log('[CheckinSDK] ✅ Transcript stored');
        }
      } else {
        console.warn('[CheckinSDK] ⚠️ Skipping transcript save - no ID or empty transcript');
      }

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete
      setIsSaving(false);
      if (onComplete) {
        onComplete();
      }

    } catch (error: any) {
      // Comprehensive error logging for iOS WebView debugging
      console.error('[CheckinSDK] ❌ CATCH BLOCK - Failed to save check-in');
      console.error('[CheckinSDK] ❌ Error type:', typeof error);
      console.error('[CheckinSDK] ❌ Error name:', error?.name);
      console.error('[CheckinSDK] ❌ Error message:', error?.message);
      console.error('[CheckinSDK] ❌ Error stack:', error?.stack?.substring(0, 500));
      try {
        console.error('[CheckinSDK] ❌ Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})));
      } catch (e) {
        console.error('[CheckinSDK] ❌ Could not stringify error');
      }
      setIsSaving(false);
      setErrorMessage('Failed to save your check-in. Please try again.');
      setShowErrorModal(true);
    }
  };

  // Show conversation screen - EXACT COPY FROM BASELINE with title change
  if (showConversation) {
    return (
      <>
        {/* Processing Overlay - EXACT COPY FROM BASELINE */}
        {isSaving && (
          <div className="fixed inset-0 z-[9999] min-h-screen relative overflow-hidden flex items-center justify-center">
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                ]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              }}
            />

            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-black/5" />

            {/* Floating orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl"
              animate={{
                y: [0, -15, 0],
                x: [0, 10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/8 rounded-full blur-xl"
              animate={{
                y: [0, 10, 0],
                x: [0, -8, 0],
                scale: [1, 0.9, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />

            {/* Content */}
            <motion.div
              className="relative z-10 flex flex-col items-center text-center px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Logo */}
              <motion.div
                className="mb-6"
                animate={{
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="w-32 h-32 p-4 bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
                  <img
                    src={mindMeasureLogo}
                    alt="Mind Measure"
                    className="w-full h-full object-contain"
                  />
                </div>
              </motion.div>

              {/* Processing messages with phase transitions */}
              <motion.div
                key={processingPhase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl font-semibold text-white mb-3">
                  {processingPhase === 'extracting' && 'Processing Your Check-in'}
                  {processingPhase === 'analyzing' && 'Analysing Multimodal Data'}
                  {processingPhase === 'saving' && 'Finalising Your Check-in'}
                </h1>
              </motion.div>

              <motion.div
                key={processingMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <p className="text-white/90 text-lg font-medium mb-8">
                  {processingMessage}
                </p>
              </motion.div>

              {/* Progress bar - infinite loop */}
              <motion.div
                className="mt-8 w-48 h-1 bg-white/30 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <motion.div
                  className="h-full bg-white/60 rounded-full"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ width: "50%" }}
                />
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* New ConversationScreen Component */}
        <ConversationScreen
          type="checkin"
          messages={messages}
          isListening={conversation.status === 'connected'}
          onFinish={handleFinish}
          onBack={onBack}
        />
      </>
    );
  }

  // This should never show since we start directly in conversation
  return null;
}

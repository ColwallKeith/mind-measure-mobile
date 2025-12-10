import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import { MediaCapture } from '../../services/multimodal/baseline/mediaCapture';
import { CheckinEnrichmentService } from '../../services/multimodal/checkin/enrichmentService';

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
  const [showConversation, setShowConversation] = useState(true); // Start directly in conversation
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
  const [isCapturingMedia, setIsCapturingMedia] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Context refs
  const pendingContextRef = useRef<string | null>(null);
  const contextSentRef = useRef(false);
  const backendServiceRef = useRef<any>(null);

  // Initialize the ElevenLabs conversation hook - SAME AS BASELINE
  const conversation = useConversation({
    onConnect: () => {
      console.log('[CheckinSDK] ✅ Connected to ElevenLabs');
      // Context sending disabled - agent will use default greeting
      console.log('[CheckinSDK] ⚠️ Context sending disabled for now');
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
          console.log('[CheckinSDK] 🚀 Starting ElevenLabs conversation session...');
          
          // ONLY DIFFERENCE FROM BASELINE: different agent ID + pass variables
          const sid = await conversation.startSession({
            agentId: 'agent_7501k3hpgd5gf8ssm3c3530jx8qx' // Check-in agent
          });

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
      
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      // End ElevenLabs session
      if (conversation.status === 'connected') {
        await conversation.endSession();
        console.log('[CheckinSDK] ✅ Conversation ended');
      }

      const endedAt = Date.now();
      const duration = startedAt ? (endedAt - startedAt) / 1000 : 0;
      
      console.log('[CheckinSDK] 📊 Processing check-in data...');
      console.log('[CheckinSDK] 📝 Transcript length:', transcript.length, 'Duration:', duration, 'seconds');

      // Show processing overlay
      setIsSaving(true);
      setProcessingPhase('extracting');

      // Stop media capture
      let capturedMedia: any = null;
      if (mediaCaptureRef.current) {
        console.log('[CheckinSDK] 📹 Stopping media capture...');
        capturedMedia = await mediaCaptureRef.current.stop();
        setIsCapturingMedia(false);
        console.log('[CheckinSDK] ✅ Media captured:', {
          audioSize: capturedMedia.audioBlob?.size,
          videoFrames: capturedMedia.videoFrames?.length
        });
      }

      // Run enrichment - Bedrock + Baseline Multimodal (50/50)
      setProcessingPhase('analyzing');
      let enrichmentResult = null;
      
      try {
        console.log('[CheckinSDK] 🔬 Running check-in enrichment (Bedrock + Multimodal)...');
        const enrichmentService = new CheckinEnrichmentService();
        enrichmentResult = await enrichmentService.enrichCheckIn({
          userId: user!.id,
          transcript,
          audioBlob: capturedMedia?.audioBlob,
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
      setProcessingPhase('saving');
      console.log('[CheckinSDK] 💾 Saving check-in to database...');

      const { BackendServiceFactory } = await import('@/services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.getService();

      // Create analysis - mark as check-in type
      const analysis = enrichmentResult 
        ? {
            ...enrichmentResult,
            assessment_type: 'checkin',
            session_id: sessionId,
            transcript_length: transcript.length,
            duration
          }
        : {
            assessment_type: 'checkin',
            mind_measure_score: 50,
            transcript_summary: 'Check-in completed',
            conversation_duration: duration,
            session_id: sessionId
          };

      const fusionData = {
        user_id: user!.id,
        score: enrichmentResult?.finalScore || enrichmentResult?.mind_measure_score || 50,
        analysis: analysis
        // created_at is auto-generated by database
      };

      const { data: fusionResult, error: fusionError } = await backendService.database.insert('fusion_outputs', fusionData);
      
      if (fusionError) {
        console.error('[CheckinSDK] ❌ Failed to save check-in:', fusionError);
        console.error('[CheckinSDK] ❌ Error details:', JSON.stringify(fusionError, null, 2));
        throw fusionError;
      }

      console.log('[CheckinSDK] ✅ Check-in saved successfully:', fusionResult);

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete
      setIsSaving(false);
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('[CheckinSDK] ❌ Failed to save check-in:', error);
      setIsSaving(false);
      setErrorMessage('Failed to save your check-in. Please try again.');
      setShowErrorModal(true);
    }
  };

  // Show conversation screen - EXACT COPY FROM BASELINE with title change
  if (showConversation) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(to bottom right, #eff6ff, #faf5ff, #fce7f3)'
      }}>
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
                  {processingPhase === 'extracting' && 'Extracting Your Responses'}
                  {processingPhase === 'analyzing' && 'Analyzing Your Check-in'}
                  {processingPhase === 'saving' && 'Saving Your Check-in'}
                </h1>
              </motion.div>

              <motion.div
                key={`${processingPhase}-subtitle`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <p className="text-white/90 text-lg font-medium mb-8">
                  {processingPhase === 'extracting' && 'Analysing your conversation data...'}
                  {processingPhase === 'analyzing' && 'Computing your wellbeing score...'}
                  {processingPhase === 'saving' && 'Finalizing your check-in...'}
                </p>
              </motion.div>

              {/* Progress bar */}
              <motion.div
                className="mt-8 w-48 h-1 bg-white/30 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <motion.div
                  className="h-full bg-white/60 rounded-full"
                  animate={{ width: ["0%", "100%"] }}
                  transition={{
                    duration: 15,
                    ease: "linear"
                  }}
                />
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* Header - EXACT COPY FROM BASELINE */}
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
            {/* Title - ONLY CHANGE: "Daily Check-in" instead of "Baseline Assessment" */}
            <h1 style={{ 
              fontSize: '1.875rem', 
              fontWeight: '400',
              marginBottom: '0.75rem',
              color: '#111827'
            }}>
              Daily Check-in
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

        {/* Control Bar - EXACT COPY FROM BASELINE */}
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

        {/* Messages - EXACT COPY FROM BASELINE */}
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

  // This should never show since we start directly in conversation
  return null;
}

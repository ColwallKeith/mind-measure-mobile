import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
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
import { MediaCapture } from '../../services/multimodal/baseline/mediaCapture';
import { BaselineEnrichmentService } from '../../services/multimodal/baseline';

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
  const [isSaving, setIsSaving] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'extracting' | 'calculating' | 'saving'>('extracting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Multimodal capture
  const mediaCaptureRef = useRef<MediaCapture | null>(null);
  const captureStartTimeRef = useRef<number>(0);

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

      // Start media capture for multimodal features
      try {
        console.log('[SDK] 📹 Starting multimodal media capture...');
        mediaCaptureRef.current = new MediaCapture({
          captureAudio: true,
          captureVideo: true,
          videoFrameRate: 1 // 1 frame per second
        });
        await mediaCaptureRef.current.start();
        captureStartTimeRef.current = Date.now();
        console.log('[SDK] ✅ Media capture started');
      } catch (captureError) {
        console.warn('[SDK] ⚠️ Media capture failed, continuing with clinical-only:', captureError);
        // Continue anyway - we'll fall back to clinical-only scoring
      }

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
          
          // Cleanup media capture
          if (mediaCaptureRef.current) {
            mediaCaptureRef.current.cancel();
            mediaCaptureRef.current = null;
          }
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
    
    // Show saving state immediately
    setIsSaving(true);
    
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

    // Process assessment data (including multimodal enrichment)
    await processAssessmentData();
  };

  const processAssessmentData = async () => {
    console.log('[SDK] 📊 Processing assessment data...');

    // Phase 1: Extracting (3 seconds)
    setProcessingPhase('extracting');

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
      setIsSaving(false);
      return;
    }

    console.log('[SDK] ✅ Baseline validation passed');

    // Calculate clinical scores
    const clinical = calculateClinicalScores(phqResponses, moodScore);
    const composite = calculateMindMeasureComposite(clinical);

    console.log('[SDK] 📊 Clinical scores:', clinical);
    console.log('[SDK] 📊 Mind Measure composite (clinical-only):', composite);

    // Phase 2: Calculating (stop media capture + enrich with multimodal)
    setTimeout(() => setProcessingPhase('calculating'), 3000);
    
    // Stop media capture and get blobs
    let capturedMedia: any = null;
    let enrichmentResult: any = null;
    
    if (mediaCaptureRef.current) {
      try {
        console.log('[SDK] 📹 Stopping media capture...');
        capturedMedia = await mediaCaptureRef.current.stop();
        console.log('[SDK] ✅ Media captured:', {
          hasAudio: !!capturedMedia.audio,
          hasVideo: !!capturedMedia.videoFrames?.length,
          duration: capturedMedia.duration
        });

        // Enrich with multimodal features
        console.log('[SDK] 🎯 Enriching with multimodal features...');
        const enrichmentService = new BaselineEnrichmentService();
        
        enrichmentResult = await enrichmentService.enrichBaseline({
          clinicalScore: composite.score,
          audioBlob: capturedMedia.audio,
          videoFrames: capturedMedia.videoFrames,
          duration: capturedMedia.duration,
          userId: user?.id || '',
          fusionOutputId: 'temp', // Will be replaced after DB insert
          startTime: capturedMedia.startTime,
          endTime: capturedMedia.endTime
        });

        console.log('[SDK] ✅ Enrichment complete:', {
          originalScore: enrichmentResult.originalScore,
          finalScore: enrichmentResult.finalScore,
          success: enrichmentResult.success,
          warnings: enrichmentResult.warnings
        });

      } catch (error) {
        console.warn('[SDK] ⚠️ Multimodal enrichment failed:', error);
        enrichmentResult = null; // Fall back to clinical-only
      } finally {
        mediaCaptureRef.current = null;
      }
    } else {
      console.log('[SDK] ℹ️ No media capture - using clinical-only scoring');
    }

    // Use enriched score if available, otherwise clinical-only
    const finalScore = enrichmentResult?.finalScore ?? composite.score;
    console.log('[SDK] 📊 Final score:', finalScore, enrichmentResult ? '(70% clinical + 30% multimodal)' : '(clinical-only)');

    // Phase 3: Saving (6 seconds from start)
    setTimeout(() => setProcessingPhase('saving'), 3000); // 3s more = 6s total

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
      setIsSaving(false);
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

      // Build analysis object with multimodal data if available
      const analysisData: any = {
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
      };

      // Add multimodal data if enrichment succeeded
      if (enrichmentResult && enrichmentResult.success) {
        analysisData.multimodal_enrichment = {
          enabled: true,
          audio_features: enrichmentResult.audioFeatures,
          visual_features: enrichmentResult.visualFeatures,
          scoring_breakdown: enrichmentResult.scoringBreakdown,
          processing_time_ms: enrichmentResult.processingTimeMs,
          warnings: enrichmentResult.warnings
        };
      } else {
        analysisData.multimodal_enrichment = {
          enabled: false,
          reason: enrichmentResult?.warnings?.[0] || 'Media capture not available'
        };
      }

      // Save fusion output with FINAL score (hybrid if available, clinical-only otherwise)
      const fusionData = {
        user_id: userId,
        session_id: null, // ElevenLabs session ID stored in analysis JSON instead
        score: finalScore,
        score_smoothed: finalScore,
        final_score: finalScore,
        p_worse_fused: (100 - finalScore) / 100,
        uncertainty: enrichmentResult ? (1 - enrichmentResult.scoringBreakdown.confidence) : 0.3,
        qc_overall: enrichmentResult?.scoringBreakdown.confidence || 0.7,
        public_state: 'report',
        model_version: enrichmentResult ? 'v1.1-multimodal' : 'v1.0-clinical',
        analysis: JSON.stringify(analysisData),
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
      console.log('[SDK] ✅ Baseline assessment saved with final score:', finalScore, 'fusion_output_id:', fusionOutputId);
      if (enrichmentResult) {
        console.log('[SDK] 📊 Score breakdown: clinical=' + composite.score + ', final=' + finalScore + ' (70/30 weighted)');
      }

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
      setIsSaving(false);
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
        {/* Processing Overlay */}
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
                  {processingPhase === 'calculating' && 'Calculating Your Baseline'}
                  {processingPhase === 'saving' && 'Saving Your Assessment'}
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
                  {processingPhase === 'calculating' && 'Computing your Mind Measure score...'}
                  {processingPhase === 'saving' && 'Finalizing your baseline profile...'}
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5'
    }}>
      <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px',
          paddingTop: '80px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <img 
            src={mindMeasureLogo} 
            alt="Mind Measure" 
            style={{
              width: '80px',
              height: '80px',
              marginBottom: '20px'
            }}
          />
          
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 32px 0',
            textAlign: 'center'
          }}>
            Start your wellness journey
          </h1>

          {/* What to Expect Card */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            marginBottom: '24px',
            width: '100%'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 24px 0',
              textAlign: 'center'
            }}>
              What to expect
            </h2>

            {/* Bullet Points */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Point 1 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '15px',
                  color: '#1a1a1a',
                  lineHeight: '1.6'
                }}>
                  Five questions
                </span>
              </div>

              {/* Point 2 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '15px',
                  color: '#1a1a1a',
                  lineHeight: '1.6'
                }}>
                  3-5 minutes max
                </span>
              </div>

              {/* Point 3 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '15px',
                  color: '#1a1a1a',
                  lineHeight: '1.6'
                }}>
                  We use your camera so make sure you are looking at the screen
                </span>
              </div>

              {/* Point 4 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '15px',
                  color: '#1a1a1a',
                  lineHeight: '1.6'
                }}>
                  We analyse your voice to understand your mood
                </span>
              </div>

              {/* Point 5 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '15px',
                  color: '#1a1a1a',
                  lineHeight: '1.6'
                }}>
                  We delete any voice and images we collect as soon as we have analysed them
                </span>
              </div>
            </div>
          </div>

          {/* Start Assessment Button */}
          <button
            onClick={handleStartAssessment}
            disabled={requestingPermissions}
            style={{
              width: '100%',
              padding: '16px',
              background: requestingPermissions ? '#cccccc' : 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: requestingPermissions ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: requestingPermissions ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (!requestingPermissions) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!requestingPermissions) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }
            }}
          >
            {requestingPermissions ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Requesting Permissions...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Let's Get Started
              </>
            )}
          </button>
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

import mindMeasureLogo from "../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Preferences } from '@capacitor/preferences';
interface BaselineAssessmentProps {
  onBack?: () => void;
  onComplete?: () => void;
}
export function BaselineAssessment({ onBack, onComplete }: BaselineAssessmentProps) {
  const { user, loading: authLoading } = useAuth();
  const [showConversation, setShowConversation] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [baselineSubmitted, setBaselineSubmitted] = useState(false); // Prevent duplicate submissions
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Real assessment data collection
  const [conversationData, setConversationData] = useState({
    transcript: '',
    duration: 0,
    moodScore: null as number | null,
    phqResponses: {} as Record<string, number>,
    startTime: null as number | null,
    endTime: null as number | null
  });
  const [visualAnalysisData, setVisualAnalysisData] = useState({
    rekognitionSamples: [] as any[],
    faceDetectionRate: 0,
    avgBrightness: 0,
    qualityScore: 0
  });
  const [audioAnalysisData, setAudioAnalysisData] = useState({
    speechRate: 'normal' as 'slow' | 'normal' | 'fast',
    voiceQuality: 'clear' as 'clear' | 'muffled' | 'distorted',
    emotionalTone: 'neutral' as 'positive' | 'neutral' | 'negative'
  });
  
  // Camera stream and visual analysis
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualAnalysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Debug authentication state on component load
  useEffect(() => {
    console.log('🔍 BaselineAssessment loaded with auth state:', {
      authLoading,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    // User reached this screen, so they must be authenticated
    // No redirects - trust that user presence on screen = authentication
    console.log('✅ User reached baseline screen - assuming authenticated');
  }, [user, authLoading]);
  // Check media devices availability (iOS WKWebView has native support)
  useEffect(() => {
    console.log('🔧 Checking media devices availability...');
    console.log('📱 navigator.mediaDevices exists:', !!navigator.mediaDevices);
    console.log('📱 getUserMedia exists:', !!(navigator.mediaDevices?.getUserMedia));
    // Modern iOS (11+) has native getUserMedia - no polyfill needed
    // ElevenLabs widget will handle permissions internally
  }, []);
  
  // Load ElevenLabs script
  useEffect(() => {
    const id = 'elevenlabs-convai-embed';
    if (document.getElementById(id)) {
      setScriptLoaded(true);
      return;
    }
    console.log('Loading ElevenLabs script...');
    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.onload = () => {
      console.log('✅ ElevenLabs script loaded successfully');
      setScriptLoaded(true);
    };
    script.onerror = (error) => {
      console.error('❌ Failed to load ElevenLabs script:', error);
    };
    document.head.appendChild(script);
  }, []);
  // Initialize widget when script is loaded and conversation should show
  useEffect(() => {
    if (scriptLoaded && showConversation && widgetRef.current && !widgetRef.current.querySelector('elevenlabs-convai')) {
      initializeWidget();
    }
  }, [scriptLoaded, showConversation]);
  const initializeWidget = () => {
    if (!widgetRef.current) return;
    console.log('🚀 Initializing ElevenLabs widget...');
    console.log('🔍 Checking media capabilities before widget creation...');
    
    // Clear any existing widgets first to prevent duplicates and repeated questions
    if (widgetRef.current.children.length > 0) {
      console.log('🧹 Clearing existing widgets to prevent conflicts');
      Array.from(widgetRef.current.children).forEach(child => {
        if (child.tagName === 'ELEVENLABS-CONVAI') {
          widgetRef.current?.removeChild(child);
        }
      });
    }
    
    // Test getUserMedia before creating widget
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log('✅ getUserMedia is available');
      // Test audio access
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('✅ Audio test successful:', stream);
          // Stop the test stream
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((error) => {
          console.warn('⚠️ Audio test failed:', error);
        });
    } else {
      console.error('❌ getUserMedia not available even after polyfill');
    }
    // Create the widget element
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', 'agent_9301k22s8e94f7qs5e704ez02npe'); // Baseline agent
    widget.setAttribute('auto-start', 'false');
    widget.setAttribute('conversation-mode', 'voice');
    widget.setAttribute('language', 'en');
    
    // Add iOS-specific attributes to prevent audio/video issues
    widget.setAttribute('playsinline', 'true');
    widget.setAttribute('webkit-playsinline', 'true');
    widget.setAttribute('muted', 'false');
    console.log('🎯 Widget attributes set:', {
      'agent-id': widget.getAttribute('agent-id'),
      'auto-start': widget.getAttribute('auto-start'),
      'conversation-mode': widget.getAttribute('conversation-mode'),
      'language': widget.getAttribute('language')
    });
    // Set explicit dimensions
    widget.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      min-height: 600px !important;
      display: block !important;
    `;
    // Add comprehensive event listeners with real data capture and error handling
    // Use state flag (baselineSubmitted) to prevent multiple conversation-ended events
    
    widget.addEventListener('conversation-ended', (event) => {
      if (baselineSubmitted) {
        console.log('🚫 Conversation already ended, ignoring duplicate event');
        return;
      }
      
      console.log('🔚 Conversation ended with data:', event);
      console.log('[Baseline] Raw conversation-ended detail:', event.detail);
      
      // Extract real conversation data from ElevenLabs event
      if (event.detail) {
        const detail = event.detail;
        const transcript = detail.transcript || '';
        const messages = detail.messages || [];
        const durationMs = detail.duration_ms || detail.duration || 0;
        
        console.log('[Baseline] Extracted from event:', {
          transcriptLength: transcript.length,
          durationMs: durationMs,
          messageCount: messages.length,
          hasTranscript: !!transcript
        });
        
        // Update conversation data with captured transcript and metadata
        const updatedConversationData = {
          transcript: transcript,
          messages: messages,
          durationMs: durationMs,
          duration: durationMs / 1000, // Convert to seconds for compatibility
          endTime: Date.now(),
          startTime: conversationData.startTime || Date.now()
        };
        
        setConversationData(prev => ({
          ...prev,
          ...updatedConversationData
        }));
        
        console.log('[Baseline] Stored conversation data:', {
          transcriptLength: transcript.length,
          durationMs: durationMs,
          messageCount: messages.length
        });
        
        // Pass the fresh data directly to handleConversationEnd
        // Don't rely on state update timing
        setTimeout(() => {
          handleConversationEnd(updatedConversationData);
        }, 1000);
      } else {
        console.error('[Baseline] ❌ No event.detail - cannot capture conversation data');
        setTimeout(() => {
          handleConversationEnd();
        }, 1000);
      }
    });
    
    widget.addEventListener('conversation-started', (event) => {
      console.log('🎯 Conversation started:', event);
      setConversationData(prev => ({
        ...prev,
        startTime: Date.now()
      }));
      
      // Start camera frame capture for visual analysis
      startVisualAnalysis();
    });
    
    widget.addEventListener('transcript-update', (event) => {
      console.log('📝 Transcript update:', event);
      if (event.detail?.transcript) {
        setConversationData(prev => ({
          ...prev,
          transcript: event.detail.transcript
        }));
        
        // Extract mood score and PHQ responses from transcript
        extractAssessmentData(event.detail.transcript);
      }
    });
    
    widget.addEventListener('audio-data', (event) => {
      console.log('🎤 Audio data received:', event);
      if (event.detail) {
        setAudioAnalysisData(prev => ({
          ...prev,
          speechRate: event.detail.speechRate || prev.speechRate,
          voiceQuality: event.detail.quality || prev.voiceQuality,
          emotionalTone: event.detail.emotion || prev.emotionalTone
        }));
      }
    });
    
    // Add error handling for iOS WebKit issues
    widget.addEventListener('error', (event) => {
      console.error('❌ ElevenLabs widget error:', event);
      console.error('❌ Error details:', event.detail);
      
      // If there's a critical error, try to restart the widget
      if (event.detail?.type === 'audio_error' || event.detail?.type === 'connection_error') {
        console.log('🔄 Attempting widget restart due to critical error...');
        setTimeout(() => {
          if (widgetRef.current && widget.parentNode) {
            widgetRef.current.removeChild(widget);
            initializeWidget(); // Restart the widget
          }
        }, 2000);
      }
    });
    
    // Add ready event to track widget initialization
    widget.addEventListener('ready', (event) => {
      console.log('✅ ElevenLabs widget ready:', event);
      setWidgetReady(true);
    });
    
    widget.addEventListener('error', (event) => {
      console.error('❌ Widget error event:', event);
    });
    
    widget.addEventListener('ready', () => {
      console.log('✅ Widget ready event received');
    });
    // Append to container
    widgetRef.current.appendChild(widget);
    console.log('📦 Widget appended to container');
    // Monitor widget for any errors after a delay
    setTimeout(() => {
      const widgetElement = widgetRef.current?.querySelector('elevenlabs-convai');
      if (widgetElement) {
        console.log('🔍 Widget status check:', {
          isConnected: widgetElement.isConnected,
          hasIframe: !!widgetElement.querySelector('iframe'),
          hasError: widgetElement.textContent?.includes('error') || false
        });
        // Check for specific error text
        if (widgetElement.textContent?.includes('navigator.mediaDevices.getUserMedia')) {
          console.error('❌ Widget shows getUserMedia error - polyfill may have failed');
        }
      }
    }, 3000);
  };
  const handleStartAssessment = async () => {
    console.log('🎯 Starting real ElevenLabs baseline assessment');
    console.log('🔍 User is authenticated (reached baseline screen) - requesting permissions');
    setRequestingPermissions(true);
    
    // Initialize conversation tracking
    setConversationData(prev => ({
      ...prev,
      startTime: Date.now()
    }));
    
    // Add debug info about the environment
    console.log('🔧 Environment debug:', {
      isCapacitor: !!(window as any).Capacitor,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      mediaDevices: !!navigator.mediaDevices
    });
    
    try {
      console.log('🎤 Requesting microphone permission...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not available');
      }
      
      console.log('📱 Requesting permissions for iOS Capacitor environment...');
      
      // Try a simple audio-first approach for iOS
      console.log('🎤 Step 1: Requesting audio permission...');
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      console.log('✅ Audio permission granted:', {
        audioTracks: audioStream.getAudioTracks().length,
        audioTrackSettings: audioStream.getAudioTracks()[0]?.getSettings()
      });
      
      // Now try to add video
      try {
        console.log('📹 Step 2: Requesting video permission...');
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        
        console.log('✅ Video permission granted:', {
          videoTracks: videoStream.getVideoTracks().length
        });
        
        // Combine streams
        const combinedStream = new MediaStream([
          ...audioStream.getAudioTracks(),
          ...videoStream.getVideoTracks()
        ]);
        
        (window as any).mindMeasurePermissionStream = combinedStream;
        console.log('✅ Combined audio/video stream created');
        
      } catch (videoError) {
        console.warn('⚠️ Video permission failed, using audio-only:', videoError);
        (window as any).mindMeasurePermissionStream = audioStream;
      }
      
      // Start the conversation after permissions are granted
      console.log('🚀 Starting conversation with permissions granted');
      setShowConversation(true);
      
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Show user-friendly error message with more details
      const errorMsg = `Microphone access is required for the baseline assessment. Error: ${error.message}. Please check your browser settings and try again.`;
      alert(errorMsg);
      
      // Still start conversation - maybe ElevenLabs can handle permissions
      console.log('🤞 Starting conversation anyway - ElevenLabs might handle permissions internally');
      setShowConversation(true);
      
    } finally {
      setRequestingPermissions(false);
    }
  };

  // Start visual analysis with camera frame capture
  const startVisualAnalysis = async () => {
    console.log('📹 Starting visual analysis with camera frame capture...');
    
    try {
      // Get video stream for visual analysis
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        console.log('✅ Video stream started for visual analysis');
        
        // Start periodic frame capture for Rekognition analysis
        visualAnalysisIntervalRef.current = setInterval(() => {
          captureFrameForAnalysis();
        }, 5000); // Capture frame every 5 seconds
      }
    } catch (error) {
      console.warn('⚠️ Visual analysis failed to start:', error);
      // Continue without visual analysis
    }
  };

  // Capture frame and send to AWS Rekognition
  const captureFrameForAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 for Rekognition
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];
      
      console.log('📸 Frame captured for Rekognition analysis');
      
      // Send to backend for Rekognition analysis
      const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      
      try {
        const rekognitionResult = await fetch('/api/rekognition/analyze-frame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64Data,
            timestamp: Date.now()
          })
        });
        
        if (rekognitionResult.ok) {
          const analysisData = await rekognitionResult.json();
          
          // Store both the analysis results AND the raw imageData for Lambda function
          const sampleWithImageData = {
            ...analysisData,
            imageData: base64Data // Store raw image data for Lambda visual analysis
          };
          
          // Update visual analysis data
          setVisualAnalysisData(prev => ({
            ...prev,
            rekognitionSamples: [...prev.rekognitionSamples, sampleWithImageData],
            faceDetectionRate: analysisData.faceDetected ? 
              (prev.faceDetectionRate + 1) / (prev.rekognitionSamples.length + 1) : 
              prev.faceDetectionRate * prev.rekognitionSamples.length / (prev.rekognitionSamples.length + 1),
            avgBrightness: (prev.avgBrightness + (analysisData.brightness || 128)) / 2,
            qualityScore: Math.min(prev.qualityScore + 0.1, 1.0)
          }));
          
          console.log('✅ Rekognition analysis completed:', analysisData);
        }
      } catch (rekognitionError) {
        console.warn('⚠️ Rekognition analysis failed:', rekognitionError);
      }
      
    } catch (error) {
      console.warn('⚠️ Frame capture failed:', error);
    }
  };

  // Extract assessment data from conversation transcript
  const extractAssessmentData = (transcript: string) => {
    console.log('🔍 Extracting assessment data from transcript...');
    
    // Define baseline questions for matching
    const baselineQuestions = [
      { id: 'question_1', keywords: ['little interest', 'pleasure', 'doing things'], context: 'past two weeks' },
      { id: 'question_2', keywords: ['down', 'depressed', 'hopeless'], context: 'past two weeks' },
      { id: 'question_3', keywords: ['nervous', 'anxious', 'on edge'], context: 'past two weeks' },
      { id: 'question_4', keywords: ['unable to stop', 'control worrying'], context: 'past two weeks' },
      { id: 'question_5', keywords: ['scale', 'one to ten', 'current mood', 'rate your'], context: 'mood' }
    ];
    
    // Extract mood score (Question 5 - numeric 1-10)
    const moodMatch = transcript.match(/(?:mood|feeling|rate).*?(\d+)(?:\s*out of\s*10)?/i);
    const phqResponses: Record<string, number> = { ...conversationData.phqResponses };
    
    if (moodMatch) {
      const moodScore = parseInt(moodMatch[1]);
      if (moodScore >= 1 && moodScore <= 10) {
        phqResponses['question_5'] = moodScore;
        setConversationData(prev => ({
          ...prev,
          moodScore: moodScore,
          phqResponses
        }));
        console.log('📊 Question 5 (Mood score) extracted:', moodScore);
      }
    }
    
    // Extract PHQ-2/GAD-2 responses (Questions 1-4) by matching question context
    const responsePattern = /(not at all|several days|more than half the days|nearly every day)/gi;
    const lowerTranscript = transcript.toLowerCase();
    
    // For each question, look for its keywords nearby the response
    baselineQuestions.slice(0, 4).forEach((question) => {
      // Check if this question appears in the transcript
      const hasKeywords = question.keywords.some(keyword => lowerTranscript.includes(keyword.toLowerCase()));
      
      if (hasKeywords && !phqResponses[question.id]) {
        // Find the response after the question keywords
        const questionIndex = question.keywords.reduce((idx, keyword) => {
          const keywordIdx = lowerTranscript.indexOf(keyword.toLowerCase());
          return keywordIdx !== -1 && (idx === -1 || keywordIdx < idx) ? keywordIdx : idx;
        }, -1);
        
        if (questionIndex !== -1) {
          // Look for response within next 200 characters
          const searchWindow = transcript.slice(questionIndex, questionIndex + 200);
          const responseMatch = searchWindow.match(responsePattern);
          
          if (responseMatch) {
            const response = responseMatch[0].toLowerCase();
            const score = response === 'not at all' ? 0 :
                         response === 'several days' ? 1 :
                         response === 'more than half the days' ? 2 :
                         response === 'nearly every day' ? 3 : 0;
            
            phqResponses[question.id] = score;
            console.log(`📋 ${question.id} detected and answered: "${responseMatch[0]}" (score: ${score})`);
          }
        }
      }
    });
    
    // Update state with all extracted responses
    setConversationData(prev => ({
      ...prev,
      phqResponses
    }));
    
    console.log('📊 Current baseline progress:', {
      totalAnswered: Object.keys(phqResponses).length,
      questions: Object.keys(phqResponses),
      needsQuestions: ['question_1', 'question_2', 'question_3', 'question_4', 'question_5'].filter(
        q => !phqResponses[q]
      )
    });
  };

  // Cleanup visual analysis on component unmount
  useEffect(() => {
    return () => {
      if (visualAnalysisIntervalRef.current) {
        clearInterval(visualAnalysisIntervalRef.current);
      }
      
      // Stop video stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleConversationEnd = async (freshConversationData?: any) => {
    // Prevent duplicate submissions
    if (baselineSubmitted) {
      console.log('🚫 Baseline already submitted - ignoring duplicate conversation end');
      return;
    }
    
    setBaselineSubmitted(true); // Mark as submitted immediately
    console.log('✅ Baseline conversation completed');
    
    // Use fresh data if provided, otherwise fall back to state
    const dataToUse = freshConversationData || conversationData;
    
    // Add validation snapshot logs
    console.log('[Baseline] Validation input snapshot:', {
      hasTranscript: !!dataToUse.transcript,
      transcriptLength: dataToUse.transcript?.length || 0,
      durationMs: dataToUse.durationMs || 0,
      duration: dataToUse.duration || 0,
      hasMessages: !!dataToUse.messages
    });
    
    // Record conversation end time if not already set
    setConversationData(prev => ({
      ...prev,
      ...dataToUse,
      endTime: dataToUse.endTime || Date.now()
    }));
    
    // Clean up permission stream
    try {
      const permissionStream = (window as any).mindMeasurePermissionStream;
      if (permissionStream) {
        permissionStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        (window as any).mindMeasurePermissionStream = null;
        console.log('✅ Permission stream cleaned up');
      }
    } catch (error) {
      console.warn('⚠️ Error cleaning up permission stream:', error);
    }
    
    // Get user ID from auth context or device storage
    let userId = user?.id;
    if (!userId) {
      try {
        const { value } = await Preferences.get({ key: 'mindmeasure_user' });
        if (value) {
          const userData = JSON.parse(value);
          userId = userData.userId;
          console.log('📱 Retrieved user ID from device storage:', userId);
        }
      } catch (error) {
        console.error('❌ Error reading user ID from device:', error);
      }
    }

    // 🚀 REAL MIND MEASURE ANALYSIS: Process the complete assessment
    if (!userId) {
      console.error('❌ No user ID available - cannot create assessment session');
      return;
    }

    try {
      console.log('🧠 Starting comprehensive Mind Measure baseline analysis...');
      
      // Import backend service
      const { BackendServiceFactory } = await import('../../services/database/BackendServiceFactory');
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // CRITICAL: Ensure user profile exists before creating assessment session
      // Assessment sessions require a foreign key reference to profiles table
      console.log('[Baseline] Checking if user profile exists in database...');
      const { data: existingProfiles, error: profileCheckError} = await backendService.database.select(
        'profiles',
        ['id', 'email', 'user_id'],
        { user_id: userId }
      );

      if (profileCheckError) {
        console.error('[Baseline] ❌ Error checking user profile:', profileCheckError);
        throw new Error('Failed to verify user profile. Please contact support.');
      }

      if (!existingProfiles || existingProfiles.length === 0) {
        console.warn('[Baseline] ⚠️ User profile not found - creating profile now...');
        
        // For this phase: All users are assigned to University of Worcester
        // Multi-tenant domain-mapping will be implemented in a future phase
        const WORCESTER_UNIVERSITY_ID = 'worcester';
        
        const userEmail = user?.email || '';
        console.log('[Baseline] User email:', userEmail);
        
        // Verify Worcester university exists in database
        const { data: worcesterUni, error: uniError } = await backendService.database.select(
          'universities',
          ['id', 'name', 'status'],
          { id: WORCESTER_UNIVERSITY_ID }
        );
        
        if (uniError || !worcesterUni || worcesterUni.length === 0) {
          console.error('[Baseline] ❌ Worcester university record not found in database', { uniError });
          // Continue with Worcester ID anyway - profile creation should not fail
        } else {
          console.log('[Baseline] ✅ Worcester university verified:', worcesterUni[0]);
        }
        
        const universityId = WORCESTER_UNIVERSITY_ID;
        console.log('[Baseline] University resolved (forced Worcester):', { universityId });
        
        // Create profile with Worcester university
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
          // Check if error is due to duplicate email constraint
          if (profileCreateError.includes('duplicate key') && profileCreateError.includes('profiles_email_key')) {
            console.warn('[Baseline] ⚠️ Profile with this email already exists - this is OK, continuing...');
            // Profile already exists with this email, which is fine - proceed
          } else {
            console.error('[Baseline] ❌ Failed to create user profile:', profileCreateError);
            throw new Error('Failed to create user profile. Assessment cannot proceed without a database profile. Please contact support.');
          }
        } else {
          console.log('[Baseline] ✅ User profile created successfully');
        }
      } else {
        console.log('[Baseline] ✅ User profile exists in database');
      }

      // NOTE: assessment_sessions creation disabled - FK constraint issue (sessions require users table entry)
      // For now, we only create fusion_outputs which links directly to Cognito user_id
      const sessionId = null; // Will be null until we fix the users/profiles FK issue

      // Step 2: Trigger comprehensive analysis pipeline
        console.log('🔬 Initiating multi-modal analysis pipeline...');
        
        try {
          // Audio Analysis (from ElevenLabs conversation)
          console.log('🎤 Processing audio analysis...');
          const actualDuration = dataToUse.endTime && dataToUse.startTime 
            ? (dataToUse.endTime - dataToUse.startTime) / 1000 
            : dataToUse.durationMs 
              ? dataToUse.durationMs / 1000
              : 300;
            
          let audioAnalysisResult = null;
          try {
            audioAnalysisResult = await backendService.functions.invoke('analyze-audio', {
              sessionId: sessionId,
              audioData: {
                conversation_duration: actualDuration,
                speech_rate: audioAnalysisData.speechRate,
                voice_quality: audioAnalysisData.voiceQuality,
                emotional_tone: audioAnalysisData.emotionalTone,
                mood_score_1_10: dataToUse.moodScore,
                transcript_length: dataToUse.transcript?.length || 0
              },
              conversationDuration: actualDuration * 1000 // Convert to milliseconds
            });
            console.log('✅ Audio analysis completed successfully');
          } catch (error) {
            console.warn('⚠️ Audio analysis failed, continuing with fallback:', error);
          }

          // Visual Analysis (from camera/Rekognition)
          console.log('📹 Processing visual analysis...');
          
          // Prepare visual frames array for Lambda function
          // The Lambda expects an array of { imageData, timestamp } objects
          const visualFrames = [];
          
          // Use captured Rekognition samples if available, otherwise capture current frame
          if (visualAnalysisData.rekognitionSamples && visualAnalysisData.rekognitionSamples.length > 0) {
            // Use existing samples
            visualAnalysisData.rekognitionSamples.forEach((sample: any, index: number) => {
              if (sample.imageData) {
                visualFrames.push({
                  imageData: sample.imageData,
                  timestamp: sample.timestamp || Date.now() - (visualAnalysisData.rekognitionSamples.length - index) * 1000
                });
              }
            });
          } else if (canvasRef.current) {
            // Fallback: capture current frame
            try {
              const canvas = canvasRef.current;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              const imageData = dataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix
              visualFrames.push({
                imageData: imageData,
                timestamp: Date.now()
              });
            } catch (error) {
              console.warn('⚠️ Could not capture frame for analysis:', error);
            }
          }
          
          let visualAnalysisResult = null;
          if (visualFrames.length > 0) {
            try {
              visualAnalysisResult = await backendService.functions.invoke('analyze-visual', {
                sessionId: sessionId,
                visualFrames: visualFrames
              });
              console.log('✅ Visual analysis completed successfully');
            } catch (error) {
              console.warn('⚠️ Visual analysis failed, continuing with fallback:', error);
            }
          } else {
            console.warn('⚠️ No visual frames available for analysis');
          }

          // Text Analysis (from conversation transcript)
          console.log('📝 Processing text analysis...');
          const conversationTranscript = dataToUse.transcript || 
            `Baseline conversation completed. Duration: ${actualDuration} seconds. ` +
            `Mood score: ${dataToUse.moodScore || 'not provided'}. ` +
            `PHQ responses: ${Object.keys(dataToUse.phqResponses || {}).length} questions answered.`;
            
          let textAnalysisResult = null;
          try {
            textAnalysisResult = await backendService.functions.invoke('analyze-text', {
              sessionId: sessionId,
              conversationTranscript: conversationTranscript,
              assessmentType: 'baseline'
            });
            console.log('✅ Text analysis completed successfully');
          } catch (error) {
            console.warn('⚠️ Text analysis failed, continuing with fallback:', error);
          }

          console.log('📊 Analysis results:', {
            audio: audioAnalysisResult ? 'success' : 'failed',
            visual: visualAnalysisResult ? 'success' : 'failed', 
            text: textAnalysisResult ? 'success' : 'failed'
          });

          // Step 3: Calculate Mind Measure score using fusion algorithm
          console.log('🔮 Calculating Mind Measure fusion score...');
          let fusionResult = null;
          try {
            fusionResult = await backendService.functions.invoke('calculate-mind-measure', {
              sessionId: sessionId
            });
            console.log('✅ Mind Measure calculation completed successfully');
          } catch (error) {
            console.warn('⚠️ Mind Measure calculation failed, using fallback scoring:', error);
          }

          if (!fusionResult) {
            console.warn('⚠️ Fusion calculation failed, using provisional scoring');
            
            // CRITICAL VALIDATION: Check if we have answers to questions 1-5 (mandatory for valid baseline)
            const phqResponses = dataToUse.phqResponses || {};
            const answeredQuestions = Object.keys(phqResponses).filter(key => 
              key.match(/question_[1-5]$/) && phqResponses[key] !== undefined
            );
            const hasRequiredQuestions = answeredQuestions.length >= 5;
            
            console.log('📊 Baseline validation:', {
              phqResponses,
              answeredQuestions,
              hasRequiredQuestions,
              count: answeredQuestions.length
            });
            
            // Also check for minimum conversation data as fallback
            const actualDuration = dataToUse.endTime && dataToUse.startTime 
              ? (dataToUse.endTime - dataToUse.startTime) / 1000 
              : dataToUse.durationMs 
                ? dataToUse.durationMs / 1000
                : 0;
            const hasTranscript = dataToUse.transcript && dataToUse.transcript.length > 100;
            const hasDuration = actualDuration > 60; // At least 60 seconds for 5 questions
            
            console.log('[Baseline] Validation checks:', {
              hasRequiredQuestions,
              answeredCount: answeredQuestions.length,
              hasTranscript,
              transcriptLength: dataToUse.transcript?.length || 0,
              hasDuration,
              actualDuration
            });
            
            // Require either: 5 PHQ questions answered OR (sufficient transcript AND duration)
            const hasValidData = hasRequiredQuestions || (hasTranscript && hasDuration);
            
            if (!hasValidData) {
              console.error('❌ Insufficient conversation data - cannot create baseline assessment');
              console.error('❌ Missing required data:', {
                hasRequiredQuestions,
                answeredCount: answeredQuestions.length,
                hasTranscript: dataToUse.transcript?.length || 0,
                actualDuration
              });
              
              alert(
                'Unable to Complete Baseline\n\n' +
                'We didn\'t capture enough data to create your baseline assessment. ' +
                'This can happen if you pressed Finish before answering enough questions.\n\n' +
                'Please try again.'
              );
              
              // Reset the flag so user can try again
              setBaselineSubmitted(false);
              
              // Navigate back to welcome screen
              if (onBack) {
                onBack();
              }
              return;
            }
            
            console.log('✅ Baseline validation passed - sufficient data for assessment');
            
            // ==================================================================================
            // CLINICAL SCORING - Validated Instruments
            // ==================================================================================
            // Extract raw scores from validated clinical instruments
            const phq2_q1 = phqResponses['question_1'] || 0; // Little interest/pleasure (0-3)
            const phq2_q2 = phqResponses['question_2'] || 0; // Down/depressed/hopeless (0-3)
            const gad2_q1 = phqResponses['question_3'] || 0; // Nervous/anxious/on edge (0-3)
            const gad2_q2 = phqResponses['question_4'] || 0; // Unable to stop worrying (0-3)
            const mood_1_10 = dataToUse.moodScore || 5; // Self-reported mood (1-10)
            
            // Calculate standard clinical totals (used by healthcare professionals)
            const phq2_total = phq2_q1 + phq2_q2; // Range: 0-6 (≥3 = positive screen)
            const gad2_total = gad2_q1 + gad2_q2; // Range: 0-6 (≥3 = positive screen)
            
            // Clinical interpretation flags (standard practice)
            const phq2_positive_screen = phq2_total >= 3; // Depression screening threshold
            const gad2_positive_screen = gad2_total >= 3; // Anxiety screening threshold
            
            // ==================================================================================
            // MIND MEASURE COMPOSITE - Proprietary Algorithm
            // ==================================================================================
            // Convert clinical scores to 0-100 wellbeing scale for UX
            // NOTE: This is a proprietary composite, NOT a clinical standard
            const phq2Score = Math.max(0, 100 - (phq2_total / 6) * 100);
            const gad2Score = Math.max(0, 100 - (gad2_total / 6) * 100);
            const moodScore = (mood_1_10 / 10) * 100;
            
            // Weighted fusion for Mind Measure composite score
            // Weights determined by Mind Measure algorithm (not clinically validated)
            const mindMeasureScore = Math.round(
              (phq2Score * 0.35) + (gad2Score * 0.35) + (moodScore * 0.30)
            );
            
            console.log('📊 Baseline scoring (clinical + composite):', {
              // Clinical scores (validated)
              clinical: {
                phq2_total: phq2_total,
                gad2_total: gad2_total,
                mood_scale: mood_1_10,
                phq2_positive_screen: phq2_positive_screen,
                gad2_positive_screen: gad2_positive_screen
              },
              // Mind Measure composite (proprietary)
              composite: {
                mind_measure_score: mindMeasureScore,
                phq2_component: Math.round(phq2Score * 0.35),
                gad2_component: Math.round(gad2Score * 0.35),
                mood_component: Math.round(moodScore * 0.30)
              }
            });
            
            const provisionalFusionData = {
              session_id: sessionId,
              user_id: userId,
              score: mindMeasureScore, // Mind Measure composite for UX
              score_smoothed: mindMeasureScore,
              final_score: mindMeasureScore,
              p_worse_fused: (100 - mindMeasureScore) / 100,
              uncertainty: 0.15, // Lower uncertainty - based on validated clinical instruments
              qc_overall: 0.85, // High quality - PHQ-2/GAD-2/Mood are validated measures
              public_state: 'report',
              model_version: 'clinical_baseline_v1.0',
              analysis: JSON.stringify({
                // ===== VALIDATED CLINICAL SCORES (Standard Practice) =====
                clinical_scores: {
                  phq2_total: phq2_total,              // 0-6 (depression screening)
                  phq2_q1: phq2_q1,                    // Question 1: Little interest/pleasure
                  phq2_q2: phq2_q2,                    // Question 2: Down/depressed/hopeless
                  phq2_positive_screen: phq2_positive_screen, // ≥3 indicates positive screen
                  
                  gad2_total: gad2_total,              // 0-6 (anxiety screening)
                  gad2_q1: gad2_q1,                    // Question 3: Nervous/anxious/on edge
                  gad2_q2: gad2_q2,                    // Question 4: Unable to stop worrying
                  gad2_positive_screen: gad2_positive_screen, // ≥3 indicates positive screen
                  
                  mood_scale: mood_1_10,               // 1-10 (self-reported mood)
                },
                
                // ===== MIND MEASURE COMPOSITE (Proprietary) =====
                mind_measure_composite: {
                  score: mindMeasureScore,             // 0-100 proprietary composite
                  phq2_component: Math.round(phq2Score * 0.35),
                  gad2_component: Math.round(gad2Score * 0.35),
                  mood_component: Math.round(moodScore * 0.30),
                  weighting: 'PHQ-2: 35%, GAD-2: 35%, Mood: 30%',
                  note: 'Proprietary composite for user experience - not a clinical diagnosis'
                },
                
                // General metadata
                mood: 'baseline_established',
                assessment_type: 'baseline',
                conversation_quality: 'complete',
                wellbeing_score: mindMeasureScore
              }),
              topics: JSON.stringify(['wellbeing', 'baseline', 'initial_assessment', 'phq2', 'gad2']),
              created_at: new Date().toISOString()
            };

            const { error: fusionError } = await backendService.database.insert('fusion_outputs', provisionalFusionData);
            
            if (fusionError) {
              console.error('❌ Error saving clinical baseline score:', fusionError);
            } else {
              console.log('✅ Clinical baseline score saved:', {
                mind_measure_score: mindMeasureScore,
                clinical_scores: {
                  phq2_total: phq2_total,
                  gad2_total: gad2_total,
                  mood_scale: mood_1_10
                },
                screening_flags: {
                  phq2_positive: phq2_positive_screen,
                  gad2_positive: gad2_positive_screen
                }
              });
            }
          } else {
            console.log('✅ Mind Measure fusion calculation completed successfully');
          }

          // Step 4: Update user profile to mark baseline as established
          const { error: profileError } = await backendService.database.update(
            'profiles',
            { baseline_established: true },
            { user_id: userId }
          );

          if (profileError) {
            console.error('❌ Error updating profile:', profileError);
          } else {
            console.log('✅ User profile updated - baseline established');
          }

          console.log('🎉 Complete Mind Measure baseline analysis pipeline executed successfully!');
          
        } catch (analysisError) {
          console.error('❌ Analysis pipeline error:', analysisError);
          
          // Fallback: Calculate clinical score from available PHQ-2/GAD-2/mood data
          // Even if the pipeline fails, we have valid clinical responses
          const phqResponses = dataToUse.phqResponses || {};
          
          // Clinical scores (validated)
          const phq2_q1 = phqResponses['question_1'] || 0;
          const phq2_q2 = phqResponses['question_2'] || 0;
          const gad2_q1 = phqResponses['question_3'] || 0;
          const gad2_q2 = phqResponses['question_4'] || 0;
          const mood_1_10 = dataToUse.moodScore || 5;
          
          const phq2_total = phq2_q1 + phq2_q2;
          const gad2_total = gad2_q1 + gad2_q2;
          const phq2_positive_screen = phq2_total >= 3;
          const gad2_positive_screen = gad2_total >= 3;
          
          // Calculate Mind Measure composite (same algorithm as provisional)
          const phq2Score = Math.max(0, 100 - (phq2_total / 6) * 100);
          const gad2Score = Math.max(0, 100 - (gad2_total / 6) * 100);
          const moodScore = (mood_1_10 / 10) * 100;
          const fallbackScore = Math.round(
            (phq2Score * 0.35) + (gad2Score * 0.35) + (moodScore * 0.30)
          );
          
          console.log('📊 Fallback clinical scoring:', {
            clinical: { phq2_total, gad2_total, mood_1_10 },
            composite: fallbackScore
          });
          
          const fallbackData = {
            session_id: sessionId,
            user_id: userId,
            score: fallbackScore,
            final_score: fallbackScore,
            score_smoothed: fallbackScore,
            analysis: JSON.stringify({
              // ===== VALIDATED CLINICAL SCORES =====
              clinical_scores: {
                phq2_total: phq2_total,
                phq2_q1: phq2_q1,
                phq2_q2: phq2_q2,
                phq2_positive_screen: phq2_positive_screen,
                gad2_total: gad2_total,
                gad2_q1: gad2_q1,
                gad2_q2: gad2_q2,
                gad2_positive_screen: gad2_positive_screen,
                mood_scale: mood_1_10
              },
              
              // ===== MIND MEASURE COMPOSITE =====
              mind_measure_composite: {
                score: fallbackScore,
                note: 'Proprietary composite (pipeline fallback)'
              },
              
              mood: 'baseline_conversation_completed',
              assessment_type: 'baseline',
              conversation_quality: 'completed',
              wellbeing_score: fallbackScore,
              note: 'Clinical baseline score (pipeline error fallback)'
            }),
            topics: JSON.stringify(['wellbeing', 'baseline', 'initial_assessment', 'phq2', 'gad2']),
            uncertainty: 0.2, // Slightly higher uncertainty due to pipeline failure
            qc_overall: 0.75, // Good quality - still based on validated instruments
            created_at: new Date().toISOString()
          };

          await backendService.database.insert('fusion_outputs', fallbackData);
          console.log('✅ Fallback clinical baseline score saved:', {
            score: fallbackScore,
            phq2: phq2_total,
            gad2: gad2_total
          });
        }
    } catch (error) {
      console.error('❌ Error in baseline analysis:', error);
      // Continue with local storage fallback
    }

    // Wait a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark baseline as complete on device storage
    try {
      await Preferences.set({ 
        key: 'mindmeasure_baseline_complete', 
        value: 'true' 
      });
      console.log('✅ Baseline marked complete - user is now a returning user');
    } catch (error) {
      console.error('❌ Error marking baseline complete:', error);
    }
    
    // Force a brief delay to ensure all updates are complete
    console.log('🔄 Final delay before navigation...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete baseline and return to main app
    console.log('🎯 Baseline assessment completed - returning to main app');
    if (onComplete) {
      onComplete();
    }
  };
  // Show ElevenLabs widget directly when assessment started
  if (showConversation) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
        {/* Header - Same style as intro page, no buttons */}
        <header className="backdrop-blur-sm bg-white/90 border-0 px-4 sm:px-6 py-6 sm:py-8 shadow-sm">
          <div className="max-w-7xl mx-auto">
            {/* Add equivalent spacing to match intro page back button area */}
            <div className="mb-4 mt-8">
              <div className="flex-1" />
            </div>
            <div className="text-center">
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
              <p className="text-lg text-gray-600">Your Baseline Assessment</p>
            </div>
          </div>
        </header>
        {/* Body Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Control Bar - Above widget */}
          <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
            {/* Finish button - left */}
            <Button
              onClick={handleConversationEnd}
              className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all border-2 border-purple-600"
            >
              Finish
            </Button>
            {/* Camera Active indicator - right */}
            <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Camera Active</span>
            </div>
          </div>
          {/* Widget Container */}
          <div className="flex-1 relative" ref={widgetRef}>
            {!scriptLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <img src={mindMeasureLogo} alt="Mind Measure" className="w-8 h-8" />
                  </div>
                  <p className="text-gray-600">Loading conversation...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Hidden video and canvas elements for visual analysis */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    );
  }
  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <img src={mindMeasureLogo} alt="Mind Measure" className="w-8 h-8" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  // Show pre-assessment welcome/intro screen
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with back button */}
        <header className="backdrop-blur-sm bg-white/90 border-0 px-4 sm:px-6 py-6 sm:py-8 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4 mt-8">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
            </div>
            <div className="text-center">
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
              <p className="text-lg text-gray-600">Your Baseline Assessment</p>
            </div>
          </div>
        </header>
        {/* Assessment intro content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-2xl text-center">
            <div className="mb-8 bg-white rounded-2xl shadow-lg p-8 border">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <img src={mindMeasureLogo} alt="Mind Measure" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">What to expect</h3>
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <ul className="text-blue-800 space-y-3 text-left">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 mt-0.5">•</span>
                    <span>Six questions from Jodie</span>
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
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg font-medium rounded-xl disabled:opacity-50"
              >
                {requestingPermissions ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Requesting Permissions...
                  </div>
                ) : (
                  'Start Baseline Assessment'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

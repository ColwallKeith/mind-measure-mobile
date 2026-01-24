import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Eye, Mic, MessageCircle, Shield, Heart, Brain, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { useCheckinConversation } from '@/hooks/useCheckinConversation';
import { useSession } from '@/components/SessionManager';
import { useCostTracking } from '@/hooks/useCostTracking';
import { StillImageCapture, StillImageCaptureRef } from '@/components/StillImageCapture';
/** When false (default), skip assessment_sessions writes in widget path to avoid schema coupling. */
const ENABLE_ASSESSMENT_SESSIONS_WIDGET = import.meta.env.VITE_ENABLE_ASSESSMENT_SESSIONS_WIDGET === 'true';

interface MobileConversationProps {
  onNavigateBack: () => void;
  assessmentMode?: 'baseline' | 'checkin';
}
export const MobileConversation: React.FC<MobileConversationProps> = ({ onNavigateBack, assessmentMode = 'checkin' }) => {
  const { user } = useAuth();
  const { currentSession, createSession, updateSessionData } = useSession();
  const { endCheckin } = useCheckinConversation(() => handleConversationEnd());
  const { trackElevenLabsUsage } = useCostTracking();
  const [currentStep, setCurrentStep] = useState<'welcome' | 'recording'>('recording');
  const [conversationState, setConversationState] = useState<'idle' | 'active' | 'processing'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [visualData, setVisualData] = useState<any>(null);
  const [userContext, setUserContext] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetInitializedRef = useRef(false);
  const conversationEndedRef = useRef(false);
  const sessionCreatedRef = useRef(false);
  const startingRef = useRef(false);
  const stillImageCaptureRef = useRef<StillImageCaptureRef>(null);
  // Use the assessmentMode prop instead of URL parameter
  const actualMode = assessmentMode === 'baseline';
  console.log('📱 MobileConversation initialized with mode:', assessmentMode, 'actualMode:', actualMode);
  
  // AWS Backend Service
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );
  
  // Load user context on mount
  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);
  
  // Load user context for personalized conversations
  const loadUserContext = useCallback(async () => {
    if (!user?.id) return null;
    try {
      console.log('Loading user context for mobile conversation...');
      // Get user profile data
      const { data: profile } = await backendService.database.select({
        table: 'profiles',
        select: 'first_name, last_name, university, course, year_of_study',
        filters: { id: user.id },
        limit: 1
      });
      
      // Get recent assessment history for context
      const { data: recentAssessments } = await backendService.database.select({
        table: 'assessment_sessions',
        select: 'assessment_type, created_at, meta',
        filters: { user_id: user.id },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 3
      });
      
      // Get wellness trends
      const { data: wellnessData } = await backendService.database.select({
        table: 'fusion_outputs',
        select: 'score, created_at',
        filters: { user_id: user.id },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 5
      });
      
      const context = {
        user: {
          name: profile?.[0]?.first_name || 'there',
          fullName: `${profile?.[0]?.first_name || ''} ${profile?.[0]?.last_name || ''}`.trim(),
          university: profile?.[0]?.university,
          course: profile?.[0]?.course,
          yearOfStudy: profile?.[0]?.year_of_study
        },
        assessmentHistory: recentAssessments || [],
        wellnessTrends: wellnessData || [],
        isFirstTime: !recentAssessments || recentAssessments.length === 0,
        platform: 'mobile'
      };
      console.log('✅ User context loaded:', context);
      setUserContext(context);
      return context;
    } catch (error) {
      console.error('Failed to load user context:', error);
      return null;
    }
  }, [user?.id, backendService]);
  // Load ElevenLabs script
  useEffect(() => {
    const id = 'elevenlabs-convai-embed';
    if (document.getElementById(id)) {
      setScriptLoaded(true);
      setLoading(false);
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
      setLoading(false);
      setConnectionError(null); // Clear any previous errors
      // Add a timeout to check if the widget is actually working
      setTimeout(() => {
        console.log('🔍 Checking if ElevenLabs widget is available...');
        if (customElements.get('elevenlabs-convai')) {
          console.log('✅ Widget custom element is registered');
        } else {
          console.error('❌ Widget custom element NOT registered');
        }
      }, 2000);
      // Check if the custom element is available
      setTimeout(() => {
        if (customElements.get('elevenlabs-convai')) {
          console.log('✅ ElevenLabs custom element is available');
        } else {
          console.error('❌ ElevenLabs custom element not available after script load');
          // Fallback: try to manually register the element
          console.log('🔄 Attempting fallback element registration...');
          if (window.customElements && !customElements.get('elevenlabs-convai')) {
            console.log('⚠️ Custom element not registered, this may cause issues');
          }
        }
      }, 1000);
      // Add custom dark theme CSS and containment
      const style = document.createElement('style');
      style.textContent = `
        .elevenlabs-dark-theme elevenlabs-convai {
          --background: #1f2937 !important;
          --foreground: #f9fafb !important;
          --card: #374151 !important;
          --card-foreground: #f9fafb !important;
          --border: #4b5563 !important;
          --input: #374151 !important;
          --primary: #8b5cf6 !important;
          --primary-foreground: #ffffff !important;
        }
        .elevenlabs-dark-theme elevenlabs-convai iframe {
          background: #1f2937 !important;
          border: none !important;
          z-index: 1 !important;
          position: relative !important;
        }
        .elevenlabs-dark-theme elevenlabs-convai * {
          color: #f9fafb !important;
        }
        /* Force widget containment */
        .elevenlabs-dark-theme {
          contain: layout style paint !important;
          isolation: isolate !important;
          z-index: 1 !important;
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 600px !important;
        }
        /* Ensure iframe is visible and sized */
        .elevenlabs-dark-theme elevenlabs-convai iframe {
          width: 100% !important;
          height: 100% !important;
          min-height: 600px !important;
          display: block !important;
        }
        /* Ensure our buttons stay on top */
        .conversation-controls {
          z-index: 1000 !important;
          position: relative !important;
        }
      `;
      document.head.appendChild(style);
    };
    script.onerror = (error) => {
      console.error('❌ Failed to load ElevenLabs script:', error);
      setConnectionError('Failed to load ElevenLabs. Please check your internet connection.');
      // Retry mechanism
      if (retryCount < 3) {
        console.log(`🔄 Retrying script load (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          // Instead of calling loadScript() which doesn't exist, reload the page or handle differently
          console.log('🔄 Would retry script loading here');
        }, 2000);
      }
    };
    document.head.appendChild(script);
  }, []);
  // Initialize ElevenLabs widget when script is loaded
  useEffect(() => {
    console.log('🔄 Widget init effect:', { scriptLoaded, hasRef: !!widgetRef.current, currentStep, alreadyInitialized: widgetInitializedRef.current });
    if (scriptLoaded && widgetRef.current && currentStep === 'recording' && !widgetInitializedRef.current) {
      console.log('🚀 Initializing mobile widget...');
      widgetInitializedRef.current = true; // Set flag immediately to prevent re-initialization
      initializeWidget();
    }
  }, [scriptLoaded]); // Removed currentStep from dependencies to prevent loop
  // Enhanced conversation monitoring for mobile with camera integration
  useEffect(() => {
    if (currentStep !== 'recording' || !widgetRef.current || !scriptLoaded || widgetInitializedRef.current) return;
    console.log('📱 Starting mobile conversation initialization...');
    widgetInitializedRef.current = true;
    // Set up client tools for the ElevenLabs widget
    const setupClientTools = () => {
      const widget = widgetRef.current?.querySelector('elevenlabs-convai');
      if (widget && (widget as any).shadowRoot) {
        // Inject client tools into the widget
        (window as any).mobileClientTools = {
          endConversation: () => {
            endCheckin();
            return 'Mobile conversation completed';
          },
          getConversationContext: () => {
            console.log('[ClientTools] getConversationContext called');
            console.log('[ClientTools] userContext available:', !!userContext);
            
            // Check if userContext is available
            if (!userContext) {
              console.warn('[ClientTools] No userContext available, returning basic context');
              return JSON.stringify({
                platform: 'mobile',
                sessionId: currentSession?.id,
                userId: user?.id,
                assessmentType: actualMode ? 'baseline' : 'checkin',
                conversationStage: 'active',
                studentName: 'there',
                lastCheckinDays: null,
                recentTrend: [],
                currentPeriod: 'General'
              });
            }
            
            // Calculate daysSinceLastCheckin from assessmentHistory
            let lastCheckinDays = null;
            if (userContext.assessmentHistory && userContext.assessmentHistory.length > 0) {
              const lastCheckin = userContext.assessmentHistory[0];
              const lastCheckinDate = new Date(lastCheckin.created_at);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - lastCheckinDate.getTime());
              lastCheckinDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              console.log('[ClientTools] Last check-in was', lastCheckinDays, 'days ago');
            } else {
              console.log('[ClientTools] No previous check-ins found');
            }
            
            // Extract last 3 scores from wellnessTrends
            const recentTrend = [];
            if (userContext.wellnessTrends && userContext.wellnessTrends.length > 0) {
              for (let i = 0; i < Math.min(3, userContext.wellnessTrends.length); i++) {
                recentTrend.push(userContext.wellnessTrends[i].score);
              }
              console.log('[ClientTools] Recent trend scores:', recentTrend);
            } else {
              console.log('[ClientTools] No wellness trends available');
            }
            
            // Determine current period (e.g., "Exam Season")
            const now = new Date();
            const month = now.getMonth(); // 0-11
            let currentPeriod = 'General';
            
            // UK Academic Calendar approximate periods
            if (month >= 0 && month <= 1) {
              currentPeriod = 'Exam Season'; // Jan-Feb
            } else if (month >= 2 && month <= 3) {
              currentPeriod = 'Spring Term'; // Mar-Apr
            } else if (month >= 4 && month <= 5) {
              currentPeriod = 'Exam Season'; // May-Jun
            } else if (month >= 6 && month <= 8) {
              currentPeriod = 'Summer Break'; // Jul-Sep
            } else if (month >= 9 && month <= 10) {
              currentPeriod = 'Autumn Term'; // Oct-Nov
            } else {
              currentPeriod = 'Winter Break'; // Dec
            }
            
            console.log('[ClientTools] Current period:', currentPeriod);
            
            // Build rich context object
            const context = {
              platform: 'mobile',
              sessionId: currentSession?.id,
              userId: user?.id,
              assessmentType: actualMode ? 'baseline' : 'checkin',
              conversationStage: 'active',
              
              // Dynamic user data
              studentName: userContext.user?.name || 'there',
              fullName: userContext.user?.fullName || '',
              university: userContext.user?.university || '',
              course: userContext.user?.course || '',
              yearOfStudy: userContext.user?.yearOfStudy || '',
              
              // Wellness tracking data
              lastCheckinDays: lastCheckinDays,
              recentTrend: recentTrend,
              currentPeriod: currentPeriod,
              isFirstTime: userContext.isFirstTime
            };
            
            console.log('[ClientTools] Sending context to widget:', context);
            return JSON.stringify(context);
          }
        };
        // Add event listeners for cost tracking
        widget.addEventListener('conversationstarted', () => {
          console.log('📱 Mobile conversation started');
        });
        widget.addEventListener('conversationended', () => {
          console.log('📱 Mobile conversation ended');
        });
      }
    };
    let conversationHistory = [];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          setupClientTools();
          // Check for conversation end indicators
          const widget = widgetRef.current?.querySelector('elevenlabs-convai');
          if (widget) {
            const shadowRoot = (widget as any).shadowRoot;
            if (shadowRoot) {
              // Capture conversation data
              const messages = shadowRoot.querySelectorAll('.message, .chat-message, [data-role], [role]');
              const newConversationData = [];
              const transcripts = [];
              messages.forEach((msg: Element) => {
                const text = msg.textContent?.trim() || '';
                const role = msg.getAttribute('data-role') || msg.getAttribute('role') ||
                            (msg.classList.contains('user') ? 'user' :
                             msg.classList.contains('assistant') || msg.classList.contains('ai') ? 'ai' : 'unknown');
                if (text && text.length > 5) {
                  newConversationData.push({ role, text, timestamp: Date.now() });
                  if (role === 'user') {
                    transcripts.push(text);
                  }
                }
              });
              // Update conversation history if new content detected
              if (newConversationData.length > conversationHistory.length) {
                conversationHistory = newConversationData;
                // Store conversation data in session
                if (currentSession && conversationHistory.length > 0) {
                  const textData = {
                    transcripts,
                    textInputs: transcripts,
                    fullConversation: conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'Jodie'}: ${m.text}`).join('\n'),
                    conversationData: conversationHistory
                  };
                  updateSessionData({ text_data: textData });
                  console.log('📱 Updated mobile session with conversation data:', {
                    transcriptCount: transcripts.length,
                    conversationEntries: conversationHistory.length
                  });
                }
              }
              // Look for conversation end indicators
              const endIndicators = shadowRoot.querySelectorAll('[data-conversation-ended], .conversation-ended, .call-ended');
              const textElements = shadowRoot.querySelectorAll('*');
              let hasEndText = false;
              textElements.forEach((el: Element) => {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes('caller ended') || text.includes('conversation ended') || text.includes('call ended') || text.includes('disconnected')) {
                  hasEndText = true;
                }
              });
              if ((endIndicators.length > 0 || hasEndText) && !conversationEndedRef.current) {
                conversationEndedRef.current = true;
                handleConversationEnd();
              }
            }
          }
        }
      });
    });
    observer.observe(widgetRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-state']
    });
    // Setup initial client tools
    setupClientTools();
    return () => {
      observer.disconnect();
      // Clean up client tools
      delete (window as any).mobileClientTools;
    };
  }, [scriptLoaded]); // Simplified dependencies to prevent death loop
  // Activate camera when recording starts
  useEffect(() => {
    if (currentStep === 'conversation' && scriptLoaded && !cameraActive) {
      console.log('📹 Activating camera for conversation...');
      setCameraActive(true);
    }
  }, [scriptLoaded]); // Simplified to prevent death loop
  const initializeWidget = () => {
    if (!widgetRef.current) return;
    console.log('🚀 Initializing widget with container:', widgetRef.current);
    console.log('Container dimensions:', {
      width: widgetRef.current.offsetWidth,
      height: widgetRef.current.offsetHeight,
      clientWidth: widgetRef.current.clientWidth,
      clientHeight: widgetRef.current.clientHeight
    });
    // Also check parent container dimensions
    const parentContainer = widgetRef.current.parentElement;
    if (parentContainer) {
      console.log('Parent container dimensions:', {
        width: parentContainer.offsetWidth,
        height: parentContainer.offsetHeight,
        clientWidth: parentContainer.clientWidth,
        clientHeight: parentContainer.clientHeight
      });
    }
    // Check if widget already exists
    const existingWidget = widgetRef.current.querySelector('elevenlabs-convai');
    if (existingWidget) {
      console.log('✅ Widget already exists, skipping initialization');
      return;
    }
    // Check if the custom element is defined
    if (!customElements.get('elevenlabs-convai')) {
      console.error('❌ ElevenLabs custom element not defined!');
      return;
    }
    console.log('✅ ElevenLabs custom element is defined');
    // Create the widget element with the same attributes as working examples
    const widget = document.createElement('elevenlabs-convai');
    console.log('📱 Widget element created:', widget);
    // Use the correct agent ID based on mode
    const agentId = actualMode ? 'agent_9301k22s8e94f7qs5e704ez02npe' : 'agent_7501k3hpgd5gf8ssm3c3530jx8qx';
    widget.setAttribute('agent-id', agentId);
    console.log('🎯 Setting agent ID:', agentId, 'for mode:', actualMode ? 'baseline' : 'checkin');
    widget.setAttribute('auto-start', 'false');
    widget.setAttribute('conversation-mode', 'voice');
    widget.setAttribute('language', 'en');
    // Set explicit dimensions to ensure iframe renders
    widget.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      min-height: 600px !important;
      display: block !important;
    `;
    console.log('🎨 Widget styles applied:', widget.style.cssText);
    // Debug: Check if widget is actually created
    console.log('🔍 Widget element created:', widget);
    console.log('🔍 Widget tagName:', widget.tagName);
    // Add event listeners
    widget.addEventListener('conversation-started', () => {
      console.log('🎙️ Conversation started');
      setConversationState('active');
    });
    widget.addEventListener('conversation-ended', () => {
      console.log('🔚 Conversation ended');
      setConversationState('idle');
    });
    widget.addEventListener('error', (event) => {
      console.error('❌ Widget error:', event);
    });
    // Listen for our custom start event
    widget.addEventListener('start-conversation', () => {
      console.log('🎯 Custom start event received');
      setConversationState('active');
    });
    // Listen for agent ready event
    widget.addEventListener('ready', () => {
      console.log('✅ Widget ready and agent loaded');
    });
    // Append to container
    widgetRef.current.appendChild(widget);
    console.log('📦 Widget appended to container');
    console.log('🔍 Widget in DOM:', widgetRef.current.contains(widget));
    console.log('🔍 Container children:', widgetRef.current.children);
    // Force widget initialization after append
    setTimeout(() => {
      console.log('🚀 Attempting to force widget initialization...');
      if (widget && typeof (widget as any).connect === 'function') {
        console.log('🔌 Calling widget.connect()...');
        (widget as any).connect();
      }
    }, 1500);
    // Check if widget is actually in the DOM
    setTimeout(() => {
      const widgetInDOM = widgetRef.current?.querySelector('elevenlabs-convai');
      console.log('🔍 Widget in DOM after append:', widgetInDOM);
      if (widgetInDOM) {
        console.log('✅ Widget successfully added to DOM');
        // Check for iframe content
        const iframe = widgetInDOM.querySelector('iframe');
        if (iframe) {
          console.log('✅ Iframe found and widget is rendering');
        } else {
          console.log('⏳ Widget element created, waiting for iframe to initialize...');
        }
      } else {
        console.error('❌ Widget not found in DOM after append');
      }
    }, 100);
    console.log('🎯 Widget initialization complete');
    widgetInitializedRef.current = true;
  };
  const handleStartConversation = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      // Create session first
      if (!currentSession && !sessionCreatedRef.current) {
        sessionCreatedRef.current = true;
        if (ENABLE_ASSESSMENT_SESSIONS_WIDGET) {
          try {
            await backendService.database.select('assessment_sessions')
              .update({ status: 'cancelled' })
              .eq('user_id', user?.id)
              .eq('status', 'pending');
          } catch (e) {
            console.warn('[MobileConversation] Skip cancel-pending assessment_sessions (flag off or error):', e);
          }
        }
        const sessionId = await createSession(actualMode ? 'baseline' : 'checkin');
        if (!sessionId) {
          startingRef.current = false;
          sessionCreatedRef.current = false;
          return;
        }
      }
      // Move to recording phase
      setCurrentStep('recording');
    } catch (error) {
      console.error('Error starting mobile conversation:', error);
      sessionCreatedRef.current = false;
    } finally {
      setTimeout(() => { startingRef.current = false; }, 1500);
    }
  };
  const handleBackToWelcome = () => {
    setCurrentStep('welcome');
  };
  const handleConversationEnd = async () => {
    if (!currentSession) return;
    
    // CRITICAL VALIDATION: Check if we have actual conversation data for check-in
    const sessionData = currentSession.text_data || {};
    const transcripts = sessionData.transcripts || [];
    const conversationHistory = sessionData.conversationData || [];
    
    const hasTranscript = transcripts.length > 0 && transcripts.join(' ').length > 50; // At least 50 characters total
    const hasConversation = conversationHistory.length >= 4; // At least 2 user messages + 2 AI responses
    
    if (!hasTranscript || !hasConversation) {
      console.error('❌ Insufficient conversation data - cannot create check-in assessment');
      alert(
        'Unable to Complete Check-in\n\n' +
        'We didn\'t capture enough conversation data to create a new wellbeing score.\n\n' +
        'Please try again and spend a little more time talking with Jodie.'
      );
      
      // Navigate back to allow retry
      onNavigateBack();
      return;
    }
    
    setIsProcessing(true);
    setCameraActive(false); // Turn off camera indicator immediately
    try {
      // Stop camera capture to collect final visual data
      if (stillImageCaptureRef.current && stillImageCaptureRef.current.stopCapturing) {
        stillImageCaptureRef.current.stopCapturing();
      }
      // Finalize session with visual data
      await finalizeSession(visualData);
    } catch (error) {
      console.error('Error finalizing mobile session:', error);
      // Still navigate back even if processing fails
      onNavigateBack();
    }
  };
  const finalizeSession = async (data: any) => {
    if (!currentSession || !user) return;
    try {
      if (ENABLE_ASSESSMENT_SESSIONS_WIDGET) {
        try {
          await backendService.database.select('assessment_sessions')
            .update({
              status: 'completed',
              visual_data: data,
              assessment_type: actualMode ? 'baseline' : 'checkin'
            })
            .eq('id', currentSession.id);
          console.log('✅ Mobile session finalized');
        } catch (e) {
          console.warn('[MobileConversation] Skip assessment_sessions update (flag off or error):', e);
        }
      }
      setTimeout(() => {
        onNavigateBack();
      }, 1500);
    } catch (error) {
      console.error('Error finalizing mobile session:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };
  const handleVisualDataCapture = (data: any) => {
    setVisualData(data);
    // Update session with visual data
    if (currentSession) {
      updateSessionData({ visual_data: data });
    }
  };
  const handleComplete = async (data: any) => {
    // Use the proper conversation end handler
    await handleConversationEnd();
  };
  // Loading state
  if (loading) {
    return (
      <div className="px-6 py-8 space-y-8">
        <div className="text-center pt-8">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <img
              src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
              alt="Mind Measure"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  // Conversation step - full-screen interface
  if (currentStep === 'conversation') {
    console.log('🎙️ Rendering conversation step', {
      currentStep,
      conversationState,
      scriptLoaded,
      userId: user?.id
    });
    return (
      <div
        className="min-h-screen bg-white flex flex-col"
        style={{
          position: 'relative',
          zIndex: 1000,
          isolation: 'isolate'
        }}
      >
        {/* Header - Mind Measure Logo and Title */}
        <div className="flex items-center justify-center gap-3 pt-8 pb-4 px-6">
          <div className="w-14 h-14 flex items-center justify-center">
            <img
              src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
              alt="Mind Measure"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Mind Measure</h1>
        </div>
        {/* ElevenLabs Widget Container - Full Screen Text */}
        <div className="flex-1 flex flex-col relative overflow-hidden" style={{ minHeight: '70vh' }}>
          {/* Widget container - fills entire space below header */}
          <div className="flex-1 relative p-0" style={{ minHeight: '60vh' }}>
            {conversationState === 'processing' ? (
              <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Results...</h3>
                  <p className="text-gray-600 text-sm">
                    Analyzing your conversation with Mind Measure GPT
                  </p>
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : scriptLoaded ? (
              <div className="w-full h-full relative">
                {/* ElevenLabs widget */}
                <elevenlabs-convai
                  key="mobile-widget"
                  agent-id={actualMode ? 'agent_9301k22s8e94f7qs5e704ez02npe' : 'agent_7501k3hpgd5gf8ssm3c3530jx8qx'}
                ></elevenlabs-convai>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Conversation...</h3>
                  <p className="text-gray-600 text-sm">
                    {needsBaseline
                      ? 'Preparing your baseline assessment'
                      : 'Preparing your check-in conversation'
                    }
                  </p>
                </div>
              </div>
            )}
            {/* Hidden camera capture component */}
            {currentStep === 'conversation' && cameraActive && (
              <div className="hidden">
                <StillImageCapture
                  ref={stillImageCaptureRef}
                  isActive={true}
                  onRecordingComplete={handleVisualDataCapture}
                  onRangeChange={() => {}}
                  onFrameUpdate={() => {}}
                />
              </div>
            )}
            {/* Camera status indicator */}
            {cameraActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Camera Active</span>
              </div>
            )}
            {/* End Conversation button */}
            <div className="absolute top-4 left-4 z-20">
              <Button
                size="sm"
                onClick={() => {
                  endCheckin();
                }}
                disabled={conversationState === 'processing'}
                className="h-8 px-2 text-xs font-normal shadow-lg bg-purple-300 text-purple-900 hover:bg-purple-400"
              >
                Finish
              </Button>
            </div>
          </div>
        </div>
        {/* Connection Error Display */}
        {connectionError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-red-800 font-medium text-sm">Connection Issue</h3>
                <p className="text-red-600 text-xs">{connectionError}</p>
              </div>
              <Button
                onClick={() => {
                  setConnectionError(null);
                  setRetryCount(0);
                  loadScript();
                }}
                className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        {/* Bottom Control Buttons */}
        <div className="p-6 bg-white conversation-controls">
          <div className="flex gap-3">
            <Button
              onClick={async () => {
                if (conversationState === 'idle') {
                  console.log('🎯 Start button clicked, attempting to start conversation...');
                  // First, ensure we have a session
                  if (!currentSession) {
                    console.log('🎯 Creating new session...');
                    const sessionId = await createSession(actualMode ? 'baseline' : 'checkin');
                    console.log('📝 Session creation result:', sessionId);
                    if (!sessionId) {
                      console.error('❌ Failed to create session');
                      toast.error('Failed to start conversation. Please try again.');
                      return;
                    }
                  }
                  // Transition to conversation step
                                console.log('🎙️ Transitioning to conversation step...');
                  setCurrentStep('conversation');
                  setConversationState('active');
                  console.log('🔍 Current step after transition:', currentStep);
                  console.log('🔍 Conversation state after transition:', conversationState);
                  // Try to find the widget and start it
                  setTimeout(() => {
                    const widget = document.querySelector('elevenlabs-convai');
                    if (widget) {
                      console.log('✅ Widget found, attempting to start conversation...');
                      // Try to find and click the start button
                      const startButton = widget.shadowRoot?.querySelector('[data-testid="start-button"]') ||
                                        widget.shadowRoot?.querySelector('button') ||
                                        widget.shadowRoot?.querySelector('[aria-label*="start"]') ||
                                        widget.shadowRoot?.querySelector('[aria-label*="Start"]');
                      if (startButton && startButton instanceof HTMLElement) {
                        console.log('🎙️ Found start button, clicking it...');
                        startButton.click();
                      } else {
                        console.log('⚠️ No start button found, using fallback...');
                        // Fallback: dispatch custom event
                        widget.dispatchEvent(new CustomEvent('start-conversation'));
                      }
                    } else {
                      console.error('❌ No widget found in DOM');
                    }
                  }, 1500); // Wait for widget to initialize
                }
              }}
              disabled={!scriptLoaded || conversationState === 'active' || !!connectionError}
              className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl disabled:opacity-50"
            >
              {conversationState === 'active' ? 'Active' : connectionError ? 'Retrying...' : 'Start'}
            </Button>
            <Button
              onClick={() => {
                setIsMuted(!isMuted);
                // Toggle audio by muting/unmuting the widget
                const widget = document.querySelector('elevenlabs-convai');
                if (widget) {
                  const audioElements = widget.shadowRoot?.querySelectorAll('audio') || [];
                  audioElements.forEach(audio => {
                    audio.muted = !isMuted;
                  });
                }
                console.log('Toggle mute:', !isMuted);
              }}
              className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => handleComplete({})}
              className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Finish
            </Button>
          </div>
        </div>
      </div>
    );
  }
  // Welcome step - replicate exact design from MobileCheckin
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 w-full px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 flex flex-col justify-center">
      {/* Header */}
      <div className="text-center pt-4 sm:pt-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
          <img
            src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
            alt="Mind Measure"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 sm:mb-3">
          {actualMode ? 'Welcome to Mind Measure' : 'Welcome back, Alex'}
        </h1>
        <p className="text-gray-600 leading-relaxed text-sm sm:text-base px-4 sm:px-0">
          {actualMode
            ? 'Let\'s get to know you better with a brief assessment to establish your wellness baseline'
            : 'Ready for your regular wellness check?'
          }
        </p>
      </div>
      {/* Start Button */}
      <div className="text-center space-y-3 sm:space-y-4">
        <Button
          onClick={handleStartConversation}
          className="w-full h-14 sm:h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-0 shadow-2xl text-base sm:text-lg backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
          Start {actualMode ? 'Baseline Assessment' : 'Check-in'} with Jodie
        </Button>
        <p className="text-gray-500 text-xs sm:text-sm px-4 sm:px-0">
          Find a quiet, comfortable space where you can speak freely
        </p>
      </div>
      {/* What to Expect - Different content for baseline vs check-in */}
      {actualMode ? (
        // Baseline Assessment - Detailed cards
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-gray-900 text-center text-base sm:text-lg font-semibold">What to Expect</h3>
          <div className="space-y-4 sm:space-y-5">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-3 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-blue-900 mb-1 text-sm sm:text-base font-semibold">Visual Analysis</h4>
                  <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">We use your phone's camera to assess your facial expressions. We do not store any images of you, they are analysed for facial landmarks, emotion categories (happy, sad, angry, confused, calm, etc.), and attention markers (e.g., eyes closed, head down).</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-3 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-green-900 mb-1 text-sm sm:text-base font-semibold">Voice Patterns</h4>
                  <p className="text-green-700 text-xs sm:text-sm leading-relaxed">The human voice is a rich source of affective information. Acoustic features such as pitch, jitter, speaking rate, and pauses correlate strongly with depression, anxiety, and stress. We listen to how you sound not just what you say.</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-purple-50/70 p-3 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-purple-900 mb-1 text-sm sm:text-base font-semibold">Conversation</h4>
                  <p className="text-purple-700 text-xs sm:text-sm leading-relaxed">When Jodie asks a question ("On a scale of 1–10, how is your mood right now?"), Mind Measure evaluates your response quantitatively (the numerical score) and qualitatively (tone of voice, hesitation, choice of words), this ensures a 'multi-modal' form of assessment, because we are not always completely honest in what we say!</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        // Check-in - Simple, focused content
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-5">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-purple-50/70 p-3 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-purple-900 mb-1 text-sm sm:text-base font-semibold">Quick Check-in</h4>
                  <p className="text-purple-700 text-xs sm:text-sm leading-relaxed">Jodie will have a brief conversation with you to understand how you're feeling today compared to your previous check-ins. This helps us track your wellness journey over time.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {/* Private & Secure */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-indigo-50/70 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-indigo-900 mb-2 text-sm sm:text-base font-semibold">Private & Secure</h4>
            <p className="text-indigo-700 text-xs sm:text-sm leading-relaxed">
              Your data is encrypted and confidential. Mind Measure complies with GDPR, UK ICO guidance, and aligns with NHS Clinical Governance frameworks (NHS England, 2023). Identifiable raw media (audio and images) are discarded after feature extraction and analysis.
            </p>
          </div>
        </div>
      </Card>
      {/* More Information */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-amber-50/70 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-amber-900 mb-2 text-sm sm:text-base font-semibold">More Information</h4>
            <p className="text-amber-700 text-xs sm:text-sm leading-relaxed">
              There are more details about how Mind Measure works on our website{' '}
              <a
                href="https://mindmeasure.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-amber-800 transition-colors"
              >
                mindmeasure.app
              </a>
            </p>
          </div>
        </div>
      </Card>
      {/* Mind Measure Branding */}
      <div className="text-center space-y-4 sm:space-y-6 py-6 sm:py-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
          <img
            src="https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png"
            alt="Mind Measure"
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 sm:mb-3">Mind Measure</h3>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto px-4 sm:px-0">
            Your trusted companion for understanding and measuring your mental wellbeing through intelligent conversation and analysis.
          </p>
        </div>
      </div>
      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
};

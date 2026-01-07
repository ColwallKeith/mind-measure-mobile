import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  options?: string[];
}

interface ConversationScreenProps {
  type?: 'baseline' | 'checkin';
  messages?: Message[];
  isListening?: boolean;
  onFinish?: () => void;
  onBack?: () => void;
}

export function ConversationScreen({ 
  type = 'checkin',
  messages = [],
  isListening = false,
  onFinish,
  onBack
}: ConversationScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current message visible
  useEffect(() => {
    if (contentEndRef.current) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Status bar space + Dynamic Island clearance */}
      <div style={{
        height: '60px',
        flexShrink: 0,
        backgroundColor: '#000000'
      }} />

      {/* Header - Black with white text */}
      <div style={{
        backgroundColor: '#000000',
        textAlign: 'center',
        padding: '20px 0',
        flexShrink: 0
      }}>
        <h1 style={{
          fontFamily: 'Chillax, sans-serif',
          fontSize: '24px',
          fontWeight: '500',
          color: '#FFFFFF',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          Mind Measure
        </h1>
      </div>

      {/* Scrollable Message Container - White paper background */}
      <div 
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          backgroundColor: '#FAFAFA',
          backgroundImage: 'linear-gradient(0deg, transparent 24px, rgba(0, 0, 0, 0.02) 25px, transparent 26px)',
          backgroundSize: '100% 25px'
        }}
      >
        {messages.map((msg, index) => {
          const isLatest = index === messages.length - 1;
          // Split into chunks of words to simulate line-by-line appearance
          const words = msg.text.split(' ');
          const wordsPerLine = 6; // Approximate words per visual line at 32px font
          const lines: string[] = [];
          
          for (let i = 0; i < words.length; i += wordsPerLine) {
            lines.push(words.slice(i, i + wordsPerLine).join(' '));
          }
          
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                width: '100%',
                textAlign: msg.sender === 'user' ? 'right' : 'left'
              }}
            >
              {msg.sender === 'ai' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  {/* AI Question - line by line reveal */}
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '400',
                    color: '#1a1a1a',
                    lineHeight: '1.2',
                    letterSpacing: '-0.5px',
                    margin: 0,
                    maxWidth: '90%'
                  }}>
                    {lines.map((line, lineIndex) => (
                      <motion.div
                        key={lineIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: isLatest ? lineIndex * 0.2 : 0,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                      >
                        {line}
                      </motion.div>
                    ))}
                  </div>

                  {/* Listening indicator */}
                  {isLatest && isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: lines.length * 0.2 + 0.4, duration: 0.5 }}
                      style={{
                        marginTop: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center'
                      }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: ['16px', '32px', '16px'],
                              backgroundColor: ['#E0E7FF', '#8B5CF6', '#E0E7FF']
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut'
                            }}
                            style={{
                              width: '6px',
                              borderRadius: '3px'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{
                        fontSize: '16px',
                        color: '#8B5CF6',
                        fontWeight: '500',
                        letterSpacing: '0.5px'
                      }}>
                        Listening...
                      </span>
                    </motion.div>
                  )}

                  {/* Options for baseline assessment */}
                  {isLatest && type === 'baseline' && msg.options && isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: lines.length * 0.2 + 0.6, duration: 0.5 }}
                      style={{
                        marginTop: '20px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      {msg.options.map((option, optionIndex) => (
                        <motion.div
                          key={option}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: lines.length * 0.2 + 0.7 + (optionIndex * 0.08),
                            duration: 0.4
                          }}
                          style={{
                            fontSize: '18px',
                            color: '#6B7280',
                            fontWeight: '500',
                            padding: '8px 0',
                            letterSpacing: '0.3px'
                          }}
                        >
                          {option}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* User Response */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'inline-block',
                    maxWidth: '85%',
                    marginLeft: 'auto'
                  }}
                >
                  <p style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: 0,
                    lineHeight: '1.2',
                    letterSpacing: '-1px'
                  }}>
                    {msg.text}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={contentEndRef} />
      </div>

      {/* Bottom Bar - Black with controls */}
      <div style={{
        backgroundColor: '#000000',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        {/* Finish Button */}
        <motion.button
          onClick={onFinish}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #F97316, #FB923C)',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)',
            transition: 'all 0.2s'
          }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)'
          }}
          whileTap={{ scale: 0.98 }}
        >
          Finish
        </motion.button>

        {/* Camera Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Camera Icon */}
          <div style={{ position: 'relative', width: '20px', height: '20px' }}>
            {/* Camera SVG Icon - Stills Camera */}
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <path 
                d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <circle 
                cx="12" 
                cy="13" 
                r="4" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Pulsing orange dot */}
            <motion.div
              animate={{
                opacity: [1, 0.3, 1],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#F97316'
              }}
            />
          </div>

          {/* Microphone Icon */}
          <div style={{ position: 'relative', width: '20px', height: '20px' }}>
            {/* Mic SVG Icon */}
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <path 
                d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M12 19V23" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M8 23H16" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Pulsing orange dot */}
            <motion.div
              animate={{
                opacity: [1, 0.3, 1],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5 // Offset from camera pulse for visual interest
              }}
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#F97316'
              }}
            />
          </div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}


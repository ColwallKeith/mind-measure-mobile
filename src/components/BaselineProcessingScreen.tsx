import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';

interface BaselineProcessingScreenProps {
  userName: string;
  onComplete: () => void;
}

export function BaselineProcessingScreen({ 
  userName, 
  onComplete 
}: BaselineProcessingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Analyzing your responses...');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps = [
    'Analyzing your responses...',
    'Processing audio patterns...',
    'Evaluating visual cues...',
    'Calculating Mind Measure score...',
    'Finalizing your dashboard...'
  ];
  const totalSteps = steps.length;
  const stepDuration = 2000; // 2 seconds per step

  useEffect(() => {
    let currentStepIndex = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / totalSteps / (stepDuration / 100)); // Increment smoothly
        return Math.min(newProgress, 100);
      });

      if (currentStepIndex < totalSteps) {
        setCompletedSteps(prev => [...prev, steps[currentStepIndex]]);
        setCurrentStep(steps[currentStepIndex]);
        currentStepIndex++;
      }
      
      if (currentStepIndex >= totalSteps) {
        clearInterval(progressInterval);
        setTimeout(() => {
          onComplete();
        }, 1000); // Brief pause before proceeding
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100"
      >
        <h2 className="text-3xl font-bold text-gray-900">
          Thanks, <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">{userName}</span>!
        </h2>
        <p className="text-gray-600 text-lg">
          Your baseline score is being calculated
        </p>

        {/* Beautiful Enhanced Progress Bar */}
        <div className="space-y-6">
          <div className="relative">
            {/* Background track with subtle shadow */}
            <div className="w-full h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full shadow-inner overflow-hidden border border-gray-200/50">
              {/* Animated progress fill with beautiful gradient and glow */}
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full relative overflow-hidden shadow-lg"
                style={{
                  boxShadow: '0 0 20px rgba(147, 51, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {/* Animated shimmer effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                {/* Subtle inner highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full" />
              </motion.div>
            </div>
            
            {/* Progress percentage with better styling */}
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">
                {Math.round(progress)}% Complete
              </span>
              <div className="flex items-center space-x-1.5">
                <motion.div 
                  className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-sm" 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <motion.div 
                  className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm" 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="w-2.5 h-2.5 bg-pink-500 rounded-full shadow-sm" 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-left space-y-2">
          {steps.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: completedSteps.includes(step) ? 1 : 0.5, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center text-gray-700"
            >
              {completedSteps.includes(step) ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <Loader2 className="w-5 h-5 text-purple-400 mr-2 animate-spin" />
              )}
              <span>{step}</span>
            </motion.div>
          ))}
        </div>

        {/* Loading Animation */}
        <motion.div 
          className="flex justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full"></div>
        </motion.div>
      </motion.div>
    </div>
  );
}
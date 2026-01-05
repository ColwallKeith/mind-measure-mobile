import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrentScoreCard } from './cards/CurrentScoreCard';
import { SevenDayViewCard } from './cards/SevenDayViewCard';
import { ThirtyDayViewCard } from './cards/ThirtyDayViewCard';

interface ScoreData {
  date: string;
  score: number;
}

interface SwipeableScoreCardProps {
  score: number;
  lastUpdated: string;
  trend?: 'up' | 'down' | 'stable';
  last7Days?: ScoreData[];
  last30Days?: ScoreData[];
  baselineScore?: number;
  userCreatedAt?: string;
}

type View = 'current' | '7day' | '30day';

export function SwipeableScoreCard({ 
  score, 
  lastUpdated, 
  trend = 'stable',
  last7Days = [],
  last30Days = [],
  baselineScore,
  userCreatedAt
}: SwipeableScoreCardProps) {
  
  // Debug: Log all incoming props
  console.log('SwipeableScoreCard props:', {
    score,
    lastUpdated,
    trend,
    last7Days: last7Days.length,
    last30Days: last30Days.length,
    baselineScore,
    userCreatedAt
  });
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<number>(0);

  const minSwipeDistance = 50;
  
  // Determine which views to show based on account age
  const availableViews: View[] = ['current'];
  
  if (userCreatedAt) {
    const accountCreatedDate = new Date(userCreatedAt);
    const daysSinceSignup = Math.floor((Date.now() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSignup >= 7) {
      availableViews.push('7day');
    }
    
    if (daysSinceSignup >= 30) {
      availableViews.push('30day');
    }
  }
  
  const [activeView, setActiveView] = useState<View>(availableViews[0]);
  const views = availableViews;
  const currentIndex = views.indexOf(activeView);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setDirection(-1);
      setActiveView(views[currentIndex + 1]);
    }
    
    if (isRightSwipe && currentIndex > 0) {
      setDirection(1);
      setActiveView(views[currentIndex - 1]);
    }
  };

  // Get score label
  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 70) return "Great";
    if (s >= 60) return "Good";
    if (s >= 50) return "Fair";
    return "Needs Attention";
  };

  // Get encouraging message
  const getMessage = (s: number) => {
    if (s >= 80) return "You're doing amazingly well!";
    if (s >= 70) return "You're doing great today.";
    if (s >= 60) return "You're doing well today.";
    if (s >= 50) return "Keep taking care of yourself.";
    return "We're here to support you.";
  };

  // Prepare 7-day data (fill with scores from last7Days)
  const prepare7DayData = (): number[] => {
    const data: number[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = last7Days.find(d => {
        const checkInDate = new Date(d.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === date.getTime();
      });
      
      // If no data for this day, use baseline or 0
      data.push(dayData?.score || baselineScore || 0);
    }
    
    return data;
  };

  // Prepare 30-day data
  const prepare30DayData = (): number[] => {
    const data: number[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = last30Days.find(d => {
        const checkInDate = new Date(d.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === date.getTime();
      });
      
      // If no data for this day, use baseline or 0
      data.push(dayData?.score || baselineScore || 0);
    }
    
    return data;
  };

  // Calculate averages
  const avg7Day = last7Days.length > 0 
    ? Math.round(last7Days.reduce((sum, d) => sum + d.score, 0) / last7Days.length)
    : baselineScore || score;
    
  const avg30Day = last30Days.length > 0
    ? Math.round(last30Days.reduce((sum, d) => sum + d.score, 0) / last30Days.length)
    : baselineScore || score;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div 
      className="relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        {activeView === 'current' && (
          <motion.div
            key="current"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <CurrentScoreCard
              score={score}
              status={getScoreLabel(score)}
              message={getMessage(score)}
              lastUpdated={lastUpdated}
            />
          </motion.div>
        )}

        {activeView === '7day' && (
          <motion.div
            key="7day"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <SevenDayViewCard
              baselineScore={baselineScore || score}
              weekData={prepare7DayData()}
              averageScore={avg7Day}
            />
          </motion.div>
        )}

        {activeView === '30day' && (
          <motion.div
            key="30day"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <ThirtyDayViewCard
              baselineScore={baselineScore || score}
              monthData={prepare30DayData()}
              averageScore={avg30Day}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Dots - only show if there are multiple views */}
      {views.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {views.map((view, index) => (
            <button
              key={view}
              onClick={() => {
                setDirection(index > currentIndex ? -1 : 1);
                setActiveView(view);
              }}
              className={`h-2 rounded-full transition-all ${
                activeView === view
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

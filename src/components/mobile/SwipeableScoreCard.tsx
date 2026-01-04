import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
}

type View = 'current' | '7day' | '30day';

export function SwipeableScoreCard({ 
  score, 
  lastUpdated, 
  trend = 'stable',
  last7Days = [],
  last30Days = []
}: SwipeableScoreCardProps) {
  const [activeView, setActiveView] = useState<View>('current');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<number>(0);

  const minSwipeDistance = 50;
  const views: View[] = ['current', '7day', '30day'];
  const currentIndex = views.indexOf(activeView);

  // Helper functions from original ScoreCard
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'amber';
    return 'red';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return "You're thriving today!";
    if (score >= 60) return "You're doing well today.";
    if (score >= 40) return "You're managing okay.";
    return "Let's work on improving.";
  };

  const colorSchemes = {
    green: {
      gradient: 'from-green-500/90 to-emerald-600/90',
      textLight: 'text-green-100',
      textMedium: 'text-green-200',
      bgOverlay: 'from-green-400/20 to-emerald-400/10'
    },
    blue: {
      gradient: 'from-blue-500/90 to-blue-600/90',
      textLight: 'text-blue-100',
      textMedium: 'text-blue-200',
      bgOverlay: 'from-blue-400/20 to-blue-400/10'
    },
    amber: {
      gradient: 'from-amber-500/90 to-orange-600/90',
      textLight: 'text-amber-100',
      textMedium: 'text-amber-200',
      bgOverlay: 'from-amber-400/20 to-orange-400/10'
    },
    red: {
      gradient: 'from-red-500/90 to-rose-600/90',
      textLight: 'text-red-100',
      textMedium: 'text-red-200',
      bgOverlay: 'from-red-400/20 to-rose-400/10'
    }
  };

  // Calculate averages
  const avg7Day = last7Days.length > 0 
    ? Math.round(last7Days.reduce((sum, d) => sum + d.score, 0) / last7Days.length)
    : score;
  
  const avg30Day = last30Days.length > 0
    ? Math.round(last30Days.reduce((sum, d) => sum + d.score, 0) / last30Days.length)
    : score;

  // Touch handlers
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

  // Render 7-day bar chart - always show 7 days
  const render7DayBars = () => {
    const now = new Date();
    const days = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      // Find check-in for this day
      const dayData = last7Days.find(d => {
        const checkInDate = new Date(d.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === date.getTime();
      });
      
      days.push({
        date,
        score: dayData?.score || null,
        hasData: !!dayData
      });
    }
    
    const checkInCount = days.filter(d => d.hasData).length;

    return (
      <>
        <div className="flex items-end justify-between gap-1 h-24 px-2 mt-4">
          {days.map((day, index) => {
            const height = day.score ? (day.score / 100) * 100 : 0;
            const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.date.getDay()];
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end h-20">
                  {day.hasData ? (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="w-full bg-white/40 rounded-t-lg"
                      style={{ minHeight: '4px' }}
                    />
                  ) : (
                    <div className="w-full h-1 bg-white/10 rounded" />
                  )}
                </div>
                <span className="text-[10px] text-white/70 font-medium">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
        <p className={`${colorScheme.textLight} text-xs mt-3 px-2`}>
          You have checked in {checkInCount} {checkInCount === 1 ? 'time' : 'times'} in the last seven days
          {checkInCount < 4 && ', try checking in more regularly for better monitoring'}
        </p>
      </>
    );
  };

  // Render 30-day view - show bars only if 5+ check-ins
  const render30DayView = () => {
    const checkInCount = last30Days.length;

    if (checkInCount < 5) {
      return (
        <p className={`${colorScheme.textLight} text-sm mt-4 px-4`}>
          You have only checked in {checkInCount} {checkInCount === 1 ? 'time' : 'times'} in the last 30 days, 
          try checking in more often to measure and monitor your mood.
        </p>
      );
    }

    // Show condensed bar chart for 5+ check-ins
    return (
      <>
        <div className="flex items-end justify-between gap-0.5 h-24 px-2 mt-4">
          {last30Days.slice(0, 30).map((point, index) => {
            const height = (point.score / 100) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-20">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: index * 0.02 }}
                    className="w-full bg-white/40 rounded-t-sm"
                    style={{ minHeight: '2px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className={`${colorScheme.textLight} text-xs mt-3 px-2`}>
          {checkInCount} check-ins in the last 30 days
        </p>
      </>
    );
  };

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

  const currentViewData = activeView === 'current' ? score : activeView === '7day' ? avg7Day : avg30Day;
  const colorScheme = colorSchemes[getScoreColor(currentViewData)];

  return (
    <Card 
      className={`relative overflow-hidden border-0 shadow-2xl backdrop-blur-xl bg-gradient-to-br ${colorScheme.gradient} text-white p-6 transform transition-all duration-300`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dynamic background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bgOverlay}`} />
      
      {/* Animated background elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
      
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
            className="relative z-10 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <p className={`${colorScheme.textLight}`}>Current Score</p>
              {trend === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            </div>
            
            <div className="relative">
              <div className="text-6xl mb-2 drop-shadow-lg">{score}</div>
              <div className="absolute inset-0 text-6xl mb-2 text-white/20 transform translate-x-1 translate-y-1 -z-10">{score}</div>
            </div>
            
            <p className="text-2xl mb-2">{getScoreLabel(score)}</p>
            <p className={`${colorScheme.textLight} mb-3`}>{getScoreMessage(score)}</p>
            <p className={`${colorScheme.textMedium} text-xs`}>Last updated: {lastUpdated}</p>
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
            className="relative z-10 text-center"
          >
            <p className={`${colorScheme.textLight} mb-3`}>7-Day Average</p>
            
            <div className="relative">
              <div className="text-6xl mb-2 drop-shadow-lg">{avg7Day}</div>
            </div>
            
            <p className="text-2xl mb-2">{getScoreLabel(avg7Day)}</p>
            
            {render7DayBars()}
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
            className="relative z-10 text-center"
          >
            <p className={`${colorScheme.textLight} mb-3`}>30-Day Average</p>
            
            <div className="relative">
              <div className="text-6xl mb-2 drop-shadow-lg">{avg30Day}</div>
            </div>
            
            <p className="text-2xl mb-2">{getScoreLabel(avg30Day)}</p>
            
            {render30DayView()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dots Indicator */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-4">
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

      {/* Floating particles effect */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-2/3 w-1 h-1 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
    </Card>
  );
}

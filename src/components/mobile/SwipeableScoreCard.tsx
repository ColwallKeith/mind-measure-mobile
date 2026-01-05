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
  baselineScore?: number; // User's baseline for comparison
  userCreatedAt?: string; // Account creation date to determine available views
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<number>(0);

  const minSwipeDistance = 50;
  
  // Determine which views to show based on ACCOUNT AGE, not check-in history
  const availableViews: View[] = ['current'];
  
  if (userCreatedAt) {
    const accountCreatedDate = new Date(userCreatedAt);
    const daysSinceSignup = Math.floor((Date.now() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Show 7-day view if user signed up 7+ days ago
    if (daysSinceSignup >= 7) {
      availableViews.push('7day');
    }
    
    // Show 30-day view if user signed up 30+ days ago
    if (daysSinceSignup >= 30) {
      availableViews.push('30day');
    }
  }
  
  const [activeView, setActiveView] = useState<View>(availableViews[0]);
  const views = availableViews;
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

  // Render 7-day - EXACTLY like Apple Health "Average Distance"
  // KEY: Bars must be HUGE and take up most of the space
  const render7DayBars = () => {
    const now = new Date();
    const days = [];
    
    // Build 7-day array with scores
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = last7Days.find(d => {
        const checkInDate = new Date(d.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === date.getTime();
      });
      
      days.push({
        day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()],
        score: dayData?.score || null
      });
    }
    
    const checkInCount = days.filter(d => d.score !== null).length;
    const baseline = baselineScore || avg7Day;
    const maxScore = 100;

    return (
      <div className="h-full w-full p-6 flex gap-6">
        {/* LEFT SIDE: Title + Score (40% width) */}
        <div className="w-2/5 flex flex-col justify-center">
          <p className="text-white/70 text-base mb-2">Baseline</p>
          <p className="text-white text-6xl font-bold mb-2">{Math.round(baseline)}</p>
          <p className="text-white/50 text-sm">{checkInCount} check-ins</p>
        </div>
        
        {/* RIGHT SIDE: Bar chart (60% width) */}
        <div className="w-3/5 relative">
          {/* Green baseline line across middle */}
          <div 
            className="absolute left-0 right-0 z-10"
            style={{ 
              top: '45%',
              height: '3px',
              backgroundColor: '#10b981'
            }}
          />
          
          {/* Narrow, tall bars */}
          <div className="absolute inset-0 flex items-end justify-between gap-2 pb-8">
            {days.map((day, index) => (
              <div key={index} className="flex-1 h-full flex flex-col justify-end items-center">
                {/* Bar - narrow but grows tall */}
                <div 
                  className="w-full rounded-t-lg"
                  style={{ 
                    height: day.score !== null ? `${(day.score / maxScore) * 100}%` : '8%',
                    minHeight: '16px',
                    backgroundColor: day.score !== null 
                      ? 'rgba(255, 255, 255, 0.9)' 
                      : 'rgba(255, 255, 255, 0.25)',
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Day labels at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
            {days.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <span className="text-white/80 text-sm font-medium">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render 30-day - EXACTLY like Apple Health "Flights Climbed"
  const render30DayBars = () => {
    const now = new Date();
    const days = [];
    
    // Build 30-day array
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = last30Days.find(d => {
        const checkInDate = new Date(d.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === date.getTime();
      });
      
      days.push({
        dayOfMonth: date.getDate(),
        score: dayData?.score || null
      });
    }
    
    const checkInCount = days.filter(d => d.score !== null).length;
    const maxScore = 100;

    // Calculate date markers (show every ~7 days: positions 6, 13, 20, 27)
    const dateMarkers = [
      { index: 6, label: days[6]?.dayOfMonth || '' },
      { index: 13, label: days[13]?.dayOfMonth || '' },
      { index: 20, label: days[20]?.dayOfMonth || '' },
      { index: 27, label: days[27]?.dayOfMonth || '' }
    ];

    return (
      <div className="relative px-4" style={{ height: '280px' }}>
        {/* Y-axis labels - left side */}
        <div className="absolute left-0 top-12 bottom-12 flex flex-col justify-between text-xs text-white/40">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div className="absolute left-8 right-4 top-12 bottom-12">
          {/* Horizontal grid lines */}
          <div className="absolute left-0 right-0 top-0 border-t border-white/10" />
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/10" />
          <div className="absolute left-0 right-0 bottom-0 border-t border-white/10" />
          
          {/* Dense bars - very thin like Apple Health */}
          <div className="absolute inset-0 flex items-end justify-between" style={{ gap: '1px' }}>
            {days.map((day, index) => (
              <div key={index} className="flex-1 flex items-end" style={{ height: '100%' }}>
                {day.score !== null ? (
                  <div 
                    className="w-full rounded-t-[1px]"
                    style={{ 
                      height: `${(day.score / maxScore) * 100}%`,
                      minHeight: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    }}
                  />
                ) : (
                  <div className="w-full" style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Date labels - bottom x-axis */}
        <div className="absolute left-8 right-4 bottom-4 h-6">
          {dateMarkers.map((marker, i) => (
            <span 
              key={i}
              className="absolute text-xs text-white/60"
              style={{ left: `${(marker.index / 29) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {marker.label}
            </span>
          ))}
        </div>
        
        {/* Check-in info */}
        <div className="absolute bottom-0 left-4">
          <p className="text-xs text-white/50">
            {checkInCount} check-ins
          </p>
        </div>
      </div>
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
            className="relative z-10"
          >
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
            className="relative z-10"
          >
            {render30DayBars()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dots Indicator - only show if there are multiple views */}
      {views.length > 1 && (
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
      )}

      {/* Floating particles effect */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-2/3 w-1 h-1 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
    </Card>
  );
}

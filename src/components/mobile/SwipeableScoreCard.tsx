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
}

type View = 'current' | '7day' | '30day';

export function SwipeableScoreCard({ 
  score, 
  lastUpdated, 
  trend = 'stable',
  last7Days = [],
  last30Days = [],
  baselineScore
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

  // Render 7-day - Apple Health "Average Distance" style
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
      <div className="mt-4 px-3">
        {/* Baseline label - Apple Health style */}
        <div className="mb-2">
          <p className="text-white/70 text-xs mb-1">Baseline</p>
        </div>
        
        {/* Chart container - compact like Apple Health */}
        <div className="relative" style={{ height: '140px' }}>
          {/* Baseline line - solid green like Apple Health */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-green-400"
            style={{ 
              top: `${100 - (baseline / maxScore) * 100}%`,
            }}
          />
          
          {/* Bars - compact Apple Health style */}
          <div className="absolute inset-0 flex items-end justify-between gap-0.5">
            {days.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                {/* Bar */}
                {day.score !== null ? (
                  <div 
                    className="w-full rounded-t transition-all duration-500"
                    style={{ 
                      height: `${(day.score / maxScore) * 100}%`,
                      minHeight: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)'
                    }}
                  />
                ) : (
                  <div className="w-full" style={{ height: '2px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                )}
              </div>
            ))}
          </div>
          
          {/* Day labels at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
            {days.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <span className="text-[10px] text-white/60">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Baseline score - like "3.7 mi" in Apple Health */}
        <div className="mt-3 text-center">
          <p className="text-4xl font-bold text-white">{Math.round(baseline)}</p>
        </div>
        
        {/* Check-in count */}
        <div className="mt-2 text-center">
          <p className="text-xs text-white/60">
            {checkInCount} check-in{checkInCount !== 1 ? 's' : ''} this week
          </p>
        </div>
      </div>
    );
  };

  // Render 30-day - Apple Health "Flights Climbed" style
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
        date: date.getDate(),
        score: dayData?.score || null
      });
    }
    
    const checkInCount = days.filter(d => d.score !== null).length;
    const maxScore = 100;

    // Get date markers for display (every 7 days)
    const dateMarkers = [7, 14, 21, 28].map(index => ({
      index,
      date: days[index]?.date || ''
    }));

    return (
      <div className="mt-4 px-3">
        {/* Chart container - dense like Apple Health */}
        <div className="relative" style={{ height: '180px' }}>
          {/* Y-axis labels */}
          <div className="absolute -left-2 top-0 bottom-8 flex flex-col justify-between text-[10px] text-white/40">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          
          {/* Grid lines */}
          <div className="absolute left-4 right-0 top-0 border-t border-white/10" />
          <div className="absolute left-4 right-0 top-1/2 border-t border-white/10" />
          <div className="absolute left-4 right-0 bottom-8 border-t border-white/10" />
          
          {/* Bars - very dense like Apple Health */}
          <div className="absolute left-4 right-0 bottom-8 top-0 flex items-end justify-between gap-px">
            {days.map((day, index) => (
              <div key={index} className="flex-1 h-full flex items-end">
                {day.score !== null ? (
                  <div 
                    className="w-full rounded-t-sm"
                    style={{ 
                      height: `${(day.score / maxScore) * 100}%`,
                      minHeight: '2px',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)'
                    }}
                  />
                ) : (
                  <div className="w-full" style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                )}
              </div>
            ))}
          </div>
          
          {/* Date markers at bottom */}
          <div className="absolute left-4 right-0 bottom-0 flex justify-between text-[10px] text-white/60">
            {dateMarkers.map((marker, i) => (
              <span key={i} style={{ position: 'absolute', left: `${(marker.index / 29) * 100}%` }}>
                {marker.date}
              </span>
            ))}
          </div>
        </div>
        
        {/* Info */}
        <div className="mt-3 text-center">
          <p className="text-xs text-white/60">
            {checkInCount} check-ins in the last 30 days
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
            <p className={`${colorScheme.textLight} mb-3`}>30-Day Trend</p>
            
            <div className="relative">
              <div className="text-6xl mb-2 drop-shadow-lg">{avg30Day}</div>
            </div>
            
            <p className="text-2xl mb-2">{getScoreLabel(avg30Day)}</p>
            
            {render30DayBars()}
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

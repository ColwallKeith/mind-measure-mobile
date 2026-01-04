import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ScoreData {
  date: string;
  score: number;
}

interface SwipeableScoreCardProps {
  currentScore: number;
  currentDate: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  last7Days: ScoreData[];
  last30Days: ScoreData[];
}

type View = 'current' | '7day' | '30day';

export function SwipeableScoreCard({
  currentScore,
  currentDate,
  trend,
  trendValue,
  last7Days,
  last30Days
}: SwipeableScoreCardProps) {
  const [activeView, setActiveView] = useState<View>('current');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<number>(0);

  const minSwipeDistance = 50;

  const views: View[] = ['current', '7day', '30day'];
  const currentIndex = views.indexOf(activeView);

  // Get score category and color
  const getScoreInfo = (score: number) => {
    if (score >= 80) return { 
      label: 'Excellent', 
      color: 'text-green-600', 
      bgColor: 'bg-green-600', 
      badgeColor: 'bg-green-100 text-green-700',
      message: "You're thriving today!"
    };
    if (score >= 60) return { 
      label: 'Good', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-600', 
      badgeColor: 'bg-blue-100 text-blue-700',
      message: "You're doing well today."
    };
    if (score >= 40) return { 
      label: 'Fair', 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-600', 
      badgeColor: 'bg-amber-100 text-amber-700',
      message: "You're managing okay today."
    };
    return { 
      label: 'Needs Attention', 
      color: 'text-red-600', 
      bgColor: 'bg-red-600', 
      badgeColor: 'bg-red-100 text-red-700',
      message: "Take care of yourself today."
    };
  };

  // Calculate averages
  const avg7Day = last7Days.length > 0 
    ? Math.round(last7Days.reduce((sum, d) => sum + d.score, 0) / last7Days.length)
    : currentScore;
  
  const avg30Day = last30Days.length > 0
    ? Math.round(last30Days.reduce((sum, d) => sum + d.score, 0) / last30Days.length)
    : currentScore;

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

  // Format date labels
  const formatDayLabel = (dateString: string, index: number) => {
    const date = new Date(dateString);
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days[date.getDay()];
  };

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  // Render bar chart for 7-day view
  const render7DayBars = () => {
    const maxScore = 100;
    const minScore = 0;
    
    return (
      <div className="flex items-end justify-between gap-2 h-32 px-4">
        {last7Days.slice(0, 7).map((point, index) => {
          const height = ((point.score - minScore) / (maxScore - minScore)) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-24">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="w-full bg-white/30 hover:bg-white/40 rounded-t-lg group relative transition-colors"
                  style={{ minHeight: '4px' }}
                >
                  {/* Tooltip on touch */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                      {point.score}
                    </div>
                  </div>
                </motion.div>
              </div>
              <span className="text-xs text-white/70 font-medium">
                {formatDayLabel(point.date, index)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render bar chart for 30-day view
  const render30DayBars = () => {
    const maxScore = 100;
    const minScore = 0;
    
    // Show every 5th day for labels
    const showLabel = (index: number) => index % 5 === 0 || index === last30Days.length - 1;
    
    return (
      <div className="flex items-end justify-between gap-0.5 h-32 px-2">
        {last30Days.slice(0, 30).map((point, index) => {
          const height = ((point.score - minScore) / (maxScore - minScore)) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end h-24">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.02 }}
                  className="w-full bg-white/30 hover:bg-white/40 rounded-t-sm transition-colors"
                  style={{ minHeight: '2px' }}
                />
              </div>
              {showLabel(index) && (
                <span className="text-[10px] text-white/70 font-medium">
                  {formatDateLabel(point.date)}
                </span>
              )}
            </div>
          );
        })}
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

  return (
    <Card 
      className="border-0 shadow-lg overflow-hidden"
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
            className={`p-6 ${getScoreInfo(currentScore).bgColor}`}
            style={{ minHeight: '280px' }}
          >
              {/* Current Score View */}
              <div className="text-center space-y-3">
                <p className="text-white/90 text-sm font-medium">Current Score</p>
                
                <div>
                  <motion.div
                    className="text-7xl font-bold text-white"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    {currentScore}
                  </motion.div>
                  <p className="mt-4 text-white text-xl font-semibold">
                    {getScoreInfo(currentScore).label}
                  </p>
                  <p className="mt-2 text-white/90 text-base">
                    {getScoreInfo(currentScore).message}
                  </p>
                </div>

                <p className="text-white/70 text-xs pt-4">
                  Last updated: {new Date(currentDate).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
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
              className={`p-6 ${getScoreInfo(avg7Day).bgColor}`}
              style={{ minHeight: '280px' }}
            >
              {/* 7-Day Average View */}
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-white/90 text-sm font-medium">7-Day Average</p>
                  <div className="text-7xl font-bold text-white">
                    {avg7Day}
                  </div>
                  <p className="mt-4 text-white text-xl font-semibold">
                    {getScoreInfo(avg7Day).label}
                  </p>
                </div>

                {last7Days.length > 0 ? (
                  <div className="mt-6">
                    {render7DayBars()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70 text-sm">
                    Complete more check-ins to see trends
                  </div>
                )}
              </div>
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
              className={`p-6 ${getScoreInfo(avg30Day).bgColor}`}
              style={{ minHeight: '280px' }}
            >
              {/* 30-Day Average View */}
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-white/90 text-sm font-medium">30-Day Average</p>
                  <div className="text-7xl font-bold text-white">
                    {avg30Day}
                  </div>
                  <p className="mt-4 text-white text-xl font-semibold">
                    {getScoreInfo(avg30Day).label}
                  </p>
                </div>

                {last30Days.length > 0 ? (
                  <div className="mt-6">
                    {render30DayBars()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70 text-sm">
                    Complete more check-ins to see trends
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Dots Indicator */}
      <div className={`flex items-center justify-center gap-2 py-4 ${
        activeView === 'current' ? getScoreInfo(currentScore).bgColor : 
        activeView === '7day' ? getScoreInfo(avg7Day).bgColor : 
        getScoreInfo(avg30Day).bgColor
      }`}>
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
    </Card>
  );
}


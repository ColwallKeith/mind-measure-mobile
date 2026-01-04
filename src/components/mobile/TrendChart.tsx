import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DataPoint {
  date: string;
  score: number;
  label?: string;
}

interface TrendChartProps {
  last7CheckIns: DataPoint[];
  weeklyAverages: DataPoint[]; // 10 weeks
  monthlyAverages: DataPoint[]; // 12 months
}

type ChartView = 'last7' | 'weekly' | 'monthly';

export function TrendChart({ last7CheckIns, weeklyAverages, monthlyAverages }: TrendChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('last7');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const views: Array<{ key: ChartView; title: string; subtitle: string; data: DataPoint[] }> = [
    {
      key: 'last7',
      title: 'Last 7 Check-ins',
      subtitle: 'Your most recent scores',
      data: last7CheckIns
    },
    {
      key: 'weekly',
      title: 'Weekly Averages',
      subtitle: 'Last 10 weeks',
      data: weeklyAverages
    },
    {
      key: 'monthly',
      title: 'Monthly Averages',
      subtitle: 'Last 12 months',
      data: monthlyAverages
    }
  ];

  const currentViewIndex = views.findIndex(v => v.key === activeView);
  const currentView = views[currentViewIndex];

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
    
    if (isLeftSwipe && currentViewIndex < views.length - 1) {
      setActiveView(views[currentViewIndex + 1].key);
    }
    if (isRightSwipe && currentViewIndex > 0) {
      setActiveView(views[currentViewIndex - 1].key);
    }
  };

  const handlePrevious = () => {
    if (currentViewIndex > 0) {
      setActiveView(views[currentViewIndex - 1].key);
    }
  };

  const handleNext = () => {
    if (currentViewIndex < views.length - 1) {
      setActiveView(views[currentViewIndex + 1].key);
    }
  };

  // Calculate max score for scaling
  const maxScore = 100;
  const minScore = 0;

  // Get color for score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Calculate trend
  const calculateTrend = (data: DataPoint[]) => {
    if (data.length < 2) return null;
    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));
    
    const recentAvg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.score, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    if (Math.abs(diff) < 3) return { direction: 'stable', value: 0 };
    return { direction: diff > 0 ? 'improving' : 'declining', value: Math.round(diff) };
  };

  const trend = calculateTrend(currentView.data);

  // Format label based on view type
  const formatLabel = (date: string, viewType: ChartView) => {
    const d = new Date(date);
    if (viewType === 'last7') {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    if (viewType === 'weekly') {
      return `W${Math.ceil(d.getDate() / 7)}`;
    }
    return d.toLocaleDateString('en-GB', { month: 'short' });
  };

  return (
    <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">{currentView.title}</h3>
          <p className="text-gray-600 text-sm">{currentView.subtitle}</p>
        </div>
        
        {/* Trend Badge */}
        {trend && (
          <Badge className={`${
            trend.direction === 'improving' ? 'bg-green-100 text-green-700' :
            trend.direction === 'declining' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          } border-0`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${
              trend.direction === 'declining' ? 'rotate-180' : 
              trend.direction === 'stable' ? 'rotate-90' : ''
            }`} />
            {trend.direction === 'stable' ? 'Stable' : 
             trend.direction === 'improving' ? `+${trend.value}` : 
             trend.value}
          </Badge>
        )}
      </div>

      {/* Chart Container with Touch Handlers */}
      <div
        className="relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentView.data.length > 0 ? (
              <div className="space-y-4">
                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-2 h-40">
                  {currentView.data.slice(0, 10).map((point, index) => {
                    const height = ((point.score - minScore) / (maxScore - minScore)) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end h-32">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={`w-full ${getBarColor(point.score)} rounded-t-lg relative group`}
                          >
                            {/* Score tooltip on hover/touch */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                {point.score}
                              </div>
                            </div>
                          </motion.div>
                        </div>
                        <span className="text-xs text-gray-600 text-center">
                          {formatLabel(point.date, activeView)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Average Score */}
                <div className="pt-4 border-t border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Average</span>
                    <span className={`text-2xl font-bold ${getScoreColor(
                      Math.round(currentView.data.reduce((sum, d) => sum + d.score, 0) / currentView.data.length)
                    )}`}>
                      {Math.round(currentView.data.reduce((sum, d) => sum + d.score, 0) / currentView.data.length)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Not enough data yet</p>
                <p className="text-gray-500 text-xs mt-1">Complete more check-ins to see trends</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentViewIndex === 0}
          className={`p-1 rounded-full ${
            currentViewIndex === 0 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-2">
          {views.map((view, index) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`h-2 rounded-full transition-all ${
                activeView === view.key
                  ? 'w-6 bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentViewIndex === views.length - 1}
          className={`p-1 rounded-full ${
            currentViewIndex === views.length - 1 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
}


import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  lastUpdated: string;
  trend?: 'up' | 'down' | 'stable';
}

export function ScoreCard({ score, lastUpdated, trend = 'stable' }: ScoreCardProps) {
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

  const colorScheme = colorSchemes[getScoreColor(score)];

  return (
    <Card className={`relative overflow-hidden border-0 shadow-2xl backdrop-blur-xl bg-gradient-to-br ${colorScheme.gradient} text-white p-6 transform transition-all duration-300 hover:scale-105`}>
      {/* Dynamic background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bgOverlay}`} />
      
      {/* Animated background elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
      
      <div className="relative z-10 text-center">
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
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-2/3 w-1 h-1 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
    </Card>
  );
}

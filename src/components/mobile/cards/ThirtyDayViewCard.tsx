interface ThirtyDayViewCardProps {
  baselineScore: number;
  monthData: number[];
  averageScore?: number;
}

export function ThirtyDayViewCard({ 
  baselineScore, 
  monthData,
  averageScore
}: ThirtyDayViewCardProps) {
  const maxValue = 100;
  
  // Calculate average if not provided
  const calculatedAverage = averageScore ?? Math.round(monthData.reduce((sum, val) => sum + val, 0) / monthData.length);
  
  // Calculate bar heights as percentages
  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100;
  };
  
  // Calculate baseline position
  const baselinePosition = ((maxValue - baselineScore) / maxValue) * 100;
  
  // Show day labels at intervals (1, 8, 15, 22, 29)
  const dayLabels = [1, 8, 15, 22, 29];
  
  return (
    <div className="w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-[#5B8FED] to-[#6BA3FF] p-6 shadow-lg">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-white/90 tracking-wider mb-6">THIRTY DAY VIEW</h2>
        
        {/* Scores Display - Outside graph */}
        <div className="flex gap-8 mb-4">
          {/* Baseline Score */}
          <div>
            <div className="text-white/90 tracking-wider text-sm mb-1">BASELINE SCORE</div>
            <div className="text-white text-5xl">
              {baselineScore}
            </div>
          </div>
          
          {/* Average Score */}
          <div>
            <div className="text-white/90 tracking-wider text-sm mb-1">AVERAGE SCORE</div>
            <div className="text-white text-5xl">
              {calculatedAverage}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="relative">
        {/* Chart Container */}
        <div className="relative h-64">
          {/* Y-axis labels on right */}
          <div className="absolute -right-1 top-0 bottom-0 flex flex-col justify-between text-white/70 text-sm">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 right-12 flex flex-col justify-between pointer-events-none">
            <div className="w-full h-px bg-white/10" />
            <div className="w-full h-px bg-white/10" />
            <div className="w-full h-px bg-white/10" />
          </div>
          
          {/* Baseline Line */}
          <div 
            className="absolute left-0 right-12 h-1 bg-gradient-to-r from-[#FFA726] to-[#FFB74D] rounded-full z-10"
            style={{ top: `${baselinePosition}%` }}
          />
          
          {/* Bars Container */}
          <div className="absolute inset-0 right-12 flex items-end justify-between gap-[2px] px-1">
            {monthData.map((value, index) => (
              <div key={index} className="flex-1 flex items-end justify-center min-w-0">
                {/* Bar */}
                <div 
                  className="w-full bg-white/90 rounded-t-sm transition-all duration-300"
                  style={{ 
                    height: `${getBarHeight(value)}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis Day Labels - Show at intervals */}
        <div className="relative mt-3 mr-12">
          <div className="flex justify-between">
            {dayLabels.map((day) => (
              <span key={day} className="text-white/90 text-sm">
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


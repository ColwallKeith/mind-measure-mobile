interface CurrentScoreCardProps {
  score: number;
  status?: string;
  message?: string;
  lastUpdated?: string;
}

export function CurrentScoreCard({ 
  score, 
  status = "Good",
  message = "You're doing well today.",
  lastUpdated = "04/01/2026"
}: CurrentScoreCardProps) {
  
  // Debug: Log what we're receiving
  console.log('CurrentScoreCard rendering with:', { score, status, message, lastUpdated });
  
  // Determine status based on score if not provided
  const getStatus = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Great";
    if (score >= 60) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Attention";
  };
  
  const displayStatus = status || getStatus(score);
  
  return (
    <div className="w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-[#5B8FED] to-[#6BA3FF] p-6 shadow-lg">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-white/90 tracking-wider mb-8">CURRENT SCORE</h2>
      </div>
      
      {/* Score Display */}
      <div className="flex flex-col items-center justify-center py-8">
        {/* Large Score Number */}
        <div className="text-white text-[120px] leading-none mb-4">
          {score}
        </div>
        
        {/* Status Text */}
        <div className="text-white text-3xl mb-6">
          {displayStatus}
        </div>
        
        {/* Message */}
        <div className="text-white/90 text-lg mb-2">
          {message}
        </div>
        
        {/* Last Updated */}
        <div className="text-white/60 text-sm">
          Last updated: {lastUpdated}
        </div>
      </div>
    </div>
  );
}


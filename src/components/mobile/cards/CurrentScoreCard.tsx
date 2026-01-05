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
    <div style={{
      width: '100%',
      maxWidth: '448px',
      margin: '0 auto',
      borderRadius: '24px',
      overflow: 'hidden',
      background: 'linear-gradient(to bottom right, #5B8FED, #6BA3FF)',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          letterSpacing: '0.05em', 
          marginBottom: '32px',
          fontSize: '14px',
          fontWeight: '400'
        }}>
          CURRENT SCORE
        </h2>
      </div>
      
      {/* Score Display */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingTop: '32px',
        paddingBottom: '32px'
      }}>
        {/* Large Score Number */}
        <div style={{ 
          color: 'white', 
          fontSize: '120px', 
          lineHeight: '1',
          marginBottom: '16px',
          fontWeight: '700'
        }}>
          {score}
        </div>
        
        {/* Status Text */}
        <div style={{ 
          color: 'white', 
          fontSize: '30px',
          marginBottom: '24px',
          fontWeight: '400'
        }}>
          {displayStatus}
        </div>
        
        {/* Message */}
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '18px',
          marginBottom: '8px'
        }}>
          {message}
        </div>
        
        {/* Last Updated */}
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '14px'
        }}>
          Last updated: {lastUpdated}
        </div>
      </div>
    </div>
  );
}

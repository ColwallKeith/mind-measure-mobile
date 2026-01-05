interface SevenDayViewCardProps {
  baselineScore: number;
  weekData: number[];
  averageScore?: number;
}

export function SevenDayViewCard({ 
  baselineScore, 
  weekData,
  averageScore
}: SevenDayViewCardProps) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const maxValue = 100;
  
  // Calculate average if not provided
  const calculatedAverage = averageScore ?? Math.round(weekData.reduce((sum, val) => sum + val, 0) / weekData.length);
  
  // Calculate bar heights as percentages
  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100;
  };
  
  // Calculate baseline position
  const baselinePosition = ((maxValue - baselineScore) / maxValue) * 100;
  
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
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          letterSpacing: '0.05em', 
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: '400'
        }}>
          SEVEN DAY VIEW
        </h2>
        
        {/* Scores Display - Outside graph */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
          {/* Baseline Score */}
          <div>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              letterSpacing: '0.05em', 
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              BASELINE SCORE
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '48px',
              lineHeight: '1',
              fontWeight: '700'
            }}>
              {baselineScore}
            </div>
          </div>
          
          {/* Average Score */}
          <div>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              letterSpacing: '0.05em', 
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              AVERAGE SCORE
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '48px',
              lineHeight: '1',
              fontWeight: '700'
            }}>
              {calculatedAverage}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Area */}
      <div style={{ position: 'relative' }}>
        {/* Chart Container */}
        <div style={{ position: 'relative', height: '256px' }}>
          {/* Y-axis labels on right */}
          <div style={{ 
            position: 'absolute', 
            right: '-4px', 
            top: 0, 
            bottom: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px'
          }}>
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          
          {/* Baseline Line */}
          <div style={{ 
            position: 'absolute', 
            left: 0, 
            right: '48px',
            height: '4px',
            background: 'linear-gradient(to right, #FFA726, #FFB74D)',
            borderRadius: '9999px',
            zIndex: 10,
            top: `${baselinePosition}%`
          }} />
          
          {/* Bars Container */}
          <div style={{ 
            position: 'absolute', 
            inset: 0,
            right: '48px',
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'space-around', 
            gap: '8px'
          }}>
            {weekData.map((value, index) => (
              <div key={index} style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'center' 
              }}>
                {/* Bar */}
                <div style={{ 
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px',
                  transition: 'all 0.3s',
                  height: `${getBarHeight(value)}%`,
                  minHeight: '8px'
                }} />
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis Day Labels - Lower position */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          gap: '8px', 
          marginTop: '12px',
          marginRight: '48px'
        }}>
          {days.map((day, index) => (
            <span key={index} style={{ 
              flex: 1, 
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px'
            }}>
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

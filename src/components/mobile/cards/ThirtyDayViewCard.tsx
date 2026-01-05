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
          THIRTY DAY VIEW
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
          
          {/* Horizontal grid lines */}
          <div style={{ 
            position: 'absolute',
            inset: 0,
            right: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}>
            <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
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
            justifyContent: 'space-between', 
            gap: '2px',
            paddingLeft: '4px',
            paddingRight: '4px'
          }}>
            {monthData.map((value, index) => (
              <div key={index} style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'center',
                minWidth: 0
              }}>
                {/* Bar */}
                <div style={{ 
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderTopLeftRadius: '2px',
                  borderTopRightRadius: '2px',
                  transition: 'all 0.3s',
                  height: `${getBarHeight(value)}%`,
                  minHeight: '4px'
                }} />
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis Day Labels - Show at intervals */}
        <div style={{ position: 'relative', marginTop: '12px', marginRight: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {dayLabels.map((day) => (
              <span key={day} style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px'
              }}>
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

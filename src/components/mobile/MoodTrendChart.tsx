import { useState } from 'react';

interface MoodTrendChartProps {
  data: Array<{ date: string; score: number }>;
}

export function MoodTrendChart({ data }: MoodTrendChartProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  // Filter data based on period
  const filterDataByPeriod = (days: number) => {
    if (data.length === 0) return [];
    
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return data.filter(d => new Date(d.date) >= cutoff).reverse();
  };

  const getDataForPeriod = () => {
    switch (period) {
      case '7d':
        return filterDataByPeriod(7);
      case '30d':
        return filterDataByPeriod(30);
      case '90d':
        return filterDataByPeriod(90);
      default:
        return [];
    }
  };

  const chartData = getDataForPeriod();

  if (chartData.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999999',
        fontSize: '14px'
      }}>
        {data.length === 0 
          ? 'Complete check-ins to see your mood trends'
          : `No data available for the last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}`
        }
      </div>
    );
  }

  // Calculate chart dimensions
  const width = 100; // percentage
  const height = 120; // pixels
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxScore = 10;
  const minScore = 0;

  // Create SVG points
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
    const y = padding.top + ((maxScore - d.score) / (maxScore - minScore)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      {/* Period Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={() => setPeriod('7d')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: period === '7d' ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' : '#F5F5F5',
            color: period === '7d' ? 'white' : '#666666'
          }}
        >
          7 Days
        </button>
        <button
          onClick={() => setPeriod('30d')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: period === '30d' ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' : '#F5F5F5',
            color: period === '30d' ? 'white' : '#666666'
          }}
        >
          30 Days
        </button>
        <button
          onClick={() => setPeriod('90d')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: period === '90d' ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' : '#F5F5F5',
            color: period === '90d' ? 'white' : '#666666'
          }}
        >
          90 Days
        </button>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height: `${height}px`,
          overflow: 'visible'
        }}
      >
        {/* Grid lines */}
        {[0, 2.5, 5, 7.5, 10].map((value) => {
          const y = padding.top + ((maxScore - value) / (maxScore - minScore)) * chartHeight;
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#F0F0F0"
                strokeWidth="0.5"
              />
              <text
                x={padding.left - 5}
                y={y + 2}
                textAnchor="end"
                fontSize="8"
                fill="#999999"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Area under line */}
        <polygon
          points={`${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`}
          fill="url(#areaGradient)"
        />

        {/* Data points */}
        {chartData.map((d, i) => {
          const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
          const y = padding.top + ((maxScore - d.score) / (maxScore - minScore)) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill="#5B8FED"
              stroke="white"
              strokeWidth="1"
            />
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5B8FED" />
            <stop offset="100%" stopColor="#6BA3FF" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5B8FED" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6BA3FF" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* Stats below chart */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        fontSize: '12px',
        color: '#666666'
      }}>
        <div>
          <span style={{ fontWeight: '600', color: '#1a1a1a' }}>
            {Math.round((chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length) * 10) / 10}
          </span>
          {' '}avg
        </div>
        <div>
          {chartData.length} check-ins
        </div>
      </div>
    </div>
  );
}


import { CurrentScoreCard } from './components/CurrentScoreCard';
import { SevenDayViewCard } from './components/SevenDayViewCard';
import { ThirtyDayViewCard } from './components/ThirtyDayViewCard';

export default function App() {
  // Sample data for 7 day view
  const weekData = [35, 72, 85, 48, 90, 95, 55];
  
  // Sample data for 30 day view
  const monthData = [
    65, 45, 40, 58, 62, 60, 55, 50, 48, 63,
    67, 65, 70, 48, 45, 72, 75, 55, 60, 85,
    65, 55, 52, 48, 62, 68, 95, 88, 70, 50
  ];
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      gap: '32px'
    }}>
      <CurrentScoreCard 
        score={66}
        status="Good"
        message="You're doing well today."
        lastUpdated="04/01/2026"
      />
      
      <SevenDayViewCard 
        baselineScore={65}
        weekData={weekData}
      />
      
      <ThirtyDayViewCard 
        baselineScore={65}
        monthData={monthData}
      />
    </div>
  );
}
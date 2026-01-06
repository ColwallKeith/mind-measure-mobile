import { WordCloud } from './WordCloud';

interface ThemeData {
  text: string;
  value: number;
}

interface KeyThemesProps {
  themes?: ThemeData[];
  title?: string;
  subtitle?: string;
  height?: string;
  showHeader?: boolean;
}

export function KeyThemes({ 
  themes, 
  title = 'Key Themes',
  subtitle = 'Top 10',
  height = '280px',
  showHeader = true
}: KeyThemesProps) {
  // Default mock data if no themes provided
  const defaultThemes: ThemeData[] = [
    { text: 'Stress', value: 45 },
    { text: 'Anxiety', value: 38 },
    { text: 'Sleep', value: 32 },
    { text: 'Work', value: 28 },
    { text: 'Focus', value: 25 },
    { text: 'Motivation', value: 22 },
    { text: 'Social', value: 18 },
    { text: 'Exercise', value: 15 },
    { text: 'Diet', value: 12 },
    { text: 'Mood', value: 10 }
  ];

  const displayThemes = themes || defaultThemes;

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      width: '100%'
    }}>
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
            {title}
          </span>
          <span style={{
            fontSize: '12px',
            color: '#999999'
          }}>
            {subtitle}
          </span>
        </div>
      )}
      <div style={{
        height: height,
        width: '100%',
        position: 'relative'
      }}>
        <WordCloud words={displayThemes} />
      </div>
    </div>
  );
}

// Export the ThemeData type for use in other components
export type { ThemeData };

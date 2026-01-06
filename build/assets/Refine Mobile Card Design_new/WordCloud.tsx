import { useMemo } from 'react';

interface Word {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: Word[];
  colors?: string[];
}

export function WordCloud({ words, colors = ['#5B8FED', '#6BA3FF', '#7FB8FF', '#93CCFF', '#A7E0FF'] }: WordCloudProps) {
  const processedWords = useMemo(() => {
    // Sort by value to get consistent positioning
    const sorted = [...words].sort((a, b) => b.value - a.value);
    const maxValue = sorted[0]?.value || 1;
    const minValue = sorted[sorted.length - 1]?.value || 1;
    
    return sorted.map((word, index) => {
      // Calculate font size based on value (16px to 48px range)
      const normalized = (word.value - minValue) / (maxValue - minValue || 1);
      const fontSize = 16 + (normalized * 32);
      
      // Assign color based on index
      const color = colors[index % colors.length];
      
      return {
        ...word,
        fontSize,
        color
      };
    });
  }, [words, colors]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '20px',
      height: '100%',
      width: '100%'
    }}>
      {processedWords.map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          style={{
            fontSize: `${word.fontSize}px`,
            fontWeight: '600',
            color: word.color,
            lineHeight: '1.2',
            transition: 'transform 0.2s',
            cursor: 'default',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}

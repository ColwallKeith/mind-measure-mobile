interface WordCloudProps {
  themes: Array<{
    word: string;
    frequency: number;
  }>;
}

export function WordCloud({ themes }: WordCloudProps) {
  const maxFrequency = Math.max(...themes.map(t => t.frequency));
  
  const getWordSize = (frequency: number) => {
    const ratio = frequency / maxFrequency;
    if (ratio > 0.8) return 'text-2xl';
    if (ratio > 0.6) return 'text-xl';
    if (ratio > 0.4) return 'text-lg';
    if (ratio > 0.2) return 'text-base';
    return 'text-sm';
  };

  const getWordOpacity = (frequency: number) => {
    const ratio = frequency / maxFrequency;
    if (ratio > 0.8) return 'opacity-100';
    if (ratio > 0.6) return 'opacity-90';
    if (ratio > 0.4) return 'opacity-80';
    if (ratio > 0.2) return 'opacity-70';
    return 'opacity-60';
  };

  const getWordColor = (frequency: number) => {
    const ratio = frequency / maxFrequency;
    if (ratio > 0.8) return 'text-purple-600';
    if (ratio > 0.6) return 'text-blue-600';
    if (ratio > 0.4) return 'text-indigo-600';
    if (ratio > 0.2) return 'text-slate-600';
    return 'text-gray-500';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 border-0 shadow-xl backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap gap-3 justify-center items-center min-h-[120px]">
          {themes.map((theme, index) => (
            <span
              key={theme.word}
              className={`
                transition-all duration-300 hover:scale-110 cursor-pointer
                ${getWordSize(theme.frequency)}
                ${getWordOpacity(theme.frequency)}
                ${getWordColor(theme.frequency)}
                hover:text-purple-700
              `}
              style={{
                transform: `rotate(${(index % 3 - 1) * 5}deg)`,
                animationDelay: `${index * 100}ms`
              }}
            >
              {theme.word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
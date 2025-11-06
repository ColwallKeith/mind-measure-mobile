import React from "react";
interface TopicsChipsProps { topics: string[] }
export default function TopicsChips({ topics }: TopicsChipsProps) {
  if (!topics || topics.length === 0) return null;
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-3 pr-4 py-1">
        {topics.slice(0, 6).map((t, i) => (
          <span key={i} className="whitespace-nowrap rounded-full border border-input px-3 py-1.5 text-xs text-foreground/80 bg-background">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

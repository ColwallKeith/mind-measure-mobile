import React from "react";
interface InsightsSectionProps {
  summary?: string;
  helped?: string[];
  weighed?: string[];
}
export default function InsightsSection({ summary, helped = [], weighed = [] }: InsightsSectionProps) {
  return (
    <section className="px-4 space-y-4">
      {summary && (
        <div>
          <h3 className="text-sm font-medium mb-2">Conversation summary</h3>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      )}
      {(helped.length > 0 || weighed.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {helped.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2">What helped</h4>
              <div className="flex flex-wrap gap-1.5">
                {helped.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary/40">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weighed.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2">What weighed on you</h4>
              <div className="flex flex-wrap gap-1.5">
                {weighed.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

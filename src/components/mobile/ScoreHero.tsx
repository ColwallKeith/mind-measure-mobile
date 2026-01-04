import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getScoreBand, getBandColor } from "@/lib/scoreBands";
interface ScoreHeroProps {
  score: number | null;
  onStart: () => void;
}
export default function ScoreHero({ score, onStart }: ScoreHeroProps) {
  const s = typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const radius = 56; // fits 128x128 svg nicely
  const circumference = 2 * Math.PI * radius;
  const progress = s != null ? (s / 100) * circumference : 0;
  const band = s != null ? getScoreBand(s) : null;
  const ringColor = band ? `hsl(var(--${getBandColor(band)}))` : "hsl(var(--primary))";
  const status = (() => {
    if (s == null) return "Ready for your wellness check-in";
    if (band === "excellent") return "You're in a good headspace today";
    if (band === "teal") return "You're doing well — keep it up";
    if (band === "caution") return "Taking care of yourself today";
    if (band === "warning") return "Remember to be kind to yourself";
    return "Let's focus on your wellbeing today";
  })();
  return (
    <section aria-labelledby="score-hero" className="mx-4 mt-6">
      <div className="glass-surface rounded-3xl p-8 border border-border/30 shadow-xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 aura-grid opacity-30" aria-hidden="true" />
        <div className="relative flex flex-col items-center text-center animate-fade-in">
          <h2 id="score-hero" className="text-lg font-semibold text-foreground mb-6">Today's Wellness Score</h2>
          {/* Enhanced score gauge - 30% larger */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-30"
              style={{ backgroundColor: ringColor }}
            />
            <svg width="208" height="208" viewBox="0 0 208 208" role="img" aria-label="Score gauge" className="relative">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: ringColor, stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: ringColor, stopOpacity: 0.6 }} />
                </linearGradient>
              </defs>
              <circle cx="104" cy="104" r={radius + 8} stroke="hsl(var(--muted) / 0.3)" strokeWidth="3" fill="none" />
              <circle
                cx="104"
                cy="104"
                r={radius + 8}
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                transform="rotate(-90 104 104)"
                style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' }}
              />
              <text x="104" y="114" textAnchor="middle" className="font-bold fill-foreground" style={{ fontSize: 46 }}>
                {s != null ? `${s}` : "--"}
              </text>
              <text x="104" y="142" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 18 }}>
                {s != null ? "/ 100" : ""}
              </text>
            </svg>
          </div>
          <div className="mb-6 max-w-sm">
            <p className="text-sm text-muted-foreground leading-relaxed">{status}</p>
          </div>
          <div className="w-full space-y-3">
            <Button
              onClick={onStart}
              className="w-full h-12 text-base font-medium rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${ringColor} 0%, ${ringColor}dd 100%)`,
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              Start Quick Check-in
            </Button>
            <Button asChild className="w-full h-11 rounded-xl" variant="secondary">
              <Link to="/help" aria-label="Find UK mental health support" className="text-sm font-medium">
                Find Support (UK)
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
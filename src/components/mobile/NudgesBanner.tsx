import React from "react";
import { Button } from "@/components/ui/button";
interface NudgesBannerProps {
  score: number | null;
  onNotifyBuddies: () => void;
}
const DEFAULT_NUDGES = [
  "Step outside for 10 minutes",
  "Message a friend",
  "Drink some water",
];
export default function NudgesBanner({ score, onNotifyBuddies }: NudgesBannerProps) {
  if (score == null) return null;
  if (score < 35) {
    return (
      <div className="glass-surface rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-destructive mt-0.5 animate-pulse" />
          <div>
            <h3 className="font-medium text-destructive mb-1">We're concerned about you</h3>
            <p className="text-sm text-destructive/80">Your score suggests you might be struggling. Consider reaching out to your support network.</p>
          </div>
        </div>
        <Button
          onClick={onNotifyBuddies}
          variant="destructive"
          className="w-full h-11 rounded-xl font-medium"
        >
          Alert Your Buddies
        </Button>
      </div>
    );
  }
  if (score < 60) {
    return (
      <div className="glass-surface rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-primary mt-0.5" />
          <div>
            <h3 className="font-medium text-primary mb-1">Small steps can help</h3>
            <p className="text-sm text-muted-foreground mb-3">Here are some gentle suggestions that might lift your mood:</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_NUDGES.map((n, i) => (
            <span
              key={i}
              className="text-xs px-3 py-2 rounded-full bg-primary/10 text-primary/80 border border-primary/20 font-medium"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

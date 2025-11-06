import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export type TrendRange = "W" | "M";
interface TrendRangeToggleProps {
  value: TrendRange;
  onChange: (val: TrendRange) => void;
  size?: "default" | "sm";
}
export default function TrendRangeToggle({ value, onChange, size = "default" }: TrendRangeToggleProps) {
  const isSmall = size === "sm";
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as TrendRange)}
      className={`justify-center bg-muted/30 rounded-lg ${isSmall ? 'p-0.5' : 'p-1'}`}
    >
      <ToggleGroupItem
        value="W"
        aria-label="Show last week"
        className={`data-[state=on]:bg-primary/20 data-[state=on]:text-primary text-muted-foreground hover:bg-muted/50 transition-colors ${isSmall ? 'text-xs px-2 py-1 h-7' : ''}`}
      >
        Week
      </ToggleGroupItem>
      <ToggleGroupItem
        value="M"
        aria-label="Show last month"
        className={`data-[state=on]:bg-primary/20 data-[state=on]:text-primary text-muted-foreground hover:bg-muted/50 transition-colors ${isSmall ? 'text-xs px-2 py-1 h-7' : ''}`}
      >
        Month
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

interface StreakChipProps {
  count: number
}
export function StreakChip({ count }: StreakChipProps) {
  if (!count) return null
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-3 py-1.5 text-sm font-medium">
      <span className="text-base">🔥</span>
      <span>{count} day{count > 1 ? 's' : ''}</span>
    </div>
  )
}
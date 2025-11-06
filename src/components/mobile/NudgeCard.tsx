import { Button } from '@/components/ui/button'
import { Clock, X } from 'lucide-react'
import { Nudge } from '@/hooks/useNudges'
interface NudgeCardProps {
  nudge: Nudge | null
  onDo: () => void
  onSnooze: (days: number) => void
  onDismiss: () => void
  loading?: boolean
}
export function NudgeCard({ nudge, onDo, onSnooze, onDismiss, loading }: NudgeCardProps) {
  if (!nudge) return null
  return (
    <div className="glass-surface rounded-2xl border border-primary/20 bg-primary/5 p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">{nudge.text}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              onClick={onDo}
              size="sm"
              className="h-8 px-3 text-xs font-medium rounded-lg"
              disabled={loading}
            >
              Do this
            </Button>
            <Button
              onClick={() => onSnooze(3)}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              <Clock className="w-3 h-3 mr-1" />
              Later
            </Button>
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              <X className="w-3 h-3 mr-1" />
              Not relevant
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
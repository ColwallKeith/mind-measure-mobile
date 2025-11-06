import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Heart, MessageCircle } from 'lucide-react'
interface BuddyOfferModalProps {
  open: boolean
  onAccept: () => void
  onDecline: () => void
  loading?: boolean
}
export function BuddyOfferModal({ open, onAccept, onDecline, loading }: BuddyOfferModalProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Want to notify your buddy?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Your recent scores suggest you might appreciate a check-in. We can
            let your trusted contact know you could use some support.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={onAccept}
            disabled={loading}
            className="w-full h-11 rounded-xl font-medium"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Yes, notify my buddy
          </Button>
          <Button
            onClick={onDecline}
            variant="ghost"
            disabled={loading}
            className="w-full h-11 rounded-xl font-medium"
          >
            Not right now
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Your buddy will receive a caring message letting them know you might benefit from support.
        </p>
      </DialogContent>
    </Dialog>
  )
}
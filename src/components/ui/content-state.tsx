import { ArrowRight, CircleAlert, LoaderCircle, Search } from 'lucide-react'
import { Button } from './button'

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return <div aria-label="Loading videos" className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {Array.from({ length: count }, (_, index) => <div key={index} className="animate-pulse">
      <div className="aspect-video rounded-[22px] bg-raised shadow-inset-sm" />
      <div className="mt-4 flex gap-3"><div className="size-9 rounded-full bg-raised" /><div className="flex-1 space-y-2"><div className="h-3 w-4/5 rounded bg-raised" /><div className="h-2.5 w-2/5 rounded bg-raised" /><div className="h-2.5 w-3/5 rounded bg-raised" /></div></div>
    </div>)}
  </div>
}

export function LoadingState({ label = 'Loading your videos' }: { label?: string }) {
  return <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted"><LoaderCircle className="size-6 animate-spin text-brand" /><span>{label}</span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="neumorphic mx-auto flex max-w-xl flex-col items-center rounded-[26px] border border-line/60 px-7 py-9 text-center shadow-soft">
    <span className="flex size-11 items-center justify-center rounded-full bg-red-400/10 text-red-300"><CircleAlert className="size-5" /></span>
    <h2 className="mt-4 text-base font-bold text-ink">We hit a small snag</h2>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{message}</p>
    {onRetry && <Button onClick={onRetry} className="mt-5" variant="outline" size="sm">Try again <ArrowRight className="size-3.5" /></Button>}
  </div>
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="neumorphic flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-line/60 px-6 py-10 text-center shadow-soft">
    <span className="flex size-12 items-center justify-center rounded-2xl bg-lifted text-brand shadow-soft-sm"><Search className="size-5" /></span>
    <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
    {action && onAction && <Button variant="raised" size="sm" className="mt-5" onClick={onAction}>{action}</Button>}
  </div>
}

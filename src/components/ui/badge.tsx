import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/75 px-3 py-1 text-[11px] font-semibold tracking-wide text-muted', className)} {...props} />
}

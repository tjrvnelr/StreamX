import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Check, CircleAlert, X } from 'lucide-react'
import { IconButton } from './button'
import { ToastContext, type ToastKind } from './toast-context'

type ToastItem = { id: number; message: string; kind: ToastKind }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, message, kind }].slice(-4))
    window.setTimeout(() => dismiss(id), 4200)
  }, [dismiss])
  const value = useMemo(() => ({ toast }), [toast])
  return <ToastContext.Provider value={value}>
    {children}
    <div aria-live="polite" aria-relevant="additions removals" className="fixed bottom-5 right-4 z-[100] flex w-[min(94vw,370px)] flex-col gap-2 sm:right-6">
      {items.map((item) => <div key={item.id} role={item.kind === 'error' ? 'alert' : 'status'} className="neumorphic flex items-start gap-3 rounded-2xl border border-line/70 px-4 py-3.5 shadow-soft-lg">
        {item.kind === 'success' ? <Check className="mt-0.5 size-4 shrink-0 text-mint" /> : <CircleAlert className={`mt-0.5 size-4 shrink-0 ${item.kind === 'error' ? 'text-red-300' : 'text-violet'}`} />}
        <p className="flex-1 text-xs leading-5 text-ink">{item.message}</p>
        <IconButton aria-label="Dismiss message" size="icon" variant="ghost" className="-mr-2 -mt-1 size-7" onClick={() => dismiss(item.id)}><X className="size-3.5" /></IconButton>
      </div>)}
    </div>
  </ToastContext.Provider>
}

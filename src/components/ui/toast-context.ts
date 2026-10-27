import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastContextValue = { toast: (message: string, kind?: ToastKind) => void }
export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

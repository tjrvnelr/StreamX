import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const inputClasses = 'w-full rounded-2xl border border-line/70 bg-surface px-4 text-sm text-ink shadow-inset-sm placeholder:text-dim focus:border-violet/60 focus:outline-none focus:ring-2 focus:ring-violet/20 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClasses, 'h-11', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(inputClasses, 'min-h-32 resize-y py-3 leading-6', className)} {...props} />
})

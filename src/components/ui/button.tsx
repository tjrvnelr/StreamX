import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-[transform,background-color,box-shadow,color] duration-150 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-px',
  {
    variants: {
      variant: {
        primary: 'bg-violet text-[#17151d] shadow-accent hover:bg-violet/90',
        raised: 'neumorphic text-ink hover:bg-lifted',
        ghost: 'text-muted hover:bg-lifted/70 hover:text-ink',
        outline: 'border border-line bg-surface text-ink hover:bg-lifted',
        danger: 'bg-red-500/10 text-red-300 hover:bg-red-500/20',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-sm',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'raised', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
})

export function IconButton({ className, ...props }: ButtonProps & { 'aria-label': string }) {
  return <Button size="icon" className={cn('rounded-full', className)} {...props} />
}

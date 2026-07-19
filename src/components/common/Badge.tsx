import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type BadgeVariant = 'primary' | 'secondary' | 'destructive' | 'warning' | 'success' | 'outline'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
  destructive: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  outline: 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))]',
}

export function Badge({ children, variant = 'secondary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

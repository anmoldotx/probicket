import type { ReactNode } from 'react'

type BadgeVariant = 'green' | 'yellow' | 'surface'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  green:   'border border-green text-green',
  yellow:  'border border-yellow text-yellow',
  surface: 'border border-border text-muted',
}

export function Badge({ children, variant = 'surface', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full',
        'font-body text-xs font-medium tracking-wide uppercase',
        styles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

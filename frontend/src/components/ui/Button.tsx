'use client'

import { motion } from 'motion/react'
import { SPRING } from '@/lib/motion'

type Variant = 'green' | 'yellow' | 'ghost'

interface ButtonProps {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  className?: string
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<Variant, string> = {
  green:  'border border-green text-green hover:bg-green hover:text-bg',
  yellow: 'border border-yellow text-yellow hover:bg-yellow hover:text-bg',
  ghost:  'border border-border text-muted hover:border-text hover:text-text',
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function Button({
  variant = 'yellow',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      transition={SPRING}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'relative inline-flex items-center justify-center gap-2',
        'font-body font-medium rounded-lg cursor-pointer',
        'transition-colors duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  )
}

import type { ReactNode } from 'react'

type StampProps = {
  children: ReactNode
  tone?: 'muted' | 'dead'
  className?: string
}

const TONE: Record<'muted' | 'dead', string> = {
  muted: 'border-line text-muted',
  dead: 'border-dead text-dead -rotate-12',
}

export function Stamp({ children, tone = 'muted', className = '' }: StampProps) {
  return (
    <span
      data-tone={tone}
      className={`inline-block border px-3 py-1 font-mono text-xs tracking-widest ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

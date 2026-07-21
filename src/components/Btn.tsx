import type { ReactNode } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface BtnProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: BtnVariant
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const BASE = 'inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold transition whitespace-nowrap'

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-[#5a3b2e] text-white hover:bg-[#462a20] disabled:bg-slate-300 disabled:cursor-not-allowed',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'border border-[#5a3b2e] bg-transparent text-[#5a3b2e] hover:bg-[#f6ead8]',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

export default function Btn({ children, onClick, disabled, variant = 'primary', type = 'button', className = '' }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

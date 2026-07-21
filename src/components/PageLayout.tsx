import type { ReactNode } from 'react'

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto w-full app-container px-8 py-8">
        {children}
      </div>
    </div>
  )
}

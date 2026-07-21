interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#5a3b2e]">{value}</p>
      {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

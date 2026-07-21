type Page = 'content' | 'sponsorship' | 'products' | 'shipping' | 'creators' | 'searchTrend'

interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'content', label: '콘텐츠 성과', icon: '📊' },
  { id: 'sponsorship', label: '협찬 관리', icon: '🤝' },
  { id: 'products', label: '제품 DB', icon: '🛍️' },
  { id: 'shipping', label: '정기 발송 관리', icon: '📦' },
  { id: 'creators', label: '인플루언서 DB', icon: '🎯' },
  { id: 'searchTrend', label: '검색 트렌드', icon: '🔍' },
]

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 shrink-0 min-h-screen border-r border-slate-200 bg-white">
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#8b5b3a]">Influencer Marketing CRM</p>
        <p className="mt-0.5 text-sm font-semibold text-[#5a3b2e]">인플루언서 대시보드</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = activePage === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-left transition ${
                active
                  ? 'bg-[#5a3b2e] text-white shadow-sm'
                  : 'text-[#5a3b2e] hover:bg-[#f6ead8]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-[11px] text-[#a08c7a]">© 2026 MyNormal</p>
      </div>
    </aside>
  )
}

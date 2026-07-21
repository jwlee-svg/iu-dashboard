import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import type { ShippingProject, ShippingTarget, ShippingProjectStatus, ShippingTargetStatus, TargetCategory } from '../types/shipping'
import { sampleProjects, sampleTargets } from '../data/shippingSample'

// ─── Storage ────────────────────────────────────────────────────────────────
const PROJECTS_KEY = 'iu-dashboard-shipping-projects'
const TARGETS_KEY = 'iu-dashboard-shipping-targets'

const loadProjects = (): ShippingProject[] => {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return sampleProjects
    return JSON.parse(raw)
  } catch { return sampleProjects }
}
const loadTargets = (): ShippingTarget[] => {
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (!raw) return sampleTargets
    return JSON.parse(raw)
  } catch { return sampleTargets }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PROJECT_STATUS_LABEL: Record<ShippingProjectStatus, string> = {
  preparing: '준비중', shipping: '발송중', completed: '완료', pending: '보류',
}
const PROJECT_STATUS_COLOR: Record<ShippingProjectStatus, string> = {
  preparing: 'bg-amber-100 text-amber-800',
  shipping: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-slate-100 text-slate-600',
}
const TARGET_STATUS_LABEL: Record<ShippingTargetStatus, string> = {
  completed: '완료', not_sent: '미발송', rejected: '거절', pending: '보류', special: '특이사항',
}
const TARGET_STATUS_COLOR: Record<ShippingTargetStatus, string> = {
  completed: 'bg-emerald-100 text-emerald-800',
  not_sent: 'bg-slate-100 text-slate-500',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-800',
  special: 'bg-orange-100 text-orange-700',
}
const CATEGORY_LABEL: Record<TargetCategory, string> = { influencer: '인플루언서', celebrity: '연예인' }

// ─── Sub-components ──────────────────────────────────────────────────────────

// Project Form Modal
function ProjectFormModal({
  initial, onSave, onClose,
}: {
  initial: Partial<ShippingProject>
  onSave: (p: ShippingProject) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<ShippingProject, 'id' | 'createdAt'>>({
    name: initial.name ?? '',
    productComposition: initial.productComposition ?? '',
    scheduledDate: initial.scheduledDate ?? '',
    manager: initial.manager ?? '',
    memo: initial.memo ?? '',
    smsTemplate: initial.smsTemplate ?? '',
    smsSendDate: initial.smsSendDate ?? '',
    status: initial.status ?? 'preparing',
  })
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      id: initial.id ?? String(Date.now()),
      createdAt: initial.createdAt ?? new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold text-[#5a3b2e] mb-5">{initial.id ? '프로젝트 수정' : '프로젝트 추가'}</h2>
        <div className="space-y-3">
          {([
            ['프로젝트명 *', 'name', 'text'],
            ['제품 구성', 'productComposition', 'text'],
            ['발송 예정일', 'scheduledDate', 'date'],
            ['담당자', 'manager', 'text'],
            ['SMS 발송일', 'smsSendDate', 'date'],
          ] as [string, keyof typeof form, string][]).map(([label, key, type]) => (
            <label key={key} className="block space-y-1 text-sm text-slate-700">
              <span>{label}</span>
              <input
                type={type}
                value={form[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm text-slate-700">
            <span>상태</span>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none"
            >
              {(Object.entries(PROJECT_STATUS_LABEL) as [ShippingProjectStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>문자 템플릿</span>
            <textarea
              value={form.smsTemplate}
              onChange={(e) => set('smsTemplate', e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none resize-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>메모</span>
            <textarea
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none resize-none"
            />
          </label>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
          <button type="button" onClick={handleSubmit} disabled={!form.name.trim()} className="px-5 py-2 rounded-2xl bg-[#5a3b2e] text-sm font-semibold text-white hover:bg-[#462a20] disabled:bg-slate-300">저장</button>
        </div>
      </div>
    </div>
  )
}

// Target Form Modal
function TargetFormModal({
  initial, projectId, onSave, onClose,
}: {
  initial: Partial<ShippingTarget>
  projectId: string
  onSave: (t: ShippingTarget) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<ShippingTarget, 'id' | 'projectId'>>({
    name: initial.name ?? '',
    category: initial.category ?? 'influencer',
    channelName: initial.channelName ?? '',
    mcn: initial.mcn ?? '',
    mcnManager: initial.mcnManager ?? '',
    mcnManagerEmail: initial.mcnManagerEmail ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    trackingNumber: initial.trackingNumber ?? '',
    shippingStatus: initial.shippingStatus ?? 'pending',
    specialNote: initial.specialNote ?? '',
    smsSent: initial.smsSent ?? false,
    smsSentDate: initial.smsSentDate ?? '',
    memo: initial.memo ?? '',
  })
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave({ ...form, id: initial.id ?? String(Date.now()), projectId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold text-[#5a3b2e] mb-5">{initial.id ? '대상자 수정' : '대상자 추가'}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm text-slate-700">
              <span>이름 *</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]" />
            </label>
            <label className="block space-y-1 text-sm text-slate-700">
              <span>구분</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value as TargetCategory)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none">
                <option value="influencer">인플루언서</option>
                <option value="celebrity">연예인</option>
              </select>
            </label>
          </div>
          {([
            ['채널명', 'channelName'],
            ['소속 MCN', 'mcn'],
            ['MCN 담당자', 'mcnManager'],
            ['담당자 이메일', 'mcnManagerEmail'],
            ['연락처', 'phone'],
            ['주소', 'address'],
            ['송장번호', 'trackingNumber'],
          ] as [string, keyof typeof form][]).map(([label, key]) => (
            <label key={key} className="block space-y-1 text-sm text-slate-700">
              <span>{label}</span>
              <input value={form[key] as string} onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]" />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm text-slate-700">
              <span>발송 상태</span>
              <select value={form.shippingStatus} onChange={(e) => set('shippingStatus', e.target.value as ShippingTargetStatus)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none">
                {(Object.entries(TARGET_STATUS_LABEL) as [ShippingTargetStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm text-slate-700">
              <span>SMS 발송일</span>
              <input type="date" value={form.smsSentDate} onChange={(e) => set('smsSentDate', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none" />
            </label>
          </div>
          {form.shippingStatus === 'special' && (
            <label className="block space-y-1 text-sm text-slate-700">
              <span>특이사항 내용</span>
              <input value={form.specialNote} onChange={(e) => set('specialNote', e.target.value)}
                placeholder="예: 주소 변경, 촬영 중, 휴식, 브랜드 요청"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]" />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.smsSent} onChange={(e) => set('smsSent', e.target.checked)}
              className="w-4 h-4 rounded accent-[#5a3b2e]" />
            문자 발송 완료
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>메모</span>
            <textarea value={form.memo} onChange={(e) => set('memo', e.target.value)} rows={2}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none resize-none" />
          </label>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
          <button type="button" onClick={handleSubmit} disabled={!form.name.trim()} className="px-5 py-2 rounded-2xl bg-[#5a3b2e] text-sm font-semibold text-white hover:bg-[#462a20] disabled:bg-slate-300">저장</button>
        </div>
      </div>
    </div>
  )
}

// Influencer History Modal
function InfluencerHistoryModal({
  name, allProjects, allTargets, onClose,
}: {
  name: string
  allProjects: ShippingProject[]
  allTargets: ShippingTarget[]
  onClose: () => void
}) {
  const history = useMemo(() => {
    return allTargets
      .filter((t) => t.name === name)
      .map((t) => {
        const project = allProjects.find((p) => p.id === t.projectId)
        return { target: t, project }
      })
      .sort((a, b) => (b.project?.scheduledDate ?? '').localeCompare(a.project?.scheduledDate ?? ''))
  }, [name, allProjects, allTargets])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[#5a3b2e]">{name}</h2>
            <p className="text-sm text-[#7a6b5a]">과거 발송 프로젝트 이력 ({history.length}건)</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">발송 이력이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {history.map(({ target, project }) => (
              <div key={target.id} className={`rounded-2xl border p-4 ${target.shippingStatus === 'not_sent' ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold text-slate-900 ${target.shippingStatus === 'not_sent' ? 'line-through text-slate-400' : ''}`}>
                      {project?.name ?? '(알 수 없음)'}
                    </p>
                    <p className="text-xs text-[#7a6b5a] mt-0.5">{project?.productComposition}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${TARGET_STATUS_COLOR[target.shippingStatus]}`}>
                      {TARGET_STATUS_LABEL[target.shippingStatus]}
                    </span>
                    {target.smsSent && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">문자✓</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                  <span>발송일: {project?.scheduledDate ?? '-'}</span>
                  {target.trackingNumber && <span>송장: {target.trackingNumber}</span>}
                  {target.shippingStatus === 'special' && target.specialNote && <span className="text-orange-700">⚠ {target.specialNote}</span>}
                  {target.memo && <span>메모: {target.memo}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// MCN Detail Modal
function McnDetailModal({
  mcnName, targets, onClose,
}: {
  mcnName: string
  targets: ShippingTarget[]
  onClose: () => void
}) {
  const mcnTargets = targets.filter((t) => t.mcn === mcnName && t.mcnManagerEmail)
  const uniqueManagers = Array.from(new Map(mcnTargets.map((t) => [t.mcnManagerEmail, { name: t.mcnManager, email: t.mcnManagerEmail }])).values())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#5a3b2e]">{mcnName} — MCN 담당자</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        {uniqueManagers.length === 0 ? (
          <p className="text-sm text-slate-500">담당자 정보가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {uniqueManagers.map((m) => (
              <div key={m.email} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#f6ead8] flex items-center justify-center text-sm font-bold text-[#8b5b3a]">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="text-xs text-[#7a6b5a]">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({
  project, targets, allProjects, allTargets,
  onUpdateTarget, onAddTarget, onBack,
}: {
  project: ShippingProject
  targets: ShippingTarget[]
  allProjects: ShippingProject[]
  allTargets: ShippingTarget[]
  onUpdateTarget: (t: ShippingTarget) => void
  onAddTarget: (t: ShippingTarget) => void
  onBack: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ShippingTargetStatus | ''>('')
  const [filterCategory, setFilterCategory] = useState<TargetCategory | ''>('')
  const [filterSms, setFilterSms] = useState<'all' | 'sent' | 'unsent'>('all')
  const [filterMcn, setFilterMcn] = useState('')
  const [editTarget, setEditTarget] = useState<ShippingTarget | null>(null)
  const [addTarget, setAddTarget] = useState(false)
  const [historyName, setHistoryName] = useState<string | null>(null)
  const [mcnModal, setMcnModal] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return targets.filter((t) => {
      if (search && !t.name.includes(search) && !t.channelName.includes(search)) return false
      if (filterStatus && t.shippingStatus !== filterStatus) return false
      if (filterCategory && t.category !== filterCategory) return false
      if (filterSms === 'sent' && !t.smsSent) return false
      if (filterSms === 'unsent' && t.smsSent) return false
      if (filterMcn && t.mcn !== filterMcn) return false
      return true
    })
  }, [targets, search, filterStatus, filterCategory, filterSms, filterMcn])

  const kpi = useMemo(() => {
    const total = targets.length
    const sent = targets.filter((t) => t.shippingStatus === 'completed').length
    const notSent = targets.filter((t) => t.shippingStatus === 'not_sent').length
    const smsSent = targets.filter((t) => t.smsSent).length
    const influencers = targets.filter((t) => t.category === 'influencer').length
    const celebrities = targets.filter((t) => t.category === 'celebrity').length
    const mcnTargets = targets.filter((t) => t.mcn)
    const mcnCount = mcnTargets.length
    const uniqueMcns = Array.from(new Set(mcnTargets.map((t) => t.mcn)))
    return { total, sent, notSent, smsSent, influencers, celebrities, mcnCount, uniqueMcns }
  }, [targets])

  const mcnList = useMemo(() => Array.from(new Set(targets.filter((t) => t.mcn).map((t) => t.mcn))), [targets])

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#7a6b5a] hover:text-[#5a3b2e] mb-3">
          ← 프로젝트 목록으로
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#5a3b2e]">{project.name}</h2>
            <p className="mt-1 text-sm text-[#7a6b5a]">{project.productComposition}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#7a6b5a]">
              <span>발송 예정일: {project.scheduledDate || '-'}</span>
              <span>담당자: {project.manager || '-'}</span>
              {project.memo && <span className="text-[#a08c7a]">메모: {project.memo}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${PROJECT_STATUS_COLOR[project.status]}`}>
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
            <button type="button" onClick={() => setAddTarget(true)}
              className="px-4 py-2 rounded-2xl bg-[#5a3b2e] text-xs font-semibold text-white hover:bg-[#462a20]">
              + 대상자 추가
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: '총 대상자', value: kpi.total },
          { label: '발송 완료', value: kpi.sent },
          { label: '미발송', value: kpi.notSent },
          { label: 'SMS 발송', value: kpi.smsSent },
          { label: '인플루언서', value: kpi.influencers },
          { label: '연예인', value: kpi.celebrities },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-[#5a3b2e]">{item.value}</p>
          </div>
        ))}
        <button type="button" onClick={() => kpi.uniqueMcns.length === 1 ? setMcnModal(kpi.uniqueMcns[0]) : setMcnModal('__list')}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:bg-[#f6ead8] transition">
          <p className="text-xs text-slate-500">MCN 대상</p>
          <p className="mt-1 text-xl font-semibold text-[#5a3b2e]">{kpi.mcnCount}</p>
          <p className="text-[10px] text-[#a08c7a] mt-0.5">클릭하여 확인</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 채널명 검색"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-[#d4a373]" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ShippingTargetStatus | '')}
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="">발송 상태 전체</option>
          {(Object.entries(TARGET_STATUS_LABEL) as [ShippingTargetStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as TargetCategory | '')}
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="">구분 전체</option>
          <option value="influencer">인플루언서</option>
          <option value="celebrity">연예인</option>
        </select>
        <select value={filterSms} onChange={(e) => setFilterSms(e.target.value as 'all' | 'sent' | 'unsent')}
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="all">문자 전체</option>
          <option value="sent">문자 발송</option>
          <option value="unsent">미발송</option>
        </select>
        {mcnList.length > 0 && (
          <select value={filterMcn} onChange={(e) => setFilterMcn(e.target.value)}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
            <option value="">MCN 전체</option>
            {mcnList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Target Table */}
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '55vh' }}>
        <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
          <thead className="bg-[#f6ead8] text-[#5a3b2e] sticky top-0 z-10">
            <tr>
              {['이름', '구분', '채널명', '소속(MCN)', 'MCN담당자', '연락처', '주소', '송장번호', '발송 상태', '문자', '메모', '작업'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const notSent = t.shippingStatus === 'not_sent'
              return (
                <tr key={t.id}
                  className={`border-t border-slate-100 ${notSent ? 'opacity-50' : 'hover:bg-[#fdf8f2]'}`}>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button type="button" onClick={() => setHistoryName(t.name)}
                      className={`font-medium hover:text-[#5a3b2e] hover:underline ${notSent ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.category === 'celebrity' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {CATEGORY_LABEL[t.category]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{t.channelName || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {t.mcn ? (
                      <button type="button" onClick={() => setMcnModal(t.mcn)}
                        className="text-[#8b5b3a] hover:underline text-[13px]">{t.mcn}</button>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[12px]">{t.mcnManager || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">{t.phone || '-'}</td>
                  <td className="px-3 py-3 text-slate-600 max-w-[160px] truncate text-[12px]" title={t.address}>{t.address || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[12px]">{t.trackingNumber || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${TARGET_STATUS_COLOR[t.shippingStatus]}`}>
                      {TARGET_STATUS_LABEL[t.shippingStatus]}
                    </span>
                    {t.shippingStatus === 'special' && t.specialNote && (
                      <p className="text-[11px] text-orange-600 mt-0.5">{t.specialNote}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button type="button"
                      onClick={() => onUpdateTarget({ ...t, smsSent: !t.smsSent, smsSentDate: !t.smsSent ? new Date().toISOString().slice(0, 10) : '' })}
                      className={`flex items-center gap-1 text-[12px] font-semibold ${t.smsSent ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}>
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${t.smsSent ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                        {t.smsSent && <span className="text-white text-[10px]">✓</span>}
                      </span>
                      {t.smsSent ? '완료' : '미발송'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-[12px] max-w-[120px] truncate">{t.memo || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button type="button" onClick={() => setEditTarget(t)}
                      className="px-3 py-1 rounded-xl border border-slate-300 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                      수정
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="py-10 text-center text-sm text-slate-400">조건에 맞는 대상자가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editTarget && (
        <TargetFormModal
          initial={editTarget}
          projectId={project.id}
          onSave={(t) => { onUpdateTarget(t); setEditTarget(null) }}
          onClose={() => setEditTarget(null)}
        />
      )}
      {addTarget && (
        <TargetFormModal
          initial={{}}
          projectId={project.id}
          onSave={(t) => { onAddTarget(t); setAddTarget(false) }}
          onClose={() => setAddTarget(false)}
        />
      )}
      {historyName && (
        <InfluencerHistoryModal
          name={historyName}
          allProjects={allProjects}
          allTargets={allTargets}
          onClose={() => setHistoryName(null)}
        />
      )}
      {mcnModal && mcnModal !== '__list' && (
        <McnDetailModal
          mcnName={mcnModal}
          targets={targets}
          onClose={() => setMcnModal(null)}
        />
      )}
      {mcnModal === '__list' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#5a3b2e]">MCN 목록</h2>
              <button type="button" onClick={() => setMcnModal(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <div className="space-y-2">
              {kpi.uniqueMcns.map((mcn) => {
                const count = targets.filter((t) => t.mcn === mcn).length
                return (
                  <button key={mcn} type="button" onClick={() => setMcnModal(mcn)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 hover:bg-[#f6ead8] text-sm">
                    <span className="font-semibold text-[#5a3b2e]">{mcn}</span>
                    <span className="text-[#a08c7a]">{count}명</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ShippingPage ────────────────────────────────────────────────────────
export default function ShippingPage() {
  const [projects, setProjects] = useState<ShippingProject[]>(loadProjects)
  const [targets, setTargets] = useState<ShippingTarget[]>(loadTargets)
  const [persistedProjects, setPersistedProjects] = useState<ShippingProject[]>(loadProjects)
  const [persistedTargets, setPersistedTargets] = useState<ShippingTarget[]>(loadTargets)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<Partial<ShippingProject> | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [searchProject, setSearchProject] = useState('')
  const [filterProjectStatus, setFilterProjectStatus] = useState<ShippingProjectStatus | ''>('')

  const hasUnsaved = JSON.stringify(projects) !== JSON.stringify(persistedProjects) ||
    JSON.stringify(targets) !== JSON.stringify(persistedTargets)

  const save = () => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets))
    setPersistedProjects(projects)
    setPersistedTargets(targets)
    setStatusMsg({ type: 'success', text: '변경사항이 저장되었습니다.' })
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null
  const selectedTargets = targets.filter((t) => t.projectId === selectedId)

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchProject && !p.name.includes(searchProject)) return false
      if (filterProjectStatus && p.status !== filterProjectStatus) return false
      return true
    })
  }, [projects, searchProject, filterProjectStatus])

  const handleSaveProject = (p: ShippingProject) => {
    setProjects((prev) => prev.some((x) => x.id === p.id) ? prev.map((x) => x.id === p.id ? p : x) : [p, ...prev])
    setProjectForm(null)
  }

  const handleUpdateTarget = (t: ShippingTarget) => {
    setTargets((prev) => prev.map((x) => x.id === t.id ? t : x))
  }

  const handleAddTarget = (t: ShippingTarget) => {
    setTargets((prev) => [...prev, t])
  }

  // Per-project KPI for list view
  const projectKpis = useMemo(() => {
    return Object.fromEntries(projects.map((p) => {
      const pt = targets.filter((t) => t.projectId === p.id)
      return [p.id, {
        total: pt.length,
        sent: pt.filter((t) => t.shippingStatus === 'completed').length,
        notSent: pt.filter((t) => t.shippingStatus === 'not_sent').length,
      }]
    }))
  }, [projects, targets])

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-8 py-8">
        <PageHeader
          title="정기 발송 관리"
          subtitle="프로젝트 생성 → 대상자 선정 → 발송 여부 관리 → 문자 발송 → 이력 조회"
          actions={
            <>
              {hasUnsaved && <span className="text-sm text-amber-700 font-semibold">저장되지 않은 변경사항</span>}
              <button type="button" onClick={save} disabled={!hasUnsaved}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${hasUnsaved ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'bg-slate-300 cursor-not-allowed'}`}>
                변경사항 저장
              </button>
            </>
          }
        />

        {/* Status message */}
        {statusMsg && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${statusMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Content */}
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            targets={selectedTargets}
            allProjects={projects}
            allTargets={targets}
            onUpdateTarget={handleUpdateTarget}
            onAddTarget={handleAddTarget}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            {/* Project list */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">프로젝트 목록</h2>
                <div className="flex flex-wrap gap-2 items-center">
                  <input value={searchProject} onChange={(e) => setSearchProject(e.target.value)}
                    placeholder="프로젝트명 검색"
                    className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#d4a373]" />
                  <select value={filterProjectStatus} onChange={(e) => setFilterProjectStatus(e.target.value as ShippingProjectStatus | '')}
                    className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none">
                    <option value="">상태 전체</option>
                    {(Object.entries(PROJECT_STATUS_LABEL) as [ShippingProjectStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setProjectForm({})}
                    className="px-4 py-2 rounded-2xl bg-[#5a3b2e] text-sm font-semibold text-white hover:bg-[#462a20]">
                    + 프로젝트 추가
                  </button>
                </div>
              </div>

              <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
                <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
                  <thead className="bg-[#f6ead8] text-[#5a3b2e] sticky top-0 z-10">
                    <tr>
                      {['프로젝트명', '제품 구성', '발송 예정일', '담당자', '총원', '발송', '미발송', '상태', '생성일', '작업'].map((h) => (
                        <th key={h} className="px-3 py-3 text-[11px] font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => {
                      const kpi = projectKpis[p.id] ?? { total: 0, sent: 0, notSent: 0 }
                      return (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-[#fdf8f2]">
                          <td className="px-3 py-3">
                            <button type="button" onClick={() => setSelectedId(p.id)}
                              className="font-semibold text-[#5a3b2e] hover:underline text-left">
                              {p.name}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-slate-600 max-w-[160px] truncate">{p.productComposition || '-'}</td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.scheduledDate || '-'}</td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.manager || '-'}</td>
                          <td className="px-3 py-3 text-slate-700 font-semibold text-center">{kpi.total}</td>
                          <td className="px-3 py-3 text-emerald-700 font-semibold text-center">{kpi.sent}</td>
                          <td className="px-3 py-3 text-slate-500 text-center">{kpi.notSent}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PROJECT_STATUS_COLOR[p.status]}`}>
                              {PROJECT_STATUS_LABEL[p.status]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{p.createdAt}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <button type="button" onClick={() => setProjectForm(p)}
                              className="px-3 py-1 rounded-xl border border-slate-300 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                              수정
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredProjects.length === 0 && (
                      <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-400">프로젝트가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Project form modal */}
      {projectForm !== null && (
        <ProjectFormModal
          initial={projectForm}
          onSave={handleSaveProject}
          onClose={() => setProjectForm(null)}
        />
      )}
    </div>
  )
}

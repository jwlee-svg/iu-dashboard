import { useEffect, useRef, useState } from 'react'
import type { Product } from '../types/product'
import type { Creator } from '../types/creator'
import type {
  SponsorshipProject,
  SponsorshipProductItem,
  SponsorshipTarget,
  SponsorshipProjectType,
  SponsorshipStatus,
  SponsorshipTargetCategory,
} from '../types/sponsorship'
import {
  PROJECT_TYPE_COLOR,
  STATUS_COLOR,
  TARGET_CATEGORY_LABEL,
} from '../types/sponsorship'
import { productSample } from '../data/productSample'
import { creatorSample } from '../data/creatorSample'
import { sponsorshipSample } from '../data/sponsorshipSample'
import PageHeader from '../components/PageHeader'
import KpiCard from '../components/KpiCard'

const SP_KEY = 'iu-dashboard-sponsorship-projects'
const PRODUCTS_KEY = 'iu-dashboard-products'
const CREATORS_KEY = 'iu-dashboard-creators'

const fmt = (n: number) => n.toLocaleString('ko-KR')

const load = <T,>(key: string, fallback: T[]): T[] => {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : fallback } catch { return fallback }
}

const emptyTarget = (): SponsorshipTarget => ({
  id: `tgt_${String(Date.now()).slice(-6)}`,
  creatorId: undefined,
  name: '',
  category: 'influencer',
  agency: '',
  phone: '',
  address: '',
  memo: '',
  hasContent: false,
  contentUrl: '',
  contentDate: '',
  views: 0,
  likes: 0,
  comments: 0,
  reaction: '',
  resultMemo: '',
})

const emptyProject = (): SponsorshipProject => ({
  projectId: '',
  name: '',
  projectType: '제품협찬',
  status: '기획중',
  eventDate: '',
  manager: '박지영',
  notionUrl: '',
  expectedEffect: '',
  result: '',
  notes: '',
  products: [],
  targets: [],
  createdAt: new Date().toISOString(),
})

const calcProjectCost = (items: SponsorshipProductItem[]) =>
  items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0)
const calcProjectQty = (items: SponsorshipProductItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0)
const contentCount = (targets: SponsorshipTarget[]) =>
  targets.filter((t) => t.hasContent).length


export default function SponsorshipPage() {
  const [projects, setProjects] = useState<SponsorshipProject[]>(() => load(SP_KEY, sponsorshipSample))
  const [savedProjects, setSavedProjects] = useState<SponsorshipProject[]>(() => load(SP_KEY, sponsorshipSample))
  const [products] = useState<Product[]>(() => load(PRODUCTS_KEY, productSample))
  const [creators] = useState<Creator[]>(() => load(CREATORS_KEY, creatorSample))

  // KPI date filter
  const [kpiFrom, setKpiFrom] = useState('')
  const [kpiTo, setKpiTo] = useState('')

  // List filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterManager, setFilterManager] = useState('')
  const [filterHasContent, setFilterHasContent] = useState('')

  // UI
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'info' | 'products' | 'targets'>('info')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTargetProject] = useState<string | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<'basic' | 'products' | 'targets'>('basic')
  const [formData, setFormData] = useState<SponsorshipProject>(emptyProject())
  const [editingId, setEditingId] = useState<string | null>(null)
  // Modal product sub-form
  const [newProdId, setNewProdId] = useState('')
  const [newProdQty, setNewProdQty] = useState(1)
  // Modal target sub-form
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [targetForm, setTargetForm] = useState<SponsorshipTarget>(emptyTarget())
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const hasUnsaved = JSON.stringify(projects) !== JSON.stringify(savedProjects)

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(t)
  }, [status])

  const save = () => {
    localStorage.setItem(SP_KEY, JSON.stringify(projects))
    setSavedProjects(projects)
    setStatus({ type: 'success', text: '협찬 데이터가 저장되었습니다.' })
  }

  const getProductName = (id: string) => products.find((p) => p.productId === id)?.name ?? id
  const getProductCost = (id: string) => products.find((p) => p.productId === id)?.costPrice ?? 0

  // KPI computation
  const kpiProjects = projects.filter((p) => {
    if (kpiFrom && p.eventDate < kpiFrom) return false
    if (kpiTo && p.eventDate > kpiTo) return false
    return true
  })
  const kpiTotalQty = kpiProjects.reduce((sum, p) => sum + calcProjectQty(p.products), 0)
  const kpiTotalCost = kpiProjects.reduce((sum, p) => sum + calcProjectCost(p.products), 0)
  const kpiContentCount = kpiProjects.reduce((sum, p) => sum + contentCount(p.targets), 0)

  // List filter
  const filtered = projects.filter((p) => {
    if (filterType && p.projectType !== filterType) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterManager && p.manager !== filterManager) return false
    if (filterHasContent === 'yes' && !p.targets.some((t) => t.hasContent)) return false
    if (filterHasContent === 'no' && p.targets.some((t) => t.hasContent)) return false
    if (search) {
      const q = search.toLowerCase()
      const inName = p.name.toLowerCase().includes(q)
      const inTargets = p.targets.some((t) => t.name.toLowerCase().includes(q))
      const inProducts = p.products.some((i) => getProductName(i.productId).toLowerCase().includes(q))
      const inNotes = p.notes.toLowerCase().includes(q) || p.expectedEffect.toLowerCase().includes(q)
      if (!inName && !inTargets && !inProducts && !inNotes) return false
    }
    return true
  })

  const selectedProject = projects.find((p) => p.projectId === selectedId) ?? null

  const openAdd = () => {
    const id = `sp_${new Date().getFullYear()}_${String(projects.length + 1).padStart(4, '0')}`
    setFormData({ ...emptyProject(), projectId: id })
    setEditingId(null)
    setModalTab('basic')
    setShowTargetForm(false)
    setExpandedTargetId(null)
    setShowModal(true)
  }

  const openEdit = (p: SponsorshipProject) => {
    setFormData(JSON.parse(JSON.stringify(p)))
    setEditingId(p.projectId)
    setModalTab('basic')
    setShowTargetForm(false)
    setExpandedTargetId(null)
    setShowModal(true)
  }

  const submitProject = () => {
    if (!formData.name.trim()) { setStatus({ type: 'error', text: '프로젝트명을 입력하세요.' }); return }
    if (editingId) {
      setProjects((prev) => prev.map((p) => p.projectId === editingId ? { ...formData } : p))
      if (selectedId === editingId) setSelectedId(formData.projectId)
    } else {
      setProjects((prev) => [formData, ...prev])
    }
    setShowModal(false)
  }

  const doDeleteProject = () => {
    if (!deleteTarget) return
    setProjects((prev) => prev.filter((p) => p.projectId !== deleteTarget))
    if (selectedId === deleteTarget) setSelectedId(null)
    setDeleteTargetProject(null)
  }

  // Product sub-form handlers
  const addProductToForm = () => {
    if (!newProdId) return
    const cost = getProductCost(newProdId)
    const existing = formData.products.findIndex((i) => i.productId === newProdId)
    if (existing >= 0) {
      const updated = [...formData.products]
      updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + newProdQty }
      setFormData({ ...formData, products: updated })
    } else {
      setFormData({ ...formData, products: [...formData.products, { productId: newProdId, quantity: newProdQty, costPrice: cost }] })
    }
    setNewProdId('')
    setNewProdQty(1)
  }

  const updateProductQty = (productId: string, qty: number) => {
    setFormData({ ...formData, products: formData.products.map((i) => i.productId === productId ? { ...i, quantity: qty } : i) })
  }

  const removeProductFromForm = (productId: string) => {
    setFormData({ ...formData, products: formData.products.filter((i) => i.productId !== productId) })
  }

  // Target sub-form handlers
  const selectCreatorForTarget = (creatorId: string) => {
    if (creatorId === '__manual__') {
      setTargetForm({ ...emptyTarget(), id: targetForm.id })
    } else {
      const creator = creators.find((c) => c.creatorId === creatorId)
      if (creator) {
        setTargetForm({
          ...targetForm,
          creatorId: creator.creatorId,
          name: creator.name,
          category: creator.isCelebrity ? 'celebrity' : 'influencer',
          agency: creator.agencyName,
          phone: creator.phone,
          address: creator.address,
        })
      }
    }
  }

  const openTargetAdd = () => {
    setTargetForm(emptyTarget())
    setEditingTargetId(null)
    setShowTargetForm(true)
  }

  const openTargetEdit = (target: SponsorshipTarget) => {
    setTargetForm({ ...target })
    setEditingTargetId(target.id)
    setShowTargetForm(true)
  }

  const submitTarget = () => {
    if (!targetForm.name.trim()) return
    if (editingTargetId) {
      setFormData({ ...formData, targets: formData.targets.map((t) => t.id === editingTargetId ? { ...targetForm } : t) })
    } else {
      setFormData({ ...formData, targets: [...formData.targets, { ...targetForm }] })
    }
    setShowTargetForm(false)
    setEditingTargetId(null)
    setTargetForm(emptyTarget())
  }

  const removeTargetFromForm = (id: string) => {
    setFormData({ ...formData, targets: formData.targets.filter((t) => t.id !== id) })
  }

  const PROJECT_TYPES: SponsorshipProjectType[] = ['행사협찬', '제품협찬', '신제품시딩', '연예인시딩', '기타']
  const STATUSES: SponsorshipStatus[] = ['기획중', '발송완료', '종료', '취소']

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-8 py-8">
        <PageHeader
          title="협찬 관리"
          subtitle="프로젝트 단위로 협찬/시딩 이력을 관리하고 성과를 추적합니다."
          actions={
            <>
              <button type="button" onClick={save} disabled={!hasUnsaved} className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${hasUnsaved ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'cursor-not-allowed bg-slate-300'}`}>
                변경사항 저장
              </button>
              <button type="button" onClick={openAdd} className="rounded-2xl bg-[#5a3b2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#462a20] transition">
                + 프로젝트 추가
              </button>
            </>
          }
        />

        {status && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {status.text}
          </div>
        )}

        {/* KPI Section */}
        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-700">핵심 지표</h2>
            <div className="flex items-center gap-2 text-sm">
              <input type="date" value={kpiFrom} onChange={(e) => setKpiFrom(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-[#d4a373]" />
              <span className="text-slate-400">~</span>
              <input type="date" value={kpiTo} onChange={(e) => setKpiTo(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-[#d4a373]" />
              {(kpiFrom || kpiTo) && (
                <button type="button" onClick={() => { setKpiFrom(''); setKpiTo('') }} className="text-xs text-slate-400 hover:text-[#5a3b2e]">초기화</button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="전체 프로젝트" value={String(kpiProjects.length)} sub="건" />
            <KpiCard label="총 제품 수량" value={String(kpiTotalQty)} sub="개" />
            <KpiCard label="총 원가" value={`₩${fmt(kpiTotalCost)}`} />
            <KpiCard label="콘텐츠 생성 완료" value={String(kpiContentCount)} sub="건" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="프로젝트명, 대상자, 제품 검색..."
            className="w-52 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]">
            <option value="">유형 전체</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]">
            <option value="">상태 전체</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]">
            <option value="">담당자 전체</option>
            <option value="이지원">이지원</option>
            <option value="박지영">박지영</option>
          </select>
          <select value={filterHasContent} onChange={(e) => setFilterHasContent(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]">
            <option value="">콘텐츠 전체</option>
            <option value="yes">생성 있음</option>
            <option value="no">생성 없음</option>
          </select>
          {(search || filterType || filterStatus || filterManager || filterHasContent) && (
            <button type="button" onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterManager(''); setFilterHasContent('') }}
              className="text-xs text-slate-400 hover:text-[#5a3b2e]">초기화</button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-4 items-start">
          {/* Project List */}
          <div className={`space-y-3 ${selectedId ? 'flex-1 min-w-0' : 'w-full'}`}>
            {filtered.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                조건에 맞는 프로젝트가 없습니다.
              </div>
            )}
            {filtered.map((p) => {
              const totalQty = calcProjectQty(p.products)
              const totalCost = calcProjectCost(p.products)
              const hasContentCount = contentCount(p.targets)
              const isSelected = p.projectId === selectedId
              return (
                <div
                  key={p.projectId}
                  onClick={() => { setSelectedId(isSelected ? null : p.projectId); setPanelTab('info') }}
                  className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${isSelected ? 'border-[#d4a373] ring-2 ring-[#f7e7d9]' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PROJECT_TYPE_COLOR[p.projectType]}`}>{p.projectType}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                        {p.eventDate && <span className="text-[11px] text-slate-400">{p.eventDate}</span>}
                      </div>
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {p.products.length > 0 && (
                          <span>
                            📦 {p.products.slice(0, 2).map((i) => `${getProductName(i.productId)} ×${i.quantity}`).join(', ')}
                            {p.products.length > 2 && ` 외 ${p.products.length - 2}종`}
                            {totalQty > 0 && ` | 총 ${totalQty}개`}
                            {totalCost > 0 && ` | ₩${fmt(totalCost)}`}
                          </span>
                        )}
                        {p.targets.length > 0 && (
                          <span>👥 대상자 {p.targets.length}명{hasContentCount > 0 ? ` | 콘텐츠 ${hasContentCount}/${p.targets.length}` : ''}</span>
                        )}
                        <span>담당: {p.manager}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openEdit(p)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] transition">수정</button>
                      <button type="button" onClick={() => setDeleteTargetProject(p.projectId)} className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition">삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Slide Panel */}
          {selectedProject && (
            <div
              ref={panelRef}
              className="w-[420px] shrink-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '80px' }}
            >
              {/* Panel Header */}
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 shrink-0">
                <div className="min-w-0 pr-3">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROJECT_TYPE_COLOR[selectedProject.projectType]}`}>{selectedProject.projectType}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[selectedProject.status]}`}>{selectedProject.status}</span>
                  </div>
                  <p className="font-semibold text-slate-900 leading-tight">{selectedProject.name}</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0">✕</button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 shrink-0">
                {(['info', 'products', 'targets'] as const).map((tab) => {
                  const labels = { info: '기본정보', products: '제품 구성', targets: '대상자/성과' }
                  return (
                    <button key={tab} type="button" onClick={() => setPanelTab(tab)}
                      className={`flex-1 py-3 text-xs font-semibold transition border-b-2 ${panelTab === tab ? 'border-[#5a3b2e] text-[#5a3b2e]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
                {panelTab === 'info' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: '행사일/진행일', value: selectedProject.eventDate },
                        { label: '담당자', value: selectedProject.manager },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-slate-800">{value || '-'}</p>
                        </div>
                      ))}
                    </div>
                    {selectedProject.notionUrl && (
                      <a href={selectedProject.notionUrl} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                        🔗 {selectedProject.notionUrl}
                      </a>
                    )}
                    {selectedProject.expectedEffect && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">기대효과</p>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedProject.expectedEffect}</p>
                      </div>
                    )}
                    {selectedProject.result && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">결과</p>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedProject.result}</p>
                      </div>
                    )}
                    {selectedProject.notes && (
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1">비고</p>
                        <p className="text-xs text-amber-800">{selectedProject.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {panelTab === 'products' && (
                  <div>
                    {selectedProject.products.length === 0 ? (
                      <p className="text-xs text-slate-400">등록된 제품이 없습니다.</p>
                    ) : (
                      <>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400">
                              <th className="pb-2 text-left font-semibold">제품명</th>
                              <th className="pb-2 text-right font-semibold">수량</th>
                              <th className="pb-2 text-right font-semibold">원가</th>
                              <th className="pb-2 text-right font-semibold">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProject.products.map((item) => (
                              <tr key={item.productId} className="border-t border-slate-50">
                                <td className="py-2 text-slate-800">{getProductName(item.productId)}</td>
                                <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                                <td className="py-2 text-right text-slate-600">₩{fmt(item.costPrice)}</td>
                                <td className="py-2 text-right font-semibold text-[#5a3b2e]">₩{fmt(item.costPrice * item.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-200">
                              <td className="pt-2 font-semibold text-slate-700">합계</td>
                              <td className="pt-2 text-right font-semibold text-slate-700">{calcProjectQty(selectedProject.products)}</td>
                              <td />
                              <td className="pt-2 text-right font-bold text-[#5a3b2e]">₩{fmt(calcProjectCost(selectedProject.products))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </>
                    )}
                  </div>
                )}

                {panelTab === 'targets' && (
                  <div className="space-y-4">
                    {selectedProject.targets.length === 0 ? (
                      <p className="text-xs text-slate-400">등록된 대상자가 없습니다.</p>
                    ) : selectedProject.targets.map((t) => (
                      <div key={t.id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{t.name}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{TARGET_CATEGORY_LABEL[t.category]}</span>
                            {t.hasContent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">콘텐츠 있음</span>}
                          </div>
                        </div>
                        {t.agency && <p className="text-[11px] text-slate-400 mb-1">소속: {t.agency}</p>}
                        {t.memo && <p className="text-xs text-slate-500 mb-2">{t.memo}</p>}
                        {t.hasContent && (
                          <div className="mt-2 rounded-xl bg-emerald-50 p-3 space-y-1.5">
                            {t.contentUrl && <a href={t.contentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline block truncate">🔗 {t.contentUrl}</a>}
                            <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                              {t.contentDate && <span>게시일: {t.contentDate}</span>}
                              {t.views > 0 && <span>👁 {fmt(t.views)}</span>}
                              {t.likes > 0 && <span>❤️ {fmt(t.likes)}</span>}
                              {t.comments > 0 && <span>💬 {fmt(t.comments)}</span>}
                            </div>
                            {t.reaction && <p className="text-[11px] text-slate-600">{t.reaction}</p>}
                            {t.resultMemo && <p className="text-xs font-semibold text-emerald-700">{t.resultMemo}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 px-5 py-3 shrink-0">
                <button type="button" onClick={() => openEdit(selectedProject)} className="w-full rounded-xl bg-[#5a3b2e] py-2.5 text-sm font-semibold text-white hover:bg-[#462a20] transition">
                  프로젝트 수정
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
            <div className="my-8 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-lg">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? '프로젝트 수정' : '프로젝트 추가'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-slate-100 px-6">
                {(['basic', 'products', 'targets'] as const).map((tab) => {
                  const labels = { basic: '기본 정보', products: '제품 구성', targets: '대상자' }
                  return (
                    <button key={tab} type="button" onClick={() => setModalTab(tab)}
                      className={`mr-4 py-3 text-sm font-semibold border-b-2 transition ${modalTab === tab ? 'border-[#5a3b2e] text-[#5a3b2e]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      {labels[tab]}
                      {tab === 'products' && formData.products.length > 0 && <span className="ml-1.5 rounded-full bg-[#f6ead8] px-1.5 text-[10px] text-[#5a3b2e]">{formData.products.length}</span>}
                      {tab === 'targets' && formData.targets.length > 0 && <span className="ml-1.5 rounded-full bg-[#f6ead8] px-1.5 text-[10px] text-[#5a3b2e]">{formData.targets.length}</span>}
                    </button>
                  )
                })}
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Basic Info Tab */}
                {modalTab === 'basic' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="col-span-2 space-y-1.5 text-sm block">
                        <span className="font-medium text-slate-700">프로젝트명 *</span>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]" placeholder="예: 육식맨 저탄고지 시딩" />
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">프로젝트 유형</span>
                        <select value={formData.projectType} onChange={(e) => setFormData({ ...formData, projectType: e.target.value as SponsorshipProjectType })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]">
                          {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">상태</span>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SponsorshipStatus })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">행사일/진행일</span>
                        <input type="date" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]" />
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">담당자</span>
                        <select value={formData.manager} onChange={(e) => setFormData({ ...formData, manager: e.target.value as '이지원' | '박지영' })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]">
                          <option value="이지원">이지원</option>
                          <option value="박지영">박지영</option>
                        </select>
                      </label>
                      <label className="col-span-2 space-y-1.5 text-sm block">
                        <span className="font-medium text-slate-700">노션 링크</span>
                        <input value={formData.notionUrl} onChange={(e) => setFormData({ ...formData, notionUrl: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]" placeholder="https://notion.so/..." />
                      </label>
                      <label className="col-span-2 space-y-1.5 text-sm block">
                        <span className="font-medium text-slate-700">기대효과</span>
                        <textarea value={formData.expectedEffect} onChange={(e) => setFormData({ ...formData, expectedEffect: e.target.value })} rows={2}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373] resize-none" />
                      </label>
                      <label className="col-span-2 space-y-1.5 text-sm block">
                        <span className="font-medium text-slate-700">결과</span>
                        <textarea value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} rows={2}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373] resize-none" />
                      </label>
                      <label className="col-span-2 space-y-1.5 text-sm block">
                        <span className="font-medium text-slate-700">비고</span>
                        <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]" />
                      </label>
                    </div>
                  </>
                )}

                {/* Products Tab */}
                {modalTab === 'products' && (
                  <div>
                    {/* Product adder */}
                    <div className="flex items-end gap-3 mb-4">
                      <div className="flex-1 space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">제품 선택</span>
                        <select value={newProdId} onChange={(e) => setNewProdId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]">
                          <option value="">-- 제품 선택 --</option>
                          {products.map((p) => <option key={p.productId} value={p.productId}>{p.name} (₩{fmt(p.costPrice)})</option>)}
                        </select>
                      </div>
                      <div className="w-24 space-y-1.5 text-sm">
                        <span className="font-medium text-slate-700">수량</span>
                        <input type="number" min={1} value={newProdQty} onChange={(e) => setNewProdQty(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#d4a373]" />
                      </div>
                      <button type="button" onClick={addProductToForm} disabled={!newProdId}
                        className="rounded-xl bg-[#5a3b2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#462a20] disabled:opacity-40 transition">
                        추가
                      </button>
                    </div>

                    {formData.products.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">제품을 추가해주세요.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[12px] text-slate-400">
                            <th className="pb-2 text-left font-semibold">제품명</th>
                            <th className="pb-2 text-right font-semibold w-24">수량</th>
                            <th className="pb-2 text-right font-semibold">원가</th>
                            <th className="pb-2 text-right font-semibold">합계</th>
                            <th className="pb-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.products.map((item) => (
                            <tr key={item.productId} className="border-t border-slate-50">
                              <td className="py-2.5 text-slate-800">{getProductName(item.productId)}</td>
                              <td className="py-2.5 text-right">
                                <input type="number" min={1} value={item.quantity}
                                  onChange={(e) => updateProductQty(item.productId, Number(e.target.value))}
                                  className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-right outline-none focus:border-[#d4a373]" />
                              </td>
                              <td className="py-2.5 text-right text-slate-500">₩{fmt(item.costPrice)}</td>
                              <td className="py-2.5 text-right font-semibold text-[#5a3b2e]">₩{fmt(item.costPrice * item.quantity)}</td>
                              <td className="py-2.5 text-right">
                                <button type="button" onClick={() => removeProductFromForm(item.productId)} className="text-slate-300 hover:text-red-500 text-sm">✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200">
                            <td className="pt-2.5 font-semibold text-slate-700">합계</td>
                            <td className="pt-2.5 text-right font-semibold text-slate-700">{calcProjectQty(formData.products)}</td>
                            <td />
                            <td className="pt-2.5 text-right font-bold text-[#5a3b2e]">₩{fmt(calcProjectCost(formData.products))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}

                {/* Targets Tab */}
                {modalTab === 'targets' && (
                  <div>
                    {/* Existing targets */}
                    {formData.targets.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {formData.targets.map((t) => (
                          <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{t.name}</p>
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">{TARGET_CATEGORY_LABEL[t.category]}</span>
                                  {t.hasContent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">콘텐츠</span>}
                                </div>
                                {t.agency && <p className="text-[11px] text-slate-400 mt-0.5">{t.agency}</p>}
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button type="button" onClick={() => setExpandedTargetId(expandedTargetId === t.id ? null : t.id)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-[#f6ead8]">
                                  {expandedTargetId === t.id ? '접기' : '성과'}
                                </button>
                                <button type="button" onClick={() => openTargetEdit(t)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-[#5a3b2e] hover:bg-[#f6ead8]">수정</button>
                                <button type="button" onClick={() => removeTargetFromForm(t.id)}
                                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
                              </div>
                            </div>
                            {expandedTargetId === t.id && (
                              <div className="border-t border-slate-200 px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-400 mb-0.5">연락처</p>
                                  <p className="text-slate-700">{t.phone || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 mb-0.5">콘텐츠 여부</p>
                                  <p className="text-slate-700">{t.hasContent ? '있음' : '없음'}</p>
                                </div>
                                {t.hasContent && (
                                  <>
                                    <div className="col-span-2">
                                      <p className="text-slate-400 mb-0.5">링크</p>
                                      <p className="text-blue-600 truncate">{t.contentUrl || '-'}</p>
                                    </div>
                                    <div><p className="text-slate-400 mb-0.5">조회수</p><p className="font-semibold">{t.views ? fmt(t.views) : '-'}</p></div>
                                    <div><p className="text-slate-400 mb-0.5">좋아요</p><p className="font-semibold">{t.likes ? fmt(t.likes) : '-'}</p></div>
                                    {t.resultMemo && <div className="col-span-2"><p className="text-slate-400 mb-0.5">결과</p><p>{t.resultMemo}</p></div>}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Target sub-form */}
                    {showTargetForm ? (
                      <div className="rounded-2xl border-2 border-[#d4a373] bg-[#fdf8f2] p-4 space-y-3">
                        <p className="text-sm font-semibold text-[#5a3b2e]">{editingTargetId ? '대상자 수정' : '대상자 추가'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="col-span-2 space-y-1.5 text-sm block">
                            <span className="text-slate-600">인플루언서 DB에서 선택</span>
                            <select
                              value={targetForm.creatorId ?? '__manual__'}
                              onChange={(e) => selectCreatorForTarget(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                            >
                              <option value="__manual__">직접 입력</option>
                              {creators.map((c) => <option key={c.creatorId} value={c.creatorId}>{c.name}{c.agencyName ? ` (${c.agencyName})` : ''}</option>)}
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="text-slate-600">이름 *</span>
                            <input value={targetForm.name} onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="text-slate-600">구분</span>
                            <select value={targetForm.category} onChange={(e) => setTargetForm({ ...targetForm, category: e.target.value as SponsorshipTargetCategory })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]">
                              <option value="influencer">인플루언서</option>
                              <option value="celebrity">연예인</option>
                              <option value="company">업체</option>
                              <option value="event">행사</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="text-slate-600">소속/MCN</span>
                            <input value={targetForm.agency} onChange={(e) => setTargetForm({ ...targetForm, agency: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="text-slate-600">연락처</span>
                            <input value={targetForm.phone} onChange={(e) => setTargetForm({ ...targetForm, phone: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                          </label>
                          <label className="col-span-2 space-y-1.5 text-sm block">
                            <span className="text-slate-600">주소</span>
                            <input value={targetForm.address} onChange={(e) => setTargetForm({ ...targetForm, address: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                          </label>
                          <label className="col-span-2 space-y-1.5 text-sm block">
                            <span className="text-slate-600">메모</span>
                            <input value={targetForm.memo} onChange={(e) => setTargetForm({ ...targetForm, memo: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                          </label>
                        </div>
                        {/* Performance */}
                        <div className="border-t border-[#d4a373]/30 pt-3">
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-sm font-semibold text-[#5a3b2e]">성과</p>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={targetForm.hasContent} onChange={(e) => setTargetForm({ ...targetForm, hasContent: e.target.checked })} className="accent-[#5a3b2e]" />
                              <span className="text-slate-600">콘텐츠 생성됨</span>
                            </label>
                          </div>
                          {targetForm.hasContent && (
                            <div className="grid grid-cols-2 gap-3">
                              <label className="col-span-2 space-y-1.5 text-sm block">
                                <span className="text-slate-600">게시 링크</span>
                                <input value={targetForm.contentUrl} onChange={(e) => setTargetForm({ ...targetForm, contentUrl: e.target.value })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" placeholder="https://..." />
                              </label>
                              <label className="space-y-1.5 text-sm">
                                <span className="text-slate-600">게시일</span>
                                <input type="date" value={targetForm.contentDate} onChange={(e) => setTargetForm({ ...targetForm, contentDate: e.target.value })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                              </label>
                              <label className="space-y-1.5 text-sm">
                                <span className="text-slate-600">조회수</span>
                                <input type="number" min={0} value={targetForm.views} onChange={(e) => setTargetForm({ ...targetForm, views: Number(e.target.value) })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                              </label>
                              <label className="space-y-1.5 text-sm">
                                <span className="text-slate-600">좋아요</span>
                                <input type="number" min={0} value={targetForm.likes} onChange={(e) => setTargetForm({ ...targetForm, likes: Number(e.target.value) })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                              </label>
                              <label className="space-y-1.5 text-sm">
                                <span className="text-slate-600">댓글</span>
                                <input type="number" min={0} value={targetForm.comments} onChange={(e) => setTargetForm({ ...targetForm, comments: Number(e.target.value) })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                              </label>
                              <label className="space-y-1.5 text-sm">
                                <span className="text-slate-600">후기/반응</span>
                                <input value={targetForm.reaction} onChange={(e) => setTargetForm({ ...targetForm, reaction: e.target.value })}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                              </label>
                              <label className="col-span-2 space-y-1.5 text-sm block">
                                <span className="text-slate-600">결과 메모</span>
                                <textarea value={targetForm.resultMemo} onChange={(e) => setTargetForm({ ...targetForm, resultMemo: e.target.value })} rows={2}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373] resize-none" />
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => { setShowTargetForm(false); setEditingTargetId(null) }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                          <button type="button" onClick={submitTarget} disabled={!targetForm.name.trim()}
                            className="rounded-xl bg-[#5a3b2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#462a20] disabled:opacity-40">
                            {editingTargetId ? '수정 저장' : '추가'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={openTargetAdd}
                        className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-400 hover:border-[#d4a373] hover:text-[#5a3b2e] transition">
                        + 대상자 추가
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <div className="flex gap-2">
                  {(['basic', 'products', 'targets'] as const).map((tab, i, arr) => {
                    if (modalTab !== tab) return null
                    return (
                      <div key={tab} className="flex gap-2">
                        {i > 0 && <button type="button" onClick={() => setModalTab(arr[i - 1])} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← 이전</button>}
                        {i < arr.length - 1 && <button type="button" onClick={() => setModalTab(arr[i + 1])} className="rounded-xl border border-[#5a3b2e] px-4 py-2 text-sm font-semibold text-[#5a3b2e] hover:bg-[#f6ead8]">다음 →</button>}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                  <button type="button" onClick={submitProject} className="rounded-xl bg-[#5a3b2e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#462a20]">
                    {editingId ? '수정 저장' : '등록'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900 mb-2">프로젝트 삭제</h2>
              <p className="text-sm text-slate-600 mb-5">이 협찬 프로젝트를 삭제하면 복구할 수 없습니다.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteTargetProject(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                <button type="button" onClick={doDeleteProject} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

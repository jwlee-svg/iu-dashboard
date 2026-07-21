import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import type { Creator } from '../types/creator'
import { AFFECTION_COLORS, AFFECTION_OPTIONS, calcInfluence, formatSubs } from '../types/creator'
import type { SponsorshipProject } from '../types/sponsorship'
import { PROJECT_TYPE_COLOR, STATUS_COLOR } from '../types/sponsorship'
import { fetchCreatorsFromSheet, mergeCreatorsById, pushCreatorToSheet } from '../lib/sheetSync'

const STORAGE_KEY = 'iu-dashboard-creators'
const SHEET_URL_KEY = 'iu-dashboard-creators-sheet-url'
const CONTENT_KEY = 'iu-dashboard-contents'
const TARGETS_KEY = 'iu-dashboard-shipping-targets'
const SP_KEY = 'iu-dashboard-sponsorship-projects'
const PRODUCTS_KEY = 'iu-dashboard-products'

const loadCreators = (): Creator[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const defaultCreator = (): Creator => ({
  creatorId: '',
  name: '',
  realName: '',
  affection: '3.임팩트',
  ytUrl: '',
  ytSubscribers: 0,
  ytLastUpdated: '',
  igUrl: '',
  igFollowers: 0,
  tkUrl: '',
  tkFollowers: 0,
  faceExposure: false,
  ageTargets: [],
  keywords: [],
  hasChildren: false,
  isCommerce: false,
  isCelebrity: false,
  isDoctor: false,
  isNutritionFitness: false,
  isDiabeticLowCarb: false,
  isOrganic: false,
  hasPaidCollab: false,
  hasGroupBuy: false,
  phone: '',
  address: '',
  firstSeedingDate: '',
  agencyName: '',
  agencyContact: '',
  shippingNote: '',
  smsName: '',
  notionUrl: '',
  notes: '',
})

const KEYWORD_OPTIONS = ['다이어트', '레시피', '베이킹', '자취/살림', '인테리어', '뷰티/패션', '운동/헬스', '육아', '음식/먹방', '요리/집밥', '직장인', '여행', '일상']
const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45+', '시니어(50+)']

const YT_TIER_OPTIONS = ['소형(나노)', '소형(마이크로)', '중형(미드티어)', '대형(매크로)', '대형(메가)']

type FeatureFlagKey = 'faceExposure' | 'isCelebrity' | 'isDoctor' | 'isNutritionFitness' | 'isDiabeticLowCarb' | 'isOrganic' | 'isCommerce' | 'hasPaidCollab' | 'hasGroupBuy'
const FEATURE_FLAGS: { key: FeatureFlagKey; label: string }[] = [
  { key: 'faceExposure', label: '얼굴노출' },
  { key: 'isCelebrity', label: '연예인' },
  { key: 'isDoctor', label: '의사' },
  { key: 'isNutritionFitness', label: '영양/피트니스' },
  { key: 'isDiabeticLowCarb', label: '당뇨/저탄고지' },
  { key: 'isOrganic', label: '오가닉' },
  { key: 'isCommerce', label: '커머스후보' },
  { key: 'hasPaidCollab', label: '광고/협업가능' },
  { key: 'hasGroupBuy', label: '공구가능' },
]

interface YtPreview {
  thumbnail: string
  title: string
  subscriberCount: number
  videoCount: number
}

type SortField = 'name' | 'yt' | 'ig' | 'tk' | 'collab' | 'seeding'
const SORT_FIELD_LABEL: Record<SortField, string> = {
  name: '이름',
  yt: 'YT 구독자',
  ig: 'IG 팔로워',
  tk: 'TK 팔로워',
  collab: '협업횟수',
  seeding: '첫 시딩일',
}

function tagChip(label: string, active: boolean, onClick: () => void) {
  return (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-[#5a3b2e] text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8] hover:text-[#5a3b2e]'
      }`}
    >
      {label}
    </button>
  )
}

function BoolChip({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
        value
          ? 'bg-[#5a3b2e] text-white border-[#5a3b2e]'
          : 'bg-white text-slate-600 border-slate-300 hover:border-[#5a3b2e]'
      }`}
    >
      {value ? '✓ ' : ''}{label}
    </button>
  )
}

interface ContentItemShort {
  id: string
  creatorId?: string
  influencerName: string
  contentName: string
  campaignName: string
  publishDate: string
  manager?: string
  projectType?: string
}

interface ShippingTargetShort {
  id: string
  projectId: string
  creatorId?: string
  name: string
  shippingStatus: string
  smsSent: boolean
}

interface ShippingProjectShort {
  id: string
  name: string
  scheduledDate: string
}

export default function CreatorDBPage() {
  const [creators, setCreators] = useState<Creator[]>(loadCreators)
  const [savedCreators, setSavedCreators] = useState<Creator[]>(loadCreators)
  const [search, setSearch] = useState('')
  const [filterAffection, setFilterAffection] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterYtTier, setFilterYtTier] = useState('')
  const [filterFeatures, setFilterFeatures] = useState<Set<FeatureFlagKey>>(new Set())
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'info' | 'shipping' | 'content' | 'sponsorship'>('info')
  const [showModal, setShowModal] = useState(false)
  const [editForm, setEditForm] = useState<Creator>(defaultCreator())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [ytPreviewCache, setYtPreviewCache] = useState<Record<string, YtPreview | 'loading' | 'error'>>({})
  const [hoverPreview, setHoverPreview] = useState<{ creatorId: string; x: number; y: number } | null>(null)

  const [showSheetModal, setShowSheetModal] = useState(false)
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(SHEET_URL_KEY) ?? '')
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState('')

  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const hasUnsaved = JSON.stringify(creators) !== JSON.stringify(savedCreators)

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(t)
  }, [status])

  const save = (next: Creator[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSavedCreators(next)
    setStatus({ type: 'success', text: '인플루언서 DB가 저장되었습니다.' })
  }

  const handleImportFromSheet = async () => {
    if (!sheetUrl.trim()) {
      setSheetError('Apps Script 웹 앱 URL을 입력하세요.')
      return
    }
    setSheetLoading(true)
    setSheetError('')
    try {
      const incoming = await fetchCreatorsFromSheet(sheetUrl.trim())
      const { merged, added, updated } = mergeCreatorsById(creators, incoming)
      localStorage.setItem(SHEET_URL_KEY, sheetUrl.trim())
      setCreators(merged)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      setSavedCreators(merged)
      setShowSheetModal(false)
      setStatus({ type: 'success', text: `구글시트에서 불러와 저장했습니다. 신규 ${added}건 · 업데이트 ${updated}건` })
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '구글시트를 불러오지 못했습니다.')
    } finally {
      setSheetLoading(false)
    }
  }

  const getCollabCount = (creator: Creator) => {
    try {
      const raw = localStorage.getItem(CONTENT_KEY)
      if (!raw) return 0
      const all = JSON.parse(raw) as ContentItemShort[]
      return all.filter((i) => i.creatorId === creator.creatorId || i.influencerName === creator.name).length
    } catch { return 0 }
  }

  const filtered = creators.filter((c) => {
    if (search && !c.name.includes(search) && !c.realName.includes(search) && !c.agencyName.includes(search)) return false
    if (filterAffection && c.affection !== filterAffection) return false
    if (filterKeyword && !c.keywords.includes(filterKeyword)) return false
    if (filterYtTier && calcInfluence('yt', c.ytSubscribers) !== filterYtTier) return false
    for (const key of filterFeatures) {
      if (!c[key]) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'yt':
        return (a.ytSubscribers - b.ytSubscribers) * dir
      case 'ig':
        return (a.igFollowers - b.igFollowers) * dir
      case 'tk':
        return (a.tkFollowers - b.tkFollowers) * dir
      case 'collab':
        return (getCollabCount(a) - getCollabCount(b)) * dir
      case 'seeding':
        return (a.firstSeedingDate || '').localeCompare(b.firstSeedingDate || '') * dir
      default:
        return a.name.localeCompare(b.name) * dir
    }
  })

  const selectedCreator = creators.find((c) => c.creatorId === selectedId) ?? null

  const readContentHistory = (creatorId: string): ContentItemShort[] => {
    try {
      const raw = localStorage.getItem(CONTENT_KEY)
      if (!raw) return []
      const all = JSON.parse(raw) as ContentItemShort[]
      return all.filter((i) => i.creatorId === creatorId || i.influencerName === (selectedCreator?.name ?? ''))
    } catch { return [] }
  }

  const readShippingHistory = (creatorId: string) => {
    try {
      const tRaw = localStorage.getItem(TARGETS_KEY)
      const pRaw = localStorage.getItem('iu-dashboard-shipping-projects')
      if (!tRaw) return []
      const targets = JSON.parse(tRaw) as ShippingTargetShort[]
      const projects: ShippingProjectShort[] = pRaw ? JSON.parse(pRaw) : []
      const matched = targets.filter((t) => t.creatorId === creatorId || t.name === (selectedCreator?.name ?? ''))
      return matched.map((t) => {
        const project = projects.find((p) => p.id === t.projectId)
        return { ...t, projectName: project?.name ?? t.projectId, projectDate: project?.scheduledDate ?? '' }
      })
    } catch { return [] }
  }

  const readSponsorshipHistory = (creatorId: string) => {
    try {
      const spRaw = localStorage.getItem(SP_KEY)
      const pdRaw = localStorage.getItem(PRODUCTS_KEY)
      if (!spRaw) return []
      const projects = JSON.parse(spRaw) as SponsorshipProject[]
      const productMap: Record<string, string> = {}
      if (pdRaw) {
        const prods = JSON.parse(pdRaw) as { productId: string; name: string }[]
        prods.forEach((p) => { productMap[p.productId] = p.name })
      }
      return projects
        .filter((p) => p.targets.some((t) => t.creatorId === creatorId || t.name === (selectedCreator?.name ?? '')))
        .map((p) => ({
          ...p,
          creatorTarget: p.targets.find((t) => t.creatorId === creatorId || t.name === (selectedCreator?.name ?? '')),
          productMap,
        }))
    } catch { return [] }
  }

  const openAdd = () => {
    setEditForm({ ...defaultCreator(), creatorId: `cr_${String(Date.now()).slice(-4).padStart(4, '0')}` })
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (c: Creator) => {
    setEditForm({ ...c })
    setEditingId(c.creatorId)
    setShowModal(true)
  }

  const submitForm = async () => {
    if (!editForm.name.trim()) {
      setStatus({ type: 'error', text: '크리에이터명을 입력하세요.' })
      return
    }
    const isNew = !editingId
    const localCreator: Creator = isNew
      ? { ...editForm, creatorId: `cr_${String(creators.length + 1).padStart(4, '0')}` }
      : { ...editForm }

    if (isNew) {
      setCreators((prev) => [localCreator, ...prev])
    } else {
      setCreators((prev) => prev.map((c) => (c.creatorId === editingId ? localCreator : c)))
    }
    setShowModal(false)
    setEditingId(null)

    if (sheetUrl.trim()) {
      try {
        const assignedId = await pushCreatorToSheet(sheetUrl.trim(), localCreator)
        if (assignedId !== localCreator.creatorId) {
          setCreators((prev) => prev.map((c) => (c.creatorId === localCreator.creatorId ? { ...c, creatorId: assignedId } : c)))
        }
        setStatus({ type: 'success', text: '구글시트에도 반영했습니다.' })
      } catch (e) {
        setStatus({ type: 'error', text: e instanceof Error ? `구글시트 저장 실패: ${e.message}` : '구글시트 저장 실패' })
      }
    }
  }

  const confirmDelete = (id: string) => setDeleteTarget(id)
  const doDelete = () => {
    if (!deleteTarget) return
    setCreators((prev) => prev.filter((c) => c.creatorId !== deleteTarget))
    if (selectedId === deleteTarget) setSelectedId(null)
    setDeleteTarget(null)
  }

  const fetchYtChannelSubs = async (creator: Creator): Promise<number> => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) throw new Error('YouTube API 키가 없습니다.')
    const match = creator.ytUrl.match(/(?:youtube\.com\/@|youtube\.com\/channel\/|youtu\.be\/)([^/?&\s]+)/i)
    if (!match) throw new Error('YouTube URL을 확인하세요.')
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${match[1]}&key=${apiKey}`
    )
    if (!res.ok) throw new Error('API 오류')
    const data = await res.json()
    const subs = Number(data.items?.[0]?.statistics?.subscriberCount ?? 0)
    if (!subs) throw new Error('구독자 정보를 가져올 수 없습니다.')
    return subs
  }

  const fetchYtPreview = (creator: Creator) => {
    if (!creator.ytUrl || ytPreviewCache[creator.creatorId]) return
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    const match = creator.ytUrl.match(/(?:youtube\.com\/@|youtube\.com\/channel\/|youtu\.be\/)([^/?&\s]+)/i)
    if (!apiKey || !match) return
    setYtPreviewCache((prev) => ({ ...prev, [creator.creatorId]: 'loading' }))
    fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${match[1]}&key=${apiKey}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json() })
      .then((data) => {
        const item = data.items?.[0]
        if (!item) throw new Error()
        setYtPreviewCache((prev) => ({
          ...prev,
          [creator.creatorId]: {
            thumbnail: item.snippet?.thumbnails?.default?.url ?? '',
            title: item.snippet?.title ?? creator.name,
            subscriberCount: Number(item.statistics?.subscriberCount ?? 0),
            videoCount: Number(item.statistics?.videoCount ?? 0),
          },
        }))
      })
      .catch(() => setYtPreviewCache((prev) => ({ ...prev, [creator.creatorId]: 'error' })))
  }

  const fetchYtSubs = async (creator: Creator) => {
    setUpdatingId(creator.creatorId)
    try {
      const subs = await fetchYtChannelSubs(creator)
      const today = new Date().toISOString().slice(0, 10)
      const updated = { ...creator, ytSubscribers: subs, ytLastUpdated: today }
      setCreators((prev) => prev.map((c) => (c.creatorId === creator.creatorId ? updated : c)))
      setStatus({ type: 'success', text: `${creator.name} 구독자 업데이트: ${formatSubs(subs)}` })
      if (sheetUrl.trim()) {
        pushCreatorToSheet(sheetUrl.trim(), updated).catch(() => {})
      }
    } catch (e) {
      setStatus({ type: 'error', text: e instanceof Error ? e.message : '오류 발생' })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleBulkUpdateYt = async () => {
    const targets = creators.filter((c) => /(?:youtube\.com\/@|youtube\.com\/channel\/|youtu\.be\/)/i.test(c.ytUrl))
    if (!targets.length) {
      setStatus({ type: 'error', text: 'YouTube 링크가 있는 크리에이터가 없습니다.' })
      return
    }
    setBulkUpdating(true)
    setBulkProgress({ done: 0, total: targets.length })
    const today = new Date().toISOString().slice(0, 10)
    let success = 0
    let failed = 0
    let working = creators
    for (const creator of targets) {
      try {
        const subs = await fetchYtChannelSubs(creator)
        const updated = { ...creator, ytSubscribers: subs, ytLastUpdated: today }
        working = working.map((c) => (c.creatorId === creator.creatorId ? updated : c))
        setCreators(working)
        success += 1
        if (sheetUrl.trim()) {
          pushCreatorToSheet(sheetUrl.trim(), updated).catch(() => {})
        }
      } catch {
        failed += 1
      }
      setBulkProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : null))
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(working))
    setSavedCreators(working)
    setBulkUpdating(false)
    setBulkProgress(null)
    setStatus({
      type: success ? 'success' : 'error',
      text: `YouTube 구독자 일괄 업데이트 완료 및 저장: 성공 ${success}건 · 실패 ${failed}건`,
    })
  }

  const toggleTag = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-8 py-8">
        <PageHeader
          title="인플루언서 DB"
          subtitle="크리에이터 마스터 데이터 — 모든 협업 이력의 기준 데이터입니다."
          actions={
            <>
              <span className="text-sm text-slate-500">{creators.length}명 등록됨</span>
              <button
                type="button"
                onClick={() => setShowSheetModal(true)}
                className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#5a3b2e] transition hover:bg-[#f6ead8]"
              >
                구글시트 불러오기
              </button>
              <button
                type="button"
                onClick={handleBulkUpdateYt}
                disabled={bulkUpdating}
                className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#5a3b2e] transition hover:bg-[#f6ead8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkUpdating && bulkProgress ? `YouTube 업데이트 중... (${bulkProgress.done}/${bulkProgress.total})` : 'YouTube 구독자 일괄 업데이트'}
              </button>
              <button
                type="button"
                onClick={() => save(creators)}
                disabled={!hasUnsaved}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${hasUnsaved ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'cursor-not-allowed bg-slate-300'}`}
              >
                변경사항 저장
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-[#5a3b2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#462a20]"
              >
                + 크리에이터 추가
              </button>
            </>
          }
        />

        {status && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {status.text}
          </div>
        )}

        {/* Search + Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·소속사 검색..."
            className="w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
          />
          <div className="flex flex-wrap gap-2">
            {AFFECTION_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setFilterAffection(filterAffection === a ? '' : a)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterAffection === a ? 'bg-[#5a3b2e] text-white' : `${AFFECTION_COLORS[a] ?? 'bg-slate-100 text-slate-600'}`}`}
              >
                {a}
              </button>
            ))}
          </div>
          <select
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
          >
            <option value="">특화분야 전체</option>
            {KEYWORD_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select
            value={filterYtTier}
            onChange={(e) => setFilterYtTier(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
          >
            <option value="">YT 영향력 전체</option>
            {YT_TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {(search || filterAffection || filterKeyword || filterYtTier || filterFeatures.size > 0) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterAffection(''); setFilterKeyword(''); setFilterYtTier(''); setFilterFeatures(new Set()) }}
              className="text-xs text-slate-400 hover:text-[#5a3b2e]"
            >
              초기화
            </button>
          )}
        </div>

        {/* Feature filters + Sort */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 shrink-0">특징</span>
          <div className="flex flex-wrap gap-2">
            {FEATURE_FLAGS.map(({ key, label }) => {
              const active = filterFeatures.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setFilterFeatures((prev) => {
                      const next = new Set(prev)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${active ? 'bg-[#5a3b2e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8] hover:text-[#5a3b2e]'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">정렬</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
            >
              {(Object.keys(SORT_FIELD_LABEL) as SortField[]).map((f) => (
                <option key={f} value={f}>{SORT_FIELD_LABEL[f]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#5a3b2e] hover:bg-[#f6ead8]"
              title={sortDir === 'asc' ? '오름차순' : '내림차순'}
            >
              {sortDir === 'asc' ? '오름차순 ▲' : '내림차순 ▼'}
            </button>
          </div>
        </div>

        {/* Table + Slide Panel */}
        <div className="flex gap-4">
          <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all ${selectedId ? 'flex-1 min-w-0' : 'w-full'}`}>
            <div className="overflow-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
                <thead>
                  <tr className="bg-[#f6ead8] text-[#5a3b2e]">
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">No.</th>
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">애정도</th>
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">크리에이터명</th>
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">YT 구독자</th>
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">YT 영향력</th>
                    {!selectedId && (
                      <>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">IG 팔로워</th>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">IG 영향력</th>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">TK 팔로워</th>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">특화분야</th>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">소속사</th>
                        <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">협업횟수</th>
                      </>
                    )}
                    <th className="sticky top-0 px-3 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, idx) => {
                    const isSelected = selectedId === c.creatorId
                    const collabCount = getCollabCount(c)
                    return (
                      <tr
                        key={c.creatorId}
                        onClick={() => { setSelectedId(isSelected ? null : c.creatorId); setPanelTab('info') }}
                        className={`border-t border-slate-100 cursor-pointer transition ${isSelected ? 'bg-[#fdf6ee]' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${AFFECTION_COLORS[c.affection] ?? 'bg-slate-100 text-slate-500'}`}>
                            {c.affection}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div
                            className="flex items-center gap-2"
                            onMouseEnter={(e) => {
                              if (!c.ytUrl) return
                              setHoverPreview({ creatorId: c.creatorId, x: e.clientX, y: e.clientY })
                              fetchYtPreview(c)
                            }}
                            onMouseMove={(e) => {
                              if (!c.ytUrl) return
                              setHoverPreview((prev) => (prev && prev.creatorId === c.creatorId ? { ...prev, x: e.clientX, y: e.clientY } : prev))
                            }}
                            onMouseLeave={() => setHoverPreview((prev) => (prev?.creatorId === c.creatorId ? null : prev))}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: '#5a3b2e' }}>
                              {c.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">{c.name}</p>
                              {c.realName && c.realName !== c.name && <p className="text-[11px] text-slate-400">{c.realName}</p>}
                            </div>
                            {c.isCelebrity && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">연예인</span>}
                            {c.faceExposure && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">얼굴</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {c.ytSubscribers ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{formatSubs(c.ytSubscribers)}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); fetchYtSubs(c) }}
                                disabled={updatingId === c.creatorId}
                                className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] disabled:opacity-50"
                              >
                                {updatingId === c.creatorId ? '...' : '업데이트'}
                              </button>
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{calcInfluence('yt', c.ytSubscribers)}</td>
                        {!selectedId && (
                          <>
                            <td className="px-3 py-3 text-slate-600">{c.igFollowers ? formatSubs(c.igFollowers) : <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">{calcInfluence('ig', c.igFollowers)}</td>
                            <td className="px-3 py-3 text-slate-600">{c.tkFollowers ? formatSubs(c.tkFollowers) : <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-3 max-w-[160px]">
                              <div className="flex flex-wrap gap-1">
                                {c.keywords.slice(0, 3).map((k) => (
                                  <span key={k} className="rounded-full bg-[#f6ead8] px-2 py-0.5 text-[10px] text-[#5a3b2e] font-medium">{k}</span>
                                ))}
                                {c.keywords.length > 3 && <span className="text-[10px] text-slate-400">+{c.keywords.length - 3}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500 max-w-[120px] truncate">{c.agencyName || <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-sm font-semibold ${collabCount > 0 ? 'text-[#5a3b2e]' : 'text-slate-300'}`}>{collabCount}</span>
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] transition"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(c.creatorId)}
                              className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-400">조건에 맞는 크리에이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slide Panel */}
          {selectedCreator && (
            <div
              ref={panelRef}
              className="w-[380px] shrink-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '80px' }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold" style={{ background: '#5a3b2e' }}>
                    {selectedCreator.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{selectedCreator.name}</p>
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${AFFECTION_COLORS[selectedCreator.affection] ?? 'bg-slate-100 text-slate-500'}`}>
                      {selectedCreator.affection}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 shrink-0">
                {(['info', 'shipping', 'content', 'sponsorship'] as const).map((tab) => {
                  const labels: Record<string, string> = { info: '기본정보', shipping: '발송이력', content: '콘텐츠이력', sponsorship: '협찬이력' }
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPanelTab(tab)}
                      className={`flex-1 py-3 text-[11px] font-semibold transition border-b-2 ${panelTab === tab ? 'border-[#5a3b2e] text-[#5a3b2e]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
                {panelTab === 'info' && (
                  <>
                    {/* Platform stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'YouTube', val: selectedCreator.ytSubscribers, platform: 'yt' as const, url: selectedCreator.ytUrl },
                        { label: 'Instagram', val: selectedCreator.igFollowers, platform: 'ig' as const, url: selectedCreator.igUrl },
                        { label: 'TikTok', val: selectedCreator.tkFollowers, platform: 'tk' as const, url: selectedCreator.tkUrl },
                      ].map(({ label, val, platform, url }) => (
                        <a
                          key={label}
                          href={url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded-2xl p-3 text-center block ${val ? 'bg-[#fdf6ee] hover:bg-[#f6ead8]' : 'bg-slate-50 cursor-default pointer-events-none opacity-40'}`}
                        >
                          <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                          <p className="font-bold text-[#5a3b2e]">{val ? formatSubs(val) : '-'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{calcInfluence(platform, val)}</p>
                        </a>
                      ))}
                    </div>

                    {/* Attributes */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">특화분야</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCreator.keywords.length ? selectedCreator.keywords.map((k) => (
                          <span key={k} className="rounded-full bg-[#f6ead8] px-2 py-0.5 text-[11px] text-[#5a3b2e] font-medium">{k}</span>
                        )) : <span className="text-slate-300 text-xs">없음</span>}
                      </div>
                    </div>

                    {selectedCreator.ageTargets.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">연령 타겟</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedCreator.ageTargets.map((a) => (
                            <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {selectedCreator.isCelebrity && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">연예인</span>}
                      {selectedCreator.faceExposure && <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[11px] font-semibold">얼굴 노출</span>}
                      {selectedCreator.hasChildren && <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-semibold">자녀</span>}
                      {selectedCreator.isDoctor && <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[11px] font-semibold">의사</span>}
                      {selectedCreator.isNutritionFitness && <span className="rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-[11px] font-semibold">영양/피트니스</span>}
                      {selectedCreator.isDiabeticLowCarb && <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[11px] font-semibold">당뇨/저탄고지</span>}
                      {selectedCreator.isOrganic && <span className="rounded-full bg-lime-100 text-lime-700 px-2 py-0.5 text-[11px] font-semibold">오가닉</span>}
                      {selectedCreator.hasPaidCollab && <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[11px] font-semibold">광고/협업</span>}
                      {selectedCreator.hasGroupBuy && <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[11px] font-semibold">공구</span>}
                    </div>

                    {/* Contact info */}
                    <div className="rounded-2xl bg-slate-50 p-4 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-500 mb-3">연락처 정보</p>
                      {[
                        { label: '연락처', value: selectedCreator.phone },
                        { label: '주소', value: selectedCreator.address },
                        { label: '수령인', value: selectedCreator.realName },
                        { label: '문자발송이름', value: selectedCreator.smsName },
                        { label: '첫 시딩일', value: selectedCreator.firstSeedingDate },
                        { label: '소속사', value: selectedCreator.agencyName },
                        { label: '컨택포인트', value: selectedCreator.agencyContact },
                        { label: '배송 참고', value: selectedCreator.shippingNote },
                        { label: '노출 URL', value: selectedCreator.notionUrl },
                      ].map(({ label, value }) => value ? (
                        <div key={label} className="flex gap-2">
                          <span className="text-[11px] text-slate-400 w-20 shrink-0">{label}</span>
                          <span className="text-[11px] text-slate-700 break-all">{value}</span>
                        </div>
                      ) : null)}
                    </div>

                    {selectedCreator.notes && (
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1">비고</p>
                        <p className="text-xs text-amber-800">{selectedCreator.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {panelTab === 'shipping' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3">정기 발송 이력</p>
                    {(() => {
                      const history = readShippingHistory(selectedCreator.creatorId)
                      if (!history.length) return <p className="text-xs text-slate-400">발송 이력이 없습니다.</p>
                      return history.map((h: any) => (
                        <div key={h.id} className="mb-3 rounded-2xl border border-slate-100 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-slate-800">{h.projectName}</p>
                            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${h.shippingStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : h.shippingStatus === 'not_sent' ? 'bg-slate-100 text-slate-500 line-through opacity-60' : 'bg-amber-100 text-amber-700'}`}>
                              {h.shippingStatus === 'completed' ? '발송완료' : h.shippingStatus === 'not_sent' ? '미발송' : h.shippingStatus === 'rejected' ? '거절' : h.shippingStatus === 'pending' ? '대기' : '특수'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{h.projectDate}</p>
                          {h.smsSent && <p className="text-[10px] text-emerald-600 mt-1">SMS 발송됨</p>}
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {panelTab === 'content' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3">콘텐츠 협업 이력</p>
                    {(() => {
                      const history = readContentHistory(selectedCreator.creatorId)
                      if (!history.length) return <p className="text-xs text-slate-400">협업 이력이 없습니다.</p>
                      return history.map((h) => (
                        <div key={h.id} className="mb-3 rounded-2xl border border-slate-100 p-3">
                          <p className="text-xs font-semibold text-slate-800">{h.contentName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-400">{h.campaignName}</span>
                            <span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[11px] text-slate-400">{h.publishDate}</span>
                          </div>
                          {(h.manager || h.projectType) && (
                            <div className="flex gap-2 mt-1">
                              {h.manager && <span className="rounded-full bg-[#f6ead8] px-2 py-0.5 text-[10px] text-[#5a3b2e]">{h.manager}</span>}
                              {h.projectType && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{h.projectType}</span>}
                            </div>
                          )}
                        </div>
                      ))
                    })()}
                  </div>
                )}
                {panelTab === 'sponsorship' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3">협찬 프로젝트 이력</p>
                    {(() => {
                      const history = readSponsorshipHistory(selectedCreator.creatorId)
                      if (!history.length) return <p className="text-xs text-slate-400">협찬 이력이 없습니다.</p>
                      return history.map((h) => {
                        const t = h.creatorTarget
                        const totalCost = h.products.reduce((sum: number, i: { productId: string; quantity: number; costPrice: number }) => sum + i.costPrice * i.quantity, 0)
                        return (
                          <div key={h.projectId} className="mb-4 rounded-2xl border border-slate-100 p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PROJECT_TYPE_COLOR[h.projectType]}`}>{h.projectType}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[h.status]}`}>{h.status}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800">{h.name}</p>
                            {h.eventDate && <p className="text-[11px] text-slate-400">행사일: {h.eventDate}</p>}
                            {h.products.length > 0 && (
                              <div>
                                <p className="text-[10px] text-slate-400 mb-1">제품 구성</p>
                                <div className="flex flex-wrap gap-1">
                                  {h.products.map((i: { productId: string; quantity: number; costPrice: number }) => (
                                    <span key={i.productId} className="rounded-full bg-[#f6ead8] px-2 py-0.5 text-[10px] text-[#5a3b2e]">
                                      {h.productMap[i.productId] || i.productId} ×{i.quantity}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">총 원가: ₩{totalCost.toLocaleString('ko-KR')}</p>
                              </div>
                            )}
                            {t && (
                              <div className="rounded-xl bg-slate-50 px-3 py-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-semibold text-slate-600">나의 성과</p>
                                  {t.hasContent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">콘텐츠 있음</span> : <span className="text-[10px] text-slate-400">콘텐츠 없음</span>}
                                </div>
                                {t.contentUrl && <a href={t.contentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline block truncate">{t.contentUrl}</a>}
                                {t.views > 0 && (
                                  <div className="flex gap-3 text-[10px] text-slate-500">
                                    <span>👁 {t.views.toLocaleString('ko-KR')}</span>
                                    {t.likes > 0 && <span>❤️ {t.likes.toLocaleString('ko-KR')}</span>}
                                  </div>
                                )}
                                {t.resultMemo && <p className="text-[10px] font-semibold text-emerald-700">{t.resultMemo}</p>}
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>

              {/* Edit button at bottom */}
              <div className="border-t border-slate-100 px-5 py-3 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(selectedCreator)}
                  className="w-full rounded-xl bg-[#5a3b2e] py-2.5 text-sm font-semibold text-white hover:bg-[#462a20] transition"
                >
                  정보 수정
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
            <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? '크리에이터 수정' : '크리에이터 추가'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-sm">
                    <span className="text-slate-700 font-medium">크리에이터명 <span className="text-red-500">*</span></span>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                      placeholder="활동명"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="text-slate-700 font-medium">수령인 (실명)</span>
                    <input
                      value={editForm.realName}
                      onChange={(e) => setEditForm({ ...editForm, realName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                      placeholder="실명"
                    />
                  </label>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">애정도</p>
                  <div className="flex flex-wrap gap-2">
                    {AFFECTION_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, affection: a })}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${editForm.affection === a ? 'bg-[#5a3b2e] text-white border-[#5a3b2e]' : 'border-slate-300 text-slate-600 hover:border-[#5a3b2e]'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform URLs */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">플랫폼</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">YouTube URL</label>
                      <input value={editForm.ytUrl} onChange={(e) => setEditForm({ ...editForm, ytUrl: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" placeholder="https://youtube.com/@..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">YT 구독자수</label>
                      <input type="number" value={editForm.ytSubscribers} onChange={(e) => setEditForm({ ...editForm, ytSubscribers: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">Instagram URL</label>
                      <input value={editForm.igUrl} onChange={(e) => setEditForm({ ...editForm, igUrl: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" placeholder="https://instagram.com/..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">IG 팔로워</label>
                      <input type="number" value={editForm.igFollowers} onChange={(e) => setEditForm({ ...editForm, igFollowers: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">TikTok URL</label>
                      <input value={editForm.tkUrl} onChange={(e) => setEditForm({ ...editForm, tkUrl: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" placeholder="https://tiktok.com/@..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-600">TK 팔로워</label>
                      <input type="number" value={editForm.tkFollowers} onChange={(e) => setEditForm({ ...editForm, tkFollowers: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">특화분야</p>
                  <div className="flex flex-wrap gap-2">
                    {KEYWORD_OPTIONS.map((k) => tagChip(k, editForm.keywords.includes(k), () => setEditForm({ ...editForm, keywords: toggleTag(editForm.keywords, k) })))}
                  </div>
                </div>

                {/* Age targets */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">연령 타겟</p>
                  <div className="flex flex-wrap gap-2">
                    {AGE_OPTIONS.map((a) => tagChip(a, editForm.ageTargets.includes(a), () => setEditForm({ ...editForm, ageTargets: toggleTag(editForm.ageTargets, a) })))}
                  </div>
                </div>

                {/* Boolean attributes */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">특성</p>
                  <div className="flex flex-wrap gap-2">
                    <BoolChip label="얼굴노출" value={editForm.faceExposure} onChange={(v) => setEditForm({ ...editForm, faceExposure: v })} />
                    <BoolChip label="자녀" value={editForm.hasChildren} onChange={(v) => setEditForm({ ...editForm, hasChildren: v })} />
                    <BoolChip label="연예인" value={editForm.isCelebrity} onChange={(v) => setEditForm({ ...editForm, isCelebrity: v })} />
                    <BoolChip label="커머스 후보" value={editForm.isCommerce} onChange={(v) => setEditForm({ ...editForm, isCommerce: v })} />
                    <BoolChip label="의사" value={editForm.isDoctor} onChange={(v) => setEditForm({ ...editForm, isDoctor: v })} />
                    <BoolChip label="영양/피트니스" value={editForm.isNutritionFitness} onChange={(v) => setEditForm({ ...editForm, isNutritionFitness: v })} />
                    <BoolChip label="당뇨/저탄고지" value={editForm.isDiabeticLowCarb} onChange={(v) => setEditForm({ ...editForm, isDiabeticLowCarb: v })} />
                    <BoolChip label="오가닉" value={editForm.isOrganic} onChange={(v) => setEditForm({ ...editForm, isOrganic: v })} />
                    <BoolChip label="광고/협업" value={editForm.hasPaidCollab} onChange={(v) => setEditForm({ ...editForm, hasPaidCollab: v })} />
                    <BoolChip label="공구" value={editForm.hasGroupBuy} onChange={(v) => setEditForm({ ...editForm, hasGroupBuy: v })} />
                  </div>
                </div>

                {/* Contact */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">연락처 / 배송 정보</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: '연락처', field: 'phone', placeholder: '010-XXXX-XXXX' },
                      { label: '문자발송이름', field: 'smsName', placeholder: '' },
                      { label: '소속사', field: 'agencyName', placeholder: '' },
                      { label: '컨택포인트', field: 'agencyContact', placeholder: '이름 / 이메일' },
                      { label: '첫 시딩일', field: 'firstSeedingDate', placeholder: 'YYYY-MM-DD' },
                      { label: '배송 참고', field: 'shippingNote', placeholder: '' },
                    ] as { label: string; field: keyof Creator; placeholder: string }[]).map(({ label, field, placeholder }) => (
                      <label key={field} className="space-y-1.5 text-sm">
                        <span className="text-xs text-slate-600">{label}</span>
                        <input
                          value={String(editForm[field] ?? '')}
                          onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                          placeholder={placeholder}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="space-y-1.5 text-sm block">
                    <span className="text-xs text-slate-600">주소</span>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm block">
                    <span className="text-xs text-slate-600">비고</span>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">취소</button>
                <button type="button" onClick={submitForm} className="rounded-xl bg-[#5a3b2e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#462a20] transition">
                  {editingId ? '수정 저장' : '추가'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* YT Channel Preview */}
        {hoverPreview && (() => {
          const creator = sorted.find((c) => c.creatorId === hoverPreview.creatorId)
          if (!creator?.ytUrl) return null
          const preview = ytPreviewCache[creator.creatorId]
          return (
            <div
              className="fixed z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl pointer-events-none"
              style={{ left: Math.min(hoverPreview.x + 16, window.innerWidth - 272), top: hoverPreview.y + 16 }}
            >
              {!preview || preview === 'loading' ? (
                <p className="text-xs text-slate-400">채널 정보 불러오는 중...</p>
              ) : preview === 'error' ? (
                <p className="text-xs text-red-500">채널 정보를 가져오지 못했습니다.</p>
              ) : (
                <div className="flex items-center gap-3">
                  {preview.thumbnail && (
                    <img src={preview.thumbnail} alt={preview.title} className="h-12 w-12 shrink-0 rounded-full" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{preview.title}</p>
                    <p className="text-xs text-slate-500">
                      구독자 {formatSubs(preview.subscriberCount)} · 영상 {preview.videoCount.toLocaleString('ko-KR')}개
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Sheet Sync */}
        {showSheetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900 mb-2">구글시트 불러오기</h2>
              <p className="text-sm text-slate-600 mb-4">
                구글시트에 배포한 Apps Script 웹 앱 URL을 입력하세요. 시트의 "인플루언서" 탭 데이터를 불러와
                기존 크리에이터는 업데이트하고, 새 크리에이터는 추가합니다.
              </p>
              <input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/xxxx/exec"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
              />
              {sheetError && <p className="mt-2 text-sm text-red-600">{sheetError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSheetModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleImportFromSheet}
                  disabled={sheetLoading}
                  className="rounded-xl bg-[#5a3b2e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#462a20] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sheetLoading ? '불러오는 중...' : '불러오기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900 mb-2">크리에이터 삭제</h2>
              <p className="text-sm text-slate-600 mb-5">이 크리에이터를 삭제하면 복구할 수 없습니다.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                <button type="button" onClick={doDelete} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

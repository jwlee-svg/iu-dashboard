import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import KpiCard from '../components/KpiCard'
import type { Creator } from '../types/creator'
import { fetchNaverTrendData } from '../lib/naverTrends'
import type { PeriodPreset, SearchTrendProject, TrendDataPoint, TrendDevice } from '../types/searchTrend'
import { PERIOD_PRESET_DAYS, PERIOD_PRESETS, keywordColor } from '../types/searchTrend'

const CONTENT_KEY = 'iu-dashboard-contents'
const CREATORS_KEY = 'iu-dashboard-creators'
const TREND_KEY = 'iu-dashboard-search-trends'

interface PlatformMetricLite {
  url: string
  currentViews: number
  currentLikes: number
  currentComments: number
}

interface ContentItemLite {
  id: string
  creatorId?: string
  contentName: string
  influencerName: string
  campaignName: string
  publishDate: string
  platforms: string[]
  platformMetrics: Record<string, PlatformMetricLite>
  manager?: string
  projectType?: string
  projectStatus?: string
  adFee?: number
  rsFinalSales?: number
  rsRate?: number
  notionUrl?: string
}

interface KeywordStat {
  keyword: string
  preAvg: number
  postAvg: number
  changeRate: number | null
  peakValue: number
  peakDate: string
}

const loadContentItems = (): ContentItemLite[] => {
  try {
    const raw = localStorage.getItem(CONTENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const loadCreators = (): Creator[] => {
  const raw = localStorage.getItem(CREATORS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const loadTrendProjects = (): SearchTrendProject[] => {
  const raw = localStorage.getItem(TREND_KEY)
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const formatNumber = (value: number) => value.toLocaleString('ko-KR')

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// 네이버 데이터랩은 아직 집계되지 않은 미래/당일 데이터를 요청하면 400 오류를 낸다.
const maxTrendEndDate = () => addDays(new Date().toISOString().slice(0, 10), -1)
const clampToMaxEndDate = (date: string) => {
  const max = maxTrendEndDate()
  return date > max ? max : date
}

const computePeriodFromPreset = (publishDate: string, preset: PeriodPreset) => {
  if (preset === '직접설정') return { startDate: publishDate, endDate: clampToMaxEndDate(publishDate) }
  const days = PERIOD_PRESET_DAYS[preset]
  return { startDate: addDays(publishDate, -days), endDate: clampToMaxEndDate(addDays(publishDate, days)) }
}

const pivotTrendData = (trendData: TrendDataPoint[]) => {
  const map = new Map<string, Record<string, string | number>>()
  trendData.forEach((p) => {
    if (!map.has(p.date)) map.set(p.date, { date: p.date })
    map.get(p.date)![p.keyword] = p.value
  })
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0)

const computeKeywordStats = (trend: SearchTrendProject, publishDate: string): KeywordStat[] =>
  trend.keywords.map((keyword) => {
    const points = trend.trendData.filter((p) => p.keyword === keyword)
    const pre = points.filter((p) => p.date < publishDate)
    const post = points.filter((p) => p.date >= publishDate)
    const preAvg = average(pre.map((p) => p.value))
    const postAvg = average(post.map((p) => p.value))
    const changeRate = preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : null
    const peak = points.reduce<TrendDataPoint | null>((max, p) => (!max || p.value > max.value ? p : max), null)
    return { keyword, preAvg, postAvg, changeRate, peakValue: peak?.value ?? 0, peakDate: peak?.date ?? '-' }
  })

const getContentAggregates = (item: ContentItemLite) => {
  let currentViews = 0
  let currentLikes = 0
  let currentComments = 0
  let primaryUrl = ''
  item.platforms.forEach((platform, idx) => {
    const key = platform === 'YouTube' ? 'youtube' : platform === 'Instagram' ? 'instagram' : 'tiktok'
    const metrics = item.platformMetrics?.[key]
    if (!metrics) return
    currentViews += metrics.currentViews || 0
    currentLikes += metrics.currentLikes || 0
    currentComments += metrics.currentComments || 0
    if (idx === 0) primaryUrl = metrics.url || ''
  })
  const commission = Math.round((item.rsFinalSales ?? 0) * (item.rsRate ?? 0) / 100)
  const totalCost = (item.adFee ?? 0) + commission
  const cpv = totalCost > 0 && currentViews > 0 ? totalCost / currentViews : 0
  return { currentViews, currentLikes, currentComments, primaryUrl, totalCost, commission, cpv }
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function ContentPicker({
  contentItems,
  linkedProjectIds,
  onSelect,
}: {
  contentItems: ContentItemLite[]
  linkedProjectIds: Set<string>
  onSelect: (item: ContentItemLite) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = (query.trim() === ''
    ? contentItems
    : contentItems.filter(
        (c) => c.contentName.includes(query) || c.campaignName.includes(query) || c.influencerName.includes(query),
      )
  ).slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="콘텐츠명·캠페인·인플루언서로 프로젝트 검색..."
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => {
                onSelect(c)
                setQuery('')
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f6ead8] transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{c.contentName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {c.influencerName} · {c.campaignName} · {c.publishDate}
                </p>
              </div>
              {linkedProjectIds.has(c.id) && (
                <span className="shrink-0 rounded-full bg-[#f6ead8] px-2 py-0.5 text-[10px] font-semibold text-[#5a3b2e]">
                  트렌드 등록됨
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 shadow-lg">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}

function MultiContentPicker({
  contentItems,
  excludeIds,
  onAdd,
}: {
  contentItems: ContentItemLite[]
  excludeIds: Set<string>
  onAdd: (item: ContentItemLite) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = contentItems
    .filter((c) => !excludeIds.has(c.id))
    .filter(
      (c) => query.trim() === '' || c.contentName.includes(query) || c.campaignName.includes(query) || c.influencerName.includes(query),
    )
    .slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="비교 마커로 추가할 콘텐츠 검색..."
        className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => {
                onAdd(c)
                setQuery('')
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#f6ead8] transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{c.contentName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {c.influencerName} · {c.campaignName} · {c.publishDate}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 shadow-lg">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}

export default function SearchTrendPage() {
  const [contentItems] = useState<ContentItemLite[]>(loadContentItems)
  const [creators] = useState<Creator[]>(loadCreators)
  const [trendProjects, setTrendProjects] = useState<SearchTrendProject[]>(loadTrendProjects)
  const [persistedTrendProjects, setPersistedTrendProjects] = useState<SearchTrendProject[]>(loadTrendProjects)
  const [activeTrendId, setActiveTrendId] = useState<string | null>(() => loadTrendProjects()[0]?.trendProjectId ?? null)
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [markerHover, setMarkerHover] = useState<{ x: number; y: number; items: ContentItemLite[] } | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const selectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(null), 4000)
    return () => clearTimeout(t)
  }, [statusMsg])

  const hasUnsaved = JSON.stringify(trendProjects) !== JSON.stringify(persistedTrendProjects)

  const creatorName = (creatorId?: string) => creators.find((c) => c.creatorId === creatorId)?.name ?? '-'

  const activeTrend = trendProjects.find((t) => t.trendProjectId === activeTrendId) ?? null
  const activeContent = activeTrend ? contentItems.find((c) => c.id === activeTrend.projectId) ?? null : null

  const linkedProjectIds = useMemo(() => new Set(trendProjects.map((t) => t.projectId)), [trendProjects])

  const updateActiveTrend = (updater: (t: SearchTrendProject) => SearchTrendProject) => {
    if (!activeTrendId) return
    setTrendProjects((prev) => prev.map((t) => (t.trendProjectId === activeTrendId ? updater(t) : t)))
  }

  const selectContent = (content: ContentItemLite) => {
    const existing = trendProjects.find((t) => t.projectId === content.id)
    if (existing) {
      setActiveTrendId(existing.trendProjectId)
      return
    }
    const { startDate, endDate } = computePeriodFromPreset(content.publishDate, '14일')
    const draft: SearchTrendProject = {
      trendProjectId: `tp_${Math.random().toString(36).slice(2, 10)}`,
      projectId: content.id,
      projectName: content.contentName,
      creatorId: content.creatorId,
      keywords: [],
      startDate,
      endDate,
      periodPreset: '14일',
      device: 'all',
      trendData: [],
      lastUpdatedAt: '',
      memo: '',
      markerProjectIds: [],
    }
    setTrendProjects((prev) => [draft, ...prev])
    setActiveTrendId(draft.trendProjectId)
  }

  const addMarkerProject = (contentId: string) => {
    updateActiveTrend((t) => {
      const ids = t.markerProjectIds ?? []
      if (ids.includes(contentId) || contentId === t.projectId) return t
      return { ...t, markerProjectIds: [...ids, contentId] }
    })
  }

  const removeMarkerProject = (contentId: string) => {
    updateActiveTrend((t) => ({ ...t, markerProjectIds: (t.markerProjectIds ?? []).filter((id) => id !== contentId) }))
  }

  const addKeyword = () => {
    const kw = newKeywordInput.trim()
    if (!kw) return
    updateActiveTrend((t) => (t.keywords.includes(kw) ? t : { ...t, keywords: [...t.keywords, kw] }))
    setNewKeywordInput('')
  }

  const renameKeyword = (idx: number, value: string) => {
    updateActiveTrend((t) => {
      const oldName = t.keywords[idx]
      const keywords = t.keywords.map((k, i) => (i === idx ? value : k))
      const trendData = t.trendData.map((p) => (p.keyword === oldName ? { ...p, keyword: value } : p))
      return { ...t, keywords, trendData }
    })
  }

  const removeKeyword = (idx: number) => {
    updateActiveTrend((t) => {
      const removed = t.keywords[idx]
      return {
        ...t,
        keywords: t.keywords.filter((_, i) => i !== idx),
        trendData: t.trendData.filter((p) => p.keyword !== removed),
      }
    })
  }

  const moveKeyword = (idx: number, dir: -1 | 1) => {
    updateActiveTrend((t) => {
      const target = idx + dir
      if (target < 0 || target >= t.keywords.length) return t
      const next = [...t.keywords]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...t, keywords: next }
    })
  }

  const applyPeriodPreset = (preset: PeriodPreset) => {
    if (!activeContent) return
    updateActiveTrend((t) => {
      if (preset === '직접설정') return { ...t, periodPreset: preset }
      const { startDate, endDate } = computePeriodFromPreset(activeContent.publishDate, preset)
      return { ...t, periodPreset: preset, startDate, endDate }
    })
  }

  const setDevice = (device: TrendDevice) => updateActiveTrend((t) => ({ ...t, device }))

  const handleUpdateTrend = async () => {
    if (!activeTrend || !activeContent) return
    if (!activeTrend.keywords.length) {
      setStatusMsg({ type: 'error', text: '키워드를 1개 이상 등록하세요.' })
      return
    }
    setIsUpdating(true)
    try {
      const endDate = clampToMaxEndDate(activeTrend.endDate)
      const trendData = await fetchNaverTrendData({
        keywords: activeTrend.keywords,
        startDate: activeTrend.startDate,
        endDate,
        device: activeTrend.device,
        publishDate: activeContent.publishDate,
      })
      if (endDate !== activeTrend.endDate) {
        updateActiveTrend((t) => ({ ...t, endDate }))
      }
      updateActiveTrend((t) => ({ ...t, trendData, lastUpdatedAt: new Date().toISOString() }))
      setStatusMsg({ type: 'success', text: '네이버 트렌드 데이터가 업데이트되었습니다.' })
    } catch (e) {
      setStatusMsg({ type: 'error', text: e instanceof Error ? e.message : '업데이트에 실패했습니다.' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSave = () => {
    localStorage.setItem(TREND_KEY, JSON.stringify(trendProjects))
    setPersistedTrendProjects(trendProjects)
    setStatusMsg({ type: 'success', text: '검색 트렌드가 저장되었습니다.' })
  }

  const handleView = (trendProjectId: string) => {
    setActiveTrendId(trendProjectId)
    selectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const confirmDelete = (trendProjectId: string) => setDeleteTarget(trendProjectId)
  const doDelete = () => {
    if (!deleteTarget) return
    setTrendProjects((prev) => prev.filter((t) => t.trendProjectId !== deleteTarget))
    if (activeTrendId === deleteTarget) setActiveTrendId(null)
    setDeleteTarget(null)
  }

  const pivotedData = useMemo(() => (activeTrend ? pivotTrendData(activeTrend.trendData) : []), [activeTrend])

  const markerContentItems = useMemo(() => {
    if (!activeTrend || !activeContent) return [] as ContentItemLite[]
    const ids = Array.from(new Set([activeContent.id, ...(activeTrend.markerProjectIds ?? [])]))
    return ids
      .map((id) => contentItems.find((c) => c.id === id))
      .filter((c): c is ContentItemLite => Boolean(c))
  }, [activeTrend, activeContent, contentItems])

  const markerGroups = useMemo(() => {
    const groups = new Map<string, ContentItemLite[]>()
    markerContentItems.forEach((item) => {
      if (!pivotedData.some((d) => d.date === item.publishDate)) return
      const list = groups.get(item.publishDate) ?? []
      list.push(item)
      groups.set(item.publishDate, list)
    })
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
  }, [markerContentItems, pivotedData])

  const keywordStats = useMemo(
    () => (activeTrend && activeContent ? computeKeywordStats(activeTrend, activeContent.publishDate) : []),
    [activeTrend, activeContent],
  )

  const validRates = keywordStats.filter((k): k is KeywordStat & { changeRate: number } => k.changeRate !== null)
  const avgChangeRate = validRates.length ? average(validRates.map((k) => k.changeRate)) : null
  const topKeywordStat = validRates.length
    ? validRates.reduce((max, k) => (k.changeRate > max.changeRate ? k : max))
    : null
  const overallPeakPoint = activeTrend
    ? activeTrend.trendData.reduce<TrendDataPoint | null>((max, p) => (!max || p.value > max.value ? p : max), null)
    : null

  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (markerHover) return null
    if (!active || !payload || !payload.length) return null
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
        <p className="mb-2 font-semibold text-slate-800">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.dataKey}</span>
            <span className="ml-auto font-semibold text-slate-800">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }

  const renderClusterMarker = (items: ContentItemLite[]) => (props: any) => {
    const { viewBox } = props
    if (!viewBox) return <g />
    const { x, y } = viewBox
    const count = items.length
    const radius = Math.min(5 + (count - 1) * 2, 11)
    const pillWidth = count > 1 ? 68 : 60
    const isSingleActive = count === 1 && items[0].id === activeContent?.id
    return (
      <g
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setMarkerHover({ x, y, items })}
        onMouseLeave={() => setMarkerHover(null)}
        onClick={() => { if (isSingleActive) setShowDetailPanel(true) }}
      >
        <rect x={x - pillWidth / 2} y={y - 2} width={pillWidth} height={16} rx={8} fill="#5a3b2e" opacity={0.92} />
        <text x={x} y={y + 10} textAnchor="middle" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }}>
          {count > 1 ? `업로드 ${count}건` : '업로드'}
        </text>
        <circle cx={x} cy={y + 24} r={radius} fill="#5a3b2e" stroke="#fff" strokeWidth={2} />
      </g>
    )
  }

  const aggregates = activeContent ? getContentAggregates(activeContent) : null

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-8 py-8">
        <PageHeader
          title="검색 트렌드"
          subtitle="협업 콘텐츠 릴리즈 이후 네이버 검색 트렌드 상대지표 변화를 추적합니다."
          actions={
            <>
              <span className="text-sm text-slate-500">{trendProjects.length}개 프로젝트 등록됨</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsaved}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${hasUnsaved ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'cursor-not-allowed bg-slate-300'}`}
              >
                변경사항 저장
              </button>
            </>
          }
        />

        {statusMsg && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${statusMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Project selection */}
        <div ref={selectionRef} className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">프로젝트 선택</h2>
          {contentItems.length === 0 ? (
            <p className="text-sm text-slate-400">등록된 콘텐츠가 없습니다. 콘텐츠 성과 페이지에서 먼저 콘텐츠를 등록하세요.</p>
          ) : (
            <ContentPicker contentItems={contentItems} linkedProjectIds={linkedProjectIds} onSelect={selectContent} />
          )}

          {activeContent && aggregates && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#fdf6ee] p-4 sm:grid-cols-4">
              {[
                { label: '프로젝트명', value: activeContent.contentName },
                { label: '크리에이터', value: creatorName(activeContent.creatorId) || activeContent.influencerName },
                { label: '업로드일', value: activeContent.publishDate },
                { label: '담당자', value: activeContent.manager ?? '-' },
                { label: '프로젝트 유형', value: activeContent.projectType ?? '-' },
                { label: '현재 조회수', value: formatNumber(aggregates.currentViews) },
                { label: 'CPV', value: aggregates.cpv > 0 ? `₩${aggregates.cpv.toFixed(1)}` : '-' },
                {
                  label: '콘텐츠 URL',
                  value: aggregates.primaryUrl ? (
                    <a href={aggregates.primaryUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                      바로가기
                    </a>
                  ) : (
                    '-'
                  ),
                },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <p className="text-[11px] text-slate-400">{label}</p>
                  <div className="text-sm font-semibold text-[#5a3b2e] truncate">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!activeTrend || !activeContent ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            위에서 프로젝트를 선택하면 키워드/기간 설정과 트렌드 차트가 표시됩니다.
          </div>
        ) : (
          <>
            {/* Keyword group */}
            <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">키워드 그룹</h2>
              <div className="flex flex-wrap gap-2">
                {activeTrend.keywords.map((keyword, idx) => (
                  <div key={idx} className="flex items-center gap-1 rounded-full border border-slate-300 bg-white pl-3 pr-1.5 py-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: keywordColor(idx) }} />
                    <input
                      value={keyword}
                      onChange={(e) => renameKeyword(idx, e.target.value)}
                      className="w-28 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                    <button type="button" onClick={() => moveKeyword(idx, -1)} disabled={idx === 0} className="px-1 text-xs text-slate-400 hover:text-[#5a3b2e] disabled:opacity-30">
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveKeyword(idx, 1)}
                      disabled={idx === activeTrend.keywords.length - 1}
                      className="px-1 text-xs text-slate-400 hover:text-[#5a3b2e] disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button type="button" onClick={() => removeKeyword(idx)} className="px-1 text-xs text-slate-400 hover:text-red-500">
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyword()
                      }
                    }}
                    placeholder="키워드 입력 후 Enter"
                    className="w-40 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-[#d4a373]"
                  />
                  <button type="button" onClick={addKeyword} className="rounded-full bg-[#5a3b2e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#462a20]">
                    + 추가
                  </button>
                </div>
              </div>
            </div>

            {/* Marker projects */}
            <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">비교 마커</h2>
              <p className="mb-3 text-sm text-slate-500">
                이 프로젝트 외에 차트에 업로드 마커로 같이 표시할 콘텐츠를 골라보세요. 같은 날짜에 겹치면 마커가 하나로 커집니다.
              </p>
              {(activeTrend.markerProjectIds ?? []).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {(activeTrend.markerProjectIds ?? []).map((id) => {
                    const item = contentItems.find((c) => c.id === id)
                    if (!item) return null
                    return (
                      <div key={id} className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white pl-3 pr-1.5 py-1 text-xs">
                        <span className="font-medium text-slate-700">{item.contentName}</span>
                        <span className="text-slate-400">{item.publishDate}</span>
                        <button type="button" onClick={() => removeMarkerProject(id)} className="px-1 text-slate-400 hover:text-red-500">
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <MultiContentPicker
                contentItems={contentItems}
                excludeIds={new Set([activeTrend.projectId, ...(activeTrend.markerProjectIds ?? [])])}
                onAdd={(item) => addMarkerProject(item.id)}
              />
            </div>

            {/* Period + device + update */}
            <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">기간 설정</h2>
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPeriodPreset(preset)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTrend.periodPreset === preset ? 'bg-[#5a3b2e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8] hover:text-[#5a3b2e]'}`}
                      >
                        {preset === '직접설정' ? '직접 기간 선택' : `전후 ${preset}`}
                      </button>
                    ))}
                  </div>
                  {activeTrend.periodPreset === '직접설정' && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <input
                        type="date"
                        value={activeTrend.startDate}
                        onChange={(e) => updateActiveTrend((t) => ({ ...t, startDate: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-[#d4a373]"
                      />
                      <span className="text-slate-400">~</span>
                      <input
                        type="date"
                        value={activeTrend.endDate}
                        max={maxTrendEndDate()}
                        onChange={(e) => updateActiveTrend((t) => ({ ...t, endDate: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-[#d4a373]"
                      />
                    </div>
                  )}
                  {activeTrend.periodPreset !== '직접설정' && (
                    <p className="mt-2 text-xs text-slate-400">
                      {activeTrend.startDate} ~ {activeTrend.endDate} (업로드일 {activeContent.publishDate} 기준)
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">디바이스</h2>
                  <div className="flex gap-2">
                    {([
                      { id: 'all', label: '전체' },
                      { id: 'pc', label: 'PC' },
                      { id: 'mobile', label: '모바일' },
                    ] as { id: TrendDevice; label: string }[]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDevice(opt.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTrend.device === opt.id ? 'bg-[#5a3b2e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8] hover:text-[#5a3b2e]'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpdateTrend}
                  disabled={isUpdating}
                  className="rounded-2xl bg-[#5a3b2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#462a20] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isUpdating ? '업데이트 중...' : '네이버 트렌드 업데이트'}
                </button>
              </div>

              <label className="mt-4 block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">메모</span>
                <textarea
                  value={activeTrend.memo ?? ''}
                  onChange={(e) => updateActiveTrend((t) => ({ ...t, memo: e.target.value }))}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#d4a373]"
                  placeholder="이 프로젝트의 검색 트렌드 추적 관련 메모"
                />
              </label>
            </div>

            {/* KPI */}
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <KpiCard label="등록 키워드 수" value={activeTrend.keywords.length} />
              <KpiCard label="업로드 후 평균 상승률" value={avgChangeRate !== null ? `${avgChangeRate >= 0 ? '+' : ''}${avgChangeRate.toFixed(1)}%` : '-'} />
              <KpiCard label="최고 상승 키워드" value={topKeywordStat?.keyword ?? '-'} sub={topKeywordStat ? `+${topKeywordStat.changeRate.toFixed(1)}%` : undefined} />
              <KpiCard label="최고점 지표" value={overallPeakPoint?.value ?? 0} sub={overallPeakPoint?.date} />
              <KpiCard label="마지막 업데이트" value={activeTrend.lastUpdatedAt ? formatDateTime(activeTrend.lastUpdatedAt) : '-'} />
            </div>

            {/* Chart */}
            <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">검색 트렌드 추이</h2>
              <p className="mb-4 text-sm text-slate-500">0~100 상대지표 · 마커를 클릭하면 콘텐츠 상세 정보를 확인할 수 있습니다.</p>
              {pivotedData.length === 0 ? (
                <div className="flex h-[360px] items-center justify-center text-sm text-slate-400">
                  아직 트렌드 데이터가 없습니다. 키워드를 등록하고 &apos;네이버 트렌드 업데이트&apos;를 눌러주세요.
                </div>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={pivotedData} margin={{ top: 36, right: 24, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={renderTrendTooltip} />
                      <Legend wrapperStyle={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12 }} />
                      {activeTrend.keywords.map((kw, idx) => (
                        <Line key={kw} type="monotone" dataKey={kw} name={kw} stroke={keywordColor(idx)} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                      ))}
                      {markerGroups.map(({ date, items }) => (
                        <ReferenceLine key={date} x={date} stroke="#5a3b2e" strokeDasharray="4 4" label={renderClusterMarker(items)} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {markerHover && (
                    <div
                      className="pointer-events-none absolute z-10 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg"
                      style={{ left: markerHover.x, top: markerHover.y + 32, transform: 'translate(-50%, 0)' }}
                    >
                      {markerHover.items.map((item, idx) => {
                        const itemAggregates = getContentAggregates(item)
                        return (
                          <div key={item.id} className={idx > 0 ? 'mt-2 border-t border-slate-100 pt-2' : ''}>
                            <p className="font-semibold text-slate-800 truncate">{item.contentName}</p>
                            <p className="text-slate-500">{creatorName(item.creatorId) || item.influencerName}</p>
                            <p className="text-slate-500">업로드일: {item.publishDate}</p>
                            <p className="text-slate-500">
                              조회수 {formatNumber(itemAggregates.currentViews)}
                              {itemAggregates.cpv > 0 ? ` · CPV ₩${itemAggregates.cpv.toFixed(1)}` : ''}
                            </p>
                          </div>
                        )
                      })}
                      {markerHover.items.length === 1 && markerHover.items[0].id === activeContent.id && (
                        <p className="mt-1 text-[10px] text-[#8b5b3a]">클릭하면 상세 패널이 열립니다</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Project list */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">프로젝트별 키워드 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr className="bg-[#f6ead8] text-[#5a3b2e]">
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">프로젝트명</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">크리에이터명</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap text-center">키워드 수</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">기간</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">업로드일</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">마지막 업데이트</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">최고 상승 키워드</th>
                  <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody>
                {trendProjects.map((t) => {
                  const content = contentItems.find((c) => c.id === t.projectId) ?? null
                  const stats = content ? computeKeywordStats(t, content.publishDate) : []
                  const validStats = stats.filter((s): s is KeywordStat & { changeRate: number } => s.changeRate !== null)
                  const best = validStats.length ? validStats.reduce((max, s) => (s.changeRate > max.changeRate ? s : max)) : null
                  return (
                    <tr key={t.trendProjectId} className={`border-t border-slate-100 ${activeTrendId === t.trendProjectId ? 'bg-[#fdf6ee]' : ''}`}>
                      <td className="px-4 py-3 max-w-[200px] truncate font-medium text-slate-900">{t.projectName}</td>
                      <td className="px-4 py-3 text-slate-600">{creatorName(t.creatorId)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{t.keywords.length}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">{t.startDate} ~ {t.endDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{content?.publishDate ?? '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">{formatDateTime(t.lastUpdatedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {best ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {best.keyword} +{best.changeRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleView(t.trendProjectId)} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] transition">
                            보기
                          </button>
                          <button type="button" onClick={() => handleView(t.trendProjectId)} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] transition">
                            수정
                          </button>
                          <button type="button" onClick={() => confirmDelete(t.trendProjectId)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {trendProjects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">등록된 검색 트렌드 프로젝트가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail slide panel */}
        {showDetailPanel && activeTrend && activeContent && aggregates && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setShowDetailPanel(false)}>
            <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">콘텐츠 상세</h2>
                <button type="button" onClick={() => setShowDetailPanel(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>

              <div className="space-y-6 px-6 py-5 text-sm">
                <section>
                  <h3 className="mb-2 text-xs font-semibold text-slate-500">기본 정보</h3>
                  <div className="space-y-1.5 rounded-2xl bg-slate-50 p-4">
                    {[
                      ['프로젝트명', activeTrend.projectName],
                      ['콘텐츠명', activeContent.contentName],
                      ['크리에이터명', creatorName(activeContent.creatorId) || activeContent.influencerName],
                      ['업로드일', activeContent.publishDate],
                      ['담당자', activeContent.manager ?? '-'],
                      ['프로젝트 유형', activeContent.projectType ?? '-'],
                      ['프로젝트 상태', activeContent.projectStatus ?? '-'],
                      ['노션 링크', activeContent.notionUrl || '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-slate-400">{label}</span>
                        <span className="text-[12px] text-slate-700 break-all">{value}</span>
                      </div>
                    ))}
                    {aggregates.primaryUrl && (
                      <div className="flex gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-slate-400">콘텐츠 URL</span>
                        <a href={aggregates.primaryUrl} target="_blank" rel="noreferrer" className="text-[12px] text-blue-600 hover:underline break-all">{aggregates.primaryUrl}</a>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold text-slate-500">성과 정보</h3>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-4">
                    {[
                      ['현재 조회수', formatNumber(aggregates.currentViews)],
                      ['좋아요', formatNumber(aggregates.currentLikes)],
                      ['댓글', formatNumber(aggregates.currentComments)],
                      ['광고비', `₩${formatNumber(activeContent.adFee ?? 0)}`],
                      ['총비용', `₩${formatNumber(aggregates.totalCost)}`],
                      ['CPV', aggregates.cpv > 0 ? `₩${aggregates.cpv.toFixed(1)}` : '-'],
                      ['R/S 여부', activeContent.projectType?.includes('R/S') ? '예' : '아니오'],
                      ['최종 매출', `₩${formatNumber(activeContent.rsFinalSales ?? 0)}`],
                      ['판매수수료', `₩${formatNumber(aggregates.commission)}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] text-slate-400">{label}</p>
                        <p className="text-[12px] font-semibold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold text-slate-500">검색 트렌드 요약</h3>
                  <div className="space-y-2 rounded-2xl bg-[#fdf6ee] p-4">
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1">등록 키워드</p>
                      <div className="flex flex-wrap gap-1">
                        {activeTrend.keywords.length ? activeTrend.keywords.map((k, idx) => (
                          <span key={k} className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: keywordColor(idx) }}>{k}</span>
                        )) : <span className="text-xs text-slate-400">없음</span>}
                      </div>
                    </div>
                    {(() => {
                      const allPoints = activeTrend.trendData
                      const pre = allPoints.filter((p) => p.date < activeContent.publishDate)
                      const post = allPoints.filter((p) => p.date >= activeContent.publishDate)
                      const preAvg = average(pre.map((p) => p.value))
                      const postAvg = average(post.map((p) => p.value))
                      const changeRate = preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : null
                      return (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <p className="text-[11px] text-slate-400">업로드 전 평균 지표</p>
                            <p className="text-[12px] font-semibold text-slate-800">{preAvg.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">업로드 후 평균 지표</p>
                            <p className="text-[12px] font-semibold text-slate-800">{postAvg.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">증감률</p>
                            <p className="text-[12px] font-semibold text-[#5a3b2e]">{changeRate !== null ? `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(1)}%` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">최고점 날짜 / 지표</p>
                            <p className="text-[12px] font-semibold text-slate-800">{overallPeakPoint ? `${overallPeakPoint.date} / ${overallPeakPoint.value}` : '-'}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900 mb-2">검색 트렌드 프로젝트 삭제</h2>
              <p className="text-sm text-slate-600 mb-5">이 프로젝트의 키워드/트렌드 데이터를 삭제하면 복구할 수 없습니다.</p>
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

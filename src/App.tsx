import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
// mn: applied MyNormal brand and edit-UX updates
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Platform = 'YouTube' | 'Instagram' | 'TikTok'
type PlatformKey = 'youtube' | 'instagram' | 'tiktok'

const allPlatforms: Platform[] = ['YouTube', 'Instagram', 'TikTok']
const platformKey: Record<Platform, PlatformKey> = {
  YouTube: 'youtube',
  Instagram: 'instagram',
  TikTok: 'tiktok',
}

interface PlatformMetrics {
  url: string
  sevenDayViews: number
  currentViews: number
  sevenDayLikes: number
  currentLikes: number
  sevenDayComments: number
  currentComments: number
  lastUpdatedAt: string
  updateMode: 'auto' | 'manual'
}

interface ContentItem {
  id: string
  contentName: string
  influencerName: string
  campaignName: string
  publishDate: string
  platforms: Platform[]
  platformMetrics: Record<PlatformKey, PlatformMetrics>
}

const emptyMetrics: PlatformMetrics = {
  url: '',
  sevenDayViews: 0,
  currentViews: 0,
  sevenDayLikes: 0,
  currentLikes: 0,
  sevenDayComments: 0,
  currentComments: 0,
  lastUpdatedAt: '',
  updateMode: 'manual',
}

const sampleData: ContentItem[] = [
  {
    id: '1',
    contentName: '여름 캠페인 하이라이트',
    influencerName: '채린',
    campaignName: '바캉스 스페셜',
    publishDate: '2026-05-28',
    platforms: ['YouTube', 'Instagram'],
    platformMetrics: {
      youtube: {
        url: 'https://youtu.be/sample1',
        sevenDayViews: 128000,
        currentViews: 172000,
        sevenDayLikes: 5600,
        currentLikes: 7400,
        sevenDayComments: 280,
        currentComments: 340,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'auto',
      },
      instagram: {
        url: 'https://instagram.com/sample1',
        sevenDayViews: 42000,
        currentViews: 58000,
        sevenDayLikes: 5200,
        currentLikes: 6500,
        sevenDayComments: 210,
        currentComments: 260,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'manual',
      },
      tiktok: { ...emptyMetrics },
    },
  },
  {
    id: '2',
    contentName: '스타일링 5분 룩',
    influencerName: '수지',
    campaignName: '데일리룩',
    publishDate: '2026-06-01',
    platforms: ['Instagram', 'TikTok'],
    platformMetrics: {
      youtube: { ...emptyMetrics },
      instagram: {
        url: 'https://instagram.com/sample2',
        sevenDayViews: 82000,
        currentViews: 98000,
        sevenDayLikes: 11200,
        currentLikes: 12800,
        sevenDayComments: 520,
        currentComments: 620,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'manual',
      },
      tiktok: {
        url: 'https://tiktok.com/@sample2',
        sevenDayViews: 32000,
        currentViews: 46000,
        sevenDayLikes: 4800,
        currentLikes: 5600,
        sevenDayComments: 240,
        currentComments: 280,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'manual',
      },
    },
  },
  {
    id: '3',
    contentName: '건강 레시피 챌린지',
    influencerName: '민호',
    campaignName: '건강한 한끼',
    publishDate: '2026-05-25',
    platforms: ['YouTube', 'TikTok'],
    platformMetrics: {
      youtube: {
        url: 'https://youtu.be/sample3',
        sevenDayViews: 62000,
        currentViews: 64500,
        sevenDayLikes: 3600,
        currentLikes: 3800,
        sevenDayComments: 210,
        currentComments: 240,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'auto',
      },
      instagram: { ...emptyMetrics },
      tiktok: {
        url: 'https://tiktok.com/@sample3',
        sevenDayViews: 22000,
        currentViews: 28000,
        sevenDayLikes: 2400,
        currentLikes: 2800,
        sevenDayComments: 160,
        currentComments: 190,
        lastUpdatedAt: '2026-06-10T12:00:00.000Z',
        updateMode: 'manual',
      },
    },
  },
]

const formDefaults: ContentItem = {
  id: '',
  contentName: '',
  influencerName: '',
  campaignName: '',
  publishDate: new Date().toISOString().slice(0, 10),
  platforms: ['YouTube'],
  platformMetrics: {
    youtube: {
      ...emptyMetrics,
      updateMode: 'auto',
    },
    instagram: { ...emptyMetrics },
    tiktok: { ...emptyMetrics },
  },
}

const storageKey = 'iu-dashboard-contents'

const parseStoredItems = (): ContentItem[] => {
  const raw = window.localStorage.getItem(storageKey)
  if (raw === null) {
    return sampleData
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // If stored data is malformed, preserve the user's intent by avoiding sample fallback.
  }

  return []
}

const areItemsEqual = (first: ContentItem[], second: ContentItem[]) =>
  JSON.stringify(first) === JSON.stringify(second)

const getAggregatedMetrics = (item: ContentItem) => {
  const totals = {
    sevenDayViews: 0,
    currentViews: 0,
    sevenDayLikes: 0,
    currentLikes: 0,
    sevenDayComments: 0,
    currentComments: 0,
  }

  const perPlatform = allPlatforms.reduce((acc, platform) => {
    const metrics = item.platformMetrics[platformKey[platform]]
    if (!item.platforms.includes(platform)) {
      acc[platform] = { ...metrics, sevenDayViews: 0, currentViews: 0, sevenDayLikes: 0, currentLikes: 0, sevenDayComments: 0, currentComments: 0 }
      return acc
    }

    acc[platform] = metrics
    totals.sevenDayViews += metrics.sevenDayViews
    totals.currentViews += metrics.currentViews
    totals.sevenDayLikes += metrics.sevenDayLikes
    totals.currentLikes += metrics.currentLikes
    totals.sevenDayComments += metrics.sevenDayComments
    totals.currentComments += metrics.currentComments
    return acc
  }, {} as Record<Platform, PlatformMetrics>)

  return { totals, perPlatform }
}

const computeGrowthRate = (item: ContentItem) => {
  const { totals } = getAggregatedMetrics(item)
  if (totals.sevenDayViews <= 0) return 0
  return (totals.currentViews - totals.sevenDayViews) / totals.sevenDayViews
}

const daysSince = (dateString: string) => {
  const publish = new Date(dateString)
  const diff = Date.now() - publish.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

const getStatus = (item: ContentItem) => {
  const days = daysSince(item.publishDate)
  if (days < 7) return '7일 미만'
  return computeGrowthRate(item) >= 0.15 ? '장기 추적 중' : '기준 성과 확정'
}

const formatNumber = (value: number) => value.toLocaleString('ko-KR')

function App() {
  const initialItems = parseStoredItems()
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [persistedItems, setPersistedItems] = useState<ContentItem[]>(initialItems)
  const [form, setForm] = useState<ContentItem>(formDefaults)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)

  const hasUnsavedChanges = !areItemsEqual(items, persistedItems)

  const persistItems = (nextItems: ContentItem[]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(nextItems))
    setPersistedItems(nextItems)
  }

  const handleSaveChanges = () => {
    persistItems(items)
    setStatusMessage({ type: 'success', text: '변경사항이 저장되었습니다.' })
  }

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const getYouTubeVideoId = (url: string) => {
    const normalized = url.trim()
    const match = normalized.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
    )
    return match ? match[1] : null
  }

  const fetchYoutubeStatistics = async (videoId: string) => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      throw new Error('YouTube API 키가 설정되어 있지 않습니다. .env 파일에 VITE_YOUTUBE_API_KEY를 추가해주세요.')
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`,
    )

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message = body?.error?.message || response.statusText
      throw new Error(`YouTube API 요청에 실패했습니다: ${message}`)
    }

    const data = await response.json()
    if (!data.items || !data.items.length) {
      throw new Error('해당 YouTube 영상 정보를 가져올 수 없습니다. URL을 확인해주세요.')
    }

    const stats = data.items[0].statistics
    return {
      currentViews: Number(stats.viewCount ?? 0),
      currentLikes: Number(stats.likeCount ?? 0),
      currentComments: Number(stats.commentCount ?? 0),
    }
  }

  const handleUpdateStats = async (item: ContentItem) => {
    if (!item.platforms.includes('YouTube')) {
      setStatusMessage({
        type: 'error',
        text: 'YouTube가 선택된 콘텐츠만 자동 업데이트할 수 있습니다.',
      })
      return
    }

    const youtubeMetrics = item.platformMetrics.youtube
    const videoId = getYouTubeVideoId(youtubeMetrics.url)
    if (!videoId) {
      setStatusMessage({
        type: 'error',
        text: 'YouTube URL에서 videoId를 추출할 수 없습니다. 올바른 URL을 입력해주세요.',
      })
      return
    }

    setUpdatingId(item.id)
    setStatusMessage(null)

    try {
      const stats = await fetchYoutubeStatistics(videoId)
      const updatedAt = new Date().toISOString()
      const updatedItems = items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              platformMetrics: {
                ...current.platformMetrics,
                youtube: {
                  ...current.platformMetrics.youtube,
                  currentViews: stats.currentViews,
                  currentLikes: stats.currentLikes,
                  currentComments: stats.currentComments,
                  lastUpdatedAt: updatedAt,
                  updateMode: 'auto',
                },
              },
            }
          : current,
      )
      setItems(updatedItems)
      setStatusMessage({
        type: 'success',
        text: `YouTube 성과가 최신값으로 업데이트되었습니다. (${new Date(updatedAt).toLocaleString('ko-KR')})`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      setStatusMessage({ type: 'error', text: message })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleEdit = (item: ContentItem) => {
    setForm(item)
    setEditingId(item.id)
    // scroll to the form area smoothly
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  const handleDelete = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
    if (editingId === itemId) {
      setEditingId(null)
      setForm(formDefaults)
    }
  }

  const handleResetSample = () => {
    setItems(sampleData)
    setEditingId(null)
    setForm(formDefaults)
  }

  const handleClearAll = () => {
    setItems([])
    setEditingId(null)
    setForm({ ...formDefaults, publishDate: new Date().toISOString().slice(0, 10) })
  }

  const totalItems = items.length
  const avgGrowthRate = useMemo(() => {
    if (!items.length) return 0
    const sum = items.reduce((acc, item) => acc + computeGrowthRate(item), 0)
    return sum / items.length
  }, [items])
  const currentTotalViews = useMemo(
    () =>
      items.reduce((sum, item) => {
        const { totals } = getAggregatedMetrics(item)
        return sum + totals.currentViews
      }, 0),
    [items],
  )
  const longTrackingCount = useMemo(
    () =>
      items.filter(
        (item) => daysSince(item.publishDate) >= 7 && computeGrowthRate(item) > 0,
      ).length,
    [items],
  )

  const platformChartData = useMemo(() => {
    const grouped = allPlatforms.reduce(
      (acc, platform) => ({
        ...acc,
        [platform]: { total: 0, count: 0 },
      }),
      {} as Record<Platform, { total: number; count: number }>,
    )

    items.forEach((item) => {
      allPlatforms.forEach((platform) => {
        if (!item.platforms.includes(platform)) return
        const metrics = item.platformMetrics[platformKey[platform]]
        if (metrics.sevenDayViews > 0) {
          const growth = (metrics.currentViews - metrics.sevenDayViews) / metrics.sevenDayViews
          grouped[platform].total += growth
          grouped[platform].count += 1
        }
      })
    })

    return allPlatforms.map((platform) => ({
      platform,
      avgGrowth: grouped[platform].count
        ? parseFloat(((grouped[platform].total / grouped[platform].count) * 100).toFixed(1))
        : 0,
    }))
  }, [items])

  const chartData = useMemo(
    () =>
      items.map((item) => {
        const { perPlatform, totals } = getAggregatedMetrics(item)
        return {
          title: item.contentName || '무제',
          sevenYoutube: perPlatform.YouTube.sevenDayViews,
          sevenInstagram: perPlatform.Instagram.sevenDayViews,
          sevenTiktok: perPlatform.TikTok.sevenDayViews,
          currentYoutube: perPlatform.YouTube.currentViews,
          currentInstagram: perPlatform.Instagram.currentViews,
          currentTiktok: perPlatform.TikTok.currentViews,
          sevenTotal: totals.sevenDayViews,
          currentTotal: totals.currentViews,
        }
      }),
    [items],
  )

  const formatTooltipValue = (value?: number) => (value !== undefined ? formatNumber(value) : '-')

  const renderChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.dataKey] = item.value ?? 0
        return acc
      },
      {},
    )

    const sevenYoutube = data.sevenYoutube ?? 0
    const sevenInstagram = data.sevenInstagram ?? 0
    const sevenTiktok = data.sevenTiktok ?? 0
    const currentYoutube = data.currentYoutube ?? 0
    const currentInstagram = data.currentInstagram ?? 0
    const currentTiktok = data.currentTiktok ?? 0
    const sevenTotal = sevenYoutube + sevenInstagram + sevenTiktok
    const currentTotal = currentYoutube + currentInstagram + currentTiktok

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-lg">
        <p className="mb-2 font-semibold">{label}</p>
        <p className="text-[12px] text-slate-500">7일차 총 조회수: {formatTooltipValue(sevenTotal)}</p>
        <p className="text-[12px]">- YouTube: {formatTooltipValue(sevenYoutube)}</p>
        <p className="text-[12px]">- Instagram: {formatTooltipValue(sevenInstagram)}</p>
        <p className="text-[12px] mb-2">- TikTok: {formatTooltipValue(sevenTiktok)}</p>
        <p className="text-[12px] text-slate-500">현재 총 조회수: {formatTooltipValue(currentTotal)}</p>
        <p className="text-[12px]">- YouTube: {formatTooltipValue(currentYoutube)}</p>
        <p className="text-[12px]">- Instagram: {formatTooltipValue(currentInstagram)}</p>
        <p className="text-[12px]">- TikTok: {formatTooltipValue(currentTiktok)}</p>
      </div>
    )
  }

  const handleFieldChange = (
    field: keyof Omit<ContentItem, 'platforms' | 'platformMetrics' | 'id'>,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePlatformToggle = (platform: Platform) => {
    setForm((prev) => {
      const nextPlatforms = prev.platforms.includes(platform)
        ? prev.platforms.filter((current) => current !== platform)
        : [...prev.platforms, platform]

      return {
        ...prev,
        platforms: nextPlatforms,
      }
    })
  }

  const handlePlatformMetricChange = (
    platform: Platform,
    field: keyof PlatformMetrics,
    value: string | number,
  ) => {
    const key = platformKey[platform]
    setForm((prev) => ({
      ...prev,
      platformMetrics: {
        ...prev.platformMetrics,
        [key]: {
          ...prev.platformMetrics[key],
          [field]:
            ['sevenDayViews', 'currentViews', 'sevenDayLikes', 'currentLikes', 'sevenDayComments', 'currentComments'].includes(field)
              ? Number(value)
              : String(value),
        },
      },
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.contentName.trim() || !form.influencerName.trim() || !form.campaignName.trim()) {
      setStatusMessage({ type: 'error', text: '콘텐츠명, 인플루언서명, 캠페인명을 모두 입력해주세요.' })
      return
    }

    if (!form.platforms.length) {
      setStatusMessage({ type: 'error', text: '최소 하나 이상의 플랫폼을 선택해주세요.' })
      return
    }

    for (const platform of form.platforms) {
      const metrics = form.platformMetrics[platformKey[platform]]
      if (!metrics.url.trim()) {
        setStatusMessage({ type: 'error', text: `${platform} URL을 입력해주세요.` })
        return
      }
    }

    const sanitizedForm = {
      ...form,
      platforms: form.platforms,
      platformMetrics: {
        youtube: { ...form.platformMetrics.youtube },
        instagram: { ...form.platformMetrics.instagram },
        tiktok: { ...form.platformMetrics.tiktok },
      },
    }

    if (editingId) {
      const updated = items.map((item) => (item.id === editingId ? { ...sanitizedForm, id: editingId } : item))
      setItems(updated)
      setEditingId(null)
      setForm({ ...formDefaults, publishDate: form.publishDate })
      return
    }

    const nextItem: ContentItem = {
      ...sanitizedForm,
      id: String(Date.now()),
    }
    setItems([nextItem, ...items])
    setForm({ ...formDefaults, publishDate: form.publishDate })
  }

  const formatUpdated = (iso?: string) => {
    if (!iso) return '-'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  }

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 mn-card p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-full sm:max-w-xl">
            <h1 className="mt-2 text-2xl font-semibold text-[#5a3b2e] sm:text-3xl">I.U Dashboard</h1>
            <p className="mt-1 text-xs font-semibold tracking-[0.12em] uppercase text-[#8b5b3a] sm:text-sm">Influencer Unit Performance Tracker</p>
            <p className="mt-2 max-w-full text-xs leading-5 text-[#7a6b5a] sm:whitespace-nowrap">
              여러 플랫폼 콘텐츠의 누적 성과를 관리하고, 게시 후 7일차 기준 성과와 현재 성과를 비교합니다.
            </p>
          </div>
          <div className="rounded-3xl px-5 py-4 text-white shadow-lg sm:w-auto" style={{ background: 'var(--mn-primary)' }}>
            <p className="text-sm text-slate-300">현재 저장된 콘텐츠</p>
            <p className="mt-2 text-3xl font-semibold">{totalItems}</p>
          </div>
        </header>

        {hasUnsavedChanges ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            저장되지 않은 변경사항이 있습니다.
          </div>
        ) : null}

        {statusMessage ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {statusMessage.text}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-3">
          <div ref={formRef} className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${editingId ? 'editing-card' : ''} lg:col-span-2`}>
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{editingId ? '콘텐츠 수정' : '콘텐츠 등록'}</h2>
                <p className="mt-1 text-sm text-[#7a6b5a]">URL과 KPI를 입력해 새로운 콘텐츠를 추가하거나 기존 콘텐츠를 수정하세요.</p>
                {editingId ? (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-full bg-[#fff3e6] px-3 py-1 text-sm font-semibold text-[#8b5b3a]">현재 수정 중인 콘텐츠</span>
                    <p className="text-sm text-[#7a6b5a]">현재 {form.contentName || '콘텐츠'} 수정 중입니다.</p>
                  </div>
                ) : null}
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(formDefaults)
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  수정 취소
                </button>
              ) : null}
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>콘텐츠명</span>
                  <input
                    value={form.contentName}
                    onChange={(e) => handleFieldChange('contentName', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                    placeholder="예: 여름 캠페인 하이라이트"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>인플루언서명</span>
                  <input
                    value={form.influencerName}
                    onChange={(e) => handleFieldChange('influencerName', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                    placeholder="예: 채린"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>캠페인명</span>
                  <input
                    value={form.campaignName}
                    onChange={(e) => handleFieldChange('campaignName', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                    placeholder="예: 바캉스 스페셜"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>게시일</span>
                  <input
                    type="date"
                    value={form.publishDate}
                    onChange={(e) => handleFieldChange('publishDate', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">미러링 플랫폼</p>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map((platform) => {
                    const selected = form.platforms.includes(platform)
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handlePlatformToggle(platform)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selected
                            ? 'border-[#5a3b2e] bg-[#5a3b2e] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-[#c9a17a] hover:bg-[#faf5ee]'
                        }`}
                      >
                        {platform}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-[#7a6b5a]">YouTube는 자동 업데이트를 지원하며, Instagram/TikTok은 수동 입력 방식입니다.</p>
              </div>

              {form.platforms.map((platform) => {
                const metrics = form.platformMetrics[platformKey[platform]]
                return (
                  <div key={platform} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{platform} 성과 입력</h3>
                        <p className="text-xs text-slate-600">
                          {platform === 'YouTube'
                            ? '자동 업데이트가 가능한 YouTube 플랫폼입니다.'
                            : '수동 입력 기반 플랫폼입니다. 입력값을 덮어쓰지 않습니다.'}
                        </p>
                      </div>
                      {platform === 'YouTube' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!form.platforms.includes('YouTube')) return
                            const videoId = getYouTubeVideoId(metrics.url)
                            if (!videoId) {
                              setStatusMessage({
                                type: 'error',
                                text: 'YouTube URL에서 videoId를 추출할 수 없습니다. 올바른 URL을 입력해주세요.',
                              })
                              return
                            }

                            setUpdatingId('form')
                            setStatusMessage(null)
                            try {
                              const stats = await fetchYoutubeStatistics(videoId)
                              const updatedAt = new Date().toISOString()
                              setForm((prev) => ({
                                ...prev,
                                platformMetrics: {
                                  ...prev.platformMetrics,
                                  youtube: {
                                    ...prev.platformMetrics.youtube,
                                    currentViews: stats.currentViews,
                                    currentLikes: stats.currentLikes,
                                    currentComments: stats.currentComments,
                                    lastUpdatedAt: updatedAt,
                                    updateMode: 'auto',
                                  },
                                },
                              }))
                              setStatusMessage({
                                type: 'success',
                                text: `YouTube 성과가 최신값으로 업데이트되었습니다. (${new Date(updatedAt).toLocaleString('ko-KR')})`,
                              })
                            } catch (error) {
                              const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
                              setStatusMessage({ type: 'error', text: message })
                            } finally {
                              setUpdatingId(null)
                            }
                          }}
                          disabled={updatingId !== null && updatingId !== 'form'}
                          className="inline-flex items-center justify-center rounded-2xl border border-[#5a3b2e] bg-[#5a3b2e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#462a20] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          성과 업데이트
                        </button>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-semibold text-[#8b5b3a]">수동 입력</span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>URL</span>
                        <input
                          type="text"
                          value={metrics.url}
                          onChange={(e) => handlePlatformMetricChange(platform, 'url', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                          placeholder="https://"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>7일차 조회수</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.sevenDayViews}
                          onChange={(e) => handlePlatformMetricChange(platform, 'sevenDayViews', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>현재 조회수</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.currentViews}
                          onChange={(e) => handlePlatformMetricChange(platform, 'currentViews', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>7일차 좋아요</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.sevenDayLikes}
                          onChange={(e) => handlePlatformMetricChange(platform, 'sevenDayLikes', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>현재 좋아요</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.currentLikes}
                          onChange={(e) => handlePlatformMetricChange(platform, 'currentLikes', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>7일차 댓글</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.sevenDayComments}
                          onChange={(e) => handlePlatformMetricChange(platform, 'sevenDayComments', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-700">
                        <span>현재 댓글</span>
                        <input
                          type="number"
                          min={0}
                          value={metrics.currentComments}
                          onChange={(e) => handlePlatformMetricChange(platform, 'currentComments', e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                        />
                      </label>
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#7a6b5a]">입력 후 ‘콘텐츠 등록’ 버튼으로 화면에 반영하고, 변경사항 저장을 눌러 확정하세요.</p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl mn-primary-btn px-5 py-3 text-sm font-semibold transition hover:opacity-95"
                >
                  {editingId ? '콘텐츠 수정 저장' : '콘텐츠 등록'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mn-card">
              <h2 className="text-xl font-semibold text-slate-900">핵심 지표</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <article className="rounded-3xl bg-slate-50 p-5 mn-card">
                  <p className="text-sm text-slate-500">평균 조회수 증가율</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{(avgGrowthRate * 100).toFixed(1)}%</p>
                </article>
                  <article className="rounded-3xl bg-slate-50 p-5 mn-card">
                  <p className="text-sm text-slate-500">7일 이후 성장 중인 콘텐츠</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{longTrackingCount}</p>
                </article>
                  <article className="rounded-3xl bg-slate-50 p-5 sm:col-span-2 mn-card">
                  <p className="text-sm text-slate-500">현재 총 조회수</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(currentTotalViews)}</p>
                </article>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">플랫폼별 평균 증가율</h2>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="platform" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => [`${value}%`, '증가율']} />
                    <Bar dataKey="avgGrowth" fill="#5a3b2e" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">콘텐츠별 7일차 vs 현재 조회수 비교</h2>
                <p className="mt-1 text-sm text-slate-600">콘텐츠 각각에 대해 7일차 총 조회수(좌측 막대)와 현재 총 조회수(우측 막대)를 플랫폼별 구성으로 비교합니다.</p>
              </div>
            </div>
            <div className="mt-6 h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="title" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={renderChartTooltip} />
                  <Legend
                    payload={[
                      { value: 'YouTube', type: 'square', color: '#5a3b2e' },
                      { value: 'Instagram', type: 'square', color: '#8b5b3a' },
                      { value: 'TikTok', type: 'square', color: '#6f5f55' },
                    ]}
                  />
                  <Bar dataKey="sevenYoutube" name="YouTube" stackId="seven" fill="#5a3b2e" legendType="none" />
                  <Bar dataKey="sevenInstagram" name="Instagram" stackId="seven" fill="#8b5b3a" legendType="none" />
                  <Bar dataKey="sevenTiktok" name="TikTok" stackId="seven" fill="#6f5f55" legendType="none" />
                  <Bar dataKey="currentYoutube" name="YouTube" stackId="current" fill="#5a3b2e" legendType="none" />
                  <Bar dataKey="currentInstagram" name="Instagram" stackId="current" fill="#8b5b3a" legendType="none" />
                  <Bar dataKey="currentTiktok" name="TikTok" stackId="current" fill="#6f5f55" legendType="none" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mn-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">콘텐츠 목록</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Instagram은 공개 API 제한으로 인해 1차 MVP에서는 자동 업데이트가 비활성화되어 있습니다.
                </p>
                <p className="mt-2 text-[12px] text-[#7a6b5a]">상태 기준: 게시 후 7일 미만 / 7일 이후 조회수 증가율 20% 이상은 장기 추적 중 / 그 외 기준 성과 확정</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetSample}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  샘플 데이터 초기화
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 mn-danger-btn"
                >
                  전체 데이터 삭제
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition ${
                    hasUnsavedChanges ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'cursor-not-allowed bg-slate-300 text-slate-500'
                  }`}
                >
                  변경사항 저장
                </button>
              </div>
            </div>
            <div className="mt-4 mn-table-container">
              <table className="min-w-full border-separate border-spacing-0 text-left text-[13px] mn-table">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">콘텐츠명</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">플랫폼</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">인플루언서</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">캠페인</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">게시일</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-right">7일차 조회수</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-right">현재 조회수</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-right">조회수 증가율</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-right">현재 좋아요</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-right">현재 댓글</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">마지막 업데이트</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">작업</th>
                    <th className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const growth = computeGrowthRate(item)
                    const { totals, perPlatform } = getAggregatedMetrics(item)
                    const latestTimestamp = [
                      item.platformMetrics.youtube.lastUpdatedAt,
                      item.platformMetrics.instagram.lastUpdatedAt,
                      item.platformMetrics.tiktok.lastUpdatedAt,
                    ]
                      .filter(Boolean)
                      .map((value) => new Date(value).getTime())
                      .filter((timestamp) => !Number.isNaN(timestamp))
                      .sort((a, b) => b - a)[0]
                    const latestUpdatedAt = latestTimestamp ? new Date(latestTimestamp).toISOString() : ''
                    const primaryUrl = item.platforms.length
                      ? item.platformMetrics[platformKey[item.platforms[0]]].url
                      : '#'
                    return (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-4 align-top text-slate-900 max-w-[220px] min-w-0">
                          <a href={primaryUrl} target="_blank" rel="noreferrer" className="block max-w-full truncate font-medium text-slate-900 hover:text-[#5a3b2e]">
                            {item.contentName}
                          </a>
                        </td>
                        <td className="px-4 py-4 align-top space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {item.platforms.map((platform) => (
                              <span
                                key={platform}
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                                  platform === 'YouTube'
                                    ? 'platform-youtube'
                                    : platform === 'Instagram'
                                    ? 'platform-instagram'
                                    : 'platform-tiktok'
                                }`}
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 max-w-[140px] min-w-0">
                          <div className="max-w-full truncate">{item.influencerName}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 max-w-[160px] min-w-0">
                          <div className="max-w-full truncate">{item.campaignName}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 whitespace-nowrap">{item.publishDate}</td>
                        <td
                          className="px-4 py-4 align-top text-slate-700 text-right"
                          title={`YouTube: ${formatNumber(perPlatform.YouTube.sevenDayViews)}\nInstagram: ${formatNumber(perPlatform.Instagram.sevenDayViews)}\nTikTok: ${formatNumber(perPlatform.TikTok.sevenDayViews)}`}
                        >
                          {formatNumber(totals.sevenDayViews)}
                        </td>
                        <td
                          className="px-4 py-4 align-top text-slate-700 text-right"
                          title={`YouTube: ${formatNumber(perPlatform.YouTube.currentViews)}\nInstagram: ${formatNumber(perPlatform.Instagram.currentViews)}\nTikTok: ${formatNumber(perPlatform.TikTok.currentViews)}`}
                        >
                          {formatNumber(totals.currentViews)}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 text-right">{(growth * 100).toFixed(1)}%</td>
                        <td
                          className="px-4 py-4 align-top text-slate-700 text-right"
                          title={`YouTube: ${formatNumber(perPlatform.YouTube.currentLikes)}\nInstagram: ${formatNumber(perPlatform.Instagram.currentLikes)}\nTikTok: ${formatNumber(perPlatform.TikTok.currentLikes)}`}
                        >
                          {formatNumber(totals.currentLikes)}
                        </td>
                        <td
                          className="px-4 py-4 align-top text-slate-700 text-right"
                          title={`YouTube: ${formatNumber(perPlatform.YouTube.currentComments)}\nInstagram: ${formatNumber(perPlatform.Instagram.currentComments)}\nTikTok: ${formatNumber(perPlatform.TikTok.currentComments)}`}
                        >
                          {formatNumber(totals.currentComments)}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 whitespace-nowrap">{formatUpdated(latestUpdatedAt)}</td>
                        <td className="px-4 py-4 align-top">
                          <div
                            className="relative inline-flex"
                            onBlur={(event) => {
                              const related = event.relatedTarget as HTMLElement | null
                              if (!related || !event.currentTarget.contains(related)) {
                                setOpenActionId(null)
                              }
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenActionId(openActionId === item.id ? null : item.id)}
                              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              작업
                            </button>
                            {openActionId === item.id ? (
                              <div className="absolute right-0 top-full z-20 mt-2 w-40 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateStats(item)
                                    setOpenActionId(null)
                                  }}
                                  disabled={!item.platforms.includes('YouTube') || (updatingId !== null && updatingId !== item.id)}
                                  className={`w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition ${
                                    !item.platforms.includes('YouTube')
                                      ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                                      : 'text-[#5a3b2e] hover:bg-[#f7e7d9]'
                                  }`}
                                >
                                  성과 업데이트
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEdit(item)
                                    setOpenActionId(null)
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-[#5a3b2e] transition hover:bg-[#f7e7d9]"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(item.id)
                                    setOpenActionId(null)
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                  삭제
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700">
                          <span className="status-badge text-[11px] px-2 py-1">{getStatus(item)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="mb-2 font-semibold text-slate-900">자동 업데이트 안내</p>
          <p className="mb-2">YouTube 자동 업데이트를 사용하려면 프로젝트 루트에 <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code> 파일을 생성하고 <code className="rounded bg-slate-100 px-1.5 py-0.5">VITE_YOUTUBE_API_KEY=본인_API_KEY</code>를 추가하세요.</p>
          <p>Instagram은 공개 API 제한으로 인해 1차 MVP에서는 수동 입력 방식입니다. 추후 Apify/Make 연동으로 확장 가능합니다.</p>
        </footer>
      </div>
    </div>
  )
}

export default App

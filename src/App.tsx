import { type FormEvent, useEffect, useMemo, useState } from 'react'
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

type Platform = 'YouTube' | 'Instagram'

interface ContentItem {
  id: string
  title: string
  platform: Platform
  url: string
  influencer: string
  campaign: string
  publishDate: string
  viewsDay7: number
  likesDay7: number
  commentsDay7: number
  currentViews: number
  currentLikes: number
  currentComments: number
  lastUpdatedAt: string
}

const sampleData: ContentItem[] = [
  {
    id: '1',
    title: '여름 캠페인 하이라이트',
    platform: 'YouTube',
    url: 'https://youtu.be/sample1',
    influencer: '채린',
    campaign: '바캉스 스페셜',
    publishDate: '2026-05-28',
    viewsDay7: 128000,
    likesDay7: 5600,
    commentsDay7: 280,
    currentViews: 172000,
    currentLikes: 7400,
    currentComments: 340,
    lastUpdatedAt: '',
  },
  {
    id: '2',
    title: '스타일링 5분 룩',
    platform: 'Instagram',
    url: 'https://instagram.com/sample2',
    influencer: '수지',
    campaign: '데일리룩',
    publishDate: '2026-06-01',
    viewsDay7: 82000,
    likesDay7: 11200,
    commentsDay7: 520,
    currentViews: 98000,
    currentLikes: 12800,
    currentComments: 620,
    lastUpdatedAt: '',
  },
  {
    id: '3',
    title: '건강 레시피 챌린지',
    platform: 'YouTube',
    url: 'https://youtu.be/sample3',
    influencer: '민호',
    campaign: '건강한 한끼',
    publishDate: '2026-05-25',
    viewsDay7: 62000,
    likesDay7: 3600,
    commentsDay7: 210,
    currentViews: 64500,
    currentLikes: 3800,
    currentComments: 240,
    lastUpdatedAt: '',
  },
  {
    id: '4',
    title: '데일리 메이크업 튜토리얼',
    platform: 'Instagram',
    url: 'https://instagram.com/sample4',
    influencer: '지영',
    campaign: '뷰티 플러스',
    publishDate: '2026-06-03',
    viewsDay7: 45000,
    likesDay7: 8100,
    commentsDay7: 340,
    currentViews: 49000,
    currentLikes: 9200,
    currentComments: 380,
    lastUpdatedAt: '',
  },
  {
    id: '5',
    title: '모닝루틴 Q&A',
    platform: 'YouTube',
    url: 'https://youtu.be/sample5',
    influencer: '준우',
    campaign: '모닝 에너자이저',
    publishDate: '2026-05-18',
    viewsDay7: 98000,
    likesDay7: 8900,
    commentsDay7: 760,
    currentViews: 147000,
    currentLikes: 12600,
    currentComments: 1020,
    lastUpdatedAt: '',
  },
  {
    id: '6',
    title: '여행 준비 리스트',
    platform: 'Instagram',
    url: 'https://instagram.com/sample6',
    influencer: '혜린',
    campaign: '여행 키트',
    publishDate: '2026-06-02',
    viewsDay7: 38000,
    likesDay7: 6400,
    commentsDay7: 290,
    currentViews: 41000,
    currentLikes: 7000,
    currentComments: 330,
    lastUpdatedAt: '',
  },
  {
    id: '7',
    title: '운동 루틴 15분',
    platform: 'YouTube',
    url: 'https://youtu.be/sample7',
    influencer: '성훈',
    campaign: '바디 케어',
    publishDate: '2026-05-22',
    viewsDay7: 74000,
    likesDay7: 6800,
    commentsDay7: 410,
    currentViews: 81000,
    currentLikes: 7400,
    currentComments: 450,
    lastUpdatedAt: '',
  },
  {
    id: '8',
    title: '키친 트렌드 레시피',
    platform: 'Instagram',
    url: 'https://instagram.com/sample8',
    influencer: '은지',
    campaign: '홈쿡 시즌2',
    publishDate: '2026-06-04',
    viewsDay7: 25000,
    likesDay7: 5200,
    commentsDay7: 180,
    currentViews: 26900,
    currentLikes: 5800,
    currentComments: 210,
    lastUpdatedAt: '',
  },
]

const formDefaults: ContentItem = {
  id: '',
  title: '',
  platform: 'YouTube',
  url: '',
  influencer: '',
  campaign: '',
  publishDate: new Date().toISOString().slice(0, 10),
  viewsDay7: 0,
  likesDay7: 0,
  commentsDay7: 0,
  currentViews: 0,
  currentLikes: 0,
  currentComments: 0,
  lastUpdatedAt: '',
}

const storageKey = 'content-dashboard-items'

const parseStoredItems = (): ContentItem[] => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return sampleData
    const parsed = JSON.parse(raw) as ContentItem[]
    return Array.isArray(parsed) ? parsed : sampleData
  } catch {
    return sampleData
  }
}

const computeGrowthRate = (item: ContentItem) => {
  if (item.viewsDay7 <= 0) return 0
  return (item.currentViews - item.viewsDay7) / item.viewsDay7
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
  const [items, setItems] = useState<ContentItem[]>(() => parseStoredItems())
  const [form, setForm] = useState<ContentItem>(formDefaults)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

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
    if (item.platform !== 'YouTube') {
      setStatusMessage({
        type: 'error',
        text: 'Instagram 콘텐츠는 자동 업데이트가 비활성화되어 있습니다.',
      })
      return
    }

    const videoId = getYouTubeVideoId(item.url)
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
      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id
            ? {
                ...current,
                currentViews: stats.currentViews,
                currentLikes: stats.currentLikes,
                currentComments: stats.currentComments,
                lastUpdatedAt: updatedAt,
              }
            : current,
        ),
      )
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
  }

  const handleDelete = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
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
    () => items.reduce((sum, item) => sum + item.currentViews, 0),
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
    const grouped: Record<Platform, { total: number; count: number }> = {
      YouTube: { total: 0, count: 0 },
      Instagram: { total: 0, count: 0 },
    }
    items.forEach((item) => {
      grouped[item.platform].total += computeGrowthRate(item)
      grouped[item.platform].count += 1
    })
    return (Object.keys(grouped) as Platform[]).map((platform) => ({
      platform,
      avgGrowth: grouped[platform].count
        ? parseFloat(((grouped[platform].total / grouped[platform].count) * 100).toFixed(1))
        : 0,
    }))
  }, [items])

  const chartData = useMemo(
    () =>
      items.map((item) => ({
        name: item.title,
        '7일차': item.viewsDay7,
        현재: item.currentViews,
      })),
    [items],
  )

  const handleFieldChange = (
    field: keyof ContentItem,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        ['viewsDay7', 'likesDay7', 'commentsDay7', 'currentViews', 'currentLikes', 'currentComments'].includes(field)
          ? Number(value)
          : value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.url.trim() || !form.influencer.trim()) return

    if (editingId) {
      setItems((prev) =>
        prev.map((item) => (item.id === editingId ? { ...form, id: editingId } : item)),
      )
      setEditingId(null)
      setForm({ ...formDefaults, publishDate: form.publishDate })
      return
    }

    const nextItem: ContentItem = {
      ...form,
      id: String(Date.now()),
    }
    setItems((prev) => [nextItem, ...prev])
    setForm({ ...formDefaults, publishDate: form.publishDate })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
              콘텐츠 성과 대시보드
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              유튜브 · 인스타그램 누적 성과 관리
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              게시일별 조회수, 좋아요, 댓글을 한눈에 보고, 콘텐츠를 빠르게 등록하고 추적할 수 있는 단일 페이지 MVP입니다.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900 px-5 py-4 text-white shadow-lg shadow-slate-900/10 sm:w-auto">
            <p className="text-sm text-slate-300">현재 저장된 콘텐츠</p>
            <p className="mt-2 text-3xl font-semibold">{totalItems}</p>
          </div>
        </header>

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

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{editingId ? '콘텐츠 수정' : '콘텐츠 등록'}</h2>
                <p className="mt-1 text-sm text-slate-600">URL과 KPI를 입력해 새로운 콘텐츠를 추가하거나 기존 콘텐츠를 수정하세요.</p>
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
                  편집 취소
                </button>
              ) : null}
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>콘텐츠명</span>
                  <input
                    value={form.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="예: 여름 캠페인 하이라이트"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>플랫폼</span>
                  <select
                    value={form.platform}
                    onChange={(e) => handleFieldChange('platform', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option>YouTube</option>
                    <option>Instagram</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>URL</span>
                  <input
                    value={form.url}
                    onChange={(e) => handleFieldChange('url', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="https://"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>인플루언서명</span>
                  <input
                    value={form.influencer}
                    onChange={(e) => handleFieldChange('influencer', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="예: 채린"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>캠페인명</span>
                  <input
                    value={form.campaign}
                    onChange={(e) => handleFieldChange('campaign', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="예: 바캉스 스페셜"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>게시일</span>
                  <input
                    type="date"
                    value={form.publishDate}
                    onChange={(e) => handleFieldChange('publishDate', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>7일차 조회수</span>
                  <input
                    type="number"
                    min={0}
                    value={form.viewsDay7}
                    onChange={(e) => handleFieldChange('viewsDay7', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>7일차 좋아요</span>
                  <input
                    type="number"
                    min={0}
                    value={form.likesDay7}
                    onChange={(e) => handleFieldChange('likesDay7', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>7일차 댓글</span>
                  <input
                    type="number"
                    min={0}
                    value={form.commentsDay7}
                    onChange={(e) => handleFieldChange('commentsDay7', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>현재 조회수</span>
                  <input
                    type="number"
                    min={0}
                    value={form.currentViews}
                    onChange={(e) => handleFieldChange('currentViews', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>현재 좋아요</span>
                  <input
                    type="number"
                    min={0}
                    value={form.currentLikes}
                    onChange={(e) => handleFieldChange('currentLikes', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>현재 댓글</span>
                  <input
                    type="number"
                    min={0}
                    value={form.currentComments}
                    onChange={(e) => handleFieldChange('currentComments', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">입력 후 ‘콘텐츠 등록’ 버튼을 클릭하면 즉시 저장됩니다.</p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  {editingId ? '수정 저장' : '콘텐츠 등록'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">핵심 지표</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <article className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">평균 조회수 증가율</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{(avgGrowthRate * 100).toFixed(1)}%</p>
                </article>
                <article className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">7일 이후 성장 중인 콘텐츠</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{longTrackingCount}</p>
                </article>
                <article className="rounded-3xl bg-slate-50 p-5 sm:col-span-2">
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
                    <Bar dataKey="avgGrowth" fill="#6366f1" radius={[12, 12, 0, 0]} />
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
                <h2 className="text-xl font-semibold text-slate-900">콘텐츠별 조회수 비교</h2>
                <p className="mt-1 text-sm text-slate-600">7일차 조회수와 현재 조회수를 막대그래프로 비교합니다.</p>
              </div>
            </div>
            <div className="mt-6 h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), '조회수']} />
                  <Legend />
                  <Bar dataKey="7일차" fill="#818cf8" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="현재" fill="#22c55e" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">콘텐츠 목록</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Instagram은 공개 API 제한으로 인해 1차 MVP에서는 자동 업데이트가 비활성화되어 있습니다.
                </p>
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
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  전체 데이터 삭제
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">콘텐츠명</th>
                    <th className="px-4 py-3">플랫폼</th>
                    <th className="px-4 py-3">인플루언서</th>
                    <th className="px-4 py-3">캠페인</th>
                    <th className="px-4 py-3">게시일</th>
                    <th className="px-4 py-3">7일차 조회수</th>
                    <th className="px-4 py-3">현재 조회수</th>
                    <th className="px-4 py-3">조회수 증가율</th>
                    <th className="px-4 py-3">현재 좋아요</th>
                    <th className="px-4 py-3">현재 댓글</th>
                    <th className="px-4 py-3">마지막 업데이트</th>
                    <th className="px-4 py-3">작업</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const growth = computeGrowthRate(item)
                    return (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-4 align-top text-slate-900">
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-indigo-600">
                            {item.title}
                          </a>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.platform === 'YouTube'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {item.platform}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700">{item.influencer}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{item.campaign}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{item.publishDate}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{formatNumber(item.viewsDay7)}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{formatNumber(item.currentViews)}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{(growth * 100).toFixed(1)}%</td>
                        <td className="px-4 py-4 align-top text-slate-700">{formatNumber(item.currentLikes)}</td>
                        <td className="px-4 py-4 align-top text-slate-700">{formatNumber(item.currentComments)}</td>
                        <td className="px-4 py-4 align-top text-slate-700">
                          {item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toLocaleString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={item.platform !== 'YouTube' || (updatingId !== null && updatingId !== item.id)}
                              onClick={() => handleUpdateStats(item)}
                              className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                                item.platform !== 'YouTube'
                                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {updatingId === item.id ? '업데이트 중...' : '성과 업데이트'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700">{getStatus(item)}</td>
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

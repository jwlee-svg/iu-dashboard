import type { TrendDataPoint, TrendDevice } from '../types/searchTrend'

export interface FetchTrendParams {
  keywords: string[]
  startDate: string
  endDate: string
  device: TrendDevice
  publishDate?: string
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(start)
  const last = new Date(end)
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * MVP 전용 mock 트렌드 생성기.
 * 업로드일(publishDate) 이후 구간에 완만한 상승 곡선을 섞어 넣어
 * "협업 콘텐츠 이후 검색 관심도 변화"를 데모 가능한 형태로 만든다.
 */
export function generateMockTrendData({ keywords, startDate, endDate, device, publishDate }: FetchTrendParams): TrendDataPoint[] {
  const dates = dateRange(startDate, endDate)
  const deviceFactor = device === 'mobile' ? 1.1 : device === 'pc' ? 0.85 : 1
  const points: TrendDataPoint[] = []

  keywords.forEach((keyword, keywordIdx) => {
    const rand = seededRandom(hashString(keyword) + keywordIdx * 97)
    const base = 15 + rand() * 15
    dates.forEach((date, dayIdx) => {
      const isAfterPublish = publishDate ? date >= publishDate : false
      const daysFromPublish = publishDate
        ? Math.max(0, (new Date(date).getTime() - new Date(publishDate).getTime()) / 86_400_000)
        : 0
      const boost = isAfterPublish ? Math.max(0, 40 - daysFromPublish * 2) * (0.6 + rand() * 0.8) : 0
      const noise = (rand() - 0.5) * 10
      const wave = Math.sin(dayIdx / 3) * 4
      const raw = (base + boost + noise + wave) * deviceFactor
      const value = Math.max(0, Math.min(100, Math.round(raw)))
      points.push({ date, keyword, value })
    })
  })

  return points
}

/**
 * 네이버 데이터랩 검색어 트렌드 데이터를 가져옵니다.
 *
 * 실제 호출은 /api/naver-trends (Vercel serverless function)에서 처리하며,
 * NAVER_CLIENT_ID / NAVER_CLIENT_SECRET은 서버에만 존재하고 프론트엔드에는 노출되지 않는다.
 */
export async function fetchNaverTrendData(params: FetchTrendParams): Promise<TrendDataPoint[]> {
  const { keywords, startDate, endDate, device } = params
  const res = await fetch('/api/naver-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, startDate, endDate, device }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? '네이버 트렌드 데이터를 가져오지 못했습니다.')
  }
  return (await res.json()) as TrendDataPoint[]
}

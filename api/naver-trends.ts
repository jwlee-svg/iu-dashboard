import type { VercelRequest, VercelResponse } from '@vercel/node'

interface RequestBody {
  keywords: string[]
  startDate: string
  endDate: string
  device: 'all' | 'pc' | 'mobile'
}

interface NaverDataLabResult {
  title: string
  keywords: string[]
  data: { period: string; ratio: number }[]
}

interface NaverDataLabResponse {
  results: NaverDataLabResult[]
}

interface TrendDataPoint {
  date: string
  keyword: string
  value: number
}

const NAVER_DATALAB_URL = 'https://openapi.naver.com/v1/datalab/search'
const MAX_KEYWORD_GROUPS_PER_REQUEST = 5

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function fetchKeywordGroupBatch(
  keywords: string[],
  startDate: string,
  endDate: string,
  device: RequestBody['device'],
  clientId: string,
  clientSecret: string,
): Promise<TrendDataPoint[]> {
  const payload: Record<string, unknown> = {
    startDate,
    endDate,
    timeUnit: 'date',
    keywordGroups: keywords.map((keyword) => ({ groupName: keyword, keywords: [keyword] })),
  }
  if (device === 'pc') payload.device = 'pc'
  if (device === 'mobile') payload.device = 'mo'

  const res = await fetch(NAVER_DATALAB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`네이버 데이터랩 API 오류 (${res.status}): ${text}`)
  }

  const json = (await res.json()) as NaverDataLabResponse
  return json.results.flatMap((result) =>
    result.data.map((point) => ({ date: point.period, keyword: result.title, value: Math.round(point.ratio) })),
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' })
    return
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: '서버에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 설정되지 않았습니다.' })
    return
  }

  const { keywords, startDate, endDate, device } = req.body as RequestBody
  if (!Array.isArray(keywords) || keywords.length === 0 || !startDate || !endDate) {
    res.status(400).json({ error: 'keywords, startDate, endDate가 필요합니다.' })
    return
  }

  try {
    const batches = chunk(keywords, MAX_KEYWORD_GROUPS_PER_REQUEST)
    const batchResults = await Promise.all(
      batches.map((batch) => fetchKeywordGroupBatch(batch, startDate, endDate, device, clientId, clientSecret)),
    )
    res.status(200).json(batchResults.flat())
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : '네이버 트렌드 데이터를 가져오지 못했습니다.' })
  }
}

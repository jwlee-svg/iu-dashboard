import { generateMockTrendData } from '../lib/naverTrends'
import type { SearchTrendProject } from '../types/searchTrend'

interface SampleDef {
  trendProjectId: string
  projectId: string
  projectName: string
  creatorId: string
  keywords: string[]
  publishDate: string
  memo: string
}

const SAMPLE_DEFS: SampleDef[] = [
  {
    trendProjectId: 'tp_0001',
    projectId: '1',
    projectName: '다이어트 식단 챌린지 레시피',
    creatorId: 'cr_0008',
    keywords: ['마이노멀 두부면', '두부면', '저당 면', '두부면 레시피'],
    publishDate: '2026-05-28',
    memo: '두부면 캠페인 검색 트렌드 추적',
  },
  {
    trendProjectId: 'tp_0002',
    projectId: '2',
    projectName: '숨마 홈트 루틴 협찬',
    creatorId: 'cr_0006',
    keywords: ['마이노멀 프로틴바', '홈트 루틴', '다이어트 홈트'],
    publishDate: '2026-06-01',
    memo: '숨마 협찬 2차 검색 트렌드 추적',
  },
  {
    trendProjectId: 'tp_0003',
    projectId: '3',
    projectName: '육식맨 저탄고지 레시피 광고',
    creatorId: 'cr_0012',
    keywords: ['마이노멀 저탄수 면', '저탄고지 레시피', '두부면 저탄수'],
    publishDate: '2026-05-25',
    memo: '저탄고지 캠페인 검색 트렌드 추적',
  },
]

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const searchTrendSample: SearchTrendProject[] = SAMPLE_DEFS.map((def) => {
  const startDate = addDays(def.publishDate, -14)
  const endDate = addDays(def.publishDate, 14)
  return {
    trendProjectId: def.trendProjectId,
    projectId: def.projectId,
    projectName: def.projectName,
    creatorId: def.creatorId,
    keywords: def.keywords,
    startDate,
    endDate,
    periodPreset: '14일',
    device: 'all',
    trendData: generateMockTrendData({
      keywords: def.keywords,
      startDate,
      endDate,
      device: 'all',
      publishDate: def.publishDate,
    }),
    lastUpdatedAt: '2026-06-11T09:00:00.000Z',
    memo: def.memo,
  }
})

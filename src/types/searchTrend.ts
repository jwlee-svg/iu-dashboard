export type PeriodPreset = '7일' | '14일' | '30일' | '90일' | '직접설정'
export type TrendDevice = 'all' | 'pc' | 'mobile'

export interface TrendDataPoint {
  date: string
  keyword: string
  value: number
}

export interface SearchTrendProject {
  trendProjectId: string
  projectId: string
  projectName: string
  creatorId?: string
  keywords: string[]
  startDate: string
  endDate: string
  periodPreset: PeriodPreset
  device: TrendDevice
  trendData: TrendDataPoint[]
  lastUpdatedAt: string
  memo?: string
}

export const PERIOD_PRESET_DAYS: Record<'7일' | '14일' | '30일' | '90일', number> = {
  '7일': 7,
  '14일': 14,
  '30일': 30,
  '90일': 90,
}

export const PERIOD_PRESETS: PeriodPreset[] = ['7일', '14일', '30일', '90일', '직접설정']

export const KEYWORD_COLORS = [
  '#5a3b2e',
  '#d4a373',
  '#8b5b3a',
  '#E9A5A5',
  '#C8B6E2',
  '#7bb0c9',
  '#8fbf7f',
  '#e0a15c',
  '#b98ac9',
  '#6f9fa8',
]

export const keywordColor = (index: number) => KEYWORD_COLORS[index % KEYWORD_COLORS.length]

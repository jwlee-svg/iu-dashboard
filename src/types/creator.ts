export interface Creator {
  creatorId: string           // cr_XXXX
  name: string                // 활동명
  realName: string            // 수령인 (실명)
  affection: string           // 1.팬 | 2.진심바이럴 | 3.임팩트 | 4.단순바이럴 | 발송전검토 | 중단
  // Platforms
  ytUrl: string
  ytSubscribers: number
  ytLastUpdated: string       // YYYY-MM-DD
  igUrl: string
  igFollowers: number
  tkUrl: string
  tkFollowers: number
  // Attributes
  faceExposure: boolean
  ageTargets: string[]        // e.g. ['25-34', '35-44']
  keywords: string[]          // 키워드/주제
  hasChildren: boolean
  isCommerce: boolean         // 커머스 후보
  isCelebrity: boolean
  isDoctor: boolean
  isNutritionFitness: boolean
  isDiabeticLowCarb: boolean
  isOrganic: boolean
  hasPaidCollab: boolean
  hasGroupBuy: boolean
  // Contact
  phone: string
  address: string
  firstSeedingDate: string
  agencyName: string
  agencyContact: string       // 컨택포인트 (이름/이메일)
  shippingNote: string        // 배송 참고
  smsName: string             // 문자 발송 이름
  // Extras
  notionUrl: string
  notes: string
}

export const calcInfluence = (platform: 'yt' | 'ig' | 'tk', count: number): string => {
  if (!count) return '-'
  if (platform === 'yt') {
    if (count < 10000) return '소형(나노)'
    if (count < 100000) return '소형(마이크로)'
    if (count < 500000) return '중형(미드티어)'
    if (count < 1000000) return '대형(매크로)'
    return '대형(메가)'
  }
  if (platform === 'ig') {
    if (count < 10000) return '소형'
    if (count < 30000) return '소형(마이크로)'
    if (count < 100000) return '중형'
    if (count < 500000) return '대형(매크로)'
    return '대형(메가)'
  }
  if (count < 50000) return '소형'
  if (count < 300000) return '중형'
  return '대형'
}

export const formatSubs = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

export const AFFECTION_OPTIONS = ['1.팬', '2.진심바이럴', '3.임팩트', '4.단순바이럴', '발송전검토', '중단'] as const
export const AFFECTION_COLORS: Record<string, string> = {
  '1.팬': 'bg-rose-100 text-rose-700',
  '2.진심바이럴': 'bg-amber-100 text-amber-700',
  '3.임팩트': 'bg-blue-100 text-blue-700',
  '4.단순바이럴': 'bg-slate-100 text-slate-600',
  '발송전검토': 'bg-purple-100 text-purple-700',
  '중단': 'bg-gray-100 text-gray-500',
}

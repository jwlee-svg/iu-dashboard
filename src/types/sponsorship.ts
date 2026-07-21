export type SponsorshipProjectType = '행사협찬' | '제품협찬' | '신제품시딩' | '연예인시딩' | '기타'
export type SponsorshipStatus = '기획중' | '발송완료' | '종료' | '취소'
export type SponsorshipTargetCategory = 'influencer' | 'celebrity' | 'company' | 'event'

export const TARGET_CATEGORY_LABEL: Record<SponsorshipTargetCategory, string> = {
  influencer: '인플루언서',
  celebrity: '연예인',
  company: '업체',
  event: '행사',
}

export interface SponsorshipProductItem {
  productId: string
  quantity: number
  costPrice: number    // snapshot from Product at time of entry
}

export interface SponsorshipTarget {
  id: string
  creatorId?: string
  name: string
  category: SponsorshipTargetCategory
  agency: string
  phone: string
  address: string
  memo: string
  // Performance
  hasContent: boolean
  contentUrl: string
  contentDate: string
  views: number
  likes: number
  comments: number
  reaction: string
  resultMemo: string
}

export interface SponsorshipProject {
  projectId: string    // sp_YYYY_XXXX
  name: string
  projectType: SponsorshipProjectType
  status: SponsorshipStatus
  eventDate: string    // 행사일/진행일 (YYYY-MM-DD)
  manager: '이지원' | '박지영'
  notionUrl: string
  expectedEffect: string
  result: string
  notes: string
  products: SponsorshipProductItem[]
  targets: SponsorshipTarget[]
  createdAt: string
}

export const PROJECT_TYPE_COLOR: Record<SponsorshipProjectType, string> = {
  '행사협찬': 'bg-blue-100 text-blue-700',
  '제품협찬': 'bg-emerald-100 text-emerald-700',
  '신제품시딩': 'bg-violet-100 text-violet-700',
  '연예인시딩': 'bg-amber-100 text-amber-700',
  '기타': 'bg-slate-100 text-slate-600',
}

export const STATUS_COLOR: Record<SponsorshipStatus, string> = {
  '기획중': 'bg-amber-50 text-amber-600 border-amber-200',
  '발송완료': 'bg-blue-50 text-blue-600 border-blue-200',
  '종료': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '취소': 'bg-slate-50 text-slate-500 border-slate-200',
}

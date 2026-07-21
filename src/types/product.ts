export interface ProductCategory {
  id: string    // cat_XXXX
  name: string
}

export interface Product {
  productId: string    // pd_XXXX
  name: string
  categoryId: string   // references ProductCategory.id
  costPrice: number    // 원가
  retailPrice: number  // 소비자가
  notes: string
}

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_001', name: '면류' },
  { id: 'cat_002', name: '감미료' },
  { id: 'cat_003', name: '잼/청' },
  { id: 'cat_004', name: '과자/스낵' },
  { id: 'cat_005', name: '소스/양념' },
]

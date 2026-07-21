import type { Product, ProductCategory } from '../types/product'

export const categorySample: ProductCategory[] = [
  { id: 'cat_001', name: '면류' },
  { id: 'cat_002', name: '감미료' },
  { id: 'cat_003', name: '잼/청' },
  { id: 'cat_004', name: '과자/스낵' },
  { id: 'cat_005', name: '소스/양념' },
]

export const productSample: Product[] = [
  { productId: 'pd_0001', name: '두부면', categoryId: 'cat_001', costPrice: 1200, retailPrice: 3500, notes: '' },
  { productId: 'pd_0002', name: '메밀두부면', categoryId: 'cat_001', costPrice: 1400, retailPrice: 3800, notes: '' },
  { productId: 'pd_0003', name: '알룰로스', categoryId: 'cat_002', costPrice: 2800, retailPrice: 8900, notes: '750ml' },
  { productId: 'pd_0004', name: '유자청', categoryId: 'cat_003', costPrice: 3200, retailPrice: 9500, notes: '' },
  { productId: 'pd_0005', name: '딸기잼', categoryId: 'cat_003', costPrice: 2500, retailPrice: 7500, notes: '' },
  { productId: 'pd_0006', name: '제로초코볼', categoryId: 'cat_004', costPrice: 900, retailPrice: 2900, notes: '50g' },
  { productId: 'pd_0007', name: '제로젤리', categoryId: 'cat_004', costPrice: 700, retailPrice: 2200, notes: '40g' },
  { productId: 'pd_0008', name: '저당 고추장', categoryId: 'cat_005', costPrice: 4500, retailPrice: 12000, notes: '500g' },
  { productId: 'pd_0009', name: '마요네즈', categoryId: 'cat_005', costPrice: 2200, retailPrice: 6800, notes: '' },
  { productId: 'pd_0010', name: '머스타드', categoryId: 'cat_005', costPrice: 1800, retailPrice: 5500, notes: '' },
]

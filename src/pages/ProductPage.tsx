import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import type { Product, ProductCategory } from '../types/product'
import { productSample, categorySample } from '../data/productSample'

const PRODUCTS_KEY = 'iu-dashboard-products'
const CATEGORIES_KEY = 'iu-dashboard-product-categories'

const loadProducts = (): Product[] => {
  const raw = localStorage.getItem(PRODUCTS_KEY)
  if (!raw) return productSample
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : productSample } catch { return productSample }
}

const loadCategories = (): ProductCategory[] => {
  const raw = localStorage.getItem(CATEGORIES_KEY)
  if (!raw) return categorySample
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : categorySample } catch { return categorySample }
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

const emptyProduct = (): Product => ({
  productId: '',
  name: '',
  categoryId: '',
  costPrice: 0,
  retailPrice: 0,
  notes: '',
})

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>(loadProducts)
  const [savedProducts, setSavedProducts] = useState<Product[]>(loadProducts)
  const [categories, setCategories] = useState<ProductCategory[]>(loadCategories)
  const [savedCategories, setSavedCategories] = useState<ProductCategory[]>(loadCategories)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editForm, setEditForm] = useState<Product>(emptyProduct())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Category edit state
  const [catDraft, setCatDraft] = useState<ProductCategory[]>([])
  const [newCatName, setNewCatName] = useState('')

  const hasUnsaved =
    JSON.stringify(products) !== JSON.stringify(savedProducts) ||
    JSON.stringify(categories) !== JSON.stringify(savedCategories)

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(t)
  }, [status])

  const save = () => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
    setSavedProducts(products)
    setSavedCategories(categories)
    setStatus({ type: 'success', text: '제품 DB가 저장되었습니다.' })
  }

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name ?? id

  const filtered = products.filter((p) => {
    if (filterCat && p.categoryId !== filterCat) return false
    if (search && !p.name.includes(search) && !p.notes.includes(search)) return false
    return true
  })

  const openAdd = () => {
    setEditForm({ ...emptyProduct(), productId: `pd_${String(Date.now()).slice(-4).padStart(4, '0')}` })
    setEditingId(null)
    setShowProductModal(true)
  }

  const openEdit = (p: Product) => {
    setEditForm({ ...p })
    setEditingId(p.productId)
    setShowProductModal(true)
  }

  const submitProduct = () => {
    if (!editForm.name.trim()) { setStatus({ type: 'error', text: '제품명을 입력하세요.' }); return }
    if (editingId) {
      setProducts((prev) => prev.map((p) => (p.productId === editingId ? { ...editForm } : p)))
    } else {
      const newId = `pd_${String(products.length + 1).padStart(4, '0')}`
      setProducts((prev) => [...prev, { ...editForm, productId: newId }])
    }
    setShowProductModal(false)
  }

  const doDelete = () => {
    if (!deleteTarget) return
    setProducts((prev) => prev.filter((p) => p.productId !== deleteTarget))
    setDeleteTarget(null)
  }

  const openCatModal = () => {
    setCatDraft([...categories])
    setNewCatName('')
    setShowCatModal(true)
  }

  const saveCatModal = () => {
    // Apply renames to products in memory (no productId change, just display-only via categoryId)
    setCategories(catDraft)
    setShowCatModal(false)
  }

  const addCategory = () => {
    const name = newCatName.trim()
    if (!name) return
    const id = `cat_${String(Date.now()).slice(-4).padStart(4, '0')}`
    setCatDraft((prev) => [...prev, { id, name }])
    setNewCatName('')
  }

  const removeCat = (id: string) => {
    setCatDraft((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto app-container px-8 py-8">
        <PageHeader
          title="제품 DB"
          subtitle="협찬/정기발송/공동구매의 기준이 되는 제품 마스터 데이터입니다."
          actions={
            <>
              <span className="text-sm text-slate-500">{products.length}개 등록됨</span>
              <button type="button" onClick={openCatModal} className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                카테고리 관리
              </button>
              <button type="button" onClick={save} disabled={!hasUnsaved} className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${hasUnsaved ? 'bg-[#5a3b2e] hover:bg-[#462a20]' : 'cursor-not-allowed bg-slate-300'}`}>
                변경사항 저장
              </button>
              <button type="button" onClick={openAdd} className="rounded-2xl bg-[#5a3b2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#462a20] transition">
                + 제품 등록
              </button>
            </>
          }
        />

        {status && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {status.text}
          </div>
        )}

        {/* Search + Filter */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제품명 검색..."
            className="w-44 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCat('')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${!filterCat ? 'bg-[#5a3b2e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8]'}`}
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterCat === c.id ? 'bg-[#5a3b2e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#f6ead8]'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr className="bg-[#f6ead8] text-[#5a3b2e]">
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">No.</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">제품명</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">카테고리</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap text-right bg-[#f6ead8] z-10">원가</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap text-right bg-[#f6ead8] z-10">소비자가</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap text-right bg-[#f6ead8] z-10">마진율</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">비고</th>
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold whitespace-nowrap bg-[#f6ead8] z-10">작업</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const margin = p.retailPrice > 0 ? ((p.retailPrice - p.costPrice) / p.retailPrice * 100).toFixed(1) : '0'
                  return (
                    <tr key={p.productId} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f6ead8] px-2.5 py-0.5 text-xs font-medium text-[#5a3b2e]">
                          {getCatName(p.categoryId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">₩{fmt(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₩{fmt(p.retailPrice)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{margin}%</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{p.notes || <span className="text-slate-300">-</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => openEdit(p)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#5a3b2e] hover:bg-[#f6ead8] transition">수정</button>
                          <button type="button" onClick={() => setDeleteTarget(p.productId)} className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition">삭제</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">제품이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Add/Edit Modal */}
        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? '제품 수정' : '제품 등록'}</h2>
                <button type="button" onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>
              <div className="space-y-4">
                <label className="space-y-1.5 block text-sm">
                  <span className="font-medium text-slate-700">제품명 <span className="text-red-500">*</span></span>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373] focus:ring-2 focus:ring-[#f7e7d9]"
                  />
                </label>
                <label className="space-y-1.5 block text-sm">
                  <span className="font-medium text-slate-700">카테고리</span>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                  >
                    <option value="">-- 선택 --</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">원가 (₩)</span>
                    <input type="number" min={0} value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">소비자가 (₩)</span>
                    <input type="number" min={0} value={editForm.retailPrice} onChange={(e) => setEditForm({ ...editForm, retailPrice: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]" />
                  </label>
                </div>
                <label className="space-y-1.5 block text-sm">
                  <span className="font-medium text-slate-700">비고</span>
                  <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]" placeholder="용량, 규격 등" />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setShowProductModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                <button type="button" onClick={submitProduct} className="rounded-xl bg-[#5a3b2e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#462a20]">
                  {editingId ? '저장' : '등록'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">카테고리 관리</h2>
                <button type="button" onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>
              <p className="text-xs text-slate-500 mb-4">카테고리명을 수정하면 해당 카테고리의 모든 제품에 자동 반영됩니다.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {catDraft.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) => setCatDraft((prev) => prev.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))}
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                    />
                    <button type="button" onClick={() => removeCat(c.id)} className="text-slate-400 hover:text-red-500 text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-5">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="새 카테고리 이름..."
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#d4a373]"
                />
                <button type="button" onClick={addCategory} className="rounded-xl bg-[#f6ead8] px-3 py-2 text-sm font-semibold text-[#5a3b2e] hover:bg-[#ead9c4]">추가</button>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCatModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                <button type="button" onClick={saveCatModal} className="rounded-xl bg-[#5a3b2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#462a20]">적용</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900 mb-2">제품 삭제</h2>
              <p className="text-sm text-slate-600 mb-5">삭제하면 복구할 수 없습니다. 협찬/발송 데이터와의 연결도 끊어집니다.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">취소</button>
                <button type="button" onClick={doDelete} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

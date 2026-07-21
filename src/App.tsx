import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ContentPage from './pages/ContentPage'
import SponsorshipPage from './pages/SponsorshipPage'
import ProductPage from './pages/ProductPage'
import ShippingPage from './pages/ShippingPage'
import CreatorDBPage from './pages/CreatorDBPage'
import SearchTrendPage from './pages/SearchTrendPage'

type Page = 'content' | 'sponsorship' | 'products' | 'shipping' | 'creators' | 'searchTrend'

const PAGE_KEY = 'iu-dashboard-active-page'
const PAGES: Page[] = ['content', 'sponsorship', 'products', 'shipping', 'creators', 'searchTrend']

const loadInitialPage = (): Page => {
  const stored = localStorage.getItem(PAGE_KEY)
  return PAGES.includes(stored as Page) ? (stored as Page) : 'content'
}

export default function App() {
  const [page, setPage] = useState<Page>(loadInitialPage)

  const navigate = (next: Page) => {
    setPage(next)
    localStorage.setItem(PAGE_KEY, next)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage={page} onNavigate={navigate} />
      <div className="flex-1 overflow-auto min-w-0">
        {page === 'content' && <ContentPage />}
        {page === 'sponsorship' && <SponsorshipPage />}
        {page === 'products' && <ProductPage />}
        {page === 'shipping' && <ShippingPage />}
        {page === 'creators' && <CreatorDBPage />}
        {page === 'searchTrend' && <SearchTrendPage />}
      </div>
    </div>
  )
}

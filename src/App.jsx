import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Sales from './pages/Sales.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import ProductStock from './pages/product_stock.jsx'
import PurchaseStock from './pages/purchase_stock.jsx'
import ScrapStock from './pages/ScrapStock.jsx'
import ScrapStockDetails from './pages/ScrapStockDetails.jsx'
import Quotation from './pages/Quotation.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  useEffect(() => {
    function stopNumberInputWheel(event) {
      const input = event.target
      if (input instanceof HTMLInputElement && input.type === 'number' && document.activeElement === input) {
        input.blur()
      }
    }

    document.addEventListener('wheel', stopNumberInputWheel, { capture: true })
    return () => document.removeEventListener('wheel', stopNumberInputWheel, { capture: true })
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stock" element={<ProductStock />} />
        <Route path="/purchase-stock" element={<PurchaseStock />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/scrap-stock" element={<ScrapStock />} />
        <Route path="/scrap-stock/:category" element={<ScrapStockDetails />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/quotation" element={<Quotation />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Sales from './pages/Sales.jsx'
import Inventory from './pages/Inventory.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import ProductStock from './pages/product_stock.jsx'
import PurchaseStock from './pages/purchase_stock.jsx'
import ScrapStock from './pages/ScrapStock.jsx'
import ScrapStockDetails from './pages/ScrapStockDetails.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock" element={<ProductStock />} />
        <Route path="/purchase-stock" element={<PurchaseStock />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/scrap-stock" element={<ScrapStock />} />
        <Route path="/scrap-stock/:category" element={<ScrapStockDetails />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

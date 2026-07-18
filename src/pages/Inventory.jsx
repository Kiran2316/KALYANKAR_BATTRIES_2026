import { useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'

const initialInventory = [
  { id: 1, product: 'Amaron 45Ah', brand: 'Amaron', warehouse: 'Main Warehouse', stock: 45, reorder: 10, updated: '09 Jul 2026' },
  { id: 2, product: 'Exide 45Ah', brand: 'Exide', warehouse: 'Main Warehouse', stock: 2, reorder: 10, updated: '08 Jul 2026' },
  { id: 3, product: 'Amaron 65Ah', brand: 'Amaron', warehouse: 'MG Road Store', stock: 1, reorder: 8, updated: '07 Jul 2026' },
  { id: 4, product: 'Power Zone 35Ah', brand: 'Power Zone', warehouse: 'Main Warehouse', stock: 3, reorder: 10, updated: '07 Jul 2026' },
  { id: 5, product: 'Tata Green 50Ah', brand: 'Tata Green', warehouse: 'MG Road Store', stock: 0, reorder: 12, updated: '06 Jul 2026' },
  { id: 6, product: 'Exide 65Ah', brand: 'Exide', warehouse: 'Main Warehouse', stock: 22, reorder: 10, updated: '09 Jul 2026' },
]

const emptyForm = { product: '', brand: '', warehouse: '', stock: '', reorder: '' }

function stockStatus(stock, reorder) {
  if (stock <= 0) return { label: 'Out of Stock', cls: 'badge-out-stock' }
  if (stock <= reorder) return { label: 'Low Stock', cls: 'badge-low-stock' }
  return { label: 'In Stock', cls: 'badge-received' }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Inventory() {
  const [items, setItems] = useState(initialInventory)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter((i) =>
      [i.product, i.brand, i.warehouse, i.stock, i.reorder, i.updated].join(' ').toLowerCase().includes(q)
    )
  }, [items, search])

  const summary = useMemo(() => {
    let totalUnits = 0, inStock = 0, low = 0, out = 0
    items.forEach((i) => {
      totalUnits += i.stock
      if (i.stock <= 0) out++
      else if (i.stock <= i.reorder) low++
      else inStock++
    })
    return { totalUnits, inStock, low, out }
  }, [items])

  function closeModal() {
    const el = document.getElementById('adjustStockModal')
    window.bootstrap?.Modal.getOrCreateInstance(el).hide()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const { product, brand, warehouse, stock, reorder } = form
    if (!product.trim() || !brand.trim() || !warehouse.trim()) return

    setItems((prev) => [
      {
        id: Date.now(),
        product: product.trim(),
        brand: brand.trim(),
        warehouse: warehouse.trim(),
        stock: parseInt(stock, 10) || 0,
        reorder: parseInt(reorder, 10) || 0,
        updated: todayLabel(),
      },
      ...prev,
    ])
    setForm(emptyForm)
    closeModal()
  }

  return (
    <>
      <Topbar title="Inventory" subtitle="Track stock levels across all products" />

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Total Stock Units</small><h4>{summary.totalUnits}</h4><span className="stat-change stat-muted">Across all products</span></div>
            <div className="stat-icon icon-navy"><i className="fa-solid fa-warehouse"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>In Stock</small><h4 className="text-success">{summary.inStock}</h4><span className="stat-change stat-muted">Healthy stock items</span></div>
            <div className="stat-icon icon-green"><i className="fa-solid fa-boxes-stacked"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Low Stock</small><h4 className="text-warning">{summary.low}</h4><span className="stat-change stat-orange">Reorder soon</span></div>
            <div className="stat-icon icon-orange"><i className="fa-solid fa-triangle-exclamation"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Out of Stock</small><h4 className="text-danger">{summary.out}</h4><span className="stat-change down">Needs restocking</span></div>
            <div className="stat-icon icon-red"><i className="fa-solid fa-circle-xmark"></i></div>
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="section-title d-flex justify-content-between align-items-center">
          <span>Stock Ledger</span>
          <button type="button" className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#adjustStockModal">
            <i className="fa-solid fa-right-left me-1"></i> Add / Adjust Stock
          </button>
        </div>

        <div className="mb-3">
          <input
            type="text"
            className="form-control form-control-sm w-auto d-inline-block"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr><th>Product</th><th>Brand</th><th>Warehouse</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th><th>Last Updated</th></tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const status = stockStatus(i.stock, i.reorder)
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                        {i.product}
                      </div>
                    </td>
                    <td>{i.brand}</td>
                    <td>{i.warehouse}</td>
                    <td>{i.stock}</td>
                    <td>{i.reorder}</td>
                    <td><span className={status.cls}>{status.label}</span></td>
                    <td>{i.updated}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="text-muted text-center py-4">No inventory items found.</p>}
      </div>

      {/* Add/Adjust Stock Modal */}
      <div className="modal fade" id="adjustStockModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-right-left me-2"></i>Add / Adjust Stock</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-control" placeholder="e.g. Exide 45Ah" required
                    value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Brand</label>
                  <input type="text" className="form-control" placeholder="e.g. Exide" required
                    value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Warehouse</label>
                  <input type="text" className="form-control" placeholder="e.g. Main Warehouse" required
                    value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} />
                </div>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">Quantity</label>
                    <input type="number" className="form-control" min="0" placeholder="e.g. 20" required
                      value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">Reorder Level</label>
                    <input type="number" className="form-control" min="0" placeholder="e.g. 10" required
                      value={form.reorder} onChange={(e) => setForm({ ...form, reorder: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-check me-1"></i>Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

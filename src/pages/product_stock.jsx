import { useMemo, useRef, useState } from 'react'
import Topbar from '../components/Topbar.jsx'

// This page lives in src/pages/product_stock.jsx and is routed at /stock — see src/App.jsx

const SHOP_INFO = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay',
  phone: '9420007273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
  // Color logo shown at the top of the invoice
  logo: 'data:image/png;base64,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',
  // Ink stamp shown near the signature at the bottom of the invoice
  stamp: 'data:image/png;base64,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',
}


const warrantyUnits = ['Days', 'Months', 'Years']

const initialStock = [
  {
    id: 1,
    brand: 'Exide',
    model: 'XPLORE FXI0-DIN44',
    serialNo: 'EX44DIN2409981',
    warrantyValue: 24,
    warrantyUnit: 'Months',
    purchasePrice: 4200,
    sellingPrice: 5199,
    liveStock: 18,
    addedOn: '2026-05-02',
  },
  {
    id: 2,
    brand: 'Amaron',
    model: 'GO 35B20L',
    serialNo: 'AM35B20L118827',
    warrantyValue: 18,
    warrantyUnit: 'Months',
    purchasePrice: 2850,
    sellingPrice: 3499,
    liveStock: 4,
    addedOn: '2026-06-11',
  },
  {
    id: 3,
    brand: 'Luminous',
    model: 'RC 18000 150Ah',
    serialNo: 'LM150AH005512',
    warrantyValue: 3,
    warrantyUnit: 'Years',
    purchasePrice: 11500,
    sellingPrice: 13999,
    liveStock: 0,
    addedOn: '2026-04-20',
  },
]

const emptyForm = {
  brand: '',
  model: '',
  serialNo: '',
  warrantyValue: '',
  warrantyUnit: 'Months',
  purchasePrice: '',
  sellingPrice: '',
  liveStock: '',
}

function stockStatus(stock) {
  if (stock <= 0) return { label: 'Out of Stock', cls: 'badge-out-stock' }
  if (stock <= 5) return { label: 'Low Stock', cls: 'badge-low-stock' }
  return { label: 'In Stock', cls: 'badge-received' }
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10)
}


function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function openPrintWindow(html) {
  const printWindow = window.open('', '_blank', 'width=950,height=1050')
  if (!printWindow) {
    alert('Please allow pop-ups to print the receipt.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  const printWhenReady = () => {
    const images = Array.from(printWindow.document.images)

    if (images.length === 0) {
      printWindow.focus()
      printWindow.print()
      return
    }

    let completed = 0
    const finishImage = () => {
      completed += 1
      if (completed >= images.length) {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 250)
      }
    }

    images.forEach((image) => {
      if (image.complete) {
        finishImage()
      } else {
        image.addEventListener('load', finishImage, { once: true })
        image.addEventListener('error', finishImage, { once: true })
      }
    })
  }

  if (printWindow.document.readyState === 'complete') {
    printWhenReady()
  } else {
    printWindow.addEventListener('load', printWhenReady, { once: true })
  }
}

function renderProductReceiptHTML(products) {
  const rows = products
    .map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${product.brand || '—'}</strong></td>
        <td>${product.model || '—'}</td>
        <td>${product.serialNo || '—'}</td>
        <td>${product.warrantyValue || 0} ${product.warrantyUnit || ''}</td>
        <td class="num">&#8377; ${formatCurrency(product.purchasePrice)}</td>
        <td class="num">&#8377; ${formatCurrency(product.sellingPrice)}</td>
        <td class="num">${product.liveStock || 0}</td>
        <td>${product.addedOn || '—'}</td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Product Stock Receipt</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#1c2436; margin:0; padding:18px; font-size:11px; }
  .sheet { max-width: 900px; margin:0 auto; }
  .doc-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #17213a; padding-bottom:10px; margin-bottom:14px; }
  .shop-logo { width:210px; height:auto; object-fit:contain; display:block; }
  .shop-name { font-family:Arial,sans-serif; font-size:22px; font-weight:800; color:#17213a; margin:0 0 2px; }
  .shop-tagline { font-family:Arial,sans-serif; font-size:10px; font-weight:700; color:#5f6b7d; margin-bottom:5px; text-transform:uppercase; letter-spacing:.6px; }
  .shop-meta { font-family:Arial,sans-serif; font-size:10px; color:#4a5468; margin-top:5px; line-height:1.4; max-width:390px; }
  .shop-meta strong { color:#17213a; }
  .receipt-tag { text-align:right; font-family:Arial,sans-serif; }
  .badge-title { display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; color:white; background:#17213a; padding:5px 12px; border-radius:3px; margin-bottom:8px; }
  .receipt-tag .row { font-size:12px; color:#354160; margin-top:3px; }
  table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; }
  th { background:#17213a; color:white; font-size:9.5px; text-transform:uppercase; letter-spacing:.3px; padding:7px 6px; text-align:left; }
  td { padding:7px 6px; font-size:10px; border-bottom:1px solid #e8edf4; vertical-align:top; }
  .num { text-align:right; }
  .summary { display:flex; justify-content:flex-end; margin-top:12px; font-family:Arial,sans-serif; }
  .summary-box { width:280px; border-top:2px solid #17213a; padding-top:8px; }
  .summary-line { display:flex; justify-content:space-between; padding:3px 0; }
  .footer { text-align:center; margin-top:22px; padding-top:10px; border-top:1px solid #eef1f7; font-family:Arial,sans-serif; font-size:9px; color:#929daf; }
  @page { size:A4 landscape; margin:8mm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body{padding:0;}
    .sheet, .doc-header, table, .summary, .footer{break-inside:avoid; page-break-inside:avoid;}
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="doc-header">
    <div>
      <img
        src="${SHOP_INFO.logo}"
        alt="${SHOP_INFO.name}"
        class="shop-logo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"
      />
      <div class="shop-text-fallback" style="display:none">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div class="shop-tagline">${SHOP_INFO.tagline}</div>
      </div>
      <div class="shop-meta">
        <strong>${SHOP_INFO.address}</strong><br/>
        Phone: ${SHOP_INFO.phone} &nbsp;|&nbsp; ${SHOP_INFO.email}<br/>
        GSTIN: ${SHOP_INFO.gstin}
      </div>
    </div>
    <div class="receipt-tag">
      <div class="badge-title">PRODUCT STOCK RECEIPT</div>
      <div class="row"><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
      <div class="row"><strong>Total Entries:</strong> ${products.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SR No.</th><th>Brand</th><th>Model</th><th>Serial No.</th><th>Warranty</th>
        <th class="num">Purchase Price</th><th class="num">Selling Price</th><th class="num">Stock</th><th>Purchase Date</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px">No product records available.</td></tr>'}</tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-line"><span>Total Products</span><strong>${products.length}</strong></div>
      <div class="summary-line"><span>Total Live Stock</span><strong>${products.reduce((sum, p) => sum + Number(p.liveStock || 0), 0)}</strong></div>
    </div>
  </div>
  <div class="footer">This is a computer-generated stock receipt from ${SHOP_INFO.name}.</div>
</div>
</body>
</html>`
}

// QR is expected as "Brand|Model" or JSON {"brand":"...","model":"..."}.
// Adjust to match whatever format your supplier actually prints.
function parseProductQr(raw) {
  try {
    const json = JSON.parse(raw)
    return { brand: json.brand || '', model: json.model || '' }
  } catch {
    const [brand = '', model = ''] = raw.split('|').map((s) => s.trim())
    return { brand, model }
  }
}

// Very small CSV parser for "Import Excel" (export your sheet as .csv).
// Expected header row: brand,model,serialNo,warrantyValue,warrantyUnit,purchasePrice,sellingPrice,liveStock
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(',').map((c) => c.trim())
      const row = {}
      headers.forEach((h, i) => (row[h] = cells[i] ?? ''))
      return {
        id: Date.now() + Math.random(),
        brand: row.brand || '',
        model: row.model || '',
        serialNo: row.serialno || row.serial || '',
        warrantyValue: Number(row.warrantyvalue) || 0,
        warrantyUnit: warrantyUnits.includes(row.warrantyunit) ? row.warrantyunit : 'Months',
        purchasePrice: Number(row.purchaseprice) || 0,
        sellingPrice: Number(row.sellingprice) || 0,
        liveStock: Number(row.livestock) || 0,
        addedOn: todayLabel(),
      }
    })
    .filter((r) => r.brand && r.model)
}

// Simple, dependency-free modal shell (matches the one used in Products.jsx)
function Modal({ open, onClose, title, icon, children, footer, size = '' }) {
  if (!open) return null

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className={`modal-dialog modal-dialog-centered ${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {icon}
              {title}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

// Shared camera scanner for both Barcode and QR, with manual entry fallback.
// Swap the placeholder box for the `html5-qrcode` library to enable real
// camera scanning: npm install html5-qrcode
function ScannerModal({ mode, open, onClose, onResult }) {
  const [manualValue, setManualValue] = useState('')
  const isQr = mode === 'qr'

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualValue.trim()) return
    onResult(manualValue.trim())
    setManualValue('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isQr ? 'Scan Product QR Code' : 'Scan Barcode'}
      icon={<i className={`fa-solid ${isQr ? 'fa-qrcode' : 'fa-barcode'} me-2`}></i>}
      footer={
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-muted small mb-3">
        {isQr
          ? 'Point the camera at the QR code printed by the manufacturer to auto-fill Brand & Model.'
          : 'Point the camera at the barcode to capture the Serial Number.'}
      </p>

      <div
        className="d-flex flex-column align-items-center justify-content-center text-white rounded mb-3"
        style={{ height: 180, background: '#0b0f14', fontSize: 13 }}
      >
        <i className="fa-solid fa-camera fa-lg mb-2"></i>
        Camera preview renders here
        <small className="text-secondary mt-1">(integrate html5-qrcode for live scanning)</small>
      </div>

      <form onSubmit={handleManualSubmit}>
        <label className="form-label small">
          <i className="fa-solid fa-keyboard me-1"></i>
          Camera not working? Enter {isQr ? 'QR content (Brand|Model)' : 'the code'} manually
        </label>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder={isQr ? 'e.g. Exide|XPLORE FXI0-DIN44' : 'e.g. EX44DIN2409981'}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Use Value
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Add / Manual Entry form — used by both the "Add Product" and "Manual Entry" buttons.
// `scanEnabled` hides the scan shortcuts for a pure manual-entry flow.
function ProductForm({ form, setForm, scanEnabled, onScan }) {
  return (
    <>
      {scanEnabled && (
        <div className="d-flex gap-2 mb-3">
          <button type="button" className="btn btn-outline-primary btn-sm flex-fill" onClick={() => onScan('qr')}>
            <i className="fa-solid fa-qrcode me-1"></i> Scan Product QR
          </button>
          <button type="button" className="btn btn-outline-warning btn-sm flex-fill" onClick={() => onScan('barcode')}>
            <i className="fa-solid fa-barcode me-1"></i> Scan Barcode
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Brand *</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Exide"
            required
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Model *</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. XPLORE FXI0-DIN44"
            required
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Serial Number *</label>
        <input
          type="text"
          className="form-control"
          placeholder="Type the serial no."
          required
          value={form.serialNo}
          onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
        />
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Live Stock (Qty) *</label>
          <input
            type="number"
            className="form-control"
            min="0"
            placeholder="e.g. 10"
            required
            value={form.liveStock}
            onChange={(e) => setForm({ ...form, liveStock: e.target.value })}
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Warranty</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              min="0"
              placeholder="e.g. 24"
              value={form.warrantyValue}
              onChange={(e) => setForm({ ...form, warrantyValue: e.target.value })}
            />
            <select
              className="form-select"
              style={{ maxWidth: 120 }}
              value={form.warrantyUnit}
              onChange={(e) => setForm({ ...form, warrantyUnit: e.target.value })}
            >
              {warrantyUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Purchase Price (₹)</label>
          <input
            type="number"
            className="form-control"
            min="0"
            placeholder="e.g. 4200"
            value={form.purchasePrice}
            onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Selling Price (₹) *</label>
          <input
            type="number"
            className="form-control"
            min="0"
            placeholder="e.g. 5199"
            required
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
          />
        </div>
      </div>
    </>
  )
}

export default function ProductStock() {
  const [products, setProducts] = useState(initialStock)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)

  const [addOpen, setAddOpen] = useState(false)       // Add Product (scan shortcuts visible)
  const [manualOpen, setManualOpen] = useState(false)  // Manual Entry (typing only, no scan)
  const [scanMode, setScanMode] = useState(null)       // 'qr' | 'barcode' | null — inside Add modal
  const [quickScanOpen, setQuickScanOpen] = useState(false) // Barcode Scan button in toolbar

  const fileInputRef = useRef(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return products
    return products.filter((p) =>
      [p.brand, p.model, p.serialNo].join(' ').toLowerCase().includes(q)
    )
  }, [products, search])

  const summary = useMemo(() => {
    let units = 0, low = 0, out = 0
    products.forEach((p) => {
      units += p.liveStock
      if (p.liveStock <= 0) out++
      else if (p.liveStock <= 5) low++
    })
    return { total: products.length, units, low, out }
  }, [products])

  function openAddModal() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openManualModal() {
    setForm(emptyForm)
    setManualOpen(true)
  }

  function handleAddScanResult(value) {
    if (scanMode === 'qr') {
      const { brand, model } = parseProductQr(value)
      setForm((f) => ({ ...f, brand: brand || f.brand, model: model || f.model }))
    } else if (scanMode === 'barcode') {
      setForm((f) => ({ ...f, serialNo: value }))
    }
    setScanMode(null)
  }

  function saveProduct() {
    const { brand, model, serialNo, liveStock, sellingPrice } = form
    if (!brand.trim() || !model.trim() || !serialNo.trim() || liveStock === '' || sellingPrice === '') {
      return false
    }

    setProducts((prev) => [
      ...prev,
      {
        id: Date.now(),
        brand: brand.trim(),
        model: model.trim(),
        serialNo: serialNo.trim(),
        warrantyValue: Number(form.warrantyValue) || 0,
        warrantyUnit: form.warrantyUnit,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        liveStock: Number(form.liveStock) || 0,
        addedOn: todayLabel(),
      },
    ])

    setForm(emptyForm)
    return true
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    if (saveProduct()) setAddOpen(false)
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (saveProduct()) setManualOpen(false)
  }

  function handleDelete(id) {
    if (window.confirm('Remove this product from stock?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handlePrintReceipt() {
    openPrintWindow(renderProductReceiptHTML(filtered))
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Export your sheet as .csv (File > Save As > CSV in Excel) and import that. For direct .xlsx parsing, install the "xlsx" package (SheetJS) and swap this reader.')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const rows = parseCsv(String(evt.target.result || ''))
      if (rows.length === 0) {
        alert('No valid rows found. Make sure the first row has headers: brand, model, serialNo, warrantyValue, warrantyUnit, purchasePrice, sellingPrice, liveStock')
        return
      }
      setProducts((prev) => [...rows, ...prev])
      alert(`Imported ${rows.length} product${rows.length === 1 ? '' : 's'} from Excel/CSV.`)
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Topbar title="Product Stock" subtitle="Track batteries by brand, model & serial number" />

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Total SKUs</small>
              <h4>{summary.total}</h4>
              <span className="stat-change stat-muted">Unique brand/model entries</span>
            </div>
            <div className="stat-icon icon-navy"><i className="fa-solid fa-battery-full"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Live Stock Units</small>
              <h4 className="text-success">{summary.units}</h4>
              <span className="stat-change stat-muted">Across all products</span>
            </div>
            <div className="stat-icon icon-green"><i className="fa-solid fa-boxes-stacked"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Low Stock</small>
              <h4 className="text-warning">{summary.low}</h4>
              <span className="stat-change stat-orange">5 or fewer units left</span>
            </div>
            <div className="stat-icon icon-orange"><i className="fa-solid fa-triangle-exclamation"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Out of Stock</small>
              <h4 className="text-danger">{summary.out}</h4>
              <span className="stat-change down">Needs restocking</span>
            </div>
            <div className="stat-icon icon-red"><i className="fa-solid fa-circle-xmark"></i></div>
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="section-title d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Product Stock</span>
          <div className="d-flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={handlePrintReceipt}>
              <i className="fa-solid fa-print me-1"></i> Print Receipt
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleImportClick}>
              <i className="fa-solid fa-file-excel me-1"></i> Import Excel
            </button>
            <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => setQuickScanOpen(true)}>
              <i className="fa-solid fa-barcode me-1"></i> Barcode Scan
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={openManualModal}>
              <i className="fa-solid fa-keyboard me-1"></i> Manual Entry
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
              <i className="fa-solid fa-plus me-1"></i> Add Product
            </button>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            className="form-control form-control-sm w-auto"
            style={{ minWidth: 280 }}
            placeholder="Search by brand, model or serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>SR No.</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Serial No.</th>
                <th>Warranty</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Live Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const status = stockStatus(p.liveStock)
                return (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{p.brand}</strong></td>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                        {p.model}
                      </div>
                    </td>
                    <td><span className="font-monospace small">{p.serialNo}</span></td>
                    <td>{p.warrantyValue} {p.warrantyUnit}</td>
                    <td>₹ {p.purchasePrice.toLocaleString('en-IN')}</td>
                    <td>₹ {p.sellingPrice.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={status.cls}>{p.liveStock} · {status.label}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Remove product"
                        onClick={() => handleDelete(p.id)}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="text-muted text-center py-4">No products match your search.</p>}
      </div>

      {/* Add Product — includes QR / Barcode scan shortcuts */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Product"
        icon={<i className="fa-solid fa-battery-full me-2"></i>}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="addProductForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i> Save Product
            </button>
          </>
        }
      >
        <form id="addProductForm" onSubmit={handleAddSubmit}>
          <ProductForm form={form} setForm={setForm} scanEnabled onScan={setScanMode} />
        </form>
      </Modal>

      {/* Manual Entry — plain typed form, no scan shortcuts */}
      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Manual Entry"
        icon={<i className="fa-solid fa-keyboard me-2"></i>}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setManualOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="manualEntryForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i> Save Product
            </button>
          </>
        }
      >
        <form id="manualEntryForm" onSubmit={handleManualSubmit}>
          <ProductForm form={form} setForm={setForm} scanEnabled={false} />
        </form>
      </Modal>

      {/* Scanner used inside Add Product modal (QR -> brand/model, Barcode -> serial no) */}
      <ScannerModal
        mode={scanMode}
        open={!!scanMode}
        onClose={() => setScanMode(null)}
        onResult={handleAddScanResult}
      />

      {/* Scanner used from the toolbar's "Barcode Scan" button (fills the search box) */}
      <ScannerModal
        mode="barcode"
        open={quickScanOpen}
        onClose={() => setQuickScanOpen(false)}
        onResult={(value) => {
          setSearch(value)
          setQuickScanOpen(false)
        }}
      />
    </>
  )
}

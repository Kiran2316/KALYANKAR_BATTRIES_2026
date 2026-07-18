import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const SHOP = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay, 416209',
  phone: '9420007273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
}

function readSales() {
  try {
    const sales = JSON.parse(localStorage.getItem(SALES_STORAGE_KEY) || '[]')
    return Array.isArray(sales) ? sales : []
  } catch {
    return []
  }
}

function batteryTypeFor(item) {
  return String(item.batteryType || item.exchange?.batteryType || '').trim()
}

function isBikeBattery(item) {
  const type = batteryTypeFor(item).toLowerCase().replaceAll('-', ' ')
  return type.includes('bike') || type.includes('motorcycle') || type.includes('two wheeler') || type.includes('2 wheeler') || type.includes('scooter')
}

function weightFor(item) {
  return Number(item.oldBatteryWeight || item.exchange?.weight || 0)
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

export default function ScrapStockDetails() {
  const navigate = useNavigate()
  const { category } = useParams()
  const [search, setSearch] = useState('')
  const [allSales, setAllSales] = useState(readSales)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const isBikePage = category === 'bike'
  const title = isBikePage ? 'Bike Battery Scrap Details' : 'Car Battery Scrap Details'

  const records = useMemo(() => allSales.filter((sale) => sale.saleType === 'Exchange' && (isBikePage ? isBikeBattery(sale) : !isBikeBattery(sale))), [allSales, isBikePage])
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => [
      record.customer, record.phone, record.address, record.date, record.invoice,
      record.brand, batteryTypeFor(record), record.model, record.serialNumber,
      record.vehicleNumber, record.vehicleName,
    ].join(' ').toLowerCase().includes(query))
  }, [records, search])
  const totalWeight = filteredRecords.reduce((sum, record) => sum + weightFor(record), 0)

  function deleteRecord(record) {
    if (!window.confirm(`Delete the scrap battery record for ${record.customer || 'this customer'}? This will also remove it from the original sales data.`)) return
    const nextSales = allSales.filter((sale) => sale !== record)
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales))
    setAllSales(nextSales)
    if (selectedRecord === record) setSelectedRecord(null)
  }

  function printRecord(record) {
    const reportWindow = window.open('', '_blank', 'width=900,height=700')
    if (!reportWindow) return alert('Please allow pop-ups to print this record.')
    const paymentHistory = Array.isArray(record.paymentHistory) ? record.paymentHistory : []
    const total = Number(record.amount || record.exchange?.value || 0)
    const paid = Number(record.paidAmount || 0)
    const due = Number(record.dueAmount || Math.max(0, total - paid))
    const logoUrl = new URL(mainLogo, window.location.origin).href
    reportWindow.document.write(`<!doctype html><html><head><title>Scrap Battery Record - ${escapeHtml(record.customer || '')}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:28px;color:#26344b;margin:0}.header{display:flex;align-items:center;gap:22px;border-bottom:3px solid #cf1f2c;padding-bottom:18px;margin-bottom:22px}.logo{width:125px;height:80px;object-fit:contain}.shop{flex:1}.shop h1{margin:0 0 4px;color:#18223a;font-size:25px}.shop p{margin:3px 0;font-size:12px;color:#536078}.title{text-align:center;margin:10px 0 20px;font-size:18px}.section{margin-top:18px}.section h3{font-size:14px;background:#f3f6fa;border-left:4px solid #cf1f2c;padding:9px 11px;margin:0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dfe4ec;padding:9px 11px;text-align:left;font-size:12px}th{background:#fafbfc;width:24%}.payment th{width:auto}.num{text-align:right}.status{font-weight:bold;color:${due > 0 ? '#b45309' : '#168447'}}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #dfe4ec;color:#7a879c;font-size:11px;text-align:center}@media print{body{padding:10px}.no-print{display:none}}
    </style></head><body>
      <header class="header"><img class="logo" src="${logoUrl}" alt="${escapeHtml(SHOP.name)}"><div class="shop"><h1>${escapeHtml(SHOP.name)}</h1><p>${escapeHtml(SHOP.tagline)}</p><p>${escapeHtml(SHOP.address)}</p><p><strong>Contact:</strong> ${escapeHtml(SHOP.phone)} &nbsp; <strong>Email:</strong> ${escapeHtml(SHOP.email)}</p><p><strong>GSTIN:</strong> ${escapeHtml(SHOP.gstin)}</p></div></header>
      <h2 class="title">Customer Old Battery Scrap Report</h2>
      <section class="section"><h3>Customer Information</h3><table><tr><th>Customer Name</th><td>${escapeHtml(record.customer || '—')}</td><th>Phone</th><td>${escapeHtml(record.phone || '—')}</td></tr><tr><th>Address</th><td colspan="3">${escapeHtml(record.address || '—')}</td></tr><tr><th>Customer GSTIN</th><td>${escapeHtml(record.gstNumber || '—')}</td><th>Invoice</th><td>${escapeHtml(record.invoice || '—')}</td></tr></table></section>
      <section class="section"><h3>Battery Information</h3><table><tr><th>Date</th><td>${escapeHtml(record.date || record.invoiceDate || '—')}</td><th>Battery Type</th><td>${escapeHtml(batteryTypeFor(record) || '—')}</td></tr><tr><th>Brand</th><td>${escapeHtml(record.brand || '—')}</td><th>Weight</th><td>${formatNumber(weightFor(record))} Kg</td></tr><tr><th>Model</th><td>${escapeHtml(record.model || '—')}</td><th>Serial Number</th><td>${escapeHtml(record.serialNumber || '—')}</td></tr><tr><th>Vehicle</th><td colspan="3">${escapeHtml(record.vehicleNumber || record.vehicleName || '—')}</td></tr></table></section>
      <section class="section"><h3>Payment Information</h3><table><tr><th>Total Amount</th><td>&#8377; ${formatNumber(total)}</td><th>Payment Method</th><td>${escapeHtml(record.paymentMethod || '—')}</td></tr><tr><th>Paid Amount</th><td>&#8377; ${formatNumber(paid)}</td><th>Due Amount</th><td>&#8377; ${formatNumber(due)}</td></tr><tr><th>Status</th><td class="status">${escapeHtml(record.status || (due > 0 ? 'Due' : 'Paid'))}</td><th>Notes</th><td>${escapeHtml(record.notes || '—')}</td></tr></table></section>
      ${paymentHistory.length ? `<section class="section"><h3>Payment History</h3><table class="payment"><thead><tr><th>Date</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>${paymentHistory.map((entry) => `<tr><td>${escapeHtml(entry.date || '—')}</td><td>${escapeHtml(entry.method || '—')}</td><td class="num">&#8377; ${formatNumber(entry.amount)}</td></tr>`).join('')}</tbody></table></section>` : ''}
      <div class="footer">This is a system-generated report from ${escapeHtml(SHOP.name)} &bull; Printed on ${new Date().toLocaleDateString('en-IN')}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
    </body></html>`)
    reportWindow.document.close()
  }

  return (
    <>
      <Topbar title={title} subtitle="Complete old battery information and stock search" />
      <style>{`
        .scrap-details-page { padding: 24px; }
        .details-panel { background: #fff; border: 1px solid #e7ebf2; border-radius: 14px; box-shadow: 0 3px 12px rgba(26,43,74,.05); overflow: hidden; }
        .details-head { padding: 18px 20px; border-bottom: 1px solid #edf0f5; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .details-table { margin: 0; white-space: nowrap; }
        .details-table th { background: #f7f9fc; color: #5a6780; border: 0; font-size: 12px; text-transform: uppercase; padding: 13px 15px; }
        .details-table td { padding: 14px 15px; border-color: #edf0f5; color: #35415a; font-size: 13px; vertical-align: middle; }
        .details-empty { padding: 48px 20px; text-align: center; color: #7a879c; }
      `}</style>
      <main className="scrap-details-page">
        <button className="btn btn-outline-secondary mb-3" onClick={() => navigate('/scrap-stock')}><i className="fa-solid fa-arrow-left me-2"></i>Back to Scrap Stock</button>
        <div className="row g-3 mb-3">
          <div className="col-md-6"><div className="card-box stat-card"><div><small>Showing Batteries</small><h4>{filteredRecords.length} Qty</h4><span className="stat-change stat-muted">{title}</span></div></div></div>
          <div className="col-md-6"><div className="card-box stat-card"><div><small>Showing Weight</small><h4 className="text-success">{formatNumber(totalWeight)} Kg</h4><span className="stat-change stat-muted">Based on current search</span></div></div></div>
        </div>
        <section className="details-panel">
          <div className="details-head">
            <div><h5 className="mb-1 fw-bold">All Battery Information</h5><small className="text-muted">Search any customer or battery detail</small></div>
            <div className="input-group" style={{ maxWidth: 460 }}>
              <span className="input-group-text bg-white"><i className="fa-solid fa-magnifying-glass"></i></span>
              <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, type, model, serial or invoice..." autoFocus />
              {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>Clear</button>}
            </div>
          </div>
          <div className="table-responsive">
            <table className="table details-table">
              <thead><tr><th>Date</th><th>Invoice</th><th>Customer Name / Address / Phone</th><th>Battery Type</th><th>Brand</th><th>Weight (Kg)</th><th>Action</th></tr></thead>
              <tbody>{filteredRecords.map((record, index) => <tr key={record.id || `${record.invoice}-${index}`}>
                <td>{record.date || record.invoiceDate || '—'}</td><td>{record.invoice || '—'}</td><td><strong>{record.customer || '—'}</strong><div className="text-muted small text-wrap" style={{ minWidth: 210 }}>{record.address || '—'}</div><div className="small"><i className="fa-solid fa-phone me-1"></i>{record.phone || '—'}</div></td><td><span className="badge text-bg-light border">{batteryTypeFor(record) || '—'}</span></td><td>{record.brand || '—'}</td><td><strong>{formatNumber(weightFor(record))}</strong></td>
                <td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#scrapRecordModal" onClick={() => setSelectedRecord(record)}><i className="fa-solid fa-eye me-1"></i>See</button><button className="btn btn-sm btn-outline-secondary" onClick={() => printRecord(record)}><i className="fa-solid fa-print me-1"></i>Print</button><button className="btn btn-sm btn-outline-danger" onClick={() => deleteRecord(record)}><i className="fa-solid fa-trash me-1"></i>Delete</button></div></td>
              </tr>)}</tbody>
            </table>
            {filteredRecords.length === 0 && <div className="details-empty"><i className="fa-solid fa-battery-empty fa-2x mb-3 d-block"></i>No matching battery records found.</div>}
          </div>
        </section>
      </main>
      <div className="modal fade" id="scrapRecordModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content">
          <div className="modal-header"><div><h5 className="modal-title fw-bold">Customer & Battery Information</h5><small className="text-muted">{selectedRecord?.invoice || 'Scrap battery record'}</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <div className="modal-body"><div className="row g-3">
            {[['Customer', selectedRecord?.customer], ['Phone', selectedRecord?.phone], ['Address', selectedRecord?.address], ['Date', selectedRecord?.date || selectedRecord?.invoiceDate], ['Invoice', selectedRecord?.invoice], ['Battery Type', selectedRecord && batteryTypeFor(selectedRecord)], ['Brand', selectedRecord?.brand], ['Model', selectedRecord?.model], ['Serial Number', selectedRecord?.serialNumber], ['Weight', selectedRecord ? `${formatNumber(weightFor(selectedRecord))} Kg` : ''], ['Vehicle', selectedRecord?.vehicleNumber || selectedRecord?.vehicleName]].map(([label, value]) => <div className={label === 'Address' ? 'col-12' : 'col-md-6'} key={label}><small className="text-muted d-block">{label}</small><strong>{value || '—'}</strong></div>)}
          </div></div>
          <div className="modal-footer"><button className="btn btn-outline-secondary" onClick={() => selectedRecord && printRecord(selectedRecord)}><i className="fa-solid fa-print me-2"></i>Print</button><button type="button" className="btn btn-primary" data-bs-dismiss="modal">Close</button></div>
        </div></div>
      </div>
    </>
  )
}

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
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#26344b;margin:0;background:#eef1f6}
      .sheet{max-width:820px;margin:0 auto;background:#fff;border:1.5px solid #1b2440;padding:32px 34px}
      .header{display:flex;align-items:center;gap:18px;padding-bottom:16px;margin-bottom:22px}
      .logo{width:70px;height:70px;object-fit:contain}
      .brand h1{margin:0;font-size:26px;letter-spacing:.5px}
      .brand h1 .kw{color:#1c3d8f}
      .brand h1 .bw{color:#cf1f2c}
      .brand .tagline{margin:2px 0 0;font-size:11px;letter-spacing:1px;color:#5a6780;text-transform:uppercase}
      .brand .tagline::before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#cf1f2c;margin-right:6px;vertical-align:middle}
      .contact{margin-left:auto;text-align:right;font-size:11px;color:#5a6780;line-height:1.6}
      .divider{height:3px;background:linear-gradient(90deg,#1c3d8f,#cf1f2c);margin-bottom:22px}
      .billrow{display:flex;justify-content:space-between;gap:24px;margin-bottom:22px}
      .billrow .block h4{margin:0 0 8px;font-size:12px;letter-spacing:.5px;color:#1b2440;text-transform:uppercase;font-weight:800}
      .billrow .block p{margin:3px 0;font-size:13px}
      .billrow .block p span{display:inline-block;min-width:110px;color:#7a879c;font-size:11px;text-transform:uppercase;letter-spacing:.3px}
      .billrow .right{text-align:right}
      .billrow .right p span{min-width:0;margin-left:8px}
      table.items{width:100%;border-collapse:collapse;margin-bottom:22px}
      table.items thead th{background:#1b2440;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.4px;padding:10px 12px;text-align:left}
      table.items thead th.num{text-align:right}
      table.items tbody td{padding:11px 12px;font-size:13px;border-bottom:1px solid #e7ebf2}
      table.items tbody td.num{text-align:right}
      .totalswrap{display:flex;justify-content:flex-end;margin-bottom:24px}
      .totals{width:290px;border:1.5px solid #1b2440}
      .totals .row{display:flex;justify-content:space-between;padding:9px 14px;font-size:13px;border-bottom:1px solid #e7ebf2}
      .totals .row.grand{background:#1b2440;color:#fff;font-weight:800;font-size:15px;border-bottom:none}
      .totals .row .status{font-weight:800;color:${due > 0 ? '#b45309' : '#168447'}}
      .section h3{font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:#1b2440;font-weight:800;border-left:4px solid #cf1f2c;padding:6px 10px;margin:0 0 10px}
      table.payment{width:100%;border-collapse:collapse;margin-top:6px}
      table.payment th,table.payment td{border:1px solid #e7ebf2;padding:8px 11px;font-size:12px;text-align:left}
      table.payment td.num{text-align:right}
      .footer{margin-top:26px;padding-top:12px;border-top:1px solid #e7ebf2;color:#7a879c;font-size:11px;text-align:center}
      @media print{body{background:#fff;padding:0}.sheet{border:none;max-width:none}.no-print{display:none}}
    </style></head><body>
      <div class="sheet">
        <header class="header">
          <img class="logo" src="${logoUrl}" alt="${escapeHtml(SHOP.name)}">
          <div class="brand">
            <h1><span class="kw">KALYANKAR</span> <span class="bw">BATTERIES</span></h1>
            <p class="tagline">${escapeHtml(SHOP.tagline)}</p>
          </div>
          <div class="contact">
            <p>${escapeHtml(SHOP.address)}</p>
            <p><strong>Contact:</strong> ${escapeHtml(SHOP.phone)} &nbsp; <strong>Email:</strong> ${escapeHtml(SHOP.email)}</p>
            <p><strong>GSTIN:</strong> ${escapeHtml(SHOP.gstin)}</p>
          </div>
        </header>
        <div class="divider"></div>

        <div class="billrow">
          <div class="block">
            <h4>Bill To</h4>
            <p><span>Customer Name</span>${escapeHtml(record.customer || '—')}</p>
            <p><span>Address</span>${escapeHtml(record.address || '—')}</p>
            <p><span>Contact No</span>${escapeHtml(record.phone || '—')}</p>
            <p><span>Customer GSTIN</span>${escapeHtml(record.gstNumber || '—')}</p>
          </div>
          <div class="block right">
            <h4>Record Info</h4>
            <p><strong>Invoice No:</strong> <span>${escapeHtml(record.invoice || '—')}</span></p>
            <p><strong>Date:</strong> <span>${escapeHtml(record.date || record.invoiceDate || '—')}</span></p>
            <p><strong>Vehicle Name:</strong> <span>${escapeHtml(record.vehicleName || '—')}</span></p>
            <p><strong>Vehicle No:</strong> <span>${escapeHtml(record.vehicleNumber || '—')}</span></p>
          </div>
        </div>

        <table class="items">
          <thead><tr><th>Sr.No</th><th>Battery Type</th><th>Brand</th><th>Model</th><th>Serial No</th><th class="num">Weight (Kg)</th></tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${escapeHtml(batteryTypeFor(record) || '—')}</td>
              <td>${escapeHtml(record.brand || '—')}</td>
              <td>${escapeHtml(record.model || '—')}</td>
              <td>${escapeHtml(record.serialNumber || '—')}</td>
              <td class="num">${formatNumber(weightFor(record))}</td>
            </tr>
          </tbody>
        </table>

        <div class="totalswrap">
          <div class="totals">
            <div class="row"><span>Total Amount</span><span>&#8377; ${formatNumber(total)}</span></div>
            <div class="row"><span>Payment Method</span><span>${escapeHtml(record.paymentMethod || '—')}</span></div>
            <div class="row"><span>Paid Amount</span><span>&#8377; ${formatNumber(paid)}</span></div>
            <div class="row"><span>Due Amount</span><span>&#8377; ${formatNumber(due)}</span></div>
            <div class="row"><span>Status</span><span class="status">${escapeHtml(record.status || (due > 0 ? 'Due' : 'Paid'))}</span></div>
            <div class="row grand"><span>Grand Total</span><span>&#8377; ${formatNumber(total)}</span></div>
          </div>
        </div>

        ${record.notes ? `<div class="section"><h3>Notes</h3><p style="font-size:13px;margin:0">${escapeHtml(record.notes)}</p></div>` : ''}

        ${paymentHistory.length ? `<div class="section"><h3>Payment History</h3><table class="payment"><thead><tr><th>Date</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>${paymentHistory.map((entry) => `<tr><td>${escapeHtml(entry.date || '—')}</td><td>${escapeHtml(entry.method || '—')}</td><td class="num">&#8377; ${formatNumber(entry.amount)}</td></tr>`).join('')}</tbody></table></div>` : ''}

        <div class="footer">This is a system-generated report from ${escapeHtml(SHOP.name)} &bull; Printed on ${new Date().toLocaleDateString('en-IN')}</div>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
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
import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const PURCHASE_STORAGE_KEY = 'purchaseStockHistory'

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function formatCurrency(value) {
  return 'Rs. ' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function paidPurchase(row) {
  return (row.ledger || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

function recordDate(row) {
  return String(row.invoiceDate || row.date || '').slice(0, 10)
}

function inDateRange(row, fromDate, toDate) {
  const date = recordDate(row)
  if (fromDate && date < fromDate) return false
  if (toDate && date > toDate) return false
  return true
}

export default function Reports() {
  const [reportType, setReportType] = useState('overview')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    setSales(readStorage(SALES_STORAGE_KEY))
    setPurchases(readStorage(PURCHASE_STORAGE_KEY))
  }, [])

  const filteredSales = useMemo(
    () => sales.filter((sale) => inDateRange(sale, fromDate, toDate)),
    [sales, fromDate, toDate],
  )

  const filteredPurchases = useMemo(
    () => purchases.filter((row) => inDateRange(row, fromDate, toDate)),
    [purchases, fromDate, toDate],
  )

  const brandRows = useMemo(() => {
    const map = {}
    filteredSales.forEach((sale) => {
      const brand = sale.brand || 'Unknown'
      map[brand] = map[brand] || { brand, units: 0, revenue: 0, due: 0 }
      map[brand].units += Number(sale.qty || 1)
      map[brand].revenue += Number(sale.amount || 0)
      map[brand].due += Number(sale.dueAmount || 0)
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  const modelRows = useMemo(() => {
    const map = {}
    filteredSales.forEach((sale) => {
      const model = sale.model || sale.product || 'Unknown'
      const brand = sale.brand || '-'
      const key = `${brand}|${model}`
      map[key] = map[key] || { brand, model, units: 0, revenue: 0 }
      map[key].units += Number(sale.qty || 1)
      map[key].revenue += Number(sale.amount || 0)
    })
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 10)
  }, [filteredSales])

  const purchaseDueRows = filteredPurchases
    .map((row) => ({ ...row, paid: paidPurchase(row), due: Math.max(Number(row.grandTotal || 0) - paidPurchase(row), 0) }))
    .filter((row) => row.due > 0)

  const salesDueRows = filteredSales.filter((sale) => Number(sale.dueAmount || 0) > 0)

  const summary = useMemo(() => {
    const salesAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
    const salesDue = filteredSales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0)
    const purchaseAmount = filteredPurchases.reduce((sum, row) => sum + Number(row.grandTotal || 0), 0)
    const purchaseDue = filteredPurchases.reduce((sum, row) => sum + Math.max(Number(row.grandTotal || 0) - paidPurchase(row), 0), 0)
    const unitsSold = filteredSales.reduce((sum, sale) => sum + Number(sale.qty || 1), 0)

    return {
      salesAmount,
      salesDue,
      purchaseAmount,
      purchaseDue,
      unitsSold,
      invoiceCount: filteredSales.length,
      purchaseCount: filteredPurchases.length,
      averageBill: filteredSales.length ? salesAmount / filteredSales.length : 0,
    }
  }, [filteredSales, filteredPurchases])

  const brandChartRef = useChart({
    type: 'doughnut',
    data: {
      labels: brandRows.length ? brandRows.map((row) => row.brand) : ['No sales'],
      datasets: [{
        data: brandRows.length ? brandRows.map((row) => row.revenue) : [1],
        backgroundColor: ['#00AEEF', '#16a34a', '#f97316', '#ED1C24', '#7c3aed', '#172033'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${brandRows.length ? formatCurrency(ctx.parsed) : 'No sales'}` } },
      },
    },
  })

  const moneyChartRef = useChart({
    type: 'bar',
    data: {
      labels: ['Sales', 'Purchase', 'Sales Due', 'Purchase Due'],
      datasets: [{
        data: [summary.salesAmount, summary.purchaseAmount, summary.salesDue, summary.purchaseDue],
        backgroundColor: ['#00AEEF', '#172033', '#ED1C24', '#f97316'],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => 'Rs. ' + Number(value).toLocaleString('en-IN') } },
      },
    },
  })

  const showSales = reportType === 'overview' || reportType === 'sales'
  const showPurchase = reportType === 'overview' || reportType === 'purchase'
  const showDue = reportType === 'overview' || reportType === 'dues'

  return (
    <>
      <Topbar title="Reports" subtitle="Sales, purchase, due, and brand performance" />

      <div className="card-box mb-4 report-filter">
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label mb-1 small">Report Type</label>
            <select className="form-select form-select-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="overview">Full Overview</option>
              <option value="sales">Sales Only</option>
              <option value="purchase">Purchase Only</option>
              <option value="dues">Dues Only</option>
            </select>
          </div>
          <div>
            <label className="form-label mb-1 small">From</label>
            <input type="date" className="form-control form-control-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label mb-1 small">To</label>
            <input type="date" className="form-control form-control-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => { setFromDate(''); setToDate(''); }}>
            <i className="fa-solid fa-rotate-left me-1"></i>Reset
          </button>
          <button className="btn btn-primary btn-sm ms-auto" onClick={() => window.print()}>
            <i className="fa-solid fa-print me-1"></i>Print Report
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Total Sales</small><h4>{formatCurrency(summary.salesAmount)}</h4><span className="stat-change stat-muted">{summary.invoiceCount} invoices</span></div><div className="stat-icon icon-blue"><i className="fa-solid fa-indian-rupee-sign"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Units Sold</small><h4>{summary.unitsSold}</h4><span className="stat-change stat-muted">Battery quantity</span></div><div className="stat-icon icon-green"><i className="fa-solid fa-car-battery"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Purchase Amount</small><h4>{formatCurrency(summary.purchaseAmount)}</h4><span className="stat-change stat-muted">{summary.purchaseCount} entries</span></div><div className="stat-icon icon-navy"><i className="fa-solid fa-truck-ramp-box"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Total Outstanding</small><h4 className="text-danger">{formatCurrency(summary.salesDue + summary.purchaseDue)}</h4><span className="stat-change down">Customer + purchase dues</span></div><div className="stat-icon icon-red"><i className="fa-solid fa-wallet"></i></div></div></div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card-box">
            <div className="section-title">Money Report</div>
            <div className="chart-wrap"><canvas ref={moneyChartRef}></canvas></div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card-box">
            <div className="section-title">Sales By Brand</div>
            <div className="chart-wrap"><canvas ref={brandChartRef}></canvas></div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {showSales && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Top Selling Models</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Brand</th><th>Model</th><th>Units</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {modelRows.map((row) => (
                      <tr key={`${row.brand}-${row.model}`}>
                        <td>{row.brand}</td><td>{row.model}</td><td>{row.units}</td><td>{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                    {!modelRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No sales found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showSales && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Brand Performance</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Brand</th><th>Units</th><th>Revenue</th><th>Due</th></tr></thead>
                  <tbody>
                    {brandRows.map((row) => (
                      <tr key={row.brand}><td>{row.brand}</td><td>{row.units}</td><td>{formatCurrency(row.revenue)}</td><td>{formatCurrency(row.due)}</td></tr>
                    ))}
                    {!brandRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No brand sales found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showDue && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Customer Due Report</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Due</th></tr></thead>
                  <tbody>
                    {salesDueRows.map((sale) => (
                      <tr key={sale.id || sale.invoice}><td>{sale.date || sale.invoiceDate}</td><td>{sale.invoice}</td><td>{sale.customer}</td><td><span className="payment-amount">{formatCurrency(sale.dueAmount)}</span></td></tr>
                    ))}
                    {!salesDueRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No customer dues found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showPurchase && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Purchase Due Report</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Date</th><th>Company</th><th>Total</th><th>Due</th></tr></thead>
                  <tbody>
                    {purchaseDueRows.map((row) => (
                      <tr key={row.id}><td>{row.date}</td><td>{row.company}</td><td>{formatCurrency(row.grandTotal)}</td><td><span className="payment-amount">{formatCurrency(row.due)}</span></td></tr>
                    ))}
                    {!purchaseDueRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No purchase dues found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

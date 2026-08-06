import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'
import { useLanguage } from '../language.jsx'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const PURCHASE_STORAGE_KEY = 'purchaseStockHistory'
const DUE_EPSILON = 0.005

function formatCurrency(value) {
  return 'Rs. ' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function purchasePaid(row) {
  return (row.ledger || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

export default function Dashboard() {
  const { t } = useLanguage()
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [duePaymentTarget, setDuePaymentTarget] = useState(null)
  const [duePayment, setDuePayment] = useState({ amount: '', date: todayKey(), method: 'Cash', note: '' })

  useEffect(() => {
    setSales(readStorage(SALES_STORAGE_KEY))
    setPurchases(readStorage(PURCHASE_STORAGE_KEY))
  }, [])

  const summary = useMemo(() => {
    const today = todayKey()
    const todaySales = sales.filter((sale) => (sale.invoiceDate || sale.date || '').slice(0, 10) === today)
    const totalSalesAmount = sales.reduce((sum, sale) => sum + Number(sale.amount || sale.grandTotal || 0), 0)
    const todaySalesAmount = todaySales.reduce((sum, sale) => sum + Number(sale.amount || sale.grandTotal || 0), 0)
    const salesDue = sales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0)
    const purchaseTotal = purchases.reduce((sum, row) => sum + Number(row.grandTotal || 0), 0)
    const purchaseDue = purchases.reduce((sum, row) => sum + Math.max(Number(row.grandTotal || 0) - purchasePaid(row), 0), 0)
    const purchasePaidTotal = purchases.reduce((sum, row) => sum + purchasePaid(row), 0)
    const moneyPosition = (totalSalesAmount - salesDue) - purchasePaidTotal

    return {
      todaySalesCount: todaySales.length,
      todaySalesAmount,
      totalSalesAmount,
      salesDue,
      purchaseTotal,
      purchaseDue,
      purchasePaidTotal,
      moneyPosition,
      purchaseCount: purchases.length,
      dueCustomers: sales.filter((sale) => Number(sale.dueAmount || 0) > DUE_EPSILON).length,
      dueVendors: purchases.filter((row) => Math.max(Number(row.grandTotal || 0) - purchasePaid(row), 0) > DUE_EPSILON).length,
    }
  }, [sales, purchases])

  const recentSales = sales.slice(0, 5)
  const dueSales = sales.filter((sale) => Number(sale.dueAmount || 0) > DUE_EPSILON).slice(0, 5)
  const duePurchases = purchases
    .map((row) => ({ ...row, due: Math.max(Number(row.grandTotal || 0) - purchasePaid(row), 0) }))
    .filter((row) => row.due > DUE_EPSILON)
    .slice(0, 5)

  function openDuePayment(type, record) {
    setDuePaymentTarget({ type, record })
    setDuePayment({ amount: '', date: todayKey(), method: 'Cash', note: '' })
  }

  function saveDuePayment(event) {
    event.preventDefault()
    if (!duePaymentTarget) return
    const amount = Number(duePayment.amount || 0)
    const currentDue = duePaymentTarget.type === 'sale'
      ? Number(duePaymentTarget.record.dueAmount || 0)
      : Number(duePaymentTarget.record.due || 0)
    if (amount <= 0) return alert('Please enter a valid payment amount.')
    if (amount > currentDue + DUE_EPSILON) return alert('Payment cannot be greater than the pending due amount.')

    if (duePaymentTarget.type === 'sale') {
      const target = duePaymentTarget.record
      const nextSales = sales.map((sale) => {
        const isTarget = target.id != null
          ? String(sale.id) === String(target.id)
          : String(sale.invoice || '') === String(target.invoice || '')
        if (!isTarget) return sale
        const paidAmount = Number(sale.paidAmount ?? (Number(sale.amount || 0) - Number(sale.dueAmount || 0))) + amount
        const remainingDue = Math.max(0, Number(sale.dueAmount || 0) - amount)
        const dueAmount = remainingDue <= DUE_EPSILON ? 0 : remainingDue
        return { ...sale, paidAmount, dueAmount, status: dueAmount > DUE_EPSILON ? 'Due' : 'Paid', paymentMethod: duePayment.method,
          paymentHistory: [...(sale.paymentHistory || []), { amount, date: duePayment.date, method: duePayment.method, note: duePayment.note || 'Dashboard due payment' }] }
      })
      setSales(nextSales)
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales))
    } else {
      const target = duePaymentTarget.record
      const nextPurchases = purchases.map((row) => String(row.id) === String(target.id) ? { ...row, ledger: [...(row.ledger || []), {
        id: Date.now(), date: duePayment.date, amount, method: duePayment.method, note: duePayment.note || 'Dashboard due payment',
      }] } : row)
      setPurchases(nextPurchases)
      localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(nextPurchases))
    }

    const modalElement = document.getElementById('dashboardDuePaymentModal')
    if (modalElement && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    setDuePaymentTarget(null)
  }

  const cashChartRef = useChart({
    type: 'bar',
    data: {
      labels: ['Sales Received', 'Purchase Paid', 'Sales Due', 'Purchase Due'],
      datasets: [{
        label: 'Amount (Rs.)',
        data: [Math.max(summary.totalSalesAmount - summary.salesDue, 0), summary.purchasePaidTotal, summary.salesDue, summary.purchaseDue],
        backgroundColor: ['#1769e8', '#16a34a', '#ED1C24', '#f97316'],
        borderRadius: 7,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { beginAtZero: true, ticks: { callback: (value) => `Rs. ${Number(value).toLocaleString('en-IN')}` } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } },
      },
    },
  })

  const statCards = [
    { label: "Today's Sales", value: formatCurrency(summary.todaySalesAmount), note: `${summary.todaySalesCount} ${t('invoices today')}`, icon: 'fa-indian-rupee-sign', iconClass: 'icon-blue' },
    { label: 'Sales Due', value: formatCurrency(summary.salesDue), note: `${summary.dueCustomers} ${t('customers pending')}`, icon: 'fa-user-clock', iconClass: 'icon-red', valueClass: 'text-danger' },
    { label: 'Purchase Total', value: formatCurrency(summary.purchaseTotal), note: `${summary.purchaseCount} ${t('purchase entries')}`, icon: 'fa-truck-ramp-box', iconClass: 'icon-green' },
    { label: 'Purchase Due', value: formatCurrency(summary.purchaseDue), note: `${summary.dueVendors} ${t('vendors pending')}`, icon: 'fa-file-invoice-dollar', iconClass: 'icon-orange', valueClass: 'text-warning' },
  ]

  return (
    <>
      <Topbar title="Dashboard" subtitle="Daily battery shop overview" />

      <div className="row g-3 mb-4">
        {statCards.map((card) => (
          <div className="col-md-6 col-xl-3" key={card.label}>
            <div className="card-box stat-card">
              <div>
                <small>{t(card.label)}</small>
                <h4 className={card.valueClass}>{card.value}</h4>
                <span className="stat-change stat-muted">{card.note}</span>
              </div>
              <div className={`stat-icon ${card.iconClass}`}><i className={`fa-solid ${card.icon}`}></i></div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">{t('Money Position')}</div>
            <div className="donut-wrap">
              <canvas ref={cashChartRef}></canvas>
            </div>
            <div className="donut-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#1769e8' }}></span>{t('Sales Received')} - {formatCurrency(Math.max(summary.totalSalesAmount - summary.salesDue, 0))}</div>
              <div className="legend-item"><span className="legend-dot legend-green"></span>{t('Purchase Paid')} - {formatCurrency(summary.purchasePaidTotal)}</div>
              <div className="legend-item"><span className="legend-dot legend-red"></span>{t('Sales Due')} - {formatCurrency(summary.salesDue)}</div>
              <div className="legend-item"><span className="legend-dot legend-orange"></span>{t('Purchase Due')} - {formatCurrency(summary.purchaseDue)}</div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">{t('Pending Customer Payments')} <Link to="/sales">{t('Open Sales')}</Link></div>
            {dueSales.length ? dueSales.map((sale) => (
              <div className="payment-item" key={sale.id || sale.invoice}>
                <div>
                  <strong>{sale.customer || t('Customer')}</strong><br />
                  <small className="text-muted">{sale.invoice} | {sale.date || sale.invoiceDate}</small>
                </div>
                <div className="text-end"><span className="payment-amount d-block mb-1">{formatCurrency(sale.dueAmount)}</span><button type="button" className="btn btn-success btn-sm" data-bs-toggle="modal" data-bs-target="#dashboardDuePaymentModal" onClick={() => openDuePayment('sale', sale)}><i className="fa-solid fa-money-bill-wave me-1"></i>{t('Pay Due')}</button></div>
              </div>
            )) : <p className="text-muted mb-0">{t('No customer dues recorded.')}</p>}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">{t('Pending Purchase Dues')} <Link to="/purchase-stock">{t('Open Purchase')}</Link></div>
            {duePurchases.length ? duePurchases.map((row) => (
              <div className="payment-item" key={row.id}>
                <div>
                  <strong>{row.company || t('Company')}</strong><br />
                  <small className="text-muted">{row.date} | {row.items?.length || 0} {t('models')}</small>
                </div>
                <div className="text-end"><span className="payment-amount d-block mb-1">{formatCurrency(row.due)}</span><button type="button" className="btn btn-success btn-sm" data-bs-toggle="modal" data-bs-target="#dashboardDuePaymentModal" onClick={() => openDuePayment('purchase', row)}><i className="fa-solid fa-money-bill-wave me-1"></i>{t('Pay Due')}</button></div>
              </div>
            )) : <p className="text-muted mb-0">{t('No purchase dues recorded.')}</p>}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card-box">
            <div className="section-title">{t('Recent Sales')} <Link to="/sales">{t('View All')}</Link></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr><th>{t('Invoice')}</th><th>{t('Customer')}</th><th>{t('Battery')}</th><th>{t('Amount')}</th><th>{t('Status')}</th></tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id || sale.invoice}>
                      <td>{sale.invoice}</td>
                      <td>{sale.customer || '-'}</td>
                      <td>{sale.brand || '-'} {sale.model || ''}</td>
                      <td>{formatCurrency(sale.amount)}</td>
                      <td><span className={Number(sale.dueAmount || 0) > 0 ? 'badge-due' : 'badge-paid'}>{Number(sale.dueAmount || 0) > 0 ? t('Due') : t('Paid')}</span></td>
                    </tr>
                  ))}
                  {!recentSales.length && <tr><td colSpan="5" className="text-center text-muted py-4">{t('No sales saved yet.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">{t('Quick Actions')}</div>
            <div className="quick-actions">
              <Link to="/stock" className="quick-btn"><i className="fa-solid fa-boxes-stacked"></i> {t('Product Stock')}</Link>
              <Link to="/purchase-stock" className="quick-btn"><i className="fa-solid fa-truck-ramp-box"></i> {t('Add Purchase')}</Link>
              <Link to="/sales" className="quick-btn"><i className="fa-solid fa-cart-plus"></i> {t('New Sale')}</Link>
              <Link to="/scrap-stock" className="quick-btn"><i className="fa-solid fa-recycle"></i> {t('Scrap Stock')}</Link>
              <Link to="/reports" className="quick-btn"><i className="fa-solid fa-chart-line"></i> {t('Reports')}</Link>
              <Link to="/settings" className="quick-btn"><i className="fa-solid fa-gear"></i> {t('Settings')}</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="dashboardDuePaymentModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 rounded-4">
            <form onSubmit={saveDuePayment}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-money-bill-wave text-success me-2"></i>Pay Due</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {duePaymentTarget && <div className="alert alert-light border">
                  <strong>{duePaymentTarget.type === 'sale' ? duePaymentTarget.record.customer : duePaymentTarget.record.company}</strong><br />
                  <small>{duePaymentTarget.type === 'sale' ? `Invoice: ${duePaymentTarget.record.invoice}` : `Purchase: ${duePaymentTarget.record.invoice || duePaymentTarget.record.date}`} · Due: {formatCurrency(duePaymentTarget.type === 'sale' ? duePaymentTarget.record.dueAmount : duePaymentTarget.record.due)}</small>
                </div>}
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Payment Amount *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={duePayment.amount} onChange={(e) => setDuePayment({ ...duePayment, amount: e.target.value })} /></div>
                  <div className="col-md-6"><label className="form-label">Payment Date *</label><input type="date" className="form-control" required value={duePayment.date} onChange={(e) => setDuePayment({ ...duePayment, date: e.target.value })} /></div>
                  <div className="col-md-6"><label className="form-label">Payment Method *</label><select className="form-select" required value={duePayment.method} onChange={(e) => setDuePayment({ ...duePayment, method: e.target.value })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option></select></div>
                  <div className="col-12"><label className="form-label">Note</label><input className="form-control" placeholder="Optional payment note" value={duePayment.note} onChange={(e) => setDuePayment({ ...duePayment, note: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-success"><i className="fa-solid fa-check me-2"></i>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

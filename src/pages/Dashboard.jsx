import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'
import { useLanguage } from '../language.jsx'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const PURCHASE_STORAGE_KEY = 'purchaseStockHistory'

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

    return {
      todaySalesCount: todaySales.length,
      todaySalesAmount,
      totalSalesAmount,
      salesDue,
      purchaseTotal,
      purchaseDue,
      purchasePaidTotal,
      purchaseCount: purchases.length,
      dueCustomers: sales.filter((sale) => Number(sale.dueAmount || 0) > 0).length,
      dueVendors: purchases.filter((row) => Math.max(Number(row.grandTotal || 0) - purchasePaid(row), 0) > 0).length,
    }
  }, [sales, purchases])

  const recentSales = sales.slice(0, 5)
  const dueSales = sales.filter((sale) => Number(sale.dueAmount || 0) > 0).slice(0, 5)
  const duePurchases = purchases
    .map((row) => ({ ...row, due: Math.max(Number(row.grandTotal || 0) - purchasePaid(row), 0) }))
    .filter((row) => row.due > 0)
    .slice(0, 5)

  const cashChartRef = useChart({
    type: 'doughnut',
    data: {
      labels: ['Sales Due', 'Purchase Paid', 'Purchase Due'],
      datasets: [{
        data: [summary.salesDue, summary.purchasePaidTotal, summary.purchaseDue],
        backgroundColor: ['#ED1C24', '#16a34a', '#f97316'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
      },
    },
  })

  const statCards = [
    { label: "Today's Sales", value: formatCurrency(summary.todaySalesAmount), note: `${summary.todaySalesCount} ${t('invoices today')}`, icon: 'fa-indian-rupee-sign', iconClass: 'icon-blue' },
    { label: 'Sales Due', value: formatCurrency(summary.salesDue), note: `${summary.dueCustomers} ${t('customers pending')}`, icon: 'fa-user-clock', iconClass: 'icon-red', valueClass: 'text-danger' },
    { label: 'Purchase Total', value: formatCurrency(summary.purchaseTotal), note: `${summary.purchaseCount} ${t('purchase entries')}`, icon: 'fa-truck-ramp-box', iconClass: 'icon-navy' },
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
              <div className="legend-item"><span className="legend-dot legend-red"></span>{t('Sales Due')} - {formatCurrency(summary.salesDue)}</div>
              <div className="legend-item"><span className="legend-dot legend-green"></span>{t('Purchase Paid')} - {formatCurrency(summary.purchasePaidTotal)}</div>
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
                <span className="payment-amount">{formatCurrency(sale.dueAmount)}</span>
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
                <span className="payment-amount">{formatCurrency(row.due)}</span>
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
    </>
  )
}

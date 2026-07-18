import { useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'

const topSellingProducts = [
  { product: 'Amaron 45Ah', sold: 28, revenue: '₹ 1,82,000' },
  { product: 'Exide 65Ah', sold: 22, revenue: '₹ 1,80,400' },
  { product: 'Tata Green 50Ah', sold: 18, revenue: '₹ 1,33,200' },
  { product: 'Power Zone 35Ah', sold: 15, revenue: '₹ 97,500' },
]

const lowStockReport = [
  { product: 'Exide 45Ah', brand: 'Exide', stock: 2, status: 'Low Stock' },
  { product: 'Amaron 65Ah', brand: 'Amaron', stock: 1, status: 'Out of Stock' },
  { product: 'Power Zone 35Ah', brand: 'Power Zone', stock: 3, status: 'Low Stock' },
  { product: 'Tata Green 50Ah', brand: 'Tata Green', stock: 0, status: 'Out of Stock' },
]

export default function Reports() {
  const [reportType, setReportType] = useState('sales')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const revenueChartRef = useChart({
    type: 'line',
    data: {
      labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Revenue (₹)',
        data: [385000, 412000, 398000, 465000, 501000, 542300],
        borderColor: '#2f6fed',
        backgroundColor: 'rgba(47,111,237,0.1)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  })

  const brandChartRef = useChart({
    type: 'doughnut',
    data: {
      labels: ['Amaron', 'Exide', 'Tata Green', 'Power Zone'],
      datasets: [{
        data: [182000, 180400, 133200, 97500],
        backgroundColor: ['#2f6fed', '#16a34a', '#f59e0b', '#ef4444'],
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  })

  function handleApplyFilter() {
    alert(`Showing "${reportType}" report${fromDate ? ' from ' + fromDate : ''}${toDate ? ' to ' + toDate : ''}.`)
  }

  return (
    <>
      <Topbar title="Reports" subtitle="Business performance at a glance" />

      {/* Filter Bar */}
      <div className="card-box mb-4">
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label mb-1 small">Report Type</label>
            <select className="form-select form-select-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="sales">Sales Report</option>
              <option value="stock">Stock Report</option>
              <option value="lowstock">Low Stock Report</option>
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
          <div>
            <button className="btn btn-primary btn-sm" onClick={handleApplyFilter}><i className="fa-solid fa-filter me-1"></i>Apply</button>
          </div>
          <div className="ms-auto">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}><i className="fa-solid fa-print me-1"></i>Print / Export</button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Total Revenue</small><h4>₹ 5,42,300</h4><span className="stat-change up"><i className="fa-solid fa-arrow-up"></i> 9.8% vs last month</span></div>
            <div className="stat-icon icon-blue"><i className="fa-solid fa-indian-rupee-sign"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Units Sold</small><h4>312</h4><span className="stat-change up"><i className="fa-solid fa-arrow-up"></i> 6.2% vs last month</span></div>
            <div className="stat-icon icon-navy"><i className="fa-solid fa-car-battery"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Avg. Order Value</small><h4>₹ 1,738</h4><span className="stat-change stat-muted">Per invoice</span></div>
            <div className="stat-icon icon-green"><i className="fa-solid fa-receipt"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div><small>Outstanding Dues</small><h4 className="text-danger">₹ 26,350</h4><span className="stat-change down">From 18 customers</span></div>
            <div className="stat-icon icon-red"><i className="fa-solid fa-wallet"></i></div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card-box">
            <div className="section-title">Revenue Trend (Last 6 Months)</div>
            <div className="chart-wrap"><canvas ref={revenueChartRef}></canvas></div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card-box">
            <div className="section-title">Sales by Brand</div>
            <div className="chart-wrap"><canvas ref={brandChartRef}></canvas></div>
          </div>
        </div>
      </div>

      {/* Report Tables */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card-box">
            <div className="section-title">Top Selling Products</div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topSellingProducts.map((p) => (
                    <tr key={p.product}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                          {p.product}
                        </div>
                      </td>
                      <td>{p.sold}</td>
                      <td>{p.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card-box">
            <div className="section-title">Low Stock Report</div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Product</th><th>Brand</th><th>Stock</th><th>Status</th></tr></thead>
                <tbody>
                  {lowStockReport.map((p) => (
                    <tr key={p.product}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                          {p.product}
                        </div>
                      </td>
                      <td>{p.brand}</td>
                      <td className="stock-danger">{p.stock}</td>
                      <td><span className={p.status === 'Out of Stock' ? 'badge-out-stock' : 'badge-low-stock'}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

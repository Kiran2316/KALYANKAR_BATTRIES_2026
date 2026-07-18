import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'

const statCards = [
  { label: "Today's Sales", value: '₹ 18,750', change: '12.5% vs yesterday', changeType: 'up', icon: 'fa-indian-rupee-sign', iconClass: 'icon-blue' },
  { label: 'Total Products', value: '86', change: 'Total in Inventory', changeType: 'muted', icon: 'fa-battery-full', iconClass: 'icon-navy' },
  { label: 'Low Stock', value: '12', valueClass: 'text-warning', change: 'Products low in stock', changeType: 'orange', icon: 'fa-triangle-exclamation', iconClass: 'icon-orange' },
  { label: "Today's Orders", value: '15', change: '7.1% vs yesterday', changeType: 'up', icon: 'fa-receipt', iconClass: 'icon-green' },
  { label: 'Total Customers', value: '248', change: 'All registered customers', changeType: 'muted', icon: 'fa-users', iconClass: 'icon-blue' },
  { label: 'Pending Payments', value: '₹ 26,350', valueClass: 'text-danger', change: 'From 18 customers', changeType: 'down', icon: 'fa-wallet', iconClass: 'icon-red' },
]

const recentSales = [
  { inv: 'INV-2024-0192', meta: 'Rahul Patil · 10:32 AM', status: 'Paid' },
  { inv: 'INV-2024-0191', meta: 'Sachin Jadhav · 09:15 AM', status: 'Paid' },
  { inv: 'INV-2024-0190', meta: 'Amit Shinde · Yesterday', status: 'Due' },
  { inv: 'INV-2024-0189', meta: 'Priya Kulkarni · Yesterday', status: 'Paid' },
  { inv: 'INV-2024-0188', meta: 'Vikram Desai · 17 May', status: 'Paid' },
]

const lowStockItems = [
  { product: 'Exide 45Ah', brand: 'Exide', stock: 2, status: 'Low Stock' },
  { product: 'Amaron 65Ah', brand: 'Amaron', stock: 1, status: 'Out of Stock' },
  { product: 'Power Zone 35Ah', brand: 'Power Zone', stock: 3, status: 'Low Stock' },
  { product: 'Tata Green 50Ah', brand: 'Tata Green', stock: 0, status: 'Out of Stock' },
]

const recentPurchases = [
  { bill: 'PUR-0045', supplier: 'Exide Distributor', amount: '₹ 42,000' },
  { bill: 'PUR-0044', supplier: 'Amaron Wholesale', amount: '₹ 38,500' },
  { bill: 'PUR-0043', supplier: 'Tata Green Agency', amount: '₹ 22,000' },
  { bill: 'PUR-0042', supplier: 'Power Zone Supply', amount: '₹ 15,800' },
]

const topSelling = [
  { product: 'Amaron 45Ah', sold: 28, amount: '₹ 1,82,000' },
  { product: 'Exide 65Ah', sold: 22, amount: '₹ 1,80,400' },
  { product: 'Tata Green 50Ah', sold: 18, amount: '₹ 1,33,200' },
  { product: 'Power Zone 35Ah', sold: 15, amount: '₹ 97,500' },
]

const pendingPayments = [
  { name: 'Sachin Jadhav', since: 'Due since 12 May 2024', amount: '₹ 8,200' },
  { name: 'Mahesh More', since: 'Due since 10 May 2024', amount: '₹ 6,500' },
  { name: 'Ravi Gaikwad', since: 'Due since 8 May 2024', amount: '₹ 5,400' },
  { name: 'Neha Patil', since: 'Due since 5 May 2024', amount: '₹ 6,250' },
]

function stockBadgeClass(status) {
  return status === 'Out of Stock' ? 'badge-out-stock' : 'badge-low-stock'
}

export default function Dashboard() {
  const salesChartRef = useChart({
    type: 'line',
    data: {
      labels: ['May 13', 'May 14', 'May 15', 'May 16', 'May 17', 'May 18', 'May 19'],
      datasets: [{
        label: 'Sales (₹)',
        data: [12400, 9800, 15200, 11300, 14600, 16800, 18750],
        borderColor: '#00AEEF',
        backgroundColor: 'rgba(0,174,239,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00AEEF',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ' ₹ ' + ctx.parsed.y.toLocaleString('en-IN') } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 11 }, color: '#94a3b8', callback: (v) => '₹' + v / 1000 + 'k' },
        },
      },
    },
  })

  const stockChartRef = useChart({
    type: 'doughnut',
    data: {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [{
        data: [58, 12, 16],
        backgroundColor: ['#16a34a', '#f97316', '#ED1C24'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + ctx.label + ': ' + ctx.parsed + ' (' + Math.round((ctx.parsed / 86) * 100) + '%)',
          },
        },
      },
    },
  })

  return (
    <>
      <Topbar title="Dashboard" subtitle="Welcome back, Admin!" />

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {statCards.map((c) => (
          <div className="col-md-6 col-xl-4 col-xxl-2" key={c.label}>
            <div className="card-box stat-card">
              <div>
                <small>{c.label}</small>
                <h4 className={c.valueClass}>{c.value}</h4>
                <span className={`stat-change ${c.changeType === 'up' ? 'up' : c.changeType === 'down' ? 'down' : c.changeType === 'orange' ? 'stat-orange' : 'stat-muted'}`}>
                  {c.changeType === 'up' && <i className="fa-solid fa-arrow-up"></i>} {c.change}
                </span>
              </div>
              <div className={`stat-icon ${c.iconClass}`}><i className={`fa-solid ${c.icon}`}></i></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card-box">
            <div className="section-title">Sales Overview</div>
            <div className="chart-wrap">
              <canvas ref={salesChartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="col-lg-3">
          <div className="card-box">
            <div className="section-title">Stock Status</div>
            <div className="donut-wrap">
              <canvas ref={stockChartRef}></canvas>
            </div>
            <div className="donut-legend">
              <div className="legend-item"><span className="legend-dot legend-green"></span>In Stock — 58 (67.4%)</div>
              <div className="legend-item"><span className="legend-dot legend-orange"></span>Low Stock — 12 (14.0%)</div>
              <div className="legend-item"><span className="legend-dot legend-red"></span>Out of Stock — 16 (18.6%)</div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Recent Sales <a href="#!">View All</a></div>
            {recentSales.map((s) => (
              <div className="sale-item" key={s.inv}>
                <div>
                  <div className="inv">{s.inv}</div>
                  <div className="meta">{s.meta}</div>
                </div>
                <span className={s.status === 'Paid' ? 'badge-paid' : 'badge-due'}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Low Stock Items <a href="#!">View All</a></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr><th>Product</th><th>Brand</th><th>Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {lowStockItems.map((it) => (
                    <tr key={it.product}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                          {it.product}
                        </div>
                      </td>
                      <td>{it.brand}</td>
                      <td className="stock-danger">{it.stock}</td>
                      <td><span className={stockBadgeClass(it.status)}>{it.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Recent Purchases <a href="#!">View All</a></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr><th>Bill No.</th><th>Supplier</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentPurchases.map((p) => (
                    <tr key={p.bill}>
                      <td>{p.bill}</td>
                      <td>{p.supplier}</td>
                      <td>{p.amount}</td>
                      <td><span className="badge-received">Received</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Top Selling Batteries <a href="#!">View All</a></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr><th>Product</th><th>Sold</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {topSelling.map((p) => (
                    <tr key={p.product}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                          {p.product}
                        </div>
                      </td>
                      <td>{p.sold}</td>
                      <td>{p.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Pending Payments <a href="#!">View All</a></div>
            {pendingPayments.map((p) => (
              <div className="payment-item" key={p.name}>
                <div>
                  <strong>{p.name}</strong><br />
                  <small className="text-muted">{p.since}</small>
                </div>
                <span className="payment-amount">{p.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Warranty Summary</div>
            <div className="warranty-grid">
              <div className="warranty-mini ok"><h5>64</h5><small>Active Warranties</small></div>
              <div className="warranty-mini warn"><h5>8</h5><small>Expiring Soon (30 Days)</small></div>
              <div className="warranty-mini danger"><h5>5</h5><small>Expired</small></div>
              <div className="warranty-mini"><h5>3</h5><small>Claims This Month</small></div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-box">
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions">
              <Link to="/sales" className="quick-btn"><i className="fa-solid fa-cart-plus"></i> New Sale</Link>
              <Link to="/products" className="quick-btn"><i className="fa-solid fa-plus"></i> Add Purchase</Link>
              <Link to="/inventory" className="quick-btn"><i className="fa-solid fa-boxes-stacked"></i> Adjust Stock</Link>
              <Link to="/reports" className="quick-btn"><i className="fa-solid fa-chart-line"></i> Sales Report</Link>
              <Link to="/reports" className="quick-btn"><i className="fa-solid fa-warehouse"></i> Stock Report</Link>
              <Link to="/settings" className="quick-btn"><i className="fa-solid fa-database"></i> Backup</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
import { NavLink } from 'react-router-dom'
import sidebarBrandLogo from '../assets/sidebar-brand-logo.png'
import sidebarFooterLogo from '../assets/sidebar-footer-logo.png'
import { useLanguage } from '../language.jsx'

const navItems = [
  { to: '/dashboard', icon: 'fa-gauge-high', label: 'Dashboard', end: true },
  { to: '/stock', icon: 'fa-boxes-stacked', label: 'Product Stock' },
  { to: '/purchase-stock', icon: 'fa-truck-ramp-box', label: 'Purchase Stock' },
  { to: '/sales', icon: 'fa-cart-shopping', label: 'Sales' },
  { to: '/quotation', icon: 'fa-file-lines', label: 'Quotation' },
  { to: '/scrap-stock', icon: 'fa-recycle', label: 'Scrap Stock' },
  { to: '/reports', icon: 'fa-chart-bar', label: 'Reports' },
  { to: '/settings', icon: 'fa-gear', label: 'Settings' },
]

export default function Sidebar() {
  const { t } = useLanguage()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <NavLink to="/dashboard">
          <img src={sidebarBrandLogo} alt="Kalyankar Batteries" />
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <i className={`fa-solid ${item.icon}`}></i> {t(item.label)}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <img src={sidebarFooterLogo} alt="Kalyankar Group of Business" />
      </div>
    </aside>
  )
}

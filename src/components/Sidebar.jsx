import { NavLink } from 'react-router-dom'
import logo from '../assets/mainlogo.png'
import { useLanguage } from '../language.jsx'

const navItems = [
  { to: '/', icon: 'fa-gauge-high', label: 'Dashboard', end: true },
  { to: '/stock', icon: 'fa-boxes-stacked', label: 'Product Stock' },
  { to: '/purchase-stock', icon: 'fa-truck-ramp-box', label: 'Purchase Stock' },
  { to: '/sales', icon: 'fa-cart-shopping', label: 'Sales' },
  { to: '/scrap-stock', icon: 'fa-recycle', label: 'Scrap Stock' },
  { to: '/inventory', icon: 'fa-warehouse', label: 'Inventory' },
  { to: '/reports', icon: 'fa-chart-bar', label: 'Reports' },
  { to: '/settings', icon: 'fa-gear', label: 'Settings' },
]

export default function Sidebar() {
  const { t } = useLanguage()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <NavLink to="/">
          <img src={logo} alt="Kalyankar Batteries" />
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
        <strong>{t('Kalyankar Batteries')}</strong>
        {t('Gargoti - Kolhapur main road, Gargoti 416209')}<br />
        {t('Near Swami samarth mangal karyalay')}<br />
        <i className="fa-solid fa-phone"></i> +91 9420007273
      </div>
    </aside>
  )
}

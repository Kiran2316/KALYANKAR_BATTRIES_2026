import { useLanguage } from '../language.jsx'

export default function Topbar({ title, subtitle }) {
  const { language, setLanguage, theme, setTheme, t } = useLanguage()
  const today = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="topbar">
      <div>
        <h4>{t(title)}</h4>
        <small className="text-muted">{t(subtitle)}</small>
      </div>

      <div className="topbar-right">
        <div className="date-badge">
          <i className="fa-regular fa-calendar"></i>
          <span>{today}</span>
        </div>
        <div className="user-profile">
          <div className="user-avatar"><i className="fa-solid fa-user"></i></div>
          {t('Admin')} <i className="fa-solid fa-chevron-down ms-1 chevron-muted"></i>
        </div>
        <div className="language-toggle" aria-label="Language switch">
          <button
            type="button"
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={language === 'mr' ? 'active' : ''}
            onClick={() => setLanguage('mr')}
          >
            मराठी
          </button>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </div>
    </div>
  )
}

export default function Topbar({ title, subtitle }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="topbar">
      <div>
        <h4>{title}</h4>
        <small className="text-muted">{subtitle}</small>
      </div>

      <div className="topbar-right">
        <div className="date-badge">
          <i className="fa-regular fa-calendar"></i>
          <span>{today}</span>
        </div>
        <div className="user-profile">
          <div className="user-avatar"><i className="fa-solid fa-user"></i></div>
          Admin <i className="fa-solid fa-chevron-down ms-1 chevron-muted"></i>
        </div>
      </div>
    </div>
  )
}

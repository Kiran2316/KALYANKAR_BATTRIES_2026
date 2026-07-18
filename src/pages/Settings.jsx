import { useState } from 'react'
import Topbar from '../components/Topbar.jsx'

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'fa-user' },
  { key: 'business', label: 'Business Info', icon: 'fa-shop' },
  { key: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  { key: 'security', label: 'Security', icon: 'fa-lock' },
  { key: 'backup', label: 'Backup', icon: 'fa-database' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({
    lowStock: true,
    paymentDue: true,
    warrantyExpiry: true,
    dailySummary: false,
  })
  const [lastBackup, setLastBackup] = useState('No backup created yet.')

  function handleSave(e) {
    e.preventDefault()
    alert('Changes saved successfully.')
    if (e.target.id === 'passwordForm') e.target.reset()
  }

  function handleBackup() {
    const now = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    setLastBackup('Backup created on ' + now)
  }

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your account and business preferences" />

      <div className="row g-3">
        {/* Settings Nav */}
        <div className="col-lg-3">
          <div className="card-box p-0">
            <div className="list-group list-group-flush">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`list-group-item list-group-item-action ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  <i className={`fa-solid ${t.icon} me-2`}></i> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Panels */}
        <div className="col-lg-9">

          {activeTab === 'profile' && (
            <div className="card-box">
              <div className="section-title">Profile Details</div>
              <form id="profileForm" onSubmit={handleSave}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" defaultValue="Admin" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" defaultValue="admin@kalyankarbatteries.com" />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-control" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Role</label>
                    <input type="text" className="form-control" defaultValue="Administrator" disabled />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm"><i className="fa-solid fa-check me-1"></i>Save Changes</button>
              </form>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="card-box">
              <div className="section-title">Business Information</div>
              <form id="businessForm" onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label">Business Name</label>
                  <input type="text" className="form-control" defaultValue="Kalyankar Batteries" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-control" defaultValue="MG Road, Your City – 421001" />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Number</label>
                    <input type="tel" className="form-control" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">GSTIN</label>
                    <input type="text" className="form-control" placeholder="e.g. 27ABCDE1234F1Z5" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Currency</label>
                  <select className="form-select" defaultValue="INR">
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="USD">$ US Dollar (USD)</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm"><i className="fa-solid fa-check me-1"></i>Save Changes</button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card-box">
              <div className="section-title">Notification Preferences</div>

              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <strong>Low Stock Alerts</strong><br />
                  <small className="text-muted">Get notified when a product falls below reorder level</small>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={notifications.lowStock}
                    onChange={(e) => setNotifications({ ...notifications, lowStock: e.target.checked })} />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <strong>Payment Due Reminders</strong><br />
                  <small className="text-muted">Alerts for customers with pending dues</small>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={notifications.paymentDue}
                    onChange={(e) => setNotifications({ ...notifications, paymentDue: e.target.checked })} />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <strong>Warranty Expiry Alerts</strong><br />
                  <small className="text-muted">Notify 30 days before a warranty expires</small>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={notifications.warrantyExpiry}
                    onChange={(e) => setNotifications({ ...notifications, warrantyExpiry: e.target.checked })} />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center py-2">
                <div>
                  <strong>Daily Sales Summary (Email)</strong><br />
                  <small className="text-muted">Receive a daily summary of sales and orders</small>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={notifications.dailySummary}
                    onChange={(e) => setNotifications({ ...notifications, dailySummary: e.target.checked })} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card-box">
              <div className="section-title">Change Password</div>
              <form id="passwordForm" onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-control" placeholder="Enter current password" required />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-control" placeholder="Enter new password" required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-control" placeholder="Re-enter new password" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm"><i className="fa-solid fa-check me-1"></i>Update Password</button>
              </form>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="card-box">
              <div className="section-title">Backup &amp; Data</div>
              <p className="text-muted">Create a backup of your products, sales, and customer data, or restore from a previous backup file.</p>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-primary btn-sm" onClick={handleBackup}><i className="fa-solid fa-database me-1"></i>Create Backup</button>
                <button className="btn btn-outline-secondary btn-sm"><i className="fa-solid fa-upload me-1"></i>Restore Backup</button>
              </div>
              <hr />
              <div className="section-title">Last Backup</div>
              <p className="text-muted mb-0">{lastBackup}</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { deleteGstRate, getGstSettings, saveGstSettings } from '../gstSettings.js'
import { getAdminProfile, getPaymentSettings, imageFileToDataUrl, saveAdminProfile, savePaymentSettings } from '../appSettings.js'
import defaultPaymentQr from '../assets/payment-qr.jpg'
import backupPrintLogo from '../assets/sales-print-logo.png'
import { jsPDF } from 'jspdf'

const BACKUP_EMAIL = 'bodakekiran04@gmail.com'
const NOTIFICATION_SETTINGS_KEY = 'kalyankar-notification-settings'
const defaultNotificationSettings = { lowStock: true, customerDue: true, purchaseDue: true, scrapDue: true, warrantyExpiry: true, dailySummary: true, backupReminder: true, systemAlerts: true }
const notificationOptions = [
  { key: 'lowStock', title: 'Low Stock Alerts', description: 'Alerts when a battery model has 5 or fewer units.' },
  { key: 'customerDue', title: 'Customer Payment Due', description: 'Alerts after a customer payment has remained due for 7 days; click the alert to send a WhatsApp reminder.' },
  { key: 'purchaseDue', title: 'Purchase Payment Due', description: 'Alerts for pending payments to purchase companies.' },
  { key: 'scrapDue', title: 'Scrap Company Payment Due', description: 'Alerts when scrap-sale payments are pending.' },
  { key: 'warrantyExpiry', title: 'Warranty Expiry Alerts', description: 'Alerts 30 days before a customer warranty expires.' },
  { key: 'dailySummary', title: 'Daily Summary', description: 'Daily sales, purchase, and scrap-sale summary.' },
  { key: 'backupReminder', title: 'Backup Reminder', description: 'Reminder when no backup was created in the last 7 days.' },
  { key: 'systemAlerts', title: 'System Alerts', description: 'Success and failure alerts for PDF, backup, and email activity.' },
]

function addGstNotification(message, messageMr, icon) {
  const existing = readStoredRows('kalyankar-system-notifications')
  const notification = { id: `gst-${Date.now()}`, type: 'GST Update', message, messageMr, icon, color: 'purple', path: '/settings' }
  localStorage.setItem('kalyankar-system-notifications', JSON.stringify([notification, ...existing].slice(0, 20)))
  window.dispatchEvent(new Event('kalyankar-notifications-changed'))
}

function loadNotificationSettings() {
  try { return { ...defaultNotificationSettings, ...JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || '{}') } } catch { return defaultNotificationSettings }
}
const backupTypes = [
  { key: 'purchase', label: 'PURCHASE STOCK', icon: 'fa-cart-flatbed', color: '#0ea5b7' },
  { key: 'regular', label: 'REGULAR SALE', icon: 'fa-file-invoice-dollar', color: '#2583ed' },
  { key: 'oldBattery', label: 'OLD BATTERY PURCHASE', icon: 'fa-car-battery', color: '#2563eb' },
  { key: 'scrap', label: 'SCRAP SALES', icon: 'fa-recycle', color: '#1479e8' },
]

function readStoredRows(key) {
  try {
    const rows = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function rowDate(row) {
  return String(row.invoiceDate || row.date || row.timestamp || '').slice(0, 10)
}

function shortText(value, length = 28) {
  const text = String(value ?? '-').replace(/\s+/g, ' ').trim() || '-'
  return text.length > length ? `${text.slice(0, length - 1)}.` : text
}

async function createBackupPdf(title, period, headers, rows) {
  const logoBlob = await fetch(backupPrintLogo).then((response) => {
    if (!response.ok) throw new Error('Unable to load the backup PDF logo.')
    return response.blob()
  })
  const logoData = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to prepare the backup PDF logo.'))
    reader.readAsDataURL(logoBlob)
  })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 26
  const rowHeight = 22
  const tableTop = 110
  const rowsPerPage = 19
  const pages = []
  for (let index = 0; index < rows.length; index += rowsPerPage) pages.push(rows.slice(index, index + rowsPerPage))
  if (!pages.length) pages.push([])

  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex) pdf.addPage('a4', 'landscape')
    const columnWidth = (pageWidth - margin * 2) / headers.length
    pdf.setFillColor(19, 59, 122)
    pdf.rect(0, 0, pageWidth, 82, 'F')
    pdf.addImage(logoData, 'PNG', margin, 8, 174, 66)
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(title, 220, 31)
    pdf.setFontSize(9)
    pdf.text(period, 220, 50)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Page ${pageIndex + 1}/${pages.length}`, pageWidth - margin, 50, { align: 'right' })
    pdf.setFillColor(223, 236, 255)
    pdf.rect(margin, tableTop, pageWidth - margin * 2, 26, 'F')

    headers.forEach((header, index) => {
      const x = margin + index * columnWidth
      pdf.setTextColor(20, 46, 82)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.text(shortText(header, 18), x + 4, tableTop + 16)
      pdf.setDrawColor(191, 204, 222)
      pdf.rect(x, tableTop, columnWidth, 26)
    })

    pageRows.forEach((row, rowIndex) => {
      const y = tableTop + 26 + rowIndex * rowHeight
      if (rowIndex % 2) {
        pdf.setFillColor(247, 250, 255)
        pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F')
      }
      row.forEach((value, index) => {
        const x = margin + index * columnWidth
        pdf.setTextColor(20, 31, 51)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.text(shortText(value, 22), x + 4, y + 14)
        pdf.setDrawColor(209, 217, 230)
        pdf.rect(x, y, columnWidth, rowHeight)
      })
    })

    if (!pageRows.length) {
      pdf.setTextColor(89, 102, 128)
      pdf.setFontSize(10)
      pdf.text('No records found for the selected date range.', margin + 10, tableTop + 62)
    }
    pdf.setTextColor(89, 102, 128)
    pdf.setFontSize(7)
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')} | Email: ${BACKUP_EMAIL}`, margin, pageHeight - 18)
  })
  return pdf.output('blob')
}

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'fa-user' },
  { key: 'business', label: 'Business Info', icon: 'fa-shop' },
  { key: 'payment', label: 'Payment & QR', icon: 'fa-qrcode' },
  { key: 'gst', label: 'GST Settings', icon: 'fa-percent' },
  { key: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  { key: 'security', label: 'Security', icon: 'fa-lock' },
  { key: 'backup', label: 'Backup', icon: 'fa-database' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [adminProfile, setAdminProfile] = useState(getAdminProfile)
  const [paymentSettings, setPaymentSettings] = useState(getPaymentSettings)
  const [notifications, setNotifications] = useState(loadNotificationSettings)
  const [lastBackup, setLastBackup] = useState('No backup created yet.')
  const [totalGstRate, setTotalGstRate] = useState(() => getGstSettings().totalRate)
  const [gstRates, setGstRates] = useState(() => getGstSettings().rates)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [backupDates, setBackupDates] = useState({ from: '', to: '' })

  function handleSave(e) {
    e.preventDefault()
    alert('Changes saved successfully.')
    if (e.target.id === 'passwordForm') e.target.reset()
  }

  function handleProfileSave(e) {
    e.preventDefault()
    saveAdminProfile(adminProfile)
    alert('Admin profile saved successfully.')
  }

  async function selectProfilePhoto(file) {
    try { const photo = await imageFileToDataUrl(file); setAdminProfile((profile) => ({ ...profile, photo })) }
    catch (error) { alert(error.message) }
  }

  async function selectPaymentQr(file) {
    try { const qrImage = await imageFileToDataUrl(file); setPaymentSettings((settings) => ({ ...settings, qrImage })) }
    catch (error) { alert(error.message) }
  }

  function handlePaymentSettingsSave(e) {
    e.preventDefault()
    if (!paymentSettings.upiId.trim()) return alert('Please enter the UPI ID.')
    savePaymentSettings({ ...paymentSettings, upiId: paymentSettings.upiId.trim() })
    alert('Payment QR and UPI ID saved successfully.')
  }

  function handleBackup() {
    const now = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    setLastBackup('Backup created on ' + now)
  }

  function handleGstSave(e) {
    e.preventDefault()
    const rate = Number(totalGstRate)
    const isNewRate = !gstRates.includes(rate)
    const settings = saveGstSettings(totalGstRate)
    setTotalGstRate(settings.totalRate)
    setGstRates(settings.rates)
    if (isNewRate) addGstNotification(`GST ${rate}% added.`, `GST ${rate}% जोडला.`, 'fa-percent')
    alert('GST settings saved successfully.')
  }

  function handleDeleteGstRate(rate) {
    if (gstRates.length === 1) return alert('At least one GST option is required.')
    const settings = deleteGstRate(rate)
    setTotalGstRate(settings.totalRate)
    setGstRates(settings.rates)
    addGstNotification(`GST ${rate}% deleted.`, `GST ${rate}% हटवला.`, 'fa-trash-can')
  }

  function updateNotificationSetting(key, enabled) {
    const next = { ...notifications, [key]: enabled }
    setNotifications(next)
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('kalyankar-notifications-changed'))
  }

  function openBackup(type) {
    setSelectedBackup(type)
    setBackupDates({ from: '', to: '' })
  }

  async function exportBackup() {
    if (!selectedBackup) return
    if (backupDates.from && backupDates.to && backupDates.from > backupDates.to) return alert('From Date cannot be after To Date.')

    const sales = readStoredRows('kalyankar-sales')
    let source = []
    let headers = []
    let pdfRows = []

    if (selectedBackup.key === 'purchase') {
      source = readStoredRows('purchaseStockHistory')
      headers = ['Date', 'Invoice', 'Company', 'Brand / Model', 'Quantity', 'Grand Total']
      pdfRows = source.map((row) => [rowDate(row), row.invoice, row.company, (row.items || []).map((item) => `${item.brand || ''} ${item.model || ''}`).join(', '), (row.items || []).reduce((sum, item) => sum + Number(item.units || 0), 0), `Rs. ${Number(row.grandTotal || 0).toLocaleString('en-IN')}`])
    } else if (selectedBackup.key === 'regular') {
      source = sales.filter((row) => row.saleType !== 'Exchange')
      headers = ['Date', 'Invoice', 'Customer', 'Brand / Model', 'Serial No.', 'Amount']
      pdfRows = source.map((row) => [rowDate(row), row.invoice, row.customer, `${row.brand || ''} ${row.model || row.product || ''}`, row.serialNumber, `Rs. ${Number(row.amount || 0).toLocaleString('en-IN')}`])
    } else if (selectedBackup.key === 'oldBattery') {
      source = sales.filter((row) => row.saleType === 'Exchange')
      headers = ['Date', 'Invoice', 'Customer', 'Battery', 'Weight', 'Amount']
      pdfRows = source.map((row) => [rowDate(row), row.invoice, row.customer, `${row.exchange?.brand || row.brand || ''} ${row.exchange?.model || row.model || ''}`, `${row.oldBatteryWeight || row.exchange?.weight || 0} Kg`, `Rs. ${Number(row.amount || 0).toLocaleString('en-IN')}`])
    } else {
      source = readStoredRows('kalyankar-scrap-sales')
      headers = ['Date', 'Invoice', 'Company', 'Category', 'Qty / Weight', 'Amount']
      pdfRows = source.map((row) => [rowDate(row), row.invoiceNo, row.company, row.category, `${row.quantity || 0} / ${row.weight || 0} Kg`, `Rs. ${Number(row.totalAmount || 0).toLocaleString('en-IN')}`])
    }

    pdfRows = pdfRows.filter((row) => (!backupDates.from || row[0] >= backupDates.from) && (!backupDates.to || row[0] <= backupDates.to))
    const today = new Date().toLocaleDateString('en-CA')
    const safeLabel = selectedBackup.label.replace(/\s+/g, '-')
    const fileName = `${today}-${safeLabel}.pdf`
    const period = `${backupDates.from || 'Beginning'} to ${backupDates.to || 'Today'}`
    const pdf = await createBackupPdf(selectedBackup.label, period, headers, pdfRows)
    const url = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)

    const subject = `${today} ${selectedBackup.label} Backup`
    const body = `Backup PDF: ${fileName}\nDate range: ${period}\nRecords: ${pdfRows.length}\n\nThe PDF has been downloaded. Please attach ${fileName} to this email.`
    window.location.href = `mailto:${BACKUP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    const backupTime = new Date()
    localStorage.setItem('kalyankar-last-backup-at', backupTime.toISOString())
    localStorage.setItem('kalyankar-system-notifications', JSON.stringify([{ id: `backup-created-${backupTime.getTime()}`, message: `${selectedBackup.label} backup PDF created successfully.`, messageMr: `${selectedBackup.label} बॅकअप PDF यशस्वीरीत्या तयार झाली.`, icon: 'fa-file-circle-check', color: 'success', path: '/settings' }]))
    window.dispatchEvent(new Event('kalyankar-notifications-changed'))
    setLastBackup(`${selectedBackup.label} PDF created on ${backupTime.toLocaleString('en-GB')}`)
    setSelectedBackup(null)
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
              <form id="profileForm" onSubmit={handleProfileSave}>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="rounded-circle overflow-hidden bg-primary text-white d-grid align-items-center justify-content-center" style={{ width: 86, height: 86, flex: '0 0 86px' }}>
                    {adminProfile.photo ? <img src={adminProfile.photo} alt="Admin profile" className="w-100 h-100" style={{ objectFit: 'cover' }} /> : <i className="fa-solid fa-user fs-2"></i>}
                  </div>
                  <div><label className="btn btn-outline-primary btn-sm mb-2"><i className="fa-solid fa-camera me-2"></i>Choose Profile Picture<input type="file" accept="image/*" className="d-none" onChange={(e) => e.target.files[0] && selectProfilePhoto(e.target.files[0])} /></label>{adminProfile.photo && <button type="button" className="btn btn-outline-danger btn-sm ms-2 mb-2" onClick={() => setAdminProfile({ ...adminProfile, photo: '' })}><i className="fa-solid fa-trash me-1"></i>Remove</button>}<small className="text-muted d-block">JPG, PNG or WebP, maximum 2 MB.</small></div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" value={adminProfile.name} onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })} required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={adminProfile.email} onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-control" value={adminProfile.phone} onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })} />
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
                <div className="mb-3">
                  <label className="form-label">Business Email</label>
                  <input type="email" className="form-control" defaultValue="kalyankarbatteries7273@gmail.com" />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Number</label>
                    <input type="tel" className="form-control" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">WhatsApp Number</label>
                    <input type="tel" className="form-control" defaultValue="7745047273" />
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

          {activeTab === 'payment' && (
            <div className="card-box">
              <div className="section-title">Payment QR &amp; UPI Settings</div>
              <p className="text-muted">The saved QR and UPI ID automatically replace the current payment details on every new sales invoice and PDF.</p>
              <form onSubmit={handlePaymentSettingsSave}>
                <div className="row g-4 align-items-start">
                  <div className="col-md-5">
                    <label className="form-label fw-bold">Payment QR Preview</label>
                    <div className="border rounded-4 p-3 text-center bg-light"><img src={paymentSettings.qrImage || defaultPaymentQr} alt="Payment QR" style={{ width: 220, height: 220, maxWidth: '100%', objectFit: 'contain' }} /></div>
                    <label className="btn btn-outline-primary btn-sm mt-3"><i className="fa-solid fa-upload me-2"></i>Change QR Image<input type="file" accept="image/*" className="d-none" onChange={(e) => e.target.files[0] && selectPaymentQr(e.target.files[0])} /></label>
                    {paymentSettings.qrImage && <button type="button" className="btn btn-outline-danger btn-sm mt-3 ms-2" onClick={() => setPaymentSettings({ ...paymentSettings, qrImage: '' })}><i className="fa-solid fa-rotate-left me-1"></i>Use Default QR</button>}
                  </div>
                  <div className="col-md-7">
                    <label className="form-label fw-bold">UPI ID</label>
                    <input className="form-control" value={paymentSettings.upiId} onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })} placeholder="name@bank" required />
                    <small className="text-muted d-block mt-2">Confirm that this UPI ID belongs to the same account encoded in the uploaded QR.</small>
                    <button type="submit" className="btn btn-primary mt-4"><i className="fa-solid fa-floppy-disk me-2"></i>Save Payment Settings</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card-box">
              <div className="section-title">Notification Preferences</div>
              {notificationOptions.map((option, index) => (
                <div className={`d-flex justify-content-between align-items-center gap-3 py-3 ${index < notificationOptions.length - 1 ? 'border-bottom' : ''}`} key={option.key}>
                  <div><strong>{option.title}</strong><br /><small className="text-muted">{option.description}</small></div>
                  <div className="form-check form-switch flex-shrink-0"><input className="form-check-input" type="checkbox" checked={notifications[option.key]} onChange={(e) => updateNotificationSetting(option.key, e.target.checked)} /></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'gst' && (
            <div className="card-box">
              <div className="section-title">GST Settings</div>
              <p className="text-muted">Add total GST options for different batteries. Each rate is divided equally between CGST and SGST.</p>
              <form id="gstForm" onSubmit={handleGstSave}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Total GST (%)</label>
                    <input type="number" min="0" max="100" step="0.01" className="form-control" value={totalGstRate} onChange={(e) => setTotalGstRate(e.target.value)} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">CGST (%)</label>
                    <input type="text" className="form-control" value={(Number(totalGstRate || 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 3 })} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">SGST (%)</label>
                    <input type="text" className="form-control" value={(Number(totalGstRate || 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 3 })} readOnly />
                  </div>
                  <div className="col-12">
                    <small className="text-muted d-block mb-3">Example: Total GST 18% becomes CGST 9% + SGST 9%.</small>
                    <button type="submit" className="btn btn-primary btn-sm"><i className="fa-solid fa-plus me-1"></i>Add GST Option</button>
                  </div>
                </div>
              </form>
              <div className="table-responsive mt-4">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Total GST</th><th>CGST</th><th>SGST</th><th className="text-end">Action</th></tr></thead>
                  <tbody>{gstRates.map((rate) => <tr key={rate}>
                    <td><strong>{rate}%</strong>{rate === Number(getGstSettings().totalRate) && <span className="badge text-bg-primary ms-2">Default</span>}</td>
                    <td>{rate / 2}%</td><td>{rate / 2}%</td>
                    <td className="text-end"><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteGstRate(rate)}><i className="fa-solid fa-trash me-1"></i>Delete</button></td>
                  </tr>)}</tbody>
                </table>
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
              <p className="text-muted">Select the data you want, choose a date range, then download its PDF and prepare the email.</p>
              <div className="row g-4 mt-1">
                {backupTypes.map((type) => (
                  <div className="col-sm-6 col-xl-3" key={type.key}>
                    <button
                      type="button"
                      className="border-0 rounded-3 text-white w-100 h-100 p-3 shadow-sm d-flex flex-column align-items-center justify-content-between"
                      style={{ minHeight: 230, background: `linear-gradient(135deg, ${type.color}, #3b82f6)` }}
                      onClick={() => openBackup(type)}
                    >
                      <i className={`fa-solid ${type.icon} mt-2`} style={{ fontSize: 40, color: '#ffad7d' }}></i>
                      <strong className="text-center fs-5 my-3">{type.label}</strong>
                      <span className="btn btn-success w-100"><i className="fa-solid fa-cloud-arrow-down"></i></span>
                    </button>
                  </div>
                ))}
              </div>
              <hr />
              <div className="section-title">Last Backup</div>
              <p className="text-muted mb-0">{lastBackup}</p>
            </div>
          )}

        </div>
      </div>

      {selectedBackup && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, .55)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold"><i className={`fa-solid ${selectedBackup.icon} text-primary me-2`}></i>{selectedBackup.label}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedBackup(null)}></button>
              </div>
              <div className="modal-body">
                <h6 className="fw-bold mb-3">Select Date Duration</h6>
                <div className="row g-3">
                  <div className="col-sm-6"><label className="form-label">From Date</label><input type="date" className="form-control" value={backupDates.from} max={backupDates.to || undefined} onChange={(e) => setBackupDates((dates) => ({ ...dates, from: e.target.value }))} /></div>
                  <div className="col-sm-6"><label className="form-label">To Date</label><input type="date" className="form-control" value={backupDates.to} min={backupDates.from || undefined} onChange={(e) => setBackupDates((dates) => ({ ...dates, to: e.target.value }))} /></div>
                </div>
                <div className="alert alert-info mt-3 mb-0 small">
                  The PDF will download to your PC, then an email addressed to <strong>{BACKUP_EMAIL}</strong> will open. Attach the downloaded PDF and send it.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setSelectedBackup(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={exportBackup}><i className="fa-solid fa-file-pdf me-2"></i>Download PDF &amp; Email</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

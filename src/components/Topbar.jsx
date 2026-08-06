import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../language.jsx'
import { APP_SETTINGS_CHANGED_EVENT, getAdminProfile } from '../appSettings.js'

const READ_KEY = 'kalyankar-read-notifications'
const DISMISSED_KEY = 'kalyankar-dismissed-notifications'
const NOTIFICATION_SETTINGS_KEY = 'kalyankar-notification-settings'

function notificationSettings() {
  const defaults = { lowStock: true, customerDue: true, purchaseDue: true, scrapDue: true, warrantyExpiry: true, dailySummary: true, backupReminder: true, systemAlerts: true }
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || '{}') } } catch { return defaults }
}

function readRows(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function readIds(key) {
  return new Set(readRows(key))
}

function saveIds(key, values) {
  localStorage.setItem(key, JSON.stringify([...values]))
}

function saleWarrantyEnd(sale) {
  const start = new Date(`${String(sale.invoiceDate || sale.date || '').slice(0, 10)}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  const text = String(sale.warrantyPeriod || '')
  const amount = Number(sale.totalWarranty || sale.warrantyDigits || text.match(/\d+/)?.[0] || 0)
  if (!amount) return null
  const end = new Date(start)
  if (/year/i.test(text)) end.setFullYear(end.getFullYear() + amount)
  else end.setMonth(end.getMonth() + amount)
  return end
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function saleAgeInDays(sale, now) {
  const dateText = String(sale.invoiceDate || sale.date || '').slice(0, 10)
  const saleDate = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(saleDate.getTime())) return -1
  return Math.floor((now - saleDate) / 86400000)
}

function dueReminderMessage(sale) {
  const amount = `₹${Number(sale.dueAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  return `नमस्कार ${sale.customer || 'ग्राहक'},

Kalyankar Batteries कडून आपल्याला नम्र विनंती.
आपल्या बिलाची ${amount} इतकी रक्कम अद्याप बाकी आहे.
कृपया लवकरात लवकर पेमेंट करून सहकार्य करावे.

पेमेंट लिंक:
upi://pay?pa=sidkalyankar23-4@oksbi&pn=KALYANKAR%20SIDDHESH%20RANJIT

जर आपण आधीच पेमेंट केले असेल आणि आमच्याकडून चुकून हा संदेश गेला असेल, तर कृपया आम्हाला माफ करा व हा संदेश दुर्लक्षित करा.
काही शंका असल्यास संपर्क करा.
📞 9420007273
📲 व्हाट्सअँप: 7745047273

धन्यवाद! 🙏
Kalyankar Batteries, Gargoti`
}

function whatsappDueUrl(sale) {
  let phone = String(sale.phone || '').replace(/\D/g, '')
  if (phone.length === 10) phone = `91${phone}`
  else if (phone.startsWith('0') && phone.length === 11) phone = `91${phone.slice(1)}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(dueReminderMessage(sale))}`
}

function buildNotifications() {
  const enabled = notificationSettings()
  const now = new Date()
  const today = now.toLocaleDateString('en-CA')
  const sales = readRows('kalyankar-sales')
  const purchases = readRows('purchaseStockHistory')
  const scrapSales = readRows('kalyankar-scrap-sales')
  const scrapPayments = readRows('kalyankar-scrap-company-payments')
  const products = readRows('kalyankar-product-stock')
  const models = readRows('kalyankar-product-models')
  const notifications = []

  const stockCounts = products.reduce((map, product) => {
    const key = String(product.modelId || `${product.brand}|${product.model}`)
    map[key] = (map[key] || 0) + 1
    return map
  }, {})
  const lowModels = models.filter((model) => (stockCounts[String(model.id)] || 0) <= 5)
  if (enabled.lowStock && lowModels.length) notifications.push({ id: `low-stock-${lowModels.length}`, type: 'Low Stock', icon: 'fa-box-open', color: 'danger', message: `${lowModels.length} battery models have 5 or fewer units.`, messageMr: `${lowModels.length} बॅटरी मॉडेलमध्ये 5 किंवा त्यापेक्षा कमी नग आहेत.`, path: '/stock' })

  const customerDue = sales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0)
  const dueCustomers = 0 // Individual seven-day reminders are added below.
  if (enabled.customerDue && dueCustomers) notifications.push({ id: `customer-due-${dueCustomers}-${Math.round(customerDue)}`, type: 'Customer Payment Due', icon: 'fa-user-clock', color: 'danger', message: `${dueCustomers} customer payments pending — ${money(customerDue)}.`, messageMr: `${dueCustomers} ग्राहकांची ${money(customerDue)} पेमेंट बाकी आहे.`, path: '/sales' })

  if (enabled.customerDue) {
    sales
      .filter((sale) => Number(sale.dueAmount || 0) > 0.005 && saleAgeInDays(sale, now) >= 7)
      .forEach((sale) => notifications.push({
        id: `customer-due-reminder-${sale.id || sale.invoice}`,
        type: 'Customer Payment Due',
        icon: 'fa-user-clock',
        color: 'danger',
        message: `${sale.customer || 'Customer'} has ₹${Number(sale.dueAmount || 0).toLocaleString('en-IN')} due for 7 days or more. Click to send a WhatsApp reminder.`,
        messageMr: `${sale.customer || 'ग्राहक'} यांच्याकडे ₹${Number(sale.dueAmount || 0).toLocaleString('en-IN')} रक्कम ७ दिवसांपासून बाकी आहे. व्हाट्सअँप स्मरणपत्र पाठवण्यासाठी क्लिक करा.`,
        path: '/sales',
        actionUrl: whatsappDueUrl(sale),
        dueSale: sale,
      }))
  }

  const purchaseDue = purchases.reduce((sum, row) => {
    const paid = (row.ledger || []).reduce((total, entry) => total + Number(entry.amount || 0), 0)
    return sum + Math.max(Number(row.grandTotal || 0) - paid, 0)
  }, 0)
  const duePurchases = purchases.filter((row) => {
    const paid = (row.ledger || []).reduce((total, entry) => total + Number(entry.amount || 0), 0)
    return Number(row.grandTotal || 0) - paid > 0.005
  }).length
  if (enabled.purchaseDue && duePurchases) notifications.push({ id: `purchase-due-${duePurchases}-${Math.round(purchaseDue)}`, type: 'Purchase Payment Due', icon: 'fa-building-circle-exclamation', color: 'primary', message: `${duePurchases} supplier payments pending — ${money(purchaseDue)}.`, messageMr: `${duePurchases} पुरवठादारांची ${money(purchaseDue)} पेमेंट बाकी आहे.`, path: '/purchase-stock' })

  const paidBySale = scrapPayments.reduce((map, payment) => {
    const key = String(payment.saleId || '')
    map[key] = (map[key] || 0) + Number(payment.amount || 0)
    return map
  }, {})
  const scrapDue = scrapSales.reduce((sum, sale) => sum + Math.max(Number(sale.dueAmount || 0) - Number(paidBySale[String(sale.id)] || 0), 0), 0)
  const scrapDueCount = scrapSales.filter((sale) => Number(sale.dueAmount || 0) - Number(paidBySale[String(sale.id)] || 0) > 0.005).length
  if (enabled.scrapDue && scrapDueCount) notifications.push({ id: `scrap-due-${scrapDueCount}-${Math.round(scrapDue)}`, type: 'Scrap Company Payment Due', icon: 'fa-recycle', color: 'success', message: `${scrapDueCount} scrap-company payments pending — ${money(scrapDue)}.`, messageMr: `${scrapDueCount} स्क्रॅप कंपनीची ${money(scrapDue)} पेमेंट बाकी आहे.`, path: '/scrap-stock' })

  const expiring = sales.filter((sale) => {
    const end = saleWarrantyEnd(sale)
    if (!end) return false
    const days = (end - now) / 86400000
    return days >= 0 && days <= 30
  })
  if (enabled.warrantyExpiry && expiring.length) notifications.push({ id: `warranty-${expiring.length}`, type: 'Warranty Expiry', icon: 'fa-shield-halved', color: 'info', message: `${expiring.length} warranties expire within 30 days.`, messageMr: `${expiring.length} वॉरंटी पुढील 30 दिवसांत संपणार आहेत.`, path: '/sales' })

  const todaySales = sales.filter((sale) => String(sale.invoiceDate || sale.date || '').slice(0, 10) === today)
  const todayPurchases = purchases.filter((row) => String(row.date || '').slice(0, 10) === today)
  const todayScrap = scrapSales.filter((row) => String(row.date || '').slice(0, 10) === today)
  if (enabled.dailySummary) notifications.push({ id: `daily-${today}-${todaySales.length}-${todayPurchases.length}-${todayScrap.length}`, type: 'Daily Summary', icon: 'fa-chart-column', color: 'secondary', message: `Today: ${todaySales.length} sales, ${todayPurchases.length} purchases and ${todayScrap.length} scrap sales.`, messageMr: `आज: ${todaySales.length} विक्री, ${todayPurchases.length} खरेदी आणि ${todayScrap.length} स्क्रॅप विक्री.`, path: '/reports' })

  const lastBackup = localStorage.getItem('kalyankar-last-backup-at')
  const backupAge = lastBackup ? (now - new Date(lastBackup)) / 86400000 : Infinity
  if (enabled.backupReminder && backupAge >= 7) notifications.push({ id: `backup-${lastBackup || 'never'}`, type: 'Backup Reminder', icon: 'fa-cloud-arrow-down', color: 'primary', message: lastBackup ? 'The last backup is more than 7 days old.' : 'No data backup has been created yet.', messageMr: lastBackup ? 'शेवटचा बॅकअप 7 दिवसांपेक्षा जुना आहे.' : 'अद्याप डेटा बॅकअप तयार केलेला नाही.', path: '/settings' })

  if (enabled.systemAlerts) readRows('kalyankar-system-notifications').slice(0, 5).forEach((item, index) => notifications.push({ id: item.id || `system-${index}`, type: item.type || 'System Alert', icon: item.icon || 'fa-circle-info', color: item.type === 'GST Update' ? 'purple' : 'warning', message: item.message || 'System activity completed.', messageMr: item.messageMr || 'सिस्टम प्रक्रिया पूर्ण झाली.', path: item.path || '/settings' }))
  return notifications
}

export default function Topbar({ title, subtitle }) {
  const { language, setLanguage, theme, setTheme, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const [read, setRead] = useState(() => readIds(READ_KEY))
  const [dismissed, setDismissed] = useState(() => readIds(DISMISSED_KEY))
  const [adminProfile, setAdminProfile] = useState(getAdminProfile)
  const today = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
  const allNotifications = useMemo(() => buildNotifications(), [location.pathname, version])
  const notifications = allNotifications.filter((item) => !dismissed.has(item.id))
  const unread = notifications.filter((item) => !read.has(item.id)).length

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('storage', refresh)
    window.addEventListener('kalyankar-notifications-changed', refresh)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('kalyankar-notifications-changed', refresh) }
  }, [])

  useEffect(() => {
    const refreshProfile = () => setAdminProfile(getAdminProfile())
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, refreshProfile)
    window.addEventListener('storage', refreshProfile)
    return () => { window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, refreshProfile); window.removeEventListener('storage', refreshProfile) }
  }, [])

  useEffect(() => {
    const close = (event) => { if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function markAllRead() {
    const next = new Set(read)
    notifications.forEach((item) => next.add(item.id))
    setRead(next); saveIds(READ_KEY, next)
  }

  function clearAll() {
    const next = new Set(dismissed)
    notifications.forEach((item) => next.add(item.id))
    setDismissed(next); saveIds(DISMISSED_KEY, next)
  }

  function shareDueReminder(sale) {
    window.open(whatsappDueUrl(sale), '_blank', 'noopener,noreferrer')
  }

  function openNotification(item) {
    const next = new Set(read).add(item.id)
    setRead(next); saveIds(READ_KEY, next); setOpen(false)
    if (item.dueSale) shareDueReminder(item.dueSale)
    else if (item.actionUrl) window.open(item.actionUrl, '_blank', 'noopener,noreferrer')
    else navigate(item.path)
  }

  return (
    <div className="topbar">
      <div><h4>{t(title)}</h4><small className="text-muted">{t(subtitle)}</small></div>
      <div className="topbar-right">
        <div className="date-badge"><i className="fa-regular fa-calendar"></i><span>{today}</span></div>
        <div className="notification-wrap" ref={panelRef}>
          <button type="button" className="notification-button" onClick={() => { setOpen((value) => !value); setVersion((value) => value + 1) }} title={t('Notifications')} aria-expanded={open}>
            <i className="fa-solid fa-bell"></i>{unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {open && <div className="notification-panel">
            <div className="notification-head"><div><strong>{t('Notifications')}</strong><small>{unread} {t('unread')}</small></div><button type="button" onClick={markAllRead}>{t('Mark All as Read')}</button></div>
            <div className="notification-list">
              {notifications.map((item) => <button type="button" key={item.id} className={`notification-item ${read.has(item.id) ? '' : 'unread'} ${item.type === 'Low Stock' ? 'notification-low-stock' : ''} ${item.type === 'System Alert' ? 'notification-system-alert' : ''} ${item.type === 'Backup Reminder' ? 'notification-backup-reminder' : ''} ${item.type === 'Customer Payment Due' ? 'notification-customer-due' : ''} ${item.type === 'Purchase Payment Due' ? 'notification-purchase-due' : ''} ${item.type === 'GST Update' ? 'notification-gst-update' : ''}`} onClick={() => openNotification(item)}>
                <span className={`notification-icon text-bg-${item.color}`}><i className={`fa-solid ${item.icon}`}></i></span>
                <span><strong>{t(item.type)}</strong><small>{language === 'mr' ? (item.messageMr || t(item.message)) : item.message}</small></span>
                {!read.has(item.id) && <i className="fa-solid fa-circle notification-dot"></i>}
              </button>)}
              {!notifications.length && <div className="notification-empty"><i className="fa-regular fa-bell-slash"></i><span>{t('No notifications')}</span></div>}
            </div>
            {!!notifications.length && <div className="notification-footer"><button type="button" onClick={clearAll}>{t('Clear All')}</button><button type="button" onClick={() => { setOpen(false); navigate('/settings') }}>{t('Notification Settings')}</button></div>}
          </div>}
        </div>
        <div className="user-profile"><div className="user-avatar">{adminProfile.photo ? <img src={adminProfile.photo} alt={adminProfile.name} /> : <i className="fa-solid fa-user"></i>}</div>{adminProfile.name || t('Admin')} <i className="fa-solid fa-chevron-down ms-1 chevron-muted"></i></div>
        <div className="language-toggle" aria-label="Language switch"><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button><button type="button" className={language === 'mr' ? 'active' : ''} onClick={() => setLanguage('mr')}>मराठी</button></div>
        <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i></button>
      </div>
    </div>
  )
}

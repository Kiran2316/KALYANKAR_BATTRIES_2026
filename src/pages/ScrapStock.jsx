import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const SCRAP_SALES_STORAGE_KEY = 'kalyankar-scrap-sales'
const SCRAP_PAYMENTS_STORAGE_KEY = 'kalyankar-scrap-company-payments'
const SHOP = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay, 416209',
  phone: '9420007273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
}

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function batteryTypeFor(item) {
  return String(item.batteryType || item.exchange?.batteryType || '').trim()
}

function isBikeBattery(item) {
  const type = batteryTypeFor(item).toLowerCase().replaceAll('-', ' ')
  return type.includes('bike')
    || type.includes('motorcycle')
    || type.includes('two wheeler')
    || type.includes('2 wheeler')
    || type.includes('scooter')
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function formatMoney(value) {
  return `₹ ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function categoryFor(item) {
  return isBikeBattery(item) ? 'bike' : 'other'
}

function batteryTypesFor(items) {
  return [...new Set(items.map(batteryTypeFor).filter(Boolean))]
}

function saleCategoryLabel(category) {
  if (category === 'all') return 'Bike + Car Batteries'
  return category === 'bike' ? 'Bike Batteries' : 'Car Batteries'
}

function companyLedgerRows(company) {
  let runningAmount = 0
  return [...(company?.sales || [])]
    .sort((a, b) => String(a.timestamp || a.date || '').localeCompare(String(b.timestamp || b.date || '')))
    .map((sale) => {
      runningAmount += Number(sale.totalAmount || 0)
      return { ...sale, runningAmount }
    })
}

function companyPaymentLedger(company, payments) {
  if (!company) return []
  let balance = 0
  const entries = company.sales.flatMap((sale) => {
    const transactionDate = sale.timestamp || `${sale.date}T00:00:00`
    const saleEntries = [{ ...sale, type: 'purchase', transactionDate, amount: Number(sale.totalAmount || 0) }]
    if (Number(sale.paidAmount || 0) > 0) saleEntries.push({ id: `initial-${sale.id}`, saleId: sale.id, invoiceNo: sale.invoiceNo, date: sale.date, type: 'payment', transactionDate: `${transactionDate}-payment`, amount: Number(sale.paidAmount), method: 'At Sale' })
    return saleEntries
  })
  entries.push(...payments.filter((payment) => payment.companyKey === company.key).map((payment) => ({ ...payment, type: 'payment', transactionDate: payment.timestamp })))
  return entries.sort((a, b) => String(a.transactionDate).localeCompare(String(b.transactionDate))).map((entry) => {
    if (entry.type === 'purchase') balance += Number(entry.amount || 0)
    else balance -= Number(entry.amount || 0)
    return { ...entry, balance: Math.max(0, balance) }
  })
}

function saleRemainingDue(sale, companyKey, payments) {
  const laterPayments = payments
    .filter((payment) => payment.companyKey === companyKey && String(payment.saleId || '') === String(sale.id))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  return Math.max(0, Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0) - laterPayments)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const emptySale = {
  company: '',
  contact: '',
  companyAddress: '',
  companyGstin: '',
  category: 'bike',
  quantity: '',
  weight: '',
  ratePerKg: '',
  paidAmount: '',
  date: new Date().toISOString().split('T')[0],
  stockFromDate: '',
  stockToDate: '',
  vehicleNumber: '',
  notes: '',
}

const emptyCustomerForm = {
  customer: '',
  phone: '',
  address: '',
  category: 'other',
  weight: '',
  date: new Date().toISOString().split('T')[0],
  invoice: '',
  brand: '',
  model: '',
  serialNumber: '',
}

export default function ScrapStock() {
  const navigate = useNavigate()
  const [oldBatteries, setOldBatteries] = useState(() =>
    readStorage(SALES_STORAGE_KEY).filter((sale) => sale.saleType === 'Exchange')
  )
  const [scrapSales, setScrapSales] = useState(() => readStorage(SCRAP_SALES_STORAGE_KEY))
  const [saleForm, setSaleForm] = useState(emptySale)
  const [companyMode, setCompanyMode] = useState('new')
  const [activeStockDetails, setActiveStockDetails] = useState(null)
  const [detailSearch, setDetailSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [selectedCompanySale, setSelectedCompanySale] = useState(null)
  const [companyPayments, setCompanyPayments] = useState(() => readStorage(SCRAP_PAYMENTS_STORAGE_KEY))
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash' })
  const [selectedDueSaleId, setSelectedDueSaleId] = useState(null)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [editingCustomerKey, setEditingCustomerKey] = useState(null)

  const stock = useMemo(() => {
    const result = {
      bike: { receivedQty: 0, receivedKg: 0, soldQty: 0, soldKg: 0 },
      other: { receivedQty: 0, receivedKg: 0, soldQty: 0, soldKg: 0 },
    }

    oldBatteries.forEach((battery) => {
      const category = categoryFor(battery)
      result[category].receivedQty += 1
      result[category].receivedKg += Number(battery.oldBatteryWeight || battery.exchange?.weight || 0)
    })

    scrapSales.forEach((sale) => {
      if (sale.category === 'all') {
        result.bike.soldQty += Number(sale.stockBreakdown?.bikeQty || 0)
        result.bike.soldKg += Number(sale.stockBreakdown?.bikeKg || 0)
        result.other.soldQty += Number(sale.stockBreakdown?.carQty || 0)
        result.other.soldKg += Number(sale.stockBreakdown?.carKg || 0)
        return
      }
      const category = sale.category === 'bike' ? 'bike' : 'other'
      result[category].soldQty += Number(sale.quantity || 0)
      result[category].soldKg += Number(sale.weight || 0)
    })

    Object.values(result).forEach((category) => {
      category.availableQty = Math.max(0, category.receivedQty - category.soldQty)
      category.availableKg = Math.max(0, category.receivedKg - category.soldKg)
    })

    return result
  }, [oldBatteries, scrapSales])

  const totalStock = {
    quantity: stock.bike.availableQty + stock.other.availableQty,
    weight: stock.bike.availableKg + stock.other.availableKg,
  }

  const categorySuppliers = useMemo(() => {
    if (!activeStockDetails) return []
    const query = detailSearch.trim().toLowerCase()
    const grouped = new Map()
    oldBatteries.filter((battery) => activeStockDetails === 'all' || categoryFor(battery) === activeStockDetails).forEach((battery) => {
      const phone = String(battery.phone || '').trim()
      const name = String(battery.customer || 'Unknown Customer').trim()
      const key = phone || name.toLowerCase()
      const existing = grouped.get(key) || {
        key,
        name,
        phone,
        address: battery.address || '',
        batteries: [],
        totalKg: 0,
      }
      existing.batteries.push(battery)
      existing.totalKg += Number(battery.oldBatteryWeight || battery.exchange?.weight || 0)
      if (!existing.address && battery.address) existing.address = battery.address
      grouped.set(key, existing)
    })
    return Array.from(grouped.values())
      .filter((supplier) => !query || [supplier.name, supplier.phone, supplier.address, ...supplier.batteries.flatMap((battery) => [battery.brand, batteryTypeFor(battery), battery.model, battery.serialNumber, battery.invoice])].join(' ').toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [oldBatteries, activeStockDetails, detailSearch])

  const companyGroups = useMemo(() => {
    const grouped = new Map()
    scrapSales.forEach((sale) => {
      const key = String(sale.companyGstin || sale.contact || sale.company || '').trim().toLowerCase()
      const company = grouped.get(key) || {
        key,
        name: sale.company,
        contact: sale.contact || '',
        address: sale.companyAddress || '',
        gstin: sale.companyGstin || '',
        sales: [],
        totalQty: 0,
        totalKg: 0,
        totalAmount: 0,
      }
      company.sales.push(sale)
      company.totalQty += Number(sale.quantity || 0)
      company.totalKg += Number(sale.weight || 0)
      company.totalAmount += Number(sale.totalAmount || 0)
      if (!company.contact && sale.contact) company.contact = sale.contact
      if (!company.address && sale.companyAddress) company.address = sale.companyAddress
      if (!company.gstin && sale.companyGstin) company.gstin = sale.companyGstin
      grouped.set(key, company)
    })
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [scrapSales])

  function saveOriginalSales(nextSales) {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales))
    setOldBatteries(nextSales.filter((sale) => sale.saleType === 'Exchange'))
  }

  function allRecordsForCustomer(supplier) {
    const phone = String(supplier.phone || '').trim()
    const name = String(supplier.name || '').trim().toLowerCase()
    return oldBatteries.filter((battery) => {
      const batteryPhone = String(battery.phone || '').trim()
      const batteryName = String(battery.customer || '').trim().toLowerCase()
      return phone ? batteryPhone === phone : batteryName === name
    })
  }

  function openAddCustomer() {
    setEditingCustomerKey(null)
    setCustomerForm({ ...emptyCustomerForm, date: new Date().toISOString().split('T')[0] })
  }

  function openEditCustomer(supplier) {
    setEditingCustomerKey(supplier.key)
    setCustomerForm({
      ...emptyCustomerForm,
      customer: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
    })
  }

  function submitCustomer(event) {
    event.preventDefault()
    const customer = customerForm.customer.trim()
    const phone = customerForm.phone.trim()
    if (!customer) return alert('Please enter the customer name.')
    if (!phone) return alert('Please enter the customer phone number.')

    const allSales = readStorage(SALES_STORAGE_KEY)
    if (editingCustomerKey) {
      const supplier = categorySuppliers.find((item) => item.key === editingCustomerKey)
      if (!supplier) return alert('Customer record could not be found.')
      const recordIds = new Set(allRecordsForCustomer(supplier).map((battery) => battery.id))
      saveOriginalSales(allSales.map((sale) => recordIds.has(sale.id)
        ? { ...sale, customer, phone, address: customerForm.address.trim() }
        : sale))
    } else {
      const weight = Number(customerForm.weight || 0)
      if (weight <= 0) return alert('Please enter a valid old battery weight.')
      const id = Date.now()
      const batteryType = customerForm.category === 'bike' ? 'Bike Battery' : 'Car Battery'
      const newRecord = {
        id,
        invoice: customerForm.invoice.trim() || `SCRAP-${id}`,
        invoiceDate: customerForm.date,
        date: customerForm.date,
        customer,
        phone,
        address: customerForm.address.trim(),
        saleType: 'Exchange',
        brand: customerForm.brand.trim(),
        batteryType,
        model: customerForm.model.trim(),
        serialNumber: customerForm.serialNumber.trim().toUpperCase(),
        oldBatteryWeight: weight,
        exchange: {
          brand: customerForm.brand.trim(),
          batteryType,
          model: customerForm.model.trim(),
          serialNumber: customerForm.serialNumber.trim().toUpperCase(),
          weight,
          value: 0,
        },
        amount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: 'Paid',
        notes: 'Old battery added from Scrap Stock',
      }
      saveOriginalSales([newRecord, ...allSales])
    }

    const modalElement = document.getElementById('customerScrapModal')
    if (modalElement && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
  }

  function deleteCustomer(supplier) {
    const matchingRecords = allRecordsForCustomer(supplier)
    if (!window.confirm(`Delete ${supplier.name} and all ${matchingRecords.length} matching records from Scrap Stock and original sales? This cannot be undone.`)) return
    const recordIds = new Set(matchingRecords.map((battery) => battery.id))
    saveOriginalSales(readStorage(SALES_STORAGE_KEY).filter((sale) => !recordIds.has(sale.id)))
    if (selectedSupplier?.key === supplier.key) setSelectedSupplier(null)
  }

  function openSupplier(supplier) {
    setSelectedSupplier(supplier)
  }

  function printSupplierReport(supplier = selectedSupplier) {
    if (!supplier) return
    const reportWindow = window.open('', '_blank', 'width=1000,height=750')
    if (!reportWindow) return alert('Please allow pop-ups to print the report.')

    const rows = supplier.batteries.map((battery, index) => `
      <tr>
        <td>${index + 1}</td><td>${escapeHtml(battery.date || '—')}</td><td>${escapeHtml(battery.invoice || '—')}</td>
        <td>${escapeHtml(battery.brand || '—')}</td><td>${escapeHtml(batteryTypeFor(battery) || '—')}</td>
        <td>${escapeHtml(battery.model || '—')}</td><td>${escapeHtml(battery.serialNumber || '—')}</td>
        <td>${formatNumber(battery.oldBatteryWeight || battery.exchange?.weight)} Kg</td>
      </tr>`).join('')

    reportWindow.document.write(`<!doctype html><html><head><title>Old Battery Report - ${escapeHtml(supplier.name)}</title><style>
      *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#17213a;margin:0;padding:28px}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1769e8;padding-bottom:18px}.logo{width:155px;max-height:78px;object-fit:contain}.shop{text-align:right}.shop h1{margin:0 0 5px;font-size:25px;color:#1769e8}.shop p{margin:3px 0;font-size:12px}.title{text-align:center;margin:25px 0 16px}.customer{border:1px solid #dce3ed;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.customer p{margin:0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#edf3ff;color:#263653;text-align:left}th,td{border:1px solid #cfd8e6;padding:8px}.totals{margin-top:18px;margin-left:auto;width:310px;border:1px solid #cfd8e6;padding:12px}.totals div{display:flex;justify-content:space-between;padding:5px}.footer{text-align:center;border-top:1px solid #dce3ed;margin-top:35px;padding-top:12px;font-size:11px;color:#667085}@media print{body{padding:12px}.no-print{display:none}}</style></head><body>
      <div class="header"><img class="logo" src="${mainLogo}" alt="${SHOP.name}"/><div class="shop"><h1>${SHOP.name}</h1><p>${SHOP.tagline}</p><p>${SHOP.address}</p><p>Phone: ${SHOP.phone} | Email: ${SHOP.email}</p><p>GSTIN: ${SHOP.gstin}</p></div></div>
      <div class="title"><h2>Customer Old Battery Scrap Report</h2><small>Printed on ${new Date().toLocaleDateString('en-IN')}</small></div>
      <div class="customer"><p><strong>Customer:</strong> ${escapeHtml(supplier.name)}</p><p><strong>Phone:</strong> ${escapeHtml(supplier.phone || '—')}</p><p><strong>Address:</strong> ${escapeHtml(supplier.address || '—')}</p><p><strong>Total Entries:</strong> ${supplier.batteries.length}</p></div>
      <table><thead><tr><th>#</th><th>Date</th><th>Invoice</th><th>Brand</th><th>Type</th><th>Model</th><th>Serial No.</th><th>Weight</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div><strong>Total Batteries</strong><strong>${supplier.batteries.length}</strong></div><div><strong>Total Weight</strong><strong>${formatNumber(supplier.totalKg)} Kg</strong></div></div>
      <div class="footer">This is a system-generated old battery scrap report from ${SHOP.name}. Contact: ${SHOP.phone}</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`)
    reportWindow.document.close()
  }

  function printCompanyReport(company, singleSale = null) {
    if (!company) return
    const salesToPrint = singleSale ? [singleSale] : company.sales
    const totalQty = salesToPrint.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0)
    const totalKg = salesToPrint.reduce((sum, sale) => sum + Number(sale.weight || 0), 0)
    const totalAmount = salesToPrint.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)
    const reportWindow = window.open('', '_blank', 'width=1000,height=750')
    if (!reportWindow) return alert('Please allow pop-ups to print the report.')
    // Collection and sale dates belong to the in-app history only.
    const rows = salesToPrint.map((sale, index) => {
      const paid = Number(sale.paidAmount || 0) + companyPayments.filter((payment) => payment.companyKey === company.key && String(payment.saleId || '') === String(sale.id)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const due = saleRemainingDue(sale, company.key, companyPayments)
      return `<tr><td>${index + 1}</td><td>${escapeHtml(sale.date || '—')}</td><td>${saleCategoryLabel(sale.category)}</td><td>${sale.quantity}</td><td>${formatNumber(sale.weight)} Kg</td><td>${formatMoney(sale.ratePerKg)}</td><td>${formatMoney(sale.totalAmount)}</td><td>${formatMoney(paid)}</td><td>${formatMoney(due)}</td></tr>`
    }).join('')
    const ledgerRows = companyPaymentLedger(company, companyPayments).map((entry) => `<tr><td>${escapeHtml(entry.date || '—')}</td><td>${entry.type === 'purchase' ? `Purchase - ${escapeHtml(saleCategoryLabel(entry.category))}` : `Payment - ${escapeHtml(entry.method || 'Payment received')}`}</td><td>${entry.type === 'purchase' ? formatMoney(entry.amount) : '—'}</td><td>${entry.type === 'payment' ? formatMoney(entry.amount) : '—'}</td><td><strong>${formatMoney(entry.balance)}</strong></td></tr>`).join('')
    const paymentHistory = singleSale ? '' : `<h3 style="margin:26px 0 10px">Purchase / Payment History</h3><table><thead><tr><th>Date</th><th>Description</th><th>Credit (Purchase)</th><th>Debit (Payment)</th><th>Balance</th></tr></thead><tbody>${ledgerRows}</tbody></table>`

    reportWindow.document.write(`<!doctype html><html><head><title>Company Scrap Sale - ${escapeHtml(company.name)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17213a;margin:0;padding:28px}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1769e8;padding-bottom:18px}.logo{width:155px;max-height:78px;object-fit:contain}.shop{text-align:right}.shop h1{margin:0 0 5px;font-size:25px;color:#1769e8}.shop p{margin:3px 0;font-size:12px}.title{text-align:center;margin:25px 0 16px}.company{border:1px solid #dce3ed;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.company p{margin:0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf3ff;color:#263653;text-align:left}th,td{border:1px solid #cfd8e6;padding:8px}.totals{margin-top:18px;margin-left:auto;width:330px;border:1px solid #cfd8e6;padding:12px}.totals div{display:flex;justify-content:space-between;padding:5px}.footer{text-align:center;border-top:1px solid #dce3ed;margin-top:35px;padding-top:12px;font-size:11px;color:#667085}@media print{body{padding:12px}}</style></head><body>
      <div class="header"><img class="logo" src="${mainLogo}"/><div class="shop"><h1>${SHOP.name}</h1><p>${SHOP.tagline}</p><p>${SHOP.address}</p><p>Phone: ${SHOP.phone} | Email: ${SHOP.email}</p><p>GSTIN: ${SHOP.gstin}</p></div></div>
      <div class="title"><h2>${singleSale ? 'Company Scrap Sale Receipt' : 'Company Scrap Purchase History'}</h2></div>
      <div class="company"><p><strong>Company:</strong> ${escapeHtml(company.name)}</p><p><strong>Contact:</strong> ${escapeHtml(company.contact || '—')}</p><p><strong>Address:</strong> ${escapeHtml(company.address || '—')}</p><p><strong>GSTIN:</strong> ${escapeHtml(company.gstin || '—')}</p></div>
      <table><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Quantity</th><th>Weight</th><th>Rate/Kg</th><th>Amount</th><th>Paid</th><th>Due</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div><strong>Total Quantity</strong><strong>${totalQty}</strong></div><div><strong>Total Weight</strong><strong>${formatNumber(totalKg)} Kg</strong></div><div><strong>Total Amount</strong><strong>${formatMoney(totalAmount)}</strong></div></div>
      ${paymentHistory}
      <div class="footer">System-generated scrap sale report from ${SHOP.name}. Contact: ${SHOP.phone}</div><script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`)
    reportWindow.document.close()
  }

  function updateSaleForm(field, value) {
    setSaleForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateCompanySelection(value) {
    const key = value.trim().toLowerCase()
    const existingCompany = companyGroups.find((company) => company.name.trim().toLowerCase() === key)

    setSaleForm((previous) => ({
      ...previous,
      company: value,
      ...(existingCompany
        ? {
            contact: existingCompany.contact,
            companyAddress: existingCompany.address,
            companyGstin: existingCompany.gstin,
          }
        : {}),
      // The scrap rate must be entered again for every new stock cycle.
      ratePerKg: '',
    }))
  }

  function changeCompanyMode(mode) {
    setCompanyMode(mode)
    setSaleForm((previous) => ({ ...previous, company: '', contact: '', companyAddress: '', companyGstin: '', ratePerKg: '' }))
  }

  function selectExistingCompany(companyKey) {
    const company = companyGroups.find((item) => item.key === companyKey)
    setSaleForm((previous) => ({
      ...previous,
      company: company?.name || '',
      contact: company?.contact || '',
      companyAddress: company?.address || '',
      companyGstin: company?.gstin || '',
      ratePerKg: '',
    }))
  }

  function openCompanySale(category) {
    const isCombined = category === 'all'
    const available = isCombined
      ? {
          availableQty: stock.bike.availableQty + stock.other.availableQty,
          availableKg: stock.bike.availableKg + stock.other.availableKg,
        }
      : stock[category]
    if (available.availableQty <= 0 || available.availableKg <= 0) {
      alert(isCombined ? 'No bike or car battery scrap stock is available to sell.' : `No ${category === 'bike' ? 'bike' : 'car'} battery scrap stock is available to sell.`)
      return
    }

    const categoryRecords = oldBatteries
      .filter((battery) => isCombined || categoryFor(battery) === category)
      .sort((a, b) => String(a.invoiceDate || a.date || '').localeCompare(String(b.invoiceDate || b.date || '')))
    const soldQuantity = isCombined
      ? stock.bike.soldQty + stock.other.soldQty
      : stock[category].soldQty
    const remainingRecords = categoryRecords.slice(Math.min(categoryRecords.length, soldQuantity))
    const dates = remainingRecords
      .map((battery) => battery.invoiceDate || battery.date)
      .filter(Boolean)
      .sort()

    setCompanyMode(companyGroups.length ? 'existing' : 'new')
    setSaleForm({
      ...emptySale,
      category,
      quantity: available.availableQty,
      weight: available.availableKg,
      date: new Date().toISOString().split('T')[0],
      stockFromDate: dates[0] || '',
      stockToDate: dates.at(-1) || dates[0] || '',
    })
  }

  function saveScrapSales(nextSales) {
    setScrapSales(nextSales)
    localStorage.setItem(SCRAP_SALES_STORAGE_KEY, JSON.stringify(nextSales))
  }

  function submitScrapSale(event) {
    event.preventDefault()
    const isCombined = saleForm.category === 'all'
    const available = isCombined
      ? {
          availableQty: stock.bike.availableQty + stock.other.availableQty,
          availableKg: stock.bike.availableKg + stock.other.availableKg,
        }
      : stock[saleForm.category]
    // A company sale always closes the whole currently available stock cycle.
    // Use the live balance so a stale form can never create a partial sale.
    const quantity = Number(available.availableQty || 0)
    const weight = Number(available.availableKg || 0)
    const ratePerKg = Number(saleForm.ratePerKg || 0)
    const totalAmount = weight * ratePerKg
    const paidAmount = Number(saleForm.paidAmount || 0)

    if (!saleForm.company.trim()) return alert('Please enter the company name.')
    if (quantity <= 0) return alert('Please enter a valid quantity.')
    if (weight <= 0) return alert('Please enter a valid weight in Kg.')
    if (ratePerKg <= 0) return alert('Please enter a valid rate per Kg.')
    if (paidAmount < 0 || paidAmount > totalAmount) return alert('Paid amount cannot be more than the total sale amount.')

    const newSale = {
      id: Date.now(),
      ...saleForm,
      company: saleForm.company.trim(),
      contact: saleForm.contact.trim(),
      companyAddress: saleForm.companyAddress.trim(),
      companyGstin: saleForm.companyGstin.trim().toUpperCase(),
      vehicleNumber: saleForm.vehicleNumber.trim().toUpperCase(),
      notes: saleForm.notes.trim(),
      invoiceNo: `SCRAP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quantity,
      weight,
      ratePerKg,
      totalAmount,
      paidAmount,
      dueAmount: Math.max(0, totalAmount - paidAmount),
      cycleNumber: scrapSales.filter((sale) => sale.category === saleForm.category).length + 1,
      stockBreakdown: isCombined
        ? {
            bikeQty: stock.bike.availableQty,
            bikeKg: stock.bike.availableKg,
            carQty: stock.other.availableQty,
            carKg: stock.other.availableKg,
          }
        : null,
    }

    saveScrapSales([newSale, ...scrapSales])
    setSaleForm({ ...emptySale, category: saleForm.category, date: new Date().toISOString().split('T')[0] })

    const modalElement = document.getElementById('addScrapSaleModal')
    if (modalElement && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    }
  }

  function deleteScrapSale(id) {
    if (!window.confirm('Delete this scrap sale entry and return its stock?')) return
    saveScrapSales(scrapSales.filter((sale) => sale.id !== id))
  }

  const selectedCompanyLedger = companyLedgerRows(selectedCompany)
  const selectedPaymentLedger = companyPaymentLedger(selectedCompany, companyPayments)
  const selectedOutstanding = selectedPaymentLedger.at(-1)?.balance || 0
  const selectedDueSale = selectedCompany?.sales.find((sale) => String(sale.id) === String(selectedDueSaleId))
  const selectedTransactionDue = selectedDueSale ? saleRemainingDue(selectedDueSale, selectedCompany.key, companyPayments) : 0
  const selectedSalePayments = selectedCompanySale ? [
    ...(Number(selectedCompanySale.paidAmount || 0) > 0 ? [{ id: `initial-${selectedCompanySale.id}`, amount: Number(selectedCompanySale.paidAmount), date: selectedCompanySale.date, method: 'At Sale' }] : []),
    ...companyPayments.filter((payment) => payment.companyKey === selectedCompany?.key && String(payment.saleId || '') === String(selectedCompanySale.id)),
  ] : []
  const selectedSalePaid = selectedSalePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const selectedSaleDueAmount = selectedCompanySale ? Math.max(0, Number(selectedCompanySale.totalAmount || 0) - selectedSalePaid) : 0
  const selectedSaleStatus = selectedSaleDueAmount <= 0.005 ? 'Paid' : selectedSalePaid > 0 ? 'Partial' : 'Due'

  function saveDuePayment(event) {
    event.preventDefault()
    if (!selectedCompany) return
    const amount = Number(paymentForm.amount || 0)
    if (amount <= 0) return alert('Please enter a valid payment amount.')
    if (!selectedDueSale) return alert('Please select a transaction using its Pay Due button.')
    if (amount > selectedTransactionDue + 0.005) return alert(`Payment cannot be more than this transaction's due amount ${formatMoney(selectedTransactionDue)}.`)
    const now = new Date()
    const paymentDate = now.toISOString().split('T')[0]
    const nextPayments = [...companyPayments, {
      id: Date.now(),
      companyKey: selectedCompany.key,
      saleId: selectedDueSale.id,
      invoiceNo: selectedDueSale.invoiceNo || `SCRAP-${selectedDueSale.id}`,
      date: paymentDate,
      timestamp: now.toISOString(),
      amount,
      method: paymentForm.method,
      notes: `Payment via ${paymentForm.method}`,
    }]
    localStorage.setItem(SCRAP_PAYMENTS_STORAGE_KEY, JSON.stringify(nextPayments))
    setCompanyPayments(nextPayments)
    setPaymentForm({ amount: '', method: 'Cash' })
    setSelectedDueSaleId(null)
    const paymentModal = document.getElementById('scrapDuePaymentModal')
    if (paymentModal && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(paymentModal).hide()
  }

  return (
    <>
      <Topbar title="Scrap Stock" subtitle="Old battery stock and company sales management" />

      <style>{`
        .scrap-page { padding: 22px; }
        .scrap-page .stat-card { border: 1px solid #e7ebf2; box-shadow: 0 3px 12px rgba(26, 43, 74, .05); }
        .scrap-page .stat-card h4 { margin-top: 5px; color: #27344a; font-size: 22px; font-weight: 550; letter-spacing: -.02em; }
        .scrap-page .btn { border-radius: 8px; font-weight: 600; }
        .scrap-page .btn-primary { box-shadow: 0 3px 8px rgba(23, 105, 232, .18); }
        .scrap-summary { display: grid; grid-template-columns: 1fr; gap: 18px; margin-bottom: 22px; }
        .scrap-card { position: relative; border: 1px solid #e7ebf2; border-radius: 14px; background: #fff; box-shadow: 0 3px 12px rgba(26, 43, 74, .055); padding: 20px; overflow: hidden; }
        .scrap-card::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: #2878e8; }
        .scrap-card.scrap-car::before { background: #20a05a; }
        .scrap-category-row { display: grid; grid-template-columns: minmax(210px, 1.4fr) repeat(3, minmax(140px, 1fr)); align-items: center; gap: 18px; }
        .scrap-clickable { cursor: pointer; transition: border-color .18s, box-shadow .18s; }
        .scrap-clickable:hover { border-color: #bfcde2; box-shadow: 0 7px 20px rgba(26, 43, 74, .09); }
        .scrap-category-name { display: flex; align-items: center; gap: 14px; }
        .scrap-category-name h5 { color: #202b40; font-size: 16px; letter-spacing: -.01em; }
        .scrap-stat-box { border-left: 1px solid #e9edf3; padding: 4px 0 4px 20px; }
        .scrap-stat-box small { display: block; margin-bottom: 5px; color: #7a8598; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .055em; }
        .scrap-stat-box strong { display: block; color: #29364c; font-size: 19px; line-height: 1.25; font-weight: 500; }
        .scrap-stat-box .scrap-muted { display: block; margin-top: 2px; font-size: 12px; }
        .scrap-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .scrap-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 12px; font-size: 19px; background: #edf4ff; color: #1769e8; }
        .scrap-icon.green { background: #e9f8ef; color: #168447; }
        .scrap-icon.orange { background: #fff3df; color: #d97706; }
        .scrap-card h3 { margin: 14px 0 3px; color: #18223a; font-size: 26px; font-weight: 750; }
        .scrap-card small, .scrap-muted { color: #748198; }
        .scrap-metrics { display: flex; gap: 22px; margin-top: 14px; padding-top: 13px; border-top: 1px solid #edf0f5; }
        .scrap-metrics strong { display: block; color: #26344f; font-size: 16px; }
        .scrap-panel { background: #fff; border: 1px solid #e7ebf2; border-radius: 14px; box-shadow: 0 3px 12px rgba(26, 43, 74, .05); overflow: hidden; margin-bottom: 22px; }
        .scrap-panel-head { padding: 18px 20px; border-bottom: 1px solid #edf0f5; display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap; }
        .scrap-panel-head h5 { margin: 0; color: #18223a; font-weight: 750; }
        .scrap-table { margin: 0; }
        .scrap-table thead th { background: #f7f9fc; color: #5a6780; border: 0; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; padding: 13px 16px; }
        .scrap-table tbody td { padding: 14px 16px; border-color: #edf0f5; color: #35415a; vertical-align: middle; font-size: 13px; font-weight: 400; }
        .scrap-table tbody td strong { color: #26344b; font-weight: 600; }
        .scrap-table tbody tr:hover { background: #fafcff; }
        .scrap-pill { display: inline-flex; padding: 5px 9px; border-radius: 20px; background: #e9f8ef; color: #168447; font-size: 12px; font-weight: 700; }
        .supplier-avatar { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: #eaf2ff; color: #1769e8; }
        .scrap-empty { padding: 42px 20px; text-align: center; color: #7a879c; }
        .scrap-detail-card { border: 1px solid #dce3ee; border-radius: 10px; background: #fff; padding: 16px; }
        .scrap-detail-title { position: relative; margin-bottom: 12px; padding-bottom: 12px; color: #26344b; font-size: 13px; font-weight: 700; }
        .scrap-detail-title::after { content: ''; position: absolute; left: 0; bottom: 0; width: 20px; height: 2px; background: #1769e8; }
        .scrap-detail-title.green::after { background: #1aa34a; }
        .scrap-detail-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 9px 0; border-bottom: 1px solid #e8edf4; font-size: 12px; }
        .scrap-detail-row:last-child { border-bottom: 0; }
        .scrap-detail-row span { color: #71809a; }
        .scrap-detail-row strong { color: #27354d; text-align: right; }
        .scrap-status { display: inline-flex; min-width: 48px; justify-content: center; padding: 4px 12px; border-radius: 20px; font-size: 10px; }
        @media (max-width: 900px) { .scrap-category-row { grid-template-columns: 1fr 1fr; } .scrap-stat-box { border-left: 0; padding-left: 0; } }
      `}</style>

      <main className="scrap-page">
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Present Quantity</small><h4>{totalStock.quantity}</h4><span className="stat-change stat-muted">Bike and car batteries</span></div><div className="stat-icon icon-navy"><i className="fa-solid fa-car-battery"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Present Weight</small><h4 className="text-success">{formatNumber(totalStock.weight)} Kg</h4><span className="stat-change stat-muted">Total scrap available</span></div><div className="stat-icon icon-green"><i className="fa-solid fa-weight-hanging"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Bike Battery Stock</small><h4>{stock.bike.availableQty} Qty</h4><span className="stat-change stat-muted">{formatNumber(stock.bike.availableKg)} Kg available</span></div><div className="stat-icon icon-orange"><i className="fa-solid fa-motorcycle"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Car Battery Stock</small><h4>{stock.other.availableQty} Qty</h4><span className="stat-change stat-muted">{formatNumber(stock.other.availableKg)} Kg available</span></div><div className="stat-icon icon-red"><i className="fa-solid fa-car"></i></div></div></div>
        </div>

        <div className="mb-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div><h4 className="mb-1 fw-bold">Scrap Stock</h4><div className="scrap-muted">Click Bike Batteries or Car Batteries to view and search their records.</div></div>
        </div>

        <div className="scrap-card scrap-clickable mb-3" role="button" tabIndex="0" onClick={() => navigate('/scrap-stock/bike')} onKeyDown={(event) => event.key === 'Enter' && navigate('/scrap-stock/bike')}>
          <div className="scrap-category-row">
            <div className="scrap-category-name"><span className="scrap-icon"><i className="fa-solid fa-motorcycle"></i></span><div><h5 className="mb-1 fw-bold">Bike Batteries</h5><small>Click to view all bike battery details</small></div></div>
            <div className="scrap-stat-box"><small>Total Added</small><strong>{stock.bike.receivedQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.bike.receivedKg)} Kg</span></div>
            <div className="scrap-stat-box"><small>Total Sold</small><strong>{stock.bike.soldQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.bike.soldKg)} Kg</span></div>
            <div className="scrap-stat-box"><small>Present Stock</small><strong>{stock.bike.availableQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.bike.availableKg)} Kg</span></div>
          </div>
        </div>

        <div className="scrap-card scrap-car scrap-clickable mb-4" role="button" tabIndex="0" onClick={() => navigate('/scrap-stock/car')} onKeyDown={(event) => event.key === 'Enter' && navigate('/scrap-stock/car')}>
          <div className="scrap-category-row">
            <div className="scrap-category-name"><span className="scrap-icon green"><i className="fa-solid fa-car"></i></span><div><h5 className="mb-1 fw-bold">Car Batteries</h5><small>Click to view all car and other battery details</small></div></div>
            <div className="scrap-stat-box"><small>Total Added</small><strong>{stock.other.receivedQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.other.receivedKg)} Kg</span></div>
            <div className="scrap-stat-box"><small>Total Sold</small><strong>{stock.other.soldQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.other.soldKg)} Kg</span></div>
            <div className="scrap-stat-box"><small>Present Stock</small><strong>{stock.other.availableQty} Qty</strong><span className="scrap-muted">{formatNumber(stock.other.availableKg)} Kg</span></div>
          </div>
        </div>

        {activeStockDetails && (
          <section className="scrap-panel">
            <div className="scrap-panel-head">
              <div><h5>{activeStockDetails === 'all' ? 'All Scrap Customers' : activeStockDetails === 'bike' ? 'Bike Battery Customers' : 'Car Battery Customers'}</h5><small className="scrap-muted">{activeStockDetails === 'all' ? 'Bike and car records are combined by customer phone number' : 'Customers are grouped by their phone number'}</small></div>
              <div className="input-group" style={{ maxWidth: 390 }}>
                <span className="input-group-text bg-white"><i className="fa-solid fa-magnifying-glass"></i></span>
                <input className="form-control" value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder="Search customer or battery..." />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table scrap-table">
                <thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Battery Type</th><th>Old Batteries</th><th>Total Weight</th><th>Actions</th></tr></thead>
                <tbody>{categorySuppliers.map((supplier) => (
                  <tr key={supplier.key}>
                    <td><div className="d-flex align-items-center gap-2"><span className="supplier-avatar"><i className="fa-solid fa-user"></i></span><strong>{supplier.name}</strong></div></td>
                    <td>{supplier.phone || '—'}</td><td>{supplier.address || '—'}</td>
                    <td>{batteryTypesFor(supplier.batteries).length ? batteryTypesFor(supplier.batteries).map((type) => <span className="badge text-bg-light border me-1 mb-1" key={type}>{type}</span>) : '—'}</td>
                    <td>{supplier.batteries.length}</td><td><strong>{formatNumber(supplier.totalKg)} Kg</strong></td>
                    <td><div className="d-flex gap-2 flex-wrap"><button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#supplierScrapModal" onClick={() => openSupplier(supplier)}><i className="fa-solid fa-eye me-1"></i>See</button><button className="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#customerScrapModal" onClick={() => openEditCustomer(supplier)}><i className="fa-solid fa-pen me-1"></i>Edit</button><button className="btn btn-sm btn-outline-secondary" onClick={() => printSupplierReport(supplier)}><i className="fa-solid fa-print me-1"></i>Print</button><button className="btn btn-sm btn-outline-danger" onClick={() => deleteCustomer(supplier)} title="Delete from scrap stock and original sales"><i className="fa-solid fa-trash me-1"></i>Delete</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
              {categorySuppliers.length === 0 && <div className="scrap-empty">No matching customer or old battery record found.</div>}
            </div>
          </section>
        )}

        <section className="scrap-panel">
          <div className="scrap-panel-head">
            <div><h5>Scrap Sold to Companies</h5><small className="scrap-muted">Every old-stock sale is shown as a separate company transaction</small></div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="scrap-muted">{companyGroups.length} companies · {scrapSales.length} sales</span>
              <button disabled={totalStock.quantity <= 0 || totalStock.weight <= 0} className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addScrapSaleModal" onClick={() => openCompanySale('all')}><i className="fa-solid fa-truck me-2"></i>Sell Old Stock</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table scrap-table align-middle">
              <thead><tr><th>Date</th><th>Company</th><th>Address / Phone</th><th>Scrap Type</th><th>Quantity</th><th>Weight</th><th>Rate / Kg</th><th>Total Amount</th><th>Paid Amount</th><th>Due Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{scrapSales.map((sale) => {
                const key = String(sale.companyGstin || sale.contact || sale.company || '').trim().toLowerCase()
                const company = companyGroups.find((item) => item.key === key)
                const due = company ? saleRemainingDue(sale, company.key, companyPayments) : Math.max(0, Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0))
                const laterPaid = companyPayments.filter((payment) => payment.companyKey === company?.key && String(payment.saleId || '') === String(sale.id)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
                const paid = Number(sale.paidAmount || 0) + laterPaid
                const status = due <= 0.005 ? 'Paid' : paid > 0 ? 'Partial' : 'Due'
                return <tr key={sale.id}>
                  <td><strong>{sale.date || '—'}</strong><div className="scrap-muted small">{sale.timestamp ? new Date(sale.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div></td>
                  <td><button type="button" className="btn btn-link p-0 fw-bold text-decoration-none" data-bs-toggle="modal" data-bs-target="#companyHistoryModal" onClick={() => { setSelectedCompany(company); setSelectedCompanySale(sale); setSelectedDueSaleId(null) }}>{sale.company}</button><div className="scrap-muted small">{sale.invoiceNo || `SCRAP-${sale.id}`}</div></td>
                  <td>{sale.companyAddress || '—'}<div className="scrap-muted small">{sale.contact || '—'}{sale.companyGstin ? ` · ${sale.companyGstin}` : ''}</div></td>
                  <td><strong>{saleCategoryLabel(sale.category)}</strong></td>
                  <td>{sale.quantity} Qty</td><td><strong>{formatNumber(sale.weight)} Kg</strong></td><td>{formatMoney(sale.ratePerKg)}</td><td><strong>{formatMoney(sale.totalAmount)}</strong></td><td className="text-success">{formatMoney(paid)}</td><td className="text-danger fw-bold">{formatMoney(due)}</td>
                  <td><span className={`badge rounded-pill px-3 ${status === 'Paid' ? 'text-bg-success' : status === 'Partial' ? 'text-bg-warning' : 'text-bg-danger'}`}>{status}</span></td>
                  <td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" title="See scrap sale details" data-bs-toggle="modal" data-bs-target="#companyHistoryModal" onClick={() => { setSelectedCompany(company); setSelectedCompanySale(sale); setSelectedDueSaleId(null) }}><i className="fa-solid fa-eye me-1"></i>See</button><button className="btn btn-sm btn-outline-secondary" title="Open company ledger" data-bs-toggle="modal" data-bs-target="#scrapCompanyLedgerModal" onClick={() => { setSelectedCompany(company); setSelectedDueSaleId(null) }}><i className="fa-solid fa-book-open me-1"></i>Ledger</button>{due > 0.005 && <button className="btn btn-sm btn-outline-success" title="Record payment" data-bs-toggle="modal" data-bs-target="#scrapDuePaymentModal" onClick={() => { setSelectedCompany(company); setSelectedDueSaleId(sale.id); setPaymentForm({ amount: '', method: 'Cash' }) }}><i className="fa-solid fa-money-bill-wave"></i></button>}<button className="btn btn-sm btn-outline-primary" title="Print sale" onClick={() => printCompanyReport(company, sale)}><i className="fa-solid fa-print"></i></button><button className="btn btn-sm btn-outline-danger" title="Delete sale" onClick={() => deleteScrapSale(sale.id)}><i className="fa-solid fa-trash"></i></button></div></td>
                </tr>
              })}</tbody>
            </table>
            {scrapSales.length === 0 && <div className="scrap-empty">No company scrap sales have been added yet.</div>}
          </div>
        </section>
      </main>

      <div className="modal fade" id="customerScrapModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content border-0 rounded-4">
          <form onSubmit={submitCustomer}>
            <div className="modal-header"><div><h5 className="modal-title fw-bold">{editingCustomerKey ? 'Edit Scrap Customer' : 'Add Scrap Customer'}</h5><small className="text-muted">{editingCustomerKey ? 'Changes will also update every matching original record.' : 'Add an old battery directly to scrap stock and original records.'}</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-md-6"><label className="form-label">Customer Name *</label><input className="form-control" required value={customerForm.customer} onChange={(event) => setCustomerForm({ ...customerForm, customer: event.target.value })} /></div>
              <div className="col-md-6"><label className="form-label">Phone Number *</label><input className="form-control" required value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></div>
              <div className="col-12"><label className="form-label">Address</label><input className="form-control" value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></div>
              {!editingCustomerKey && <>
                <div className="col-md-4"><label className="form-label">Battery Category *</label><select className="form-select" value={customerForm.category} onChange={(event) => setCustomerForm({ ...customerForm, category: event.target.value })}><option value="other">Car Battery</option><option value="bike">Bike Battery</option></select></div>
                <div className="col-md-4"><label className="form-label">Weight (Kg) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={customerForm.weight} onChange={(event) => setCustomerForm({ ...customerForm, weight: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Received Date *</label><input type="date" className="form-control" required value={customerForm.date} onChange={(event) => setCustomerForm({ ...customerForm, date: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Invoice Number</label><input className="form-control" value={customerForm.invoice} onChange={(event) => setCustomerForm({ ...customerForm, invoice: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Battery Brand</label><input className="form-control" value={customerForm.brand} onChange={(event) => setCustomerForm({ ...customerForm, brand: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Battery Model</label><input className="form-control" value={customerForm.model} onChange={(event) => setCustomerForm({ ...customerForm, model: event.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Serial Number</label><input className="form-control text-uppercase" value={customerForm.serialNumber} onChange={(event) => setCustomerForm({ ...customerForm, serialNumber: event.target.value })} /></div>
              </>}
            </div></div>
            <div className="modal-footer"><button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn btn-primary"><i className={`fa-solid ${editingCustomerKey ? 'fa-floppy-disk' : 'fa-user-plus'} me-2`}></i>{editingCustomerKey ? 'Save Changes' : 'Add Customer'}</button></div>
          </form>
        </div></div>
      </div>

      <div className="modal fade" id="addScrapSaleModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content border-0 rounded-4">
          <form onSubmit={submitScrapSale}>
            <div className="modal-header"><div><h5 className="modal-title fw-bold">Sell Old Stock</h5><small className="text-muted">All available bike and car stock is included automatically</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-12"><div className="d-flex gap-2 p-1 bg-light rounded-3"><button type="button" className={`btn flex-fill ${companyMode === 'existing' ? 'btn-primary' : 'btn-light'}`} disabled={!companyGroups.length} onClick={() => changeCompanyMode('existing')}><i className="fa-solid fa-building-circle-check me-2"></i>Existing Company</button><button type="button" className={`btn flex-fill ${companyMode === 'new' ? 'btn-primary' : 'btn-light'}`} onClick={() => changeCompanyMode('new')}><i className="fa-solid fa-building-circle-arrow-right me-2"></i>New Company</button></div></div>
              {companyMode === 'existing' && companyGroups.length > 0 ? <>
                <div className="col-12"><label className="form-label">Select Saved Company *</label><select className="form-select" required value={companyGroups.find((company) => company.name === saleForm.company)?.key || ''} onChange={(e) => selectExistingCompany(e.target.value)}><option value="">Select selling company</option>{companyGroups.map((company) => <option key={company.key} value={company.key}>{company.name} - {company.contact || 'No contact'}</option>)}</select><small className="text-muted">Saved company information is filled automatically.</small></div>
                <div className="col-md-6"><label className="form-label">Company Name</label><input className="form-control" readOnly value={saleForm.company} /></div><div className="col-md-6"><label className="form-label">Contact Number</label><input className="form-control" readOnly value={saleForm.contact} /></div><div className="col-md-8"><label className="form-label">Company Address</label><input className="form-control" readOnly value={saleForm.companyAddress} /></div><div className="col-md-4"><label className="form-label">Company GSTIN</label><input className="form-control" readOnly value={saleForm.companyGstin} /></div>
              </> : <>
                <div className="col-md-6"><label className="form-label">Company Name *</label><input className="form-control" required value={saleForm.company} onChange={(e) => updateCompanySelection(e.target.value)} placeholder="Enter new company name" /></div><div className="col-md-6"><label className="form-label">Contact Number *</label><input className="form-control" required value={saleForm.contact} onChange={(e) => updateSaleForm('contact', e.target.value.replace(/\D/g, ''))} placeholder="Enter contact number" /></div><div className="col-md-8"><label className="form-label">Company Address</label><input className="form-control" value={saleForm.companyAddress} onChange={(e) => updateSaleForm('companyAddress', e.target.value)} placeholder="Enter company address" /></div><div className="col-md-4"><label className="form-label">Company GSTIN</label><input className="form-control text-uppercase" maxLength="15" value={saleForm.companyGstin} onChange={(e) => updateSaleForm('companyGstin', e.target.value)} placeholder="Optional" /></div><div className="col-12"><small className="text-muted">This company will be saved after the scrap sale and available under Existing Company next time.</small></div>
              </>}
              <div className="col-md-6"><label className="form-label">Rate per Kg (₹) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={saleForm.ratePerKg} onChange={(e) => updateSaleForm('ratePerKg', e.target.value)} /></div>
              <div className="col-md-6"><label className="form-label">Automatic Total Amount</label><input className="form-control" readOnly value={formatMoney(Number(saleForm.weight || 0) * Number(saleForm.ratePerKg || 0))} /></div>
              <div className="col-md-6"><label className="form-label">Amount Paid by Company</label><input type="number" min="0" step="0.01" className="form-control" value={saleForm.paidAmount} onChange={(e) => updateSaleForm('paidAmount', e.target.value)} placeholder="Enter received amount" /><small className="text-muted">Enter 0 when no payment is received.</small></div>
              <div className="col-md-6"><label className="form-label">Automatic Due Amount</label><input className="form-control fw-bold text-danger" readOnly value={formatMoney(Math.max(0, Number(saleForm.weight || 0) * Number(saleForm.ratePerKg || 0) - Number(saleForm.paidAmount || 0)))} /><small className="text-muted">Total amount minus the amount paid.</small></div>
              <div className="col-12"><div className="p-3 rounded-3 bg-light"><div className="row g-2"><div className="col-md-3"><small className="text-muted">Stock Included</small><strong className="d-block">{saleCategoryLabel(saleForm.category)}</strong></div><div className="col-md-3"><small className="text-muted">Total Quantity</small><strong className="d-block">{saleForm.quantity} Qty</strong></div><div className="col-md-3"><small className="text-muted">Total Weight</small><strong className="d-block">{formatNumber(saleForm.weight)} Kg</strong></div><div className="col-md-3"><small className="text-muted">Stock Period</small><strong className="d-block">{saleForm.stockFromDate || '—'} to {saleForm.stockToDate || '—'}</strong></div></div>{saleForm.category === 'all' && <div className="mt-2 pt-2 border-top small text-muted">Bike: <strong>{stock.bike.availableQty} Qty / {formatNumber(stock.bike.availableKg)} Kg</strong> &nbsp; + &nbsp; Car: <strong>{stock.other.availableQty} Qty / {formatNumber(stock.other.availableKg)} Kg</strong></div>}</div></div>
            </div></div>
            <div className="modal-footer"><button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn btn-primary"><i className="fa-solid fa-check me-2"></i>Complete Old Stock Sale</button></div>
          </form>
        </div></div>
      </div>

      <div className="modal fade" id="supplierScrapModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div className="modal-content border-0 rounded-4">
          <div className="modal-header"><div><h5 className="modal-title fw-bold">{selectedSupplier?.name || 'Customer'} — Old Battery History</h5><small className="text-muted">{selectedSupplier?.phone || 'No phone number'} · {selectedSupplier?.batteries.length || 0} entries · {formatNumber(selectedSupplier?.totalKg)} Kg</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <div className="modal-body">
            <div className="p-3 bg-light rounded-3 mb-3"><strong>Address:</strong> {selectedSupplier?.address || '—'}</div>
            <div className="table-responsive"><table className="table scrap-table"><thead><tr><th>Date / Invoice</th><th>Battery</th><th>Serial Number</th><th>Weight</th><th>Vehicle</th></tr></thead><tbody>
              {selectedSupplier?.batteries.map((battery) => <tr key={battery.id}><td><strong>{battery.date || '—'}</strong><div className="scrap-muted small">{battery.invoice || '—'}</div></td><td><strong>{battery.brand || '—'}</strong><div className="scrap-muted small">{batteryTypeFor(battery) || '—'} · {battery.model || '—'}</div></td><td>{battery.serialNumber || '—'}</td><td><strong>{formatNumber(battery.oldBatteryWeight || battery.exchange?.weight)} Kg</strong></td><td>{battery.vehicleNumber || battery.vehicleName || '—'}</td></tr>)}
            </tbody></table></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-light" data-bs-dismiss="modal">Close</button></div>
        </div></div>
      </div>

      <div className="modal fade" id="companyHistoryModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div className="modal-content border-0 rounded-4">
          <div className="modal-header"><h5 className="modal-title fw-bold"><i className="fa-solid fa-file-invoice text-primary me-2"></i>Scrap Sale Details</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <div className="modal-body">{selectedCompanySale && <div className="row g-3">
            <div className="col-md-6"><div className="scrap-detail-card h-100"><div className="scrap-detail-title">Company and Invoice</div><div className="scrap-detail-row"><span>Invoice Number</span><strong>{selectedCompanySale.invoiceNo || `SCRAP-${selectedCompanySale.id}`}</strong></div><div className="scrap-detail-row"><span>Company</span><strong>{selectedCompanySale.company || '—'}</strong></div><div className="scrap-detail-row"><span>Phone</span><strong>{selectedCompanySale.contact || '—'}</strong></div><div className="scrap-detail-row"><span>Address</span><strong>{selectedCompanySale.companyAddress || '—'}</strong></div><div className="scrap-detail-row"><span>GSTIN</span><strong>{selectedCompanySale.companyGstin || '—'}</strong></div><div className="scrap-detail-row"><span>Date</span><strong>{selectedCompanySale.date || '—'}</strong></div><div className="scrap-detail-row"><span>Status</span><strong><span className={`scrap-status ${selectedSaleStatus === 'Paid' ? 'text-bg-success' : selectedSaleStatus === 'Partial' ? 'text-bg-warning' : 'text-bg-danger'}`}>{selectedSaleStatus}</span></strong></div></div></div>
            <div className="col-md-6"><div className="scrap-detail-card h-100"><div className="scrap-detail-title green">Scrap Stock Details</div><div className="scrap-detail-row"><span>Scrap Type</span><strong>{saleCategoryLabel(selectedCompanySale.category)}</strong></div><div className="scrap-detail-row"><span>Quantity</span><strong>{selectedCompanySale.quantity} Qty</strong></div><div className="scrap-detail-row"><span>Total Weight</span><strong>{formatNumber(selectedCompanySale.weight)} Kg</strong></div><div className="scrap-detail-row"><span>Stock From</span><strong>{selectedCompanySale.stockFromDate || '—'}</strong></div><div className="scrap-detail-row"><span>Stock Until</span><strong>{selectedCompanySale.stockToDate || '—'}</strong></div>{selectedCompanySale.stockBreakdown && <><div className="scrap-detail-row"><span>Bike Batteries</span><strong>{selectedCompanySale.stockBreakdown.bikeQty || 0} Qty / {formatNumber(selectedCompanySale.stockBreakdown.bikeKg)} Kg</strong></div><div className="scrap-detail-row"><span>Car Batteries</span><strong>{selectedCompanySale.stockBreakdown.carQty || 0} Qty / {formatNumber(selectedCompanySale.stockBreakdown.carKg)} Kg</strong></div></>}</div></div>
            <div className="col-12"><div className="scrap-detail-card"><div className="scrap-detail-title">Payment Summary</div><div className="scrap-detail-row"><span>Quantity</span><strong>{selectedCompanySale.quantity} Qty</strong></div><div className="scrap-detail-row"><span>Weight</span><strong>{formatNumber(selectedCompanySale.weight)} Kg</strong></div><div className="scrap-detail-row"><span>Rate per Kg</span><strong>{formatMoney(selectedCompanySale.ratePerKg)}</strong></div><div className="scrap-detail-row"><span>Paid Amount</span><strong className="text-success">{formatMoney(selectedSalePaid)}</strong></div><div className="scrap-detail-row"><span>Due Amount</span><strong className="text-danger">{formatMoney(selectedSaleDueAmount)}</strong></div><div className="scrap-detail-row"><span className="fw-bold">Grand Total</span><strong className="text-primary fs-5">{formatMoney(selectedCompanySale.totalAmount)}</strong></div></div></div>
            <div className="col-12"><div className="scrap-detail-card"><div className="scrap-detail-title">Payment History</div>{selectedSalePayments.length ? <div className="table-responsive"><table className="table table-sm mb-0"><thead><tr><th>#</th><th>Amount Paid</th><th>Date Paid</th><th>Method</th></tr></thead><tbody>{selectedSalePayments.map((payment, index) => <tr key={payment.id || index}><td>{index + 1}</td><td>{formatMoney(payment.amount)}</td><td>{payment.date || '—'}</td><td>{payment.method || '—'}</td></tr>)}</tbody></table></div> : <p className="text-muted mb-0">No payments recorded yet.</p>}</div></div>
          </div>}</div>
          <div className="modal-footer"><button className="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>{selectedCompanySale && selectedSaleDueAmount > 0.005 && <button className="btn btn-success" data-bs-toggle="modal" data-bs-target="#scrapDuePaymentModal" onClick={() => { setSelectedDueSaleId(selectedCompanySale.id); setPaymentForm({ amount: '', method: 'Cash' }) }}><i className="fa-solid fa-money-bill-wave me-2"></i>Record Payment</button>}<button className="btn btn-primary" onClick={() => printCompanyReport(selectedCompany, selectedCompanySale)}><i className="fa-solid fa-print me-2"></i>Print Invoice</button></div>
        </div></div>
      </div>

      <div className="modal fade" id="scrapCompanyLedgerModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div className="modal-content border-0 rounded-4">
          <div className="modal-header"><h5 className="modal-title fw-bold"><i className="fa-solid fa-file-invoice text-primary me-2"></i>Company Details</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <div className="modal-body">
            <table className="table table-sm mb-4"><tbody><tr><th style={{width:'35%'}}>Company Name</th><td>{selectedCompany?.name || '—'}</td></tr><tr><th>Address</th><td>{selectedCompany?.address || '—'}</td></tr><tr><th>Contact</th><td>{selectedCompany?.contact || '—'}</td></tr><tr><th>GSTIN</th><td>{selectedCompany?.gstin || '—'}</td></tr></tbody></table>
            <h5 className="fw-bold mb-2">Scrap Purchased</h5>
            <div className="table-responsive mb-4"><table className="table scrap-table"><thead><tr><th>Date</th><th>Scrap Type</th><th>Qty</th><th>Weight</th><th>Rate</th><th>Final Total</th><th>Credit (Paid)</th><th>Debit (Due)</th><th>Status</th><th>Action</th></tr></thead><tbody>{selectedCompanyLedger.map((sale) => { const paid = Number(sale.paidAmount || 0) + companyPayments.filter((payment) => payment.companyKey === selectedCompany?.key && String(payment.saleId || '') === String(sale.id)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0); const due = saleRemainingDue(sale, selectedCompany?.key, companyPayments); const status = due <= 0.005 ? 'Paid' : paid > 0 ? 'Partial' : 'Due'; return <tr key={sale.id}><td>{sale.date || '—'}</td><td>{saleCategoryLabel(sale.category)}</td><td>{sale.quantity}</td><td>{formatNumber(sale.weight)} Kg</td><td>{formatMoney(sale.ratePerKg)}</td><td><strong>{formatMoney(sale.totalAmount)}</strong></td><td>{formatMoney(paid)}</td><td>{formatMoney(due)}</td><td><span className={`badge rounded-pill ${status === 'Paid' ? 'text-bg-success' : status === 'Partial' ? 'text-bg-warning' : 'text-bg-danger'}`}>{status}</span></td><td><div className="d-flex gap-2">{due > 0.005 && <button className="btn btn-sm btn-outline-success" data-bs-toggle="modal" data-bs-target="#scrapDuePaymentModal" onClick={() => { setSelectedDueSaleId(sale.id); setPaymentForm({ amount: '', method: 'Cash' }) }}><i className="fa-solid fa-money-bill-wave me-1"></i>Pay Due</button>}<button className="btn btn-sm btn-outline-secondary" title="Print this purchase" onClick={() => printCompanyReport(selectedCompany, sale)}><i className="fa-solid fa-print"></i></button></div></td></tr> })}</tbody></table></div>
            <h5 className="fw-bold mb-2">Purchase / Payment History</h5>
            <div className="table-responsive"><table className="table scrap-table"><thead><tr><th>Date</th><th>Description</th><th>Credit (Purchase)</th><th>Debit (Payment)</th><th>Balance</th></tr></thead><tbody>{selectedPaymentLedger.map((entry) => <tr key={`${entry.type}-${entry.id}`}><td>{entry.date || '—'}</td><td>{entry.type === 'purchase' ? `Purchase - ${saleCategoryLabel(entry.category)} (${entry.invoiceNo || `SCRAP-${entry.id}`})` : `Payment - ${entry.method || 'Payment received'}`}</td><td>{entry.type === 'purchase' ? formatMoney(entry.amount) : '—'}</td><td>{entry.type === 'payment' ? formatMoney(entry.amount) : '—'}</td><td className="fw-bold">{formatMoney(entry.balance)}</td></tr>)}</tbody></table></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button><button className="btn btn-primary" onClick={() => printCompanyReport(selectedCompany)}><i className="fa-solid fa-print me-2"></i>Print Full Ledger</button></div>
        </div></div>
      </div>

      <div className="modal fade" id="scrapDuePaymentModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 rounded-4 overflow-hidden">
          <form onSubmit={saveDuePayment}>
            <div className="modal-header px-4 py-3"><h5 className="modal-title fw-bold"><i className="fa-solid fa-money-bill-wave text-success me-2"></i>Record Payment</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <div className="modal-body p-4">
              <h5 className="fw-bold mb-3">{selectedDueSale?.invoiceNo || (selectedDueSale ? `SCRAP-${selectedDueSale.id}` : 'Scrap Sale')} <span className="text-muted fw-normal">— {selectedCompany?.name || 'Company'}</span></h5>
              <div className="text-danger fs-5 mb-4">Current Due: {formatMoney(selectedTransactionDue)}</div>
              <label className="form-label fw-bold">Amount Paying Now (₹) <span className="text-danger">*</span></label>
              <input autoFocus type="number" min="0.01" max={selectedTransactionDue || undefined} step="0.01" required className="form-control form-control-lg mb-4" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <label className="form-label fw-bold">Payment Method <span className="text-danger">*</span></label>
              <select className="form-select form-select-lg" required value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option><option>Other</option></select>
              <small className="text-muted d-block mt-2">Today's date will be recorded automatically as the payment date.</small>
            </div>
            <div className="modal-footer px-4 py-3"><button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn btn-success"><i className="fa-solid fa-check me-2"></i>Save Payment</button></div>
          </form>
        </div></div>
      </div>
    </>
  )
}

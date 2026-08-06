import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/sidebar-main-logo.png'
import scrapPrintLogo from '../assets/sales-print-logo.png'
import { useLanguage } from '../language.jsx'
import { formatIndianPhone, isValidIndianPhone } from '../phoneFormat.js'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const SCRAP_SALES_STORAGE_KEY = 'kalyankar-scrap-sales'
const SCRAP_PAYMENTS_STORAGE_KEY = 'kalyankar-scrap-company-payments'
const SCRAP_COMPANIES_STORAGE_KEY = 'kalyankar-scrap-companies'
const SHOP = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay, 416209',
  phone: '9420007273',
  whatsapp: '7745047273',
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

function companyKeyFor(sale) {
  return String(sale.companyKey || sale.companyGstin || sale.contact || sale.company || '').trim().toLowerCase()
}

const NUMBER_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const NUMBER_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function numberGroupInWords(value) {
  const number = Math.floor(value)
  if (number < 20) return NUMBER_ONES[number]
  if (number < 100) return `${NUMBER_TENS[Math.floor(number / 10)]}${number % 10 ? ` ${NUMBER_ONES[number % 10]}` : ''}`
  return `${NUMBER_ONES[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${numberGroupInWords(number % 100)}` : ''}`
}

function amountInWords(value) {
  let number = Math.max(0, Math.round(Number(value || 0)))
  if (!number) return 'Zero Rupees Only'
  const groups = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']]
  const words = []
  groups.forEach(([size, label]) => {
    const count = Math.floor(number / size)
    if (count) words.push(`${numberGroupInWords(count)} ${label}`)
    number %= size
  })
  if (number) words.push(numberGroupInWords(number))
  return `${words.join(' ')} Rupees Only`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function scrapSaleGrossAmount(form, stock) {
  if (form.category === 'all') {
    return Number(stock.bike.availableKg || 0) * Number(form.bikeRatePerKg || 0)
      + Number(stock.other.availableKg || 0) * Number(form.carRatePerKg || 0)
  }
  return Number(form.weight || 0) * Number(form.ratePerKg || 0)
}

function saleRateLabel(sale, language = 'en') {
  if (sale.category !== 'all') return formatMoney(sale.ratePerKg)
  const bike = language === 'mr' ? 'बाईक दर' : 'Bike Rate'
  const car = language === 'mr' ? 'कार दर' : 'Car Rate'
  return `${bike}: ${formatMoney(sale.bikeRatePerKg || sale.ratePerKg)} / ${car}: ${formatMoney(sale.carRatePerKg || sale.ratePerKg)}`
}

function combinedSaleValues(sale) {
  if (sale.category !== 'all') return { bike: 0, car: 0 }
  const bikeGross = Number(sale.bikeGrossAmount ?? (Number(sale.stockBreakdown?.bikeKg || 0) * Number(sale.bikeRatePerKg || sale.ratePerKg || 0)))
  const carGross = Number(sale.carGrossAmount ?? (Number(sale.stockBreakdown?.carKg || 0) * Number(sale.carRatePerKg || sale.ratePerKg || 0)))
  return {
    bike: Number(sale.bikeAmount ?? bikeGross),
    car: Number(sale.carAmount ?? carGross),
  }
}

function createScrapLedgerPdf(lines) {
  const clean = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1')
  const pages = []
  for (let index = 0; index < lines.length; index += 44) pages.push(lines.slice(index, index + 44))
  const fontObject = 3 + pages.length * 2
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`]
  pages.forEach((pageLines, index) => {
    const pageObject = 3 + index * 2
    const content = `BT /F1 7 Tf 28 565 Td 11 TL ${pageLines.map((line) => `(${clean(line)}) Tj T*`).join(' ')} ET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${pageObject + 1} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>')
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function scrapReportTitle(language, english, marathi) {
  return language === 'mr' ? marathi : english
}

const emptySale = {
  companyKey: '',
  company: '',
  contact: '',
  companyEmail: '',
  companyAddress: '',
  companyGstin: '',
  hsn: '',
  category: 'bike',
  quantity: '',
  weight: '',
  ratePerKg: '',
  bikeRatePerKg: '',
  carRatePerKg: '',
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
  hsn: '8507',
}

export default function ScrapStock() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const [oldBatteries, setOldBatteries] = useState(() =>
    readStorage(SALES_STORAGE_KEY).filter((sale) => sale.saleType === 'Exchange')
  )
  const [scrapSales, setScrapSales] = useState(() => readStorage(SCRAP_SALES_STORAGE_KEY))
  const [savedCompanies, setSavedCompanies] = useState(() => readStorage(SCRAP_COMPANIES_STORAGE_KEY))
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
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [ledgerDateFrom, setLedgerDateFrom] = useState('')
  const [ledgerDateTo, setLedgerDateTo] = useState('')
  const [duePaymentOpen, setDuePaymentOpen] = useState(false)
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
    savedCompanies.forEach((company) => {
      if (!company?.key || !company?.name) return
      grouped.set(company.key, {
        key: company.key,
        name: company.name,
        contact: company.contact || '',
        email: company.email || '',
        address: company.address || '',
        gstin: company.gstin || '',
        sales: [],
        totalQty: 0,
        totalKg: 0,
        totalAmount: 0,
      })
    })
    scrapSales.forEach((sale) => {
      const key = companyKeyFor(sale)
      const company = grouped.get(key) || {
        key,
        name: sale.company,
        contact: sale.contact || '',
        email: sale.companyEmail || '',
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
      if (!company.email && sale.companyEmail) company.email = sale.companyEmail
      if (!company.address && sale.companyAddress) company.address = sale.companyAddress
      if (!company.gstin && sale.companyGstin) company.gstin = sale.companyGstin
      grouped.set(key, company)
    })
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [savedCompanies, scrapSales])

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
    const phone = formatIndianPhone(customerForm.phone)
    if (!customer) return alert('Please enter the customer name.')
    if (!isValidIndianPhone(customerForm.phone)) return alert('Please enter a valid 10-digit customer phone number.')

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
        hsn: customerForm.hsn.trim() || '8507',
        oldBatteryWeight: weight,
        exchange: {
          brand: customerForm.brand.trim(),
          batteryType,
          model: customerForm.model.trim(),
          serialNumber: customerForm.serialNumber.trim().toUpperCase(),
          hsn: customerForm.hsn.trim() || '8507',
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

  function renderSalesStyleScrapReportHTML({ title, metaHtml, invoiceMetaHtml, tableHead, rows, totalsHtml, amountWords, extraHtml = '' }) {
    const copyMarkup = () => `
      <section class="bill-copy">
        <div class="header-row">
          <div class="shop-block"><h2>${SHOP.name}</h2><div><b>Address:</b> ${SHOP.address}</div><div><b>Contact:</b> ${SHOP.phone}</div><div><b>WhatsApp No:</b> ${SHOP.whatsapp}</div><div><b>GSTIN:</b> ${SHOP.gstin}</div><div><b>Email Id:</b> ${SHOP.email}</div></div>
          <div class="right-head"><img src="${new URL(scrapPrintLogo, window.location.origin).href}" alt="${SHOP.name}"/><div class="invoice-meta">${invoiceMetaHtml}</div></div>
        </div>
        <div class="party-heading">BILL TO:</div>
        <div class="party-box">${metaHtml}</div>
        <table class="items"><thead>${tableHead}</thead><tbody>${rows}</tbody></table>
        <div class="spacer"></div>
        <div class="bottom-row"><div class="amount-words"><b>AMT in word:</b><br/>${escapeHtml(amountWords)}</div><div class="totals-box">${totalsHtml}</div></div>
        ${extraHtml}
        <div class="signature"><strong>${SHOP.name}</strong></div>
      </section>`

    return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:0;font-size:9px;line-height:1.25;overflow:hidden}
      .print-page{width:100%;display:flex;gap:8mm;position:relative}
      .print-page::before{content:'';position:absolute;top:-3mm;bottom:-3mm;left:50%;border-left:1px dashed #111}
      .bill-copy{width:calc(50% - 4mm);height:194mm;padding:6mm 5.5mm 5mm;display:flex;flex-direction:column;overflow:hidden;border:1px solid #c8cdd6;border-radius:1.5mm}
      .header-row{display:grid;grid-template-columns:1.35fr 1fr;gap:6mm;margin-bottom:3mm;padding-bottom:4mm;border-bottom:1.5px solid #16243c}
      .shop-block{font-size:9px;line-height:1.45;background-color:#bfe8f7!important;box-shadow:inset 0 0 0 1000px #bfe8f7;border:1px solid #8fcfe5;border-radius:3mm;padding:3mm}
      .shop-block h2{margin:0 0 1.5mm;font-size:15px;color:#102f69;letter-spacing:.01em}
      .right-head{display:flex;flex-direction:column;align-items:stretch;gap:2mm}
      .right-head img{width:100%;height:24mm;display:block;object-fit:cover;object-position:center;border-radius:1mm}
      .invoice-meta{font-size:8.5px;line-height:1.4}
      .invoice-meta p{margin:0;display:grid;grid-template-columns:20mm 1fr;gap:1mm}
      .party-heading{font-size:10px;font-weight:800;color:#102f69;letter-spacing:.06em;margin:0 0 1.5mm}
      .party-box{display:block;padding:2.5mm 3mm;margin-bottom:3mm;font-size:9px;line-height:1.45;background:#f5f7fa;border-left:2px solid #102f69;border-radius:0 1mm 1mm 0}
      .party-box p{margin:0}
      table.items{width:100%;border-collapse:collapse;font-size:8px}
      table.items th,table.items td{border:0;border-bottom:1px solid #d1d6de;padding:1.7mm .8mm;text-align:left;vertical-align:top}
      table.items th{font-size:7.5px;font-weight:800;color:#102f69;background:#eef2f7;border-top:1px solid #aeb8c6}
      .spacer{flex:1}
      .bottom-row{display:grid;grid-template-columns:1fr 52mm;gap:6mm;align-items:end}
      .amount-words{font-size:9px;min-height:19mm}
      .totals-box{font-size:9px;border-top:1.5px solid #102f69;padding-top:1mm}
      .totals-box div{display:flex;justify-content:space-between;gap:4mm;padding:.5mm 0}
      .totals-box div:last-child{font-weight:800;font-size:10px}
      .extra-history{margin-top:2mm;max-height:29mm;overflow:hidden}
      .extra-history h3{font-size:9px;margin:0 0 1mm}
      .extra-history table{width:100%;border-collapse:collapse;font-size:6.5px}
      .extra-history th,.extra-history td{border-bottom:1px solid #bbb;padding:.7mm}
      .signature{width:53mm;margin:8mm 0 0 auto;border-top:1px solid #16243c;padding-top:2mm;text-align:center;font-size:10px;color:#102f69}
      @page{size:A4 landscape;margin:5mm}
      @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{width:287mm;height:200mm;margin:0;padding:0;overflow:hidden}.print-page{width:100%;display:flex;gap:8mm}.print-page::before{position:fixed;top:3mm;bottom:3mm;left:50%}.bill-copy{break-inside:avoid;page-break-inside:avoid}}
    </style></head><body><main class="print-page">${copyMarkup()}${copyMarkup()}</main><script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`
  }

  function printSupplierReport(supplier = selectedSupplier) {
    if (!supplier) return
    const reportTitle = scrapReportTitle(language, 'Customer Old Battery Scrap Report', 'ग्राहक जुनी बॅटरी स्क्रॅप रिपोर्ट')
    const reportWindow = window.open('', '_blank', 'width=1000,height=750')
    if (!reportWindow) return alert('Please allow pop-ups to print the report.')

    const rows = supplier.batteries.map((battery, index) => `
      <tr>
        <td>${index + 1}</td><td>${escapeHtml(battery.date || '—')}</td><td>${escapeHtml(battery.invoice || '—')}</td>
        <td>${escapeHtml(battery.brand || '—')}</td><td>${escapeHtml(batteryTypeFor(battery) || '—')}</td>
        <td>${escapeHtml(battery.model || '—')}</td><td>${escapeHtml(battery.serialNumber || '—')}</td>
        <td>${escapeHtml(battery.hsn || battery.exchange?.hsn || '8507')}</td><td>${formatNumber(battery.oldBatteryWeight || battery.exchange?.weight)} Kg</td>
      </tr>`).join('')

    reportWindow.document.write(`<!doctype html><html><head><title>${reportTitle} - ${escapeHtml(supplier.name)}</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important} body{font-family:Arial,sans-serif;color:#17213a;margin:0;padding:28px}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1769e8;padding-bottom:18px}.logo{width:155px;max-height:78px;object-fit:contain}.shop{text-align:right;background-color:#bfe8f7!important;box-shadow:inset 0 0 0 1000px #bfe8f7;border:1px solid #8fcfe5;border-radius:12px;padding:12px 15px}.shop h1{margin:0 0 5px;font-size:25px;color:#1769e8}.shop p{margin:3px 0;font-size:12px}.title{text-align:center;margin:25px 0 16px}.customer{border:1px solid #dce3ed;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.customer p{margin:0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#edf3ff;color:#263653;text-align:left}th,td{border:1px solid #cfd8e6;padding:8px}.totals{margin-top:18px;margin-left:auto;width:310px;border:1px solid #cfd8e6;padding:12px}.totals div{display:flex;justify-content:space-between;padding:5px}.footer{text-align:center;border-top:1px solid #dce3ed;margin-top:35px;padding-top:12px;font-size:11px;color:#667085}@media print{body{padding:12px}.no-print{display:none}}</style></head><body>
      <div class="header"><img class="logo" src="${mainLogo}" alt="${SHOP.name}"/><div class="shop"><h1>${SHOP.name}</h1><p>${SHOP.tagline}</p><p>${SHOP.address}</p><p>Phone: ${SHOP.phone} | WhatsApp No: ${SHOP.whatsapp}</p><p>Email: ${SHOP.email} | GSTIN: ${SHOP.gstin}</p></div></div>
      <div class="title"><h2>Customer Old Battery Scrap Report</h2><small>Printed on ${new Date().toLocaleDateString('en-IN')}</small></div>
      <div class="customer"><p><strong>Customer:</strong> ${escapeHtml(supplier.name)}</p><p><strong>Phone:</strong> ${escapeHtml(supplier.phone || '—')}</p><p><strong>Address:</strong> ${escapeHtml(supplier.address || '—')}</p><p><strong>Total Entries:</strong> ${supplier.batteries.length}</p></div>
      <table><thead><tr><th>#</th><th>Date</th><th>Invoice</th><th>Brand</th><th>Type</th><th>Model</th><th>Serial No.</th><th>HSN</th><th>Wright (KG)</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div><strong>Total Batteries</strong><strong>${supplier.batteries.length}</strong></div><div><strong>Total Weight</strong><strong>${formatNumber(supplier.totalKg)} Kg</strong></div></div>
      <div class="footer">This is a system-generated old battery scrap report from ${SHOP.name}. Contact: ${SHOP.phone}</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`)
    reportWindow.document.close()
  }

  function printCompanyReport(company, singleSale = null, ledgerEntriesOverride = null) {
    if (!company && !singleSale) return
    const effectiveCompany = company || {
      key: companyKeyFor(singleSale),
      name: singleSale.company || 'Company',
      contact: singleSale.contact || '',
      email: singleSale.companyEmail || '',
      address: singleSale.companyAddress || '',
      gstin: singleSale.companyGstin || '',
      sales: [singleSale],
    }
    company = effectiveCompany
    const reportTitle = singleSale
      ? scrapReportTitle(language, 'Company Scrap Sale Receipt', 'कंपनी स्क्रॅप विक्री पावती')
      : scrapReportTitle(language, 'Company Scrap Purchase History', 'कंपनी स्क्रॅप खरेदी इतिहास')
    const ledgerSource = singleSale ? [] : (ledgerEntriesOverride || companyPaymentLedger(company, companyPayments))
    const salesToPrint = singleSale ? [singleSale] : ledgerEntriesOverride ? ledgerSource.filter((entry) => entry.type === 'purchase') : company.sales
    const totalQty = salesToPrint.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0)
    const totalKg = salesToPrint.reduce((sum, sale) => sum + Number(sale.weight || 0), 0)
    const totalAmount = salesToPrint.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)
    const totalDue = ledgerEntriesOverride
      ? Math.max(0, ledgerSource.filter((entry) => entry.type === 'purchase').reduce((sum, entry) => sum + Number(entry.amount || entry.totalAmount || 0), 0) - ledgerSource.filter((entry) => entry.type === 'payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0))
      : salesToPrint.reduce((sum, sale) => sum + saleRemainingDue(sale, company.key, companyPayments), 0)
    const totalPaid = Math.max(0, totalAmount - totalDue)
    const reportWindow = window.open('', '_blank', 'width=1000,height=750')
    if (!reportWindow) return alert('Please allow pop-ups to print the report.')
    // Collection and sale dates belong to the in-app history only.
    const saleRows = salesToPrint.map((sale, index) => {
      return `<tr><td>${index + 1}</td><td>${escapeHtml(saleCategoryLabel(sale.category))}</td><td>${escapeHtml(sale.hsn || '—')}</td><td>${sale.quantity}</td><td>${formatNumber(sale.weight)}</td><td>${escapeHtml(saleRateLabel(sale, language))}</td><td>${formatMoney(sale.totalAmount)}</td></tr>`
    }).join('')
    const ledgerEntries = ledgerSource
    const ledgerCredit = ledgerEntries.filter((entry) => entry.type === 'payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const ledgerDebit = ledgerEntries.filter((entry) => entry.type === 'purchase').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const closingBalance = Math.max(ledgerDebit - ledgerCredit, 0)
    const ledgerRows = ledgerEntries.map((entry) => entry.type === 'purchase'
      ? `<tr><td>${escapeHtml(entry.date || '—')}</td><td><strong>${escapeHtml(saleCategoryLabel(entry.category))} (${escapeHtml(entry.invoiceNo || `SCRAP-${entry.id}`)})</strong></td><td>${entry.quantity || 0}</td><td>${escapeHtml(saleRateLabel(entry, language))}</td><td>${entry.category === 'all' ? formatMoney(combinedSaleValues(entry).bike) : '—'}</td><td>${entry.category === 'all' ? formatMoney(combinedSaleValues(entry).car) : '—'}</td><td>${formatMoney(entry.totalAmount)}</td><td>—</td><td>${formatMoney(entry.totalAmount)}</td></tr>`
      : `<tr><td>${escapeHtml(entry.date || '—')}</td><td><strong>${escapeHtml(entry.method || 'Cash')} Payment</strong></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>${formatMoney(entry.amount)}</td><td>—</td></tr>`).join('')
    const ledgerClosingRows = `<tr><td colspan="7"></td><td><strong>${formatMoney(ledgerCredit)}</strong></td><td><strong>${formatMoney(ledgerDebit)}</strong></td></tr><tr><td>By</td><td colspan="6"><strong>Closing Balance</strong></td><td><strong>${formatMoney(closingBalance)}</strong></td><td></td></tr><tr><td colspan="7"></td><td><strong>${formatMoney(ledgerCredit + closingBalance)}</strong></td><td><strong>${formatMoney(ledgerDebit)}</strong></td></tr>`
    const rows = singleSale ? saleRows : ledgerRows + ledgerClosingRows

    reportWindow.document.write(renderSalesStyleScrapReportHTML({
      title: reportTitle,
      metaHtml: `<p><strong>Company Name:</strong> ${escapeHtml(company.name)}</p><p><strong>Address:</strong> ${escapeHtml(company.address || '—')}</p><p><strong>Company GSTIN:</strong> ${escapeHtml(company.gstin || '—')}</p><p><strong>Contact No.:</strong> ${escapeHtml(company.contact || '—')}</p><p><strong>Email:</strong> ${escapeHtml(company.email || '—')}</p>`,
      invoiceMetaHtml: `<p><span>Date:</span><strong>${escapeHtml(singleSale?.date || new Date().toLocaleDateString('en-GB'))}</strong></p><p><span>Invoice No:</span><strong>${escapeHtml(singleSale?.invoiceNo || (singleSale ? `SCRAP-${singleSale.id}` : '—'))}</strong></p><p><span>Vehicle Name:</span><strong>—</strong></p><p><span>Vehicle No:</span><strong>${escapeHtml(singleSale?.vehicleNumber || '—')}</strong></p>`,
      tableHead: singleSale ? `<tr><th>Sr.</th><th>Product Description</th><th>HSN</th><th>Qty</th><th>Kg</th><th>Rate</th><th>Total</th></tr>` : '<tr><th>Date</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Bike Value</th><th>Car Value</th><th>G.Total</th><th>Credit (Payment)</th><th>Debit (Scrap Sale)</th></tr>',
      rows,
      totalsHtml: `<div><strong>Total Qty:</strong><strong>${totalQty}</strong></div><div><strong>Total Kg:</strong><strong>${formatNumber(totalKg)}</strong></div><div><strong>Paid:</strong><strong>${formatMoney(totalPaid)}</strong></div><div><strong>Due:</strong><strong>${formatMoney(totalDue)}</strong></div><div><strong>G. Total:</strong><strong>${formatMoney(totalAmount)}</strong></div>`,
      amountWords: amountInWords(totalAmount),
      extraHtml: '',
    }))
    reportWindow.document.close()
  }

  function updateSaleForm(field, value) {
    setSaleForm((previous) => ({ ...previous, [field]: value }))
  }

  function saveCompanyProfile(profile) {
    setSavedCompanies((previous) => {
      const next = [...previous.filter((company) => company.key !== profile.key), profile]
      localStorage.setItem(SCRAP_COMPANIES_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function saveCompanyDetails() {
    const name = saleForm.company.trim()
    if (!name) return alert('Please enter the company name.')

    const key = saleForm.companyKey || `company-${Date.now()}`
    const profile = {
      key,
      name,
      contact: saleForm.contact ? formatIndianPhone(saleForm.contact) : '',
      email: saleForm.companyEmail.trim(),
      address: saleForm.companyAddress.trim(),
      gstin: saleForm.companyGstin.trim().toUpperCase(),
    }
    saveCompanyProfile(profile)
    setSaleForm((previous) => ({
      ...previous,
      companyKey: key,
      company: profile.name,
      contact: profile.contact,
      companyEmail: profile.email,
      companyAddress: profile.address,
      companyGstin: profile.gstin,
    }))
    setCompanyMode('existing')
  }

  function updateCompanySelection(value) {
    const key = value.trim().toLowerCase()
    const existingCompany = companyGroups.find((company) => company.name.trim().toLowerCase() === key)

    setSaleForm((previous) => ({
      ...previous,
      company: value,
      companyKey: existingCompany?.key || '',
      ...(existingCompany
        ? {
            contact: existingCompany.contact,
            companyEmail: existingCompany.email,
            companyAddress: existingCompany.address,
            companyGstin: existingCompany.gstin,
          }
        : {}),
      // The scrap rate must be entered again for every new stock cycle.
      ratePerKg: '',
      bikeRatePerKg: '',
      carRatePerKg: '',
    }))
  }

  function changeCompanyMode(mode) {
    setCompanyMode(mode)
    setSaleForm((previous) => ({ ...previous, companyKey: '', company: '', contact: '', companyEmail: '', companyAddress: '', companyGstin: '', ratePerKg: '', bikeRatePerKg: '', carRatePerKg: '' }))
  }

  function selectExistingCompany(companyKey) {
    const company = companyGroups.find((item) => item.key === companyKey)
    setSaleForm((previous) => ({
      ...previous,
      companyKey: company?.key || '',
      company: company?.name || '',
      contact: company?.contact || '',
      companyEmail: company?.email || '',
      companyAddress: company?.address || '',
      companyGstin: company?.gstin || '',
      ratePerKg: '',
      bikeRatePerKg: '',
      carRatePerKg: '',
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
    const bikeRatePerKg = Number(saleForm.bikeRatePerKg || 0)
    const carRatePerKg = Number(saleForm.carRatePerKg || 0)
    const bikeGrossAmount = isCombined ? Number(stock.bike.availableKg || 0) * bikeRatePerKg : 0
    const carGrossAmount = isCombined ? Number(stock.other.availableKg || 0) * carRatePerKg : 0
    const grossAmount = isCombined
      ? bikeGrossAmount + carGrossAmount
      : weight * ratePerKg
    const totalAmount = grossAmount
    const bikeAmount = bikeGrossAmount
    const carAmount = carGrossAmount
    const paidAmount = Number(saleForm.paidAmount || 0)

    if (!saleForm.company.trim()) return alert('Please enter the company name.')
    if (!saleForm.hsn.trim()) return alert('Please enter the HSN number.')
    if (quantity <= 0) return alert('Please enter a valid quantity.')
    if (weight <= 0) return alert('Please enter a valid weight in Kg.')
    if (isCombined && (bikeRatePerKg <= 0 || carRatePerKg <= 0)) return alert('Please enter valid Bike and Car rates per Kg.')
    if (!isCombined && ratePerKg <= 0) return alert('Please enter a valid rate per Kg.')
    if (paidAmount < 0 || paidAmount > totalAmount) return alert('Paid amount cannot be more than the total sale amount.')

    const companyKey = saleForm.companyKey || `company-${Date.now()}`
    const companyProfile = {
      key: companyKey,
      name: saleForm.company.trim(),
      contact: saleForm.contact ? formatIndianPhone(saleForm.contact) : '',
      email: saleForm.companyEmail.trim(),
      address: saleForm.companyAddress.trim(),
      gstin: saleForm.companyGstin.trim().toUpperCase(),
    }
    const newSale = {
      id: Date.now(),
      ...saleForm,
      companyKey,
      company: saleForm.company.trim(),
      contact: saleForm.contact ? formatIndianPhone(saleForm.contact) : '',
      companyEmail: saleForm.companyEmail.trim(),
      companyAddress: saleForm.companyAddress.trim(),
      companyGstin: saleForm.companyGstin.trim().toUpperCase(),
      hsn: saleForm.hsn.trim(),
      vehicleNumber: saleForm.vehicleNumber.trim().toUpperCase(),
      notes: saleForm.notes.trim(),
      invoiceNo: `SCRAP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quantity,
      weight,
      ratePerKg,
      bikeRatePerKg,
      carRatePerKg,
      bikeGrossAmount,
      carGrossAmount,
      bikeAmount,
      carAmount,
      grossAmount,
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

    saveCompanyProfile(companyProfile)

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
  const selectedUnifiedLedger = selectedPaymentLedger.map((entry) => entry.type === 'purchase'
    ? {
        ...entry,
        description: `Scrap Sale - ${saleCategoryLabel(entry.category)} (${entry.invoiceNo || `SCRAP-${entry.id}`})`,
        quantity: Number(entry.quantity || 0),
        rate: saleRateLabel(entry),
        bikeValue: entry.category === 'all' ? combinedSaleValues(entry).bike : null,
        carValue: entry.category === 'all' ? combinedSaleValues(entry).car : null,
        grossTotal: Number(entry.grossAmount || entry.totalAmount || 0),
        grandTotal: Number(entry.totalAmount || 0),
        credit: 0,
        debit: Number(entry.totalAmount || 0),
      }
    : {
        ...entry,
        description: `${entry.method || 'Cash'} Payment`,
        quantity: null,
        rate: null,
        bikeValue: null,
        carValue: null,
        grossTotal: null,
        grandTotal: null,
        credit: Number(entry.amount || 0),
        debit: 0,
      })
  const filteredUnifiedLedger = selectedUnifiedLedger.filter((entry) =>
    (!ledgerDateFrom || entry.date >= ledgerDateFrom) && (!ledgerDateTo || entry.date <= ledgerDateTo))
  const selectedLedgerCredit = filteredUnifiedLedger.reduce((sum, entry) => sum + entry.credit, 0)
  const selectedLedgerDebit = filteredUnifiedLedger.reduce((sum, entry) => sum + entry.debit, 0)
  const selectedOutstanding = Math.max(selectedLedgerDebit - selectedLedgerCredit, 0)
  const selectedDueSale = selectedCompany?.sales.find((sale) => String(sale.id) === String(selectedDueSaleId))
  const selectedTransactionDue = selectedDueSale ? saleRemainingDue(selectedDueSale, selectedCompany.key, companyPayments) : 0
  const selectedSalePayments = selectedCompanySale ? [
    ...(Number(selectedCompanySale.paidAmount || 0) > 0 ? [{ id: `initial-${selectedCompanySale.id}`, amount: Number(selectedCompanySale.paidAmount), date: selectedCompanySale.date, method: 'At Sale' }] : []),
    ...companyPayments.filter((payment) => payment.companyKey === selectedCompany?.key && String(payment.saleId || '') === String(selectedCompanySale.id)),
  ] : []
  const selectedSalePaid = selectedSalePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const selectedSaleDueAmount = selectedCompanySale ? Math.max(0, Number(selectedCompanySale.totalAmount || 0) - selectedSalePaid) : 0
  const selectedSaleStatus = selectedSaleDueAmount <= 0.005 ? 'Paid' : selectedSalePaid > 0 ? 'Partial' : 'Due'

  function openCompanyLedger(company, selectedSale = null) {
    const companyKey = company?.key || (selectedSale ? companyKeyFor(selectedSale) : '')
    const companyName = String(company?.name || selectedSale?.company || '').trim().toLowerCase()
    const matchingSales = scrapSales.filter((sale) => {
      const sameKey = companyKey && companyKeyFor(sale) === companyKey
      const sameLegacyName = companyName && String(sale.company || '').trim().toLowerCase() === companyName
      return sameKey || sameLegacyName
    })
    const resolvedCompany = {
      ...(company || {}),
      key: companyKey || companyKeyFor(selectedSale || {}),
      name: company?.name || selectedSale?.company || 'Company',
      contact: company?.contact || selectedSale?.contact || '',
      email: company?.email || selectedSale?.companyEmail || '',
      address: company?.address || selectedSale?.companyAddress || '',
      gstin: company?.gstin || selectedSale?.companyGstin || '',
      sales: matchingSales.length ? matchingSales : selectedSale ? [selectedSale] : (company?.sales || []),
    }
    setSelectedCompany(resolvedCompany)
    setLedgerDateFrom('')
    setLedgerDateTo('')
    setSelectedDueSaleId(null)
    setLedgerOpen(true)
  }

  function openDuePayment(company, sale) {
    const historyModal = document.getElementById('companyHistoryModal')
    if (historyModal && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(historyModal).hide()
    setSelectedCompany(company)
    setSelectedDueSaleId(sale.id)
    setPaymentForm({ amount: '', method: 'Cash' })
    setDuePaymentOpen(true)
  }

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
    setDuePaymentOpen(false)
  }

  function printScrapLedger() {
    if (!selectedCompany) return
    printCompanyReport(selectedCompany, null, filteredUnifiedLedger)
  }

  async function shareScrapLedgerPdf() {
    if (!selectedCompany) return
    const lines = ['KALYANKAR BATTERIES - SCRAP SALE LEDGER', `Company: ${selectedCompany.name}`, `Period: ${ledgerDateFrom || 'Beginning'} to ${ledgerDateTo || 'Today'}`, '', 'Date       Description                         Qty   Rate                 G.Total       Payment Credit  Scrap Sale Debit', ...filteredUnifiedLedger.map((entry) => `${String(entry.date || '-').padEnd(11)}${String(entry.description).slice(0, 35).padEnd(36)}${String(entry.quantity ?? '-').padEnd(6)}${String(entry.rate ?? '-').slice(0, 20).padEnd(21)}${String(entry.grandTotal === null ? '-' : formatMoney(entry.grandTotal)).padEnd(14)}${String(entry.credit ? formatMoney(entry.credit) : '-').padEnd(15)}${entry.debit ? formatMoney(entry.debit) : '-'}`), '', `Payments Received: ${formatMoney(selectedLedgerCredit)}`, `Scrap Sale Total: ${formatMoney(selectedLedgerDebit)}`, `Closing Balance (Company Due): ${formatMoney(selectedOutstanding)}`]
    const safeName = String(selectedCompany.name || 'Company').replace(/[\\/:*?"<>|]/g, '-')
    const fileName = `${safeName}-${new Date().toLocaleDateString('en-CA')}.pdf`
    const file = new File([createScrapLedgerPdf(lines)], fileName, { type: 'application/pdf' })
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: `${selectedCompany.name} Scrap Sale Ledger`, files: [file] }); return }
    } catch (error) { if (error?.name === 'AbortError') return }
    const url = URL.createObjectURL(file)
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    alert('The ledger PDF was downloaded. Please attach it in WhatsApp.')
  }

  return (
    <>
      <Topbar title="Scrap Stock" subtitle="Old battery stock and company sales management" />

      <style>{`
        input[type='number'] { appearance: textfield; -moz-appearance: textfield; }
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

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
        .scrap-stock-summary { background: #f8f9fa !important; color: #27354d; }
        .scrap-stock-summary strong { color: #27354d; }
        :root[data-theme='dark'] .scrap-stock-summary { background: #243044 !important; color: #f1f5f9; border: 1px solid #43516a; }
        :root[data-theme='dark'] .scrap-stock-summary small,
        :root[data-theme='dark'] .scrap-stock-summary .text-muted { color: #b9c7dc !important; }
        :root[data-theme='dark'] .scrap-stock-summary strong { color: #ffffff !important; }
        :root[data-theme='dark'] .scrap-stock-summary .border-top { border-color: #52617a !important; }
        .ledger-date-panel { background: #f8f9fa; color: #27354d; border-color: #dce3ee !important; }
        .ledger-date-panel h6, .ledger-date-panel .form-label { color: #27354d; }
        :root[data-theme='dark'] .ledger-date-panel { background: #243044 !important; color: #f1f5f9; border-color: #43516a !important; }
        :root[data-theme='dark'] .ledger-date-panel h6 { color: #ffffff !important; }
        :root[data-theme='dark'] .ledger-date-panel .form-label { color: #c8d5e8 !important; }
        @media (max-width: 900px) { .scrap-category-row { grid-template-columns: 1fr 1fr; } .scrap-stat-box { border-left: 0; padding-left: 0; } }
      `}</style>

      <main className="scrap-page">
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Present Quantity</small><h4>{totalStock.quantity}</h4><span className="stat-change stat-muted">Bike and car batteries</span></div><div className="stat-icon icon-navy"><i className="fa-solid fa-car-battery"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Present Wright (KG)</small><h4 className="text-success">{formatNumber(totalStock.weight)} KG</h4><span className="stat-change stat-muted">Total scrap available</span></div><div className="stat-icon icon-green"><i className="fa-solid fa-weight-hanging"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Bike Battery Stock</small><h4>{stock.bike.availableQty} Qty</h4><span className="stat-change stat-muted">{formatNumber(stock.bike.availableKg)} Kg available</span></div><div className="stat-icon icon-orange"><i className="fa-solid fa-motorcycle"></i></div></div></div>
          <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>Car Battery Stock</small><h4>{stock.other.availableQty} Qty</h4><span className="stat-change stat-muted">{formatNumber(stock.other.availableKg)} Kg available</span></div><div className="stat-icon icon-red"><i className="fa-solid fa-car"></i></div></div></div>
        </div>

        <div className="mb-3">
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
                <thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Battery Type</th><th>Old Batteries</th><th>Wright (KG)</th><th>Actions</th></tr></thead>
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
              <thead><tr><th>Date</th><th>Company</th><th>Address / Phone</th><th>Scrap Type</th><th>Quantity</th><th>Wright (KG)</th><th>Bike Rate / Value</th><th>Car Rate / Value</th><th>Total Amount</th><th>Paid Amount</th><th>Due Amount</th><th>Status</th><th>Action</th></tr></thead>
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
                  <td>{sale.quantity} Qty</td><td><strong>{formatNumber(sale.weight)} Kg</strong></td><td>{sale.category === 'all' || sale.category === 'bike' ? <><strong>{formatMoney(sale.bikeRatePerKg || sale.ratePerKg)} / KG</strong><div className="scrap-muted small">Value: {formatMoney(sale.category === 'all' ? combinedSaleValues(sale).bike : sale.totalAmount)}</div></> : '—'}</td><td>{sale.category === 'all' || sale.category !== 'bike' ? <><strong>{formatMoney(sale.carRatePerKg || sale.ratePerKg)} / KG</strong><div className="scrap-muted small">Value: {formatMoney(sale.category === 'all' ? combinedSaleValues(sale).car : sale.totalAmount)}</div></> : '—'}</td><td><strong>{formatMoney(sale.totalAmount)}</strong></td><td className="text-success">{formatMoney(paid)}</td><td className="text-danger fw-bold">{formatMoney(due)}</td>
                  <td><span className={`badge rounded-pill px-3 ${status === 'Paid' ? 'text-bg-success' : status === 'Partial' ? 'text-bg-warning' : 'text-bg-danger'}`}>{status}</span></td>
                  <td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" title="See scrap sale details" data-bs-toggle="modal" data-bs-target="#companyHistoryModal" onClick={() => { setSelectedCompany(company); setSelectedCompanySale(sale); setSelectedDueSaleId(null) }}><i className="fa-solid fa-eye me-1"></i>See</button><button className="btn btn-sm btn-outline-secondary" title="Open company ledger" onClick={() => openCompanyLedger(company, sale)}><i className="fa-solid fa-book-open me-1"></i>Ledger</button>{due > 0.005 && <button className="btn btn-sm btn-outline-success" title="Record payment" onClick={() => openDuePayment(company, sale)}><i className="fa-solid fa-money-bill-wave"></i></button>}<button className="btn btn-sm btn-outline-primary" title="Print sale" onClick={() => printCompanyReport(company, sale)}><i className="fa-solid fa-print"></i></button><button className="btn btn-sm btn-outline-danger" title="Delete sale" onClick={() => deleteScrapSale(sale.id)}><i className="fa-solid fa-trash"></i></button></div></td>
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
                <div className="col-md-4"><label className="form-label">Wright (KG) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={customerForm.weight} onChange={(event) => setCustomerForm({ ...customerForm, weight: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Received Date *</label><input type="date" className="form-control" required value={customerForm.date} onChange={(event) => setCustomerForm({ ...customerForm, date: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Invoice Number</label><input className="form-control" value={customerForm.invoice} onChange={(event) => setCustomerForm({ ...customerForm, invoice: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Battery Brand</label><input className="form-control" value={customerForm.brand} onChange={(event) => setCustomerForm({ ...customerForm, brand: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Battery Model</label><input className="form-control" value={customerForm.model} onChange={(event) => setCustomerForm({ ...customerForm, model: event.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Serial Number</label><input className="form-control text-uppercase" value={customerForm.serialNumber} onChange={(event) => setCustomerForm({ ...customerForm, serialNumber: event.target.value })} /></div><div className="col-md-4"><label className="form-label">HSN Number</label><input className="form-control" value={customerForm.hsn} onChange={(event) => setCustomerForm({ ...customerForm, hsn: event.target.value.replace(/\D/g, '') })} /></div>
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
                <div className="col-12"><label className="form-label">Select Saved Company *</label><select className="form-select" required value={saleForm.companyKey} onChange={(e) => selectExistingCompany(e.target.value)}><option value="">Select selling company</option>{companyGroups.map((company) => <option key={company.key} value={company.key}>{company.name} - {company.contact || 'No contact'}</option>)}</select><small className="text-muted">Select a company, edit its details if needed, then save the changes.</small></div>
                <div className="col-md-6"><label className="form-label">Company Name</label><input className="form-control" value={saleForm.company} onChange={(e) => updateSaleForm('company', e.target.value)} /></div><div className="col-md-6"><label className="form-label">Contact Number (Optional)</label><input className="form-control" value={saleForm.contact} onChange={(e) => updateSaleForm('contact', e.target.value.replace(/\D/g, ''))} /></div><div className="col-md-6"><label className="form-label">Company Email (Optional)</label><input type="email" className="form-control" value={saleForm.companyEmail} onChange={(e) => updateSaleForm('companyEmail', e.target.value)} /></div><div className="col-md-6"><label className="form-label">Company Address</label><input className="form-control" value={saleForm.companyAddress} onChange={(e) => updateSaleForm('companyAddress', e.target.value)} /></div><div className="col-md-4"><label className="form-label">Company GSTIN</label><input className="form-control text-uppercase" maxLength="15" value={saleForm.companyGstin} onChange={(e) => updateSaleForm('companyGstin', e.target.value)} /></div><div className="col-12"><button type="button" className="btn btn-outline-primary" onClick={saveCompanyDetails}><i className="fa-solid fa-floppy-disk me-2"></i>Save Company Details</button></div>
              </> : <>
                <div className="col-md-6"><label className="form-label">Company Name *</label><input className="form-control" required value={saleForm.company} onChange={(e) => updateCompanySelection(e.target.value)} placeholder="Enter new company name" /></div><div className="col-md-6"><label className="form-label">Contact Number (Optional)</label><input className="form-control" value={saleForm.contact} onChange={(e) => updateSaleForm('contact', e.target.value.replace(/\D/g, ''))} placeholder="Optional" /></div><div className="col-md-6"><label className="form-label">Company Email (Optional)</label><input type="email" className="form-control" value={saleForm.companyEmail} onChange={(e) => updateSaleForm('companyEmail', e.target.value)} placeholder="company@example.com" /></div><div className="col-md-6"><label className="form-label">Company Address</label><input className="form-control" value={saleForm.companyAddress} onChange={(e) => updateSaleForm('companyAddress', e.target.value)} placeholder="Enter company address" /></div><div className="col-md-4"><label className="form-label">Company GSTIN</label><input className="form-control text-uppercase" maxLength="15" value={saleForm.companyGstin} onChange={(e) => updateSaleForm('companyGstin', e.target.value)} placeholder="Optional" /></div><div className="col-12"><button type="button" className="btn btn-outline-primary" onClick={saveCompanyDetails}><i className="fa-solid fa-floppy-disk me-2"></i>Save Company Details</button><small className="text-muted ms-2">Save now to use this company later without creating a sale.</small></div>
              </>}
              <div className="col-md-4"><label className="form-label">HSN Number *</label><input className="form-control" required value={saleForm.hsn} onChange={(e) => updateSaleForm('hsn', e.target.value.replace(/\D/g, ''))} placeholder="Enter HSN number" /></div>
              {saleForm.category === 'all' ? <><div className="col-md-4"><label className="form-label">Bike Rate per Kg (₹) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={saleForm.bikeRatePerKg} onChange={(e) => updateSaleForm('bikeRatePerKg', e.target.value)} /></div><div className="col-md-4"><label className="form-label">Car Rate per Kg (₹) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={saleForm.carRatePerKg} onChange={(e) => updateSaleForm('carRatePerKg', e.target.value)} /></div></> : <div className="col-md-4"><label className="form-label">Rate per Kg (₹) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={saleForm.ratePerKg} onChange={(e) => updateSaleForm('ratePerKg', e.target.value)} /></div>}
              {saleForm.category === 'all' && <>
                <div className="col-md-6"><label className="form-label">Bike Value</label><input className="form-control fw-bold" readOnly value={formatMoney(Number(stock.bike.availableKg || 0) * Number(saleForm.bikeRatePerKg || 0))} /><small className="text-muted">{formatNumber(stock.bike.availableKg)} KG × {formatMoney(saleForm.bikeRatePerKg || 0)}</small></div>
                <div className="col-md-6"><label className="form-label">Car Value</label><input className="form-control fw-bold" readOnly value={formatMoney(Number(stock.other.availableKg || 0) * Number(saleForm.carRatePerKg || 0))} /><small className="text-muted">{formatNumber(stock.other.availableKg)} KG × {formatMoney(saleForm.carRatePerKg || 0)}</small></div>
              </>}
              <div className="col-md-6"><label className="form-label">Automatic Total Amount</label><input className="form-control" readOnly value={formatMoney(scrapSaleGrossAmount(saleForm, stock))} /></div>
              <div className="col-md-6"><label className="form-label">Amount Paid by Company</label><input type="number" min="0" step="0.01" className="form-control" value={saleForm.paidAmount} onChange={(e) => updateSaleForm('paidAmount', e.target.value)} placeholder="Enter received amount" /><small className="text-muted">Enter 0 when no payment is received.</small></div>
              <div className="col-md-6"><label className="form-label">Automatic Due Amount</label><input className="form-control fw-bold text-danger" readOnly value={formatMoney(Math.max(0, scrapSaleGrossAmount(saleForm, stock) - Number(saleForm.paidAmount || 0)))} /><small className="text-muted">Total amount minus the amount paid.</small></div>
              <div className="col-12"><div className="scrap-stock-summary p-3 rounded-3"><div className="row g-2"><div className="col-md-3"><small className="text-muted">Stock Included</small><strong className="d-block">{saleCategoryLabel(saleForm.category)}</strong></div><div className="col-md-3"><small className="text-muted">Total Quantity</small><strong className="d-block">{saleForm.quantity} Qty</strong></div><div className="col-md-3"><small className="text-muted">Total Weight</small><strong className="d-block">{formatNumber(saleForm.weight)} Kg</strong></div><div className="col-md-3"><small className="text-muted">Stock Period</small><strong className="d-block">{saleForm.stockFromDate || '—'} to {saleForm.stockToDate || '—'}</strong></div></div>{saleForm.category === 'all' && <div className="mt-2 pt-2 border-top small text-muted">Bike: <strong>{stock.bike.availableQty} Qty / {formatNumber(stock.bike.availableKg)} Kg</strong> &nbsp; + &nbsp; Car: <strong>{stock.other.availableQty} Qty / {formatNumber(stock.other.availableKg)} Kg</strong></div>}</div></div>
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
            <div className="table-responsive"><table className="table scrap-table"><thead><tr><th>Date / Invoice</th><th>Battery</th><th>Serial Number</th><th>Wright (KG)</th><th>Vehicle</th></tr></thead><tbody>
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
            <div className="col-md-6"><div className="scrap-detail-card h-100"><div className="scrap-detail-title">Company and Invoice</div><div className="scrap-detail-row"><span>Invoice Number</span><strong>{selectedCompanySale.invoiceNo || `SCRAP-${selectedCompanySale.id}`}</strong></div><div className="scrap-detail-row"><span>Company</span><strong>{selectedCompanySale.company || '—'}</strong></div><div className="scrap-detail-row"><span>Phone</span><strong>{selectedCompanySale.contact || '—'}</strong></div><div className="scrap-detail-row"><span>Email</span><strong>{selectedCompanySale.companyEmail || '—'}</strong></div><div className="scrap-detail-row"><span>Address</span><strong>{selectedCompanySale.companyAddress || '—'}</strong></div><div className="scrap-detail-row"><span>GSTIN</span><strong>{selectedCompanySale.companyGstin || '—'}</strong></div><div className="scrap-detail-row"><span>HSN Number</span><strong>{selectedCompanySale.hsn || '—'}</strong></div><div className="scrap-detail-row"><span>Date</span><strong>{selectedCompanySale.date || '—'}</strong></div><div className="scrap-detail-row"><span>Status</span><strong><span className={`scrap-status ${selectedSaleStatus === 'Paid' ? 'text-bg-success' : selectedSaleStatus === 'Partial' ? 'text-bg-warning' : 'text-bg-danger'}`}>{selectedSaleStatus}</span></strong></div></div></div>
            <div className="col-md-6"><div className="scrap-detail-card h-100"><div className="scrap-detail-title green">Scrap Stock Details</div><div className="scrap-detail-row"><span>Scrap Type</span><strong>{saleCategoryLabel(selectedCompanySale.category)}</strong></div><div className="scrap-detail-row"><span>Quantity</span><strong>{selectedCompanySale.quantity} Qty</strong></div><div className="scrap-detail-row"><span>Total Weight</span><strong>{formatNumber(selectedCompanySale.weight)} Kg</strong></div><div className="scrap-detail-row"><span>Stock From</span><strong>{selectedCompanySale.stockFromDate || '—'}</strong></div><div className="scrap-detail-row"><span>Stock Until</span><strong>{selectedCompanySale.stockToDate || '—'}</strong></div>{selectedCompanySale.stockBreakdown && <><div className="scrap-detail-row"><span>Bike Batteries</span><strong>{selectedCompanySale.stockBreakdown.bikeQty || 0} Qty / {formatNumber(selectedCompanySale.stockBreakdown.bikeKg)} Kg</strong></div><div className="scrap-detail-row"><span>Car Batteries</span><strong>{selectedCompanySale.stockBreakdown.carQty || 0} Qty / {formatNumber(selectedCompanySale.stockBreakdown.carKg)} Kg</strong></div></>}</div></div>
            <div className="col-12"><div className="scrap-detail-card"><div className="scrap-detail-title">Payment Summary</div><div className="scrap-detail-row"><span>Quantity</span><strong>{selectedCompanySale.quantity} Qty</strong></div><div className="scrap-detail-row"><span>Weight</span><strong>{formatNumber(selectedCompanySale.weight)} Kg</strong></div>{selectedCompanySale.category === 'all' ? <><div className="scrap-detail-row"><span>Bike Rate per Kg</span><strong>{formatMoney(selectedCompanySale.bikeRatePerKg || selectedCompanySale.ratePerKg)}</strong></div><div className="scrap-detail-row"><span>Bike Value</span><strong>{formatNumber(selectedCompanySale.stockBreakdown?.bikeKg)} KG × {formatMoney(selectedCompanySale.bikeRatePerKg || 0)} = {formatMoney(combinedSaleValues(selectedCompanySale).bike)}</strong></div><div className="scrap-detail-row"><span>Car Rate per Kg</span><strong>{formatMoney(selectedCompanySale.carRatePerKg || selectedCompanySale.ratePerKg)}</strong></div><div className="scrap-detail-row"><span>Car Value</span><strong>{formatNumber(selectedCompanySale.stockBreakdown?.carKg)} KG × {formatMoney(selectedCompanySale.carRatePerKg || 0)} = {formatMoney(combinedSaleValues(selectedCompanySale).car)}</strong></div></> : <div className="scrap-detail-row"><span>Rate per Kg</span><strong>{formatMoney(selectedCompanySale.ratePerKg)}</strong></div>}<div className="scrap-detail-row"><span>Paid Amount</span><strong className="text-success">{formatMoney(selectedSalePaid)}</strong></div><div className="scrap-detail-row"><span>Due Amount</span><strong className="text-danger">{formatMoney(selectedSaleDueAmount)}</strong></div><div className="scrap-detail-row"><span className="fw-bold">Grand Total</span><strong className="text-primary fs-5">{formatMoney(selectedCompanySale.totalAmount)}</strong></div></div></div>
            <div className="col-12"><div className="scrap-detail-card"><div className="scrap-detail-title">Payment History</div>{selectedSalePayments.length ? <div className="table-responsive"><table className="table table-sm mb-0"><thead><tr><th>#</th><th>Amount Paid</th><th>Date Paid</th><th>Method</th></tr></thead><tbody>{selectedSalePayments.map((payment, index) => <tr key={payment.id || index}><td>{index + 1}</td><td>{formatMoney(payment.amount)}</td><td>{payment.date || '—'}</td><td>{payment.method || '—'}</td></tr>)}</tbody></table></div> : <p className="text-muted mb-0">No payments recorded yet.</p>}</div></div>
          </div>}</div>
          <div className="modal-footer"><button className="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>{selectedCompanySale && selectedSaleDueAmount > 0.005 && <button className="btn btn-success" onClick={() => openDuePayment(selectedCompany, selectedCompanySale)}><i className="fa-solid fa-money-bill-wave me-2"></i>Record Payment</button>}<button className="btn btn-primary" onClick={() => printCompanyReport(selectedCompany, selectedCompanySale)}><i className="fa-solid fa-print me-2"></i>Print Invoice</button></div>
        </div></div>
      </div>

      {ledgerOpen && <div className="modal d-block" id="scrapCompanyLedgerModal" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, .5)' }}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div className="modal-content border-0 rounded-4">
          <div className="modal-header"><h5 className="modal-title fw-bold"><i className="fa-solid fa-file-invoice text-primary me-2"></i>Company Details</h5><button type="button" className="btn-close" onClick={() => setLedgerOpen(false)}></button></div>
          <div className="modal-body">
            <div className="row g-3 mb-4"><div className="col-lg-7"><table className="table table-sm mb-0 h-100"><tbody><tr><th style={{width:'35%'}}>Company Name</th><td>{selectedCompany?.name || '—'}</td></tr><tr><th>Address</th><td>{selectedCompany?.address || '—'}</td></tr><tr><th>Contact</th><td>{selectedCompany?.contact || '—'}</td></tr><tr><th>Email</th><td>{selectedCompany?.email || '—'}</td></tr><tr><th>GSTIN</th><td>{selectedCompany?.gstin || '—'}</td></tr></tbody></table></div><div className="col-lg-5"><div className="ledger-date-panel border rounded p-3 h-100"><h6 className="fw-bold mb-3"><i className="fa-solid fa-calendar-days me-2"></i>Select Ledger Date Range</h6><div className="row g-2"><div className="col-sm-6"><label className="form-label small">From Date</label><input type="date" className="form-control" value={ledgerDateFrom} max={ledgerDateTo || undefined} onChange={(e) => setLedgerDateFrom(e.target.value)} /></div><div className="col-sm-6"><label className="form-label small">To Date</label><input type="date" className="form-control" value={ledgerDateTo} min={ledgerDateFrom || undefined} onChange={(e) => setLedgerDateTo(e.target.value)} /></div></div><div className="d-flex flex-wrap gap-2 mt-3"><button type="button" className="btn btn-sm btn-primary" onClick={printScrapLedger}><i className="fa-solid fa-print me-2"></i>Print Ledger</button><button type="button" className="btn btn-sm btn-success" onClick={shareScrapLedgerPdf}><i className="fa-brands fa-whatsapp me-2"></i>Share PDF on WhatsApp</button></div></div></div></div>
            <div className="d-flex flex-wrap gap-2 mb-3">{selectedCompanyLedger.map((sale) => { const due = saleRemainingDue(sale, selectedCompany?.key, companyPayments); return due > 0.005 && <button key={sale.id} className="btn btn-sm btn-outline-success" onClick={() => openDuePayment(selectedCompany, sale)}><i className="fa-solid fa-money-bill-wave me-1"></i>Pay {formatMoney(due)} for {sale.invoiceNo || `SCRAP-${sale.id}`}</button> })}</div>
            <h5 className="fw-bold mb-2">Scrap Purchase Ledger</h5>
            <div className="table-responsive"><table className="table scrap-table"><thead><tr><th>Date</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Bike Value</th><th>Car Value</th><th>G.Total</th><th>Credit (Payment)</th><th>Debit (Scrap Sale)</th></tr></thead><tbody>{filteredUnifiedLedger.map((entry) => <tr key={`${entry.type}-${entry.id}`}><td>{entry.date || '—'}</td><td><strong>{entry.description}</strong></td><td>{entry.quantity ?? '—'}</td><td>{entry.rate ?? '—'}</td><td>{entry.bikeValue === null ? '—' : formatMoney(entry.bikeValue)}</td><td>{entry.carValue === null ? '—' : formatMoney(entry.carValue)}</td><td>{entry.grandTotal === null ? '—' : formatMoney(entry.grandTotal)}</td><td>{entry.credit ? formatMoney(entry.credit) : '—'}</td><td>{entry.debit ? formatMoney(entry.debit) : '—'}</td></tr>)}{!filteredUnifiedLedger.length && <tr><td colSpan="9" className="text-center text-muted py-4">No scrap transactions found for the selected date range.</td></tr>}</tbody><tfoot className="table-light"><tr><td colSpan="7"></td><th>{formatMoney(selectedLedgerCredit)}</th><th>{formatMoney(selectedLedgerDebit)}</th></tr><tr><th>By</th><th colSpan="6">Closing Balance (Company Due)</th><th>{formatMoney(selectedOutstanding)}</th><td></td></tr><tr className="border-top border-2"><td colSpan="7"></td><th>{formatMoney(selectedLedgerCredit + selectedOutstanding)}</th><th>{formatMoney(selectedLedgerDebit)}</th></tr></tfoot></table></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setLedgerOpen(false)}>Close</button></div>
        </div></div>
      </div>}

      {duePaymentOpen && <div className="modal d-block" id="scrapDuePaymentModal" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, .58)', zIndex: 1065 }}>
        <div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 rounded-4 overflow-hidden">
          <form onSubmit={saveDuePayment}>
            <div className="modal-header px-4 py-3"><h5 className="modal-title fw-bold"><i className="fa-solid fa-money-bill-wave text-success me-2"></i>Record Payment</h5><button type="button" className="btn-close" onClick={() => setDuePaymentOpen(false)}></button></div>
            <div className="modal-body p-4">
              <h5 className="fw-bold mb-3">{selectedDueSale?.invoiceNo || (selectedDueSale ? `SCRAP-${selectedDueSale.id}` : 'Scrap Sale')} <span className="text-muted fw-normal">— {selectedCompany?.name || 'Company'}</span></h5>
              <div className="text-danger fs-5 mb-4">Current Due: {formatMoney(selectedTransactionDue)}</div>
              <label className="form-label fw-bold">Amount Paying Now (₹) <span className="text-danger">*</span></label>
              <input autoFocus type="number" min="0.01" max={selectedTransactionDue || undefined} step="0.01" required className="form-control form-control-lg mb-4" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <label className="form-label fw-bold">Payment Method <span className="text-danger">*</span></label>
              <select className="form-select form-select-lg" required value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option><option>Other</option></select>
              <small className="text-muted d-block mt-2">Today's date will be recorded automatically as the payment date.</small>
            </div>
            <div className="modal-footer px-4 py-3"><button type="button" className="btn btn-outline-secondary" onClick={() => setDuePaymentOpen(false)}>Cancel</button><button type="submit" className="btn btn-success"><i className="fa-solid fa-check me-2"></i>Save Payment</button></div>
          </form>
        </div></div>
      </div>}
    </>
  )
}

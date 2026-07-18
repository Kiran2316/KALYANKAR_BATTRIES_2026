import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const SCRAP_SALES_STORAGE_KEY = 'kalyankar-scrap-sales'
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
  const [activeStockDetails, setActiveStockDetails] = useState(null)
  const [detailSearch, setDetailSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
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
    const rows = salesToPrint.map((sale, index) => `<tr><td>${index + 1}</td><td>${saleCategoryLabel(sale.category)}</td><td>${sale.quantity}</td><td>${formatNumber(sale.weight)} Kg</td><td>${formatMoney(sale.ratePerKg)}</td><td>${formatMoney(sale.totalAmount)}</td></tr>`).join('')

    reportWindow.document.write(`<!doctype html><html><head><title>Company Scrap Sale - ${escapeHtml(company.name)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17213a;margin:0;padding:28px}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1769e8;padding-bottom:18px}.logo{width:155px;max-height:78px;object-fit:contain}.shop{text-align:right}.shop h1{margin:0 0 5px;font-size:25px;color:#1769e8}.shop p{margin:3px 0;font-size:12px}.title{text-align:center;margin:25px 0 16px}.company{border:1px solid #dce3ed;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.company p{margin:0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf3ff;color:#263653;text-align:left}th,td{border:1px solid #cfd8e6;padding:8px}.totals{margin-top:18px;margin-left:auto;width:330px;border:1px solid #cfd8e6;padding:12px}.totals div{display:flex;justify-content:space-between;padding:5px}.footer{text-align:center;border-top:1px solid #dce3ed;margin-top:35px;padding-top:12px;font-size:11px;color:#667085}@media print{body{padding:12px}}</style></head><body>
      <div class="header"><img class="logo" src="${mainLogo}"/><div class="shop"><h1>${SHOP.name}</h1><p>${SHOP.tagline}</p><p>${SHOP.address}</p><p>Phone: ${SHOP.phone} | Email: ${SHOP.email}</p><p>GSTIN: ${SHOP.gstin}</p></div></div>
      <div class="title"><h2>${singleSale ? 'Company Scrap Sale Receipt' : 'Company Scrap Purchase History'}</h2></div>
      <div class="company"><p><strong>Company:</strong> ${escapeHtml(company.name)}</p><p><strong>Contact:</strong> ${escapeHtml(company.contact || '—')}</p><p><strong>Address:</strong> ${escapeHtml(company.address || '—')}</p><p><strong>GSTIN:</strong> ${escapeHtml(company.gstin || '—')}</p></div>
      <table><thead><tr><th>#</th><th>Category</th><th>Quantity</th><th>Weight</th><th>Rate/Kg</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div><strong>Total Quantity</strong><strong>${totalQty}</strong></div><div><strong>Total Weight</strong><strong>${formatNumber(totalKg)} Kg</strong></div><div><strong>Total Amount</strong><strong>${formatMoney(totalAmount)}</strong></div></div>
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

    if (!saleForm.company.trim()) return alert('Please enter the company name.')
    if (quantity <= 0) return alert('Please enter a valid quantity.')
    if (weight <= 0) return alert('Please enter a valid weight in Kg.')
    if (ratePerKg <= 0) return alert('Please enter a valid rate per Kg.')

    const newSale = {
      id: Date.now(),
      ...saleForm,
      company: saleForm.company.trim(),
      contact: saleForm.contact.trim(),
      companyAddress: saleForm.companyAddress.trim(),
      companyGstin: saleForm.companyGstin.trim().toUpperCase(),
      vehicleNumber: saleForm.vehicleNumber.trim().toUpperCase(),
      notes: saleForm.notes.trim(),
      quantity,
      weight,
      ratePerKg,
      totalAmount: weight * ratePerKg,
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
            <div><h5>Scrap Sold to Companies</h5><small className="scrap-muted">Bike and car stock are sold together in one complete sale</small></div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="scrap-muted">{companyGroups.length} companies · {scrapSales.length} sales</span>
              <button disabled={totalStock.quantity <= 0 || totalStock.weight <= 0} className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addScrapSaleModal" onClick={() => openCompanySale('all')}><i className="fa-solid fa-truck me-2"></i>Sell All Scrap to Company</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table scrap-table">
              <thead><tr><th>Company</th><th>Contact / GSTIN</th><th>Purchases</th><th>Total Quantity</th><th>Total Weight</th><th>Total Amount</th><th>Actions</th></tr></thead>
              <tbody>{companyGroups.map((company) => (
                <tr key={company.key}>
                  <td><strong>{company.name}</strong><div className="scrap-muted small">{company.address || '—'}</div></td><td>{company.contact || '—'}<div className="scrap-muted small">{company.gstin || ''}</div></td><td>{company.sales.length}</td><td>{company.totalQty}</td><td><strong>{formatNumber(company.totalKg)} Kg</strong></td><td><strong>{formatMoney(company.totalAmount)}</strong></td>
                  <td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#companyHistoryModal" onClick={() => setSelectedCompany(company)}><i className="fa-solid fa-eye me-1"></i>See</button><button className="btn btn-sm btn-primary" onClick={() => printCompanyReport(company)}><i className="fa-solid fa-print me-1"></i>Print History</button></div></td>
                </tr>
              ))}</tbody>
            </table>
            {companyGroups.length === 0 && <div className="scrap-empty">No company scrap sales have been added yet.</div>}
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
            <div className="modal-header"><div><h5 className="modal-title fw-bold">Sell Scrap to Company</h5><small className="text-muted">Enter company information and rate; stock details are automatic</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-md-6"><label className="form-label">Company Name *</label><input className="form-control" list="scrapCompanyOptions" required value={saleForm.company} onChange={(e) => updateCompanySelection(e.target.value)} placeholder="Select or enter company" /><datalist id="scrapCompanyOptions">{companyGroups.map((company) => <option key={company.key} value={company.name}>{company.contact}</option>)}</datalist><small className="text-muted">Selecting an existing company fills its saved details automatically.</small></div>
              <div className="col-md-6"><label className="form-label">Contact Number *</label><input className="form-control" required value={saleForm.contact} onChange={(e) => updateSaleForm('contact', e.target.value)} /></div>
              <div className="col-md-8"><label className="form-label">Company Address</label><input className="form-control" value={saleForm.companyAddress} onChange={(e) => updateSaleForm('companyAddress', e.target.value)} /></div>
              <div className="col-md-4"><label className="form-label">Company GSTIN</label><input className="form-control text-uppercase" maxLength="15" value={saleForm.companyGstin} onChange={(e) => updateSaleForm('companyGstin', e.target.value)} /></div>
              <div className="col-md-6"><label className="form-label">Rate per Kg (₹) *</label><input type="number" min="0.01" step="0.01" className="form-control" required value={saleForm.ratePerKg} onChange={(e) => updateSaleForm('ratePerKg', e.target.value)} /></div>
              <div className="col-md-6"><label className="form-label">Automatic Total Amount</label><input className="form-control" readOnly value={formatMoney(Number(saleForm.weight || 0) * Number(saleForm.ratePerKg || 0))} /></div>
              <div className="col-12"><div className="p-3 rounded-3 bg-light"><div className="row g-2"><div className="col-md-3"><small className="text-muted">Stock Included</small><strong className="d-block">{saleCategoryLabel(saleForm.category)}</strong></div><div className="col-md-3"><small className="text-muted">Total Quantity</small><strong className="d-block">{saleForm.quantity} Qty</strong></div><div className="col-md-3"><small className="text-muted">Total Weight</small><strong className="d-block">{formatNumber(saleForm.weight)} Kg</strong></div><div className="col-md-3"><small className="text-muted">Stock Period</small><strong className="d-block">{saleForm.stockFromDate || '—'} to {saleForm.stockToDate || '—'}</strong></div></div>{saleForm.category === 'all' && <div className="mt-2 pt-2 border-top small text-muted">Bike: <strong>{stock.bike.availableQty} Qty / {formatNumber(stock.bike.availableKg)} Kg</strong> &nbsp; + &nbsp; Car: <strong>{stock.other.availableQty} Qty / {formatNumber(stock.other.availableKg)} Kg</strong></div>}</div></div>
            </div></div>
            <div className="modal-footer"><button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn btn-primary"><i className="fa-solid fa-check me-2"></i>Complete Company Sale</button></div>
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
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div className="modal-content border-0 rounded-4">
          <div className="modal-header"><div><h5 className="modal-title fw-bold">{selectedCompany?.name || 'Company'} — Scrap Purchase History</h5><small className="text-muted">{selectedCompany?.sales.length || 0} purchases · {formatNumber(selectedCompany?.totalKg)} Kg · {formatMoney(selectedCompany?.totalAmount)}</small></div><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <div className="modal-body"><div className="p-3 bg-light rounded-3 mb-3"><strong>Contact:</strong> {selectedCompany?.contact || '—'} &nbsp; | &nbsp; <strong>GSTIN:</strong> {selectedCompany?.gstin || '—'}<br/><strong>Address:</strong> {selectedCompany?.address || '—'}</div>
            <div className="table-responsive"><table className="table scrap-table"><thead><tr><th>Stock Added From</th><th>Stock Added Until</th><th>Sold On</th><th>Category</th><th>Quantity</th><th>Weight</th><th>Rate / Kg</th><th>Total</th><th></th></tr></thead><tbody>{selectedCompany?.sales.map((sale) => <tr key={sale.id}><td>{sale.stockFromDate || '—'}</td><td>{sale.stockToDate || '—'}</td><td>{sale.date || '—'}</td><td>{saleCategoryLabel(sale.category)}</td><td>{sale.quantity}</td><td>{formatNumber(sale.weight)} Kg</td><td>{formatMoney(sale.ratePerKg)}</td><td><strong>{formatMoney(sale.totalAmount)}</strong></td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => printCompanyReport(selectedCompany, sale)}><i className="fa-solid fa-print me-1"></i>Print</button><button className="btn btn-sm btn-outline-danger" onClick={() => deleteScrapSale(sale.id)}><i className="fa-solid fa-trash"></i></button></div></td></tr>)}</tbody></table></div>
          </div>
          <div className="modal-footer"><button className="btn btn-light" data-bs-dismiss="modal">Close</button><button className="btn btn-primary" onClick={() => printCompanyReport(selectedCompany)}><i className="fa-solid fa-print me-2"></i>Print Full History</button></div>
        </div></div>
      </div>
    </>
  )
}

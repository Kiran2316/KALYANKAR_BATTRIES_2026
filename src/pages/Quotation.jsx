import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Topbar from '../components/Topbar.jsx'
import salesLogo from '../assets/sales-print-logo.png'
import { getGstSettings } from '../gstSettings.js'
import { INVOICE_SHORT_LINK_BASE, supabase } from '../supabaseClient.js'
import { formatIndianPhone, indianPhoneDigits, isValidIndianPhone } from '../phoneFormat.js'

const newItem = () => ({ id: crypto.randomUUID(), brand: '', model: '', warranty: '', quantity: 1, rate: '' })
const PRODUCT_MODELS_STORAGE_KEY = 'kalyankar-product-models'
const PRODUCT_BRANDS_STORAGE_KEY = 'kalyankar-product-brands'
const SALES_STORAGE_KEY = 'kalyankar-sales'
const QUOTATIONS_STORAGE_KEY = 'kalyankar-quotations'
const QUOTATION_VEHICLES_STORAGE_KEY = 'kalyankar-quotation-vehicles'
const DEFAULT_BRANDS = ['EXIDE', 'AMARON', 'SF SONIC', 'TATA GREEN', 'POWER ZONE']
const BATTERY_TYPES = ['Car Battery', 'Bike Battery', 'Inverter Battery', 'Truck Battery', 'Commercial Vehicle Battery', 'Solar Battery']
const DEFAULT_QUOTATION_NOTES = 'Prices are valid for 7 days and are subject to stock availability.'
const todayLabel = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function storedList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function quotationOptions() {
  const models = storedList(PRODUCT_MODELS_STORAGE_KEY)
  const brands = [...new Set([
    ...DEFAULT_BRANDS,
    ...storedList(PRODUCT_BRANDS_STORAGE_KEY),
    ...models.map((model) => model.brand),
  ].map((brand) => String(brand || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const vehicles = [...new Set(storedList(SALES_STORAGE_KEY)
    .map((sale) => String(sale.vehicleName || '').trim())
    .filter(Boolean)
    .concat(storedList(QUOTATION_VEHICLES_STORAGE_KEY).map((vehicle) => String(vehicle || '').trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b))
  return { brands, models, vehicles }
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const under100 = (n) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`
  const under1000 = (n) => `${n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred ` : ''}${under100(n % 100)}`.trim()
  let remaining = Math.round(Number(value || 0))
  if (!remaining) return 'Zero Rupees Only'
  const words = []
  const crore = Math.floor(remaining / 10000000); if (crore) { words.push(`${under1000(crore)} Crore`); remaining %= 10000000 }
  const lakh = Math.floor(remaining / 100000); if (lakh) { words.push(`${under100(lakh)} Lakh`); remaining %= 100000 }
  const thousand = Math.floor(remaining / 1000); if (thousand) { words.push(`${under100(thousand)} Thousand`); remaining %= 1000 }
  if (remaining) words.push(under1000(remaining))
  return `${words.join(' ')} Rupees Only`
}

function formatWarrantyPeriod(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length < 2) return digits
  const fullReplacement = digits.slice(0, 2)
  const proRata = digits.slice(2, 4)
  if (!proRata) return `${fullReplacement}F + `
  if (proRata.length < 2) return `${fullReplacement}F + ${proRata}`
  return `${fullReplacement}F + ${proRata}P`
}

export default function Quotation() {
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', gstin: '', batteryType: '' })
  const [itemsByType, setItemsByType] = useState(() => ({ gst: [newItem()], 'without-gst': [newItem()] }))
  const [options, setOptions] = useState(quotationOptions)
  const [notes, setNotes] = useState(DEFAULT_QUOTATION_NOTES)
  const [quotationType, setQuotationType] = useState('gst')
  const [gst, setGst] = useState(() => ({ ...getGstSettings(), totalRate: '', cgstRate: 0, sgstRate: 0 }))
  const [gstRateOptions, setGstRateOptions] = useState(() => getGstSettings().rates)
  const [sharingPdf, setSharingPdf] = useState(false)
  const [pdfItemsSnapshot, setPdfItemsSnapshot] = useState(null)
  const [showCloudLogin, setShowCloudLogin] = useState(false)
  const [cloudLogin, setCloudLogin] = useState({ email: 'bodakekiran63@gmail.com', password: '' })
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [openModelSearch, setOpenModelSearch] = useState(null)
  const [quotationHistory, setQuotationHistory] = useState(() => storedList(QUOTATIONS_STORAGE_KEY))
  const [historyType, setHistoryType] = useState('gst')
  const [customerMode, setCustomerMode] = useState('new')
  const [quotationIds, setQuotationIds] = useState(() => ({ gst: crypto.randomUUID(), 'without-gst': crypto.randomUUID() }))
  const [selectedHistoryQuote, setSelectedHistoryQuote] = useState(null)
  const [pendingHistoryPrint, setPendingHistoryPrint] = useState(false)
  const [pendingHistoryShare, setPendingHistoryShare] = useState(false)
  const historyShareWindowRef = useRef(null)
  const historyShareQuoteRef = useRef(null)
  const includeGst = quotationType === 'gst'
  const items = itemsByType[quotationType]
  const setItems = (next) => setItemsByType((current) => ({
    ...current,
    [quotationType]: typeof next === 'function' ? next(current[quotationType]) : next,
  }))
  const [quotationNo, setQuotationNo] = useState(() => String(storedList(QUOTATIONS_STORAGE_KEY).reduce((largest, row) => Math.max(largest, Number(row.sequence || row.quotationNo || 0)), 0) + 1).padStart(3, '0'))
  const [date, setDate] = useState(todayLabel)
  const enteredTotal = items.reduce((sum, item) => sum + Number(item.rate || 0), 0)
  const taxableAmount = includeGst && gst.totalRate > 0
    ? enteredTotal / (1 + gst.totalRate / 100)
    : enteredTotal
  const cgstAmount = includeGst ? taxableAmount * gst.cgstRate / 100 : 0
  const sgstAmount = includeGst ? taxableAmount * gst.sgstRate / 100 : 0
  const totalGstAmount = cgstAmount + sgstAmount
  const grandTotal = includeGst ? enteredTotal : taxableAmount
  const printRows = (pdfItemsSnapshot || itemsByType)[quotationType]
  const printEnteredTotal = printRows.reduce((sum, item) => sum + Number(item.rate || 0), 0)
  const printTaxableAmount = includeGst && gst.totalRate > 0 ? printEnteredTotal / (1 + gst.totalRate / 100) : printEnteredTotal
  const printCgstAmount = includeGst ? printTaxableAmount * gst.cgstRate / 100 : 0
  const printSgstAmount = includeGst ? printTaxableAmount * gst.sgstRate / 100 : 0
  const visibleQuotationHistory = quotationHistory.filter((quote) => (quote.quotationType || (quote.gst ? 'gst' : 'without-gst')) === historyType)
  const savedCustomers = useMemo(() => {
    const byPhone = new Map()
    ;[...storedList(SALES_STORAGE_KEY).map((sale) => ({ name: sale.customer, phone: sale.phone, address: sale.address, gstin: sale.gstNumber })), ...quotationHistory.map((quote) => quote.customer || {})].forEach((entry) => {
      const phoneDigits = indianPhoneDigits(entry.phone)
      if (phoneDigits) byPhone.set(phoneDigits, { name: entry.name || '', phone: formatIndianPhone(phoneDigits), address: entry.address || '', gstin: entry.gstin || '' })
    })
    return Array.from(byPhone.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }, [quotationHistory])

  useEffect(() => {
    const refresh = () => setOptions(quotationOptions())
    const refreshGstRates = () => setGstRateOptions(getGstSettings().rates)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refreshGstRates)
    window.addEventListener('focus', refreshGstRates)
    window.addEventListener('kalyankar-gst-settings-changed', refreshGstRates)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('storage', refreshGstRates); window.removeEventListener('focus', refreshGstRates); window.removeEventListener('kalyankar-gst-settings-changed', refreshGstRates) }
  }, [])

  useEffect(() => {
    document.querySelectorAll('.quotation-editor input, .quotation-editor select, .quotation-table select, .quotation-table input').forEach((field) => {
      const optional = field.hasAttribute('data-optional')
      field.required = !optional
      field.setAttribute('aria-required', optional ? 'false' : 'true')
    })
  }, [items.length, includeGst])

  useEffect(() => {
    if (!pendingHistoryPrint) return
    setPendingHistoryPrint(false)
    const timer = setTimeout(() => document.querySelector('[data-quotation-print]')?.click(), 0)
    return () => clearTimeout(timer)
  }, [pendingHistoryPrint])

  useEffect(() => {
    if (!pendingHistoryShare) return
    setPendingHistoryShare(false)
    const shareWindow = historyShareWindowRef.current
    const historyQuote = historyShareQuoteRef.current
    historyShareWindowRef.current = null
    historyShareQuoteRef.current = null
    sendQuotationPdf(shareWindow, historyQuote)
  }, [pendingHistoryShare])

  function updateCustomer(key, value) { setCustomer((current) => ({ ...current, [key]: value })) }
  function selectSavedCustomer(phone) {
    const saved = savedCustomers.find((entry) => entry.phone === phone)
    setCustomer((current) => ({ ...current, name: saved?.name || '', phone: saved?.phone || '', address: saved?.address || '', gstin: saved?.gstin || '' }))
  }

  function selectedQuotationGst() {
    const selectedRate = Number(document.querySelector('#quotation-total-gst')?.value ?? gst.totalRate)
    const totalRate = Number.isFinite(selectedRate) ? selectedRate : gst.totalRate
    return { ...gst, totalRate, cgstRate: totalRate / 2, sgstRate: totalRate / 2 }
  }

  function saveQuotationTransaction(action, exportItems, appliedGst = gst) {
    const rows = (exportItems || itemsByType)[quotationType].map((item) => ({ ...item }))
    const savedGrandTotal = rows.reduce((sum, item) => sum + Number(item.rate || 0), 0)
    const savedTaxableAmount = includeGst && appliedGst.totalRate > 0 ? savedGrandTotal / (1 + appliedGst.totalRate / 100) : savedGrandTotal
    const record = {
      id: quotationIds[quotationType],
      sequence: Number(quotationNo),
      quotationNo,
      quotationType,
      date,
      customer: { ...customer, phone: formatIndianPhone(customer.phone) },
      items: rows,
      gst: includeGst ? { totalRate: appliedGst.totalRate, cgstRate: appliedGst.cgstRate, sgstRate: appliedGst.sgstRate } : null,
      notes,
      totals: { taxableAmount: savedTaxableAmount, cgstAmount: includeGst ? savedTaxableAmount * appliedGst.cgstRate / 100 : 0, sgstAmount: includeGst ? savedTaxableAmount * appliedGst.sgstRate / 100 : 0, grandTotal: savedGrandTotal },
      lastAction: action,
      updatedAt: new Date().toISOString(),
    }
    setQuotationHistory((current) => {
      const currentQuotationId = quotationIds[quotationType]
      const next = current.some((entry) => entry.id === currentQuotationId) ? current.map((entry) => entry.id === currentQuotationId ? record : entry) : [record, ...current]
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }
  function loadHistoryQuotation(quote) {
    const type = quote.quotationType || (quote.gst ? 'gst' : 'without-gst')
    const restoredItems = Array.isArray(quote.items) && quote.items.length
      ? quote.items.map((item) => ({ ...newItem(), ...item, id: item.id || crypto.randomUUID() }))
      : [newItem()]
    setQuotationType(type)
    setHistoryType(type)
    setCustomerMode('new')
    setCustomer({ name: '', phone: '', address: '', gstin: '', batteryType: '', ...(quote.customer || {}) })
    setItemsByType((current) => ({ ...current, [type]: restoredItems }))
    if (quote.gst) setGst((current) => ({ ...current, ...quote.gst }))
    setNotes(quote.notes || DEFAULT_QUOTATION_NOTES)
    setQuotationNo(String(quote.quotationNo || quote.sequence || '').padStart(3, '0'))
    setDate(quote.date || todayLabel())
    setQuotationIds((current) => ({ ...current, [type]: quote.id || crypto.randomUUID() }))
    setOpenModelSearch(null)
  }
  function editHistoryQuotation(quote) {
    loadHistoryQuotation(quote)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function printHistoryQuotation(quote) {
    loadHistoryQuotation(quote)
    setPendingHistoryPrint(true)
  }
  function shareHistoryQuotation(quote) {
    historyShareWindowRef.current = null
    historyShareQuoteRef.current = quote
    loadHistoryQuotation(quote)
    setPendingHistoryShare(true)
  }
  function deleteHistoryQuotation(quote) {
    if (!window.confirm(`Delete quotation ${quote.quotationNo || ''}? This cannot be undone.`)) return
    setQuotationHistory((current) => {
      const next = current.filter((entry) => quote.id ? entry.id !== quote.id : entry !== quote)
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    if (selectedHistoryQuote?.id === quote.id) setSelectedHistoryQuote(null)
  }
  function saveVehicle() {
    const vehicle = customer.vehicle.trim()
    if (!vehicle) return
    const saved = storedList(QUOTATION_VEHICLES_STORAGE_KEY)
    if (!saved.some((name) => String(name).toUpperCase() === vehicle.toUpperCase())) {
      localStorage.setItem(QUOTATION_VEHICLES_STORAGE_KEY, JSON.stringify([...saved, vehicle]))
    }
    setOptions(quotationOptions())
  }
  function updateItem(id, key, value) { setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item)) }
  function updateManualWarranty(id, value) { updateItem(id, 'warranty', formatWarrantyPeriod(value)) }
  function handleManualWarrantyKeyDown(event, item) {
    if (event.key !== 'Backspace') return
    event.preventDefault()
    const digits = String(item.warranty || '').replace(/\D/g, '').slice(0, -1)
    updateItem(item.id, 'warranty', formatWarrantyPeriod(digits))
  }
  function selectBrand(id, brand) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, brand, model: '', warranty: '', rate: '' } : item))
  }
  function selectModel(id, modelId) {
    const model = options.models.find((entry) => String(entry.id) === modelId)
    if (!model) return updateItem(id, 'model', '')
    const warranty = Number(model.warrantyValue || 0) > 0 ? `${model.warrantyValue} ${model.warrantyUnit || 'Months'}` : ''
    setItems((current) => current.map((item) => item.id === id ? {
      ...item,
      brand: model.brand,
      model: model.name,
      warranty,
      rate: model.sellingPrice || item.rate,
    } : item))
  }
  function searchModel(id, brand, modelName) {
    const model = options.models.find((entry) => String(entry.brand || '').trim().toUpperCase() === String(brand || '').trim().toUpperCase() && String(entry.name || '').trim().toUpperCase() === String(modelName || '').trim().toUpperCase())
    if (!model) return updateItem(id, 'model', modelName)
    selectModel(id, String(model.id))
  }
  function removeItem(id) { setItems((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current) }
  function addModelForBrand(index, brand) {
    const nextItem = { ...newItem(), brand }
    setItems((current) => [...current.slice(0, index + 1), nextItem, ...current.slice(index + 1)])
  }
  function validateQuotation() {
    if (!customer.name.trim()) return alert('Please enter the customer name.'), false
    if (!isValidIndianPhone(customer.phone)) return alert('Please enter a valid 10-digit WhatsApp number.'), false
    if (!customer.address.trim()) return alert('Please enter the customer address.'), false
    if (!customer.batteryType) return alert('Please select the battery type.'), false
    if (includeGst && gst.totalRate === '') return alert('Please select the GST rate.'), false
    const incompleteIndex = items.findIndex((item) => !String(item.brand || '').trim() || !String(item.model || '').trim() || !String(item.warranty || '').trim() || Number(item.quantity || 0) <= 0 || Number(item.rate || 0) <= 0)
    if (incompleteIndex >= 0) return alert(`Please complete all fields for battery row ${incompleteIndex + 1}.`), false
    return true
  }
  function validatePrintableQuotation() {
    if (!customer.name.trim() || !isValidIndianPhone(customer.phone) || !customer.address.trim() || !customer.batteryType) return validateQuotation()
    if (includeGst && gst.totalRate === '') return alert('Please select the GST rate.'), false
    const selectedRows = itemsByType[quotationType]
    if (!selectedRows.some((item) => item.brand || item.model || item.warranty || Number(item.rate || 0) > 0)) return alert(`Please complete the ${quotationType === 'gst' ? 'GST' : 'Without GST'} quotation.`), false
    const incompleteIndex = selectedRows.findIndex((item) => !String(item.brand || '').trim() || !String(item.model || '').trim() || !String(item.warranty || '').trim() || Number(item.quantity || 0) <= 0 || Number(item.rate || 0) <= 0)
    if (incompleteIndex >= 0) return alert(`Please complete all fields in ${quotationType === 'gst' ? 'GST' : 'Without GST'} row ${incompleteIndex + 1}.`), false
    return true
  }

  function quotationWhatsAppUrl() {
    const destination = `91${indianPhoneDigits(customer.phone)}`
    const lines = itemsByType[quotationType]
      .filter((item) => item.brand || item.model)
      .map((item, index) => `${index + 1}. ${item.brand} ${item.model}${item.warranty ? ` | Warranty: ${item.warranty}` : ''}${item.rate ? ` | ${money(item.rate)} x ${item.quantity}` : ''}`)
    const message = `*KALYANKAR BATTERIES*\n${includeGst ? 'GST Quotation' : 'Without GST Quotation (Secondary Market)'} ${quotationNo}\nDate: ${date}\n\nDear ${customer.name || 'Customer'},\n\n${lines.join('\n')}\n\n*Total: ${money(grandTotal)}*\n\n${notes}\n\nCall: 9420007273 | WhatsApp: 7745047273`
    return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`
  }

  function historyQuotationWhatsAppUrl(quote) {
    const quoteCustomer = quote?.customer || {}
    const destination = `91${indianPhoneDigits(quoteCustomer.phone)}`
    const quoteItems = Array.isArray(quote?.items) ? quote.items : []
    const lines = quoteItems.map((item, index) => `${index + 1}. ${item.brand || ''} ${item.model || ''}${item.warranty ? ` | Warranty: ${item.warranty}` : ''}${item.rate ? ` | ${money(item.rate)} x ${item.quantity || 1}` : ''}`.trim())
    const quoteType = (quote?.quotationType || (quote?.gst ? 'gst' : 'without-gst')) === 'gst' ? 'GST Quotation' : 'Without GST Quotation (Secondary Market)'
    const total = quote?.totals?.grandTotal ?? quoteItems.reduce((sum, item) => sum + Number(item.rate || 0), 0)
    const message = `*KALYANKAR BATTERIES*\n${quoteType} ${quote?.quotationNo || ''}\nDate: ${quote?.date || ''}\n\nDear ${quoteCustomer.name || 'Customer'},\n\n${lines.join('\n')}\n\n*Total: ${money(total)}*\n\n${quote?.notes || DEFAULT_QUOTATION_NOTES}\n\nCall: 9420007273 | WhatsApp: 7745047273`
    return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`
  }

  function navigateToWhatsApp(url, openedWindow = null) {
    if (openedWindow && !openedWindow.closed) {
      openedWindow.opener = null
      openedWindow.location.replace(url)
      return
    }
    window.location.assign(url)
  }

  async function printQuotation() {
    if (!validatePrintableQuotation()) return
    const appliedGst = selectedQuotationGst()
    const exportItems = Object.fromEntries(Object.entries(itemsByType).map(([type, rows]) => [type, rows.map((row) => ({ ...row }))]))
    flushSync(() => { setGst(appliedGst); setPdfItemsSnapshot(exportItems) })
    saveQuotationTransaction('print', exportItems, appliedGst)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const paper = document.querySelector('.quotation-paper')
    const quotationHistory = document.querySelector('.quotation-history')
    const historyWasHidden = quotationHistory?.hidden ?? false
    if (quotationHistory) quotationHistory.hidden = true
    Object.entries(exportItems).forEach(([type, rows]) => rows.forEach((item) => {
      const amount = Number(item.rate || 0)
      const quantity = Math.max(1, Number(item.quantity || 1))
      const taxable = type === 'gst' && appliedGst.totalRate > 0 ? amount / (1 + appliedGst.totalRate / 100) : amount
      const cellKey = `${type}:${item.id}`
      const rateCell = paper?.querySelector(`[data-print-rate-id="${cellKey}"]`)
      const totalCell = paper?.querySelector(`[data-print-total-id="${cellKey}"]`)
      const cgstCell = paper?.querySelector(`[data-print-cgst-id="${cellKey}"]`)
      const sgstCell = paper?.querySelector(`[data-print-sgst-id="${cellKey}"]`)
      if (rateCell) rateCell.textContent = money(taxable / quantity)
      if (totalCell) totalCell.textContent = money(amount)
      if (cgstCell) cgstCell.textContent = money(taxable * appliedGst.cgstRate / 100)
      if (sgstCell) sgstCell.textContent = money(taxable * appliedGst.sgstRate / 100)
    }))
    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      window.removeEventListener('afterprint', cleanup)
      window.removeEventListener('focus', cleanup)
      if (quotationHistory) quotationHistory.hidden = historyWasHidden
      setPdfItemsSnapshot(null)
    }
    window.addEventListener('afterprint', cleanup, { once: true })
    // Some Chromium print dialogs do not consistently emit afterprint.
    window.addEventListener('focus', cleanup, { once: true })
    window.print()
  }

  async function sendQuotationPdf(existingShareWindow = null, historyQuote = null) {
    const fallbackUrl = historyQuote ? historyQuotationWhatsAppUrl(historyQuote) : quotationWhatsAppUrl()
    if (sharingPdf) {
      existingShareWindow?.close()
      return
    }
    const canShareHistory = historyQuote && isValidIndianPhone(historyQuote.customer?.phone) && Array.isArray(historyQuote.items) && historyQuote.items.length > 0
    if (historyQuote ? !canShareHistory : !validatePrintableQuotation()) {
      existingShareWindow?.close()
      if (historyQuote) alert('This saved quotation needs a valid WhatsApp number and at least one battery item before it can be shared.')
      return
    }
    const shareWindow = existingShareWindow
    let sessionData
    try {
      const response = await supabase.auth.getSession()
      sessionData = response.data
    } catch {
      navigateToWhatsApp(fallbackUrl, shareWindow)
      return
    }
    if (!sessionData.session) {
      saveQuotationTransaction('whatsapp', itemsByType, selectedQuotationGst())
      navigateToWhatsApp(fallbackUrl, shareWindow)
      return
    }
    const phone = customer.phone.replace(/\D/g, '')
    const destination = phone.length === 10 ? `91${phone}` : phone.startsWith('0') && phone.length === 11 ? `91${phone.slice(1)}` : phone
    const appliedGst = selectedQuotationGst()
    const safeCustomer = String(customer.name || 'Customer').replace(/[\\/:*?"<>|]/g, '-').trim()
    const fileName = `${safeCustomer}-${quotationNo}-${quotationType === 'gst' ? 'GST' : 'Without-GST'}.pdf`
    const paper = document.querySelector('.quotation-paper')

    try {
      setSharingPdf(true)
      const exportItems = itemsByType
      flushSync(() => { setGst(appliedGst); setPdfItemsSnapshot(exportItems) })
      saveQuotationTransaction('whatsapp', exportItems, appliedGst)
      paper?.classList.add('quotation-pdf-export')
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      Object.entries(exportItems).forEach(([type, rows]) => rows.forEach((item) => {
        const amount = Number(item.rate || 0)
        const quantity = Math.max(1, Number(item.quantity || 1))
        const taxable = type === 'gst' && appliedGst.totalRate > 0 ? amount / (1 + appliedGst.totalRate / 100) : amount
        const cellKey = `${type}:${item.id}`
        const rateCell = paper?.querySelector(`[data-print-rate-id="${cellKey}"]`)
        const grandTotalCell = paper?.querySelector(`[data-print-total-id="${cellKey}"]`)
        const cgstCell = paper?.querySelector(`[data-print-cgst-id="${cellKey}"]`)
        const sgstCell = paper?.querySelector(`[data-print-sgst-id="${cellKey}"]`)
        if (rateCell) rateCell.textContent = money(taxable / quantity)
        if (grandTotalCell) grandTotalCell.textContent = money(amount)
        if (cgstCell) cgstCell.textContent = money(taxable * appliedGst.cgstRate / 100)
        if (sgstCell) sgstCell.textContent = money(taxable * appliedGst.sgstRate / 100)
      }))
      const html2pdfModule = await import('html2pdf.js')
      const html2pdf = html2pdfModule.default || html2pdfModule
      const pdfBlob = await html2pdf().set({
        margin: 8,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(paper).outputPdf('blob')
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })
      const objectPath = `quotations/${new Date().getFullYear()}/${Date.now()}-${safeCustomer}-${quotationNo}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(objectPath, pdfFile, { contentType: 'application/pdf', upsert: false })
      if (uploadError) throw uploadError

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
      let shortCode = ''
      let shortLinkError = null
      for (let attempt = 0; attempt < 4; attempt += 1) {
        shortCode = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => alphabet[byte % alphabet.length]).join('')
        const { error } = await supabase.from('invoice_links').insert({ code: shortCode, object_path: objectPath, expires_at: expiresAt })
        if (!error) {
          shortLinkError = null
          break
        }
        shortLinkError = error
        if (error.code !== '23505') break
      }
      if (shortLinkError) throw shortLinkError

      const quotationLink = `${INVOICE_SHORT_LINK_BASE}/${shortCode}`
      const linkMessage = `Hello ${customer.name || 'Customer'},\n\nYour Kalyankar Batteries quotation is ready. Open the secure PDF link below:\n${quotationLink}\n\nThis link is available for 7 days.\nThank you!\nKalyankar Batteries, Gargoti`
      const whatsappUrl = `https://wa.me/${destination}?text=${encodeURIComponent(linkMessage)}`
      navigateToWhatsApp(whatsappUrl, shareWindow)
    } catch (error) {
      console.error('Unable to create quotation PDF', error)
      alert('The PDF link could not be created, so WhatsApp will open with the quotation details instead.')
      navigateToWhatsApp(fallbackUrl, shareWindow)
    } finally {
      paper?.classList.remove('quotation-pdf-export')
      setPdfItemsSnapshot(null)
      setSharingPdf(false)
    }
  }

  async function loginAndSendQuotation(event) {
    event.preventDefault()
    if (cloudBusy) return
    const shareWindow = window.open('about:blank', '_blank')
    if (!shareWindow) return setCloudError('Please allow pop-ups for this site to open WhatsApp in a new tab.')
    setCloudBusy(true)
    setCloudError('')
    const { error } = await supabase.auth.signInWithPassword(cloudLogin)
    setCloudBusy(false)
    if (error) {
      shareWindow.close()
      setCloudError('Login failed. Please check the admin email and password.')
      return
    }
    setShowCloudLogin(false)
    setCloudLogin((current) => ({ ...current, password: '' }))
    await sendQuotationPdf(shareWindow)
  }

  function sendWhatsApp() {
    if (!validateQuotation()) return
    const phone = customer.phone.replace(/\D/g, '')
    const lines = items.filter((item) => item.brand || item.model).map((item, index) =>
      `${index + 1}. ${item.brand} ${item.model}${item.warranty ? ` | Warranty: ${item.warranty}` : ''}${item.rate ? ` | ${money(item.rate)} × ${item.quantity}` : ''}`
    )
    const message = `*KALYANKAR BATTERIES*\n${includeGst ? 'GST Quotation' : 'Without GST Quotation (Secondary Market)'} ${quotationNo}\nDate: ${date}\n\nDear ${customer.name || 'Customer'},\n\n${lines.join('\n')}\n\n*Total: ${money(grandTotal)}*\n\n${notes}\n\nCall: 9420007273 | WhatsApp: 7745047273`
    const destination = phone.length === 10 ? `91${phone}` : phone
    window.open(`https://wa.me/${destination}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return <>
    <div className="quotation-screen">
      <Topbar title="Battery Quotation" subtitle="Create and share battery prices with customers" />

      <section className="quotation-editor card-box">
        <div className="row g-3">
          <div className="col-12">
            <div className="quotation-customer-mode">
              <button type="button" className={customerMode === 'new' ? 'active' : ''} onClick={() => { setCustomerMode('new'); setCustomer({ name: '', phone: '', address: '', gstin: '', batteryType: '' }) }}>New Customer</button>
              <button type="button" className={customerMode === 'existing' ? 'active' : ''} disabled={!savedCustomers.length} onClick={() => setCustomerMode('existing')}>Existing Customer</button>
            </div>
          </div>
          {customerMode === 'existing' && <div className="col-12"><label className="form-label">Select Existing Customer</label><select className="form-select" data-optional defaultValue="" onChange={(e) => selectSavedCustomer(e.target.value)}><option value="">Select customer</option>{savedCustomers.map((entry) => <option key={entry.phone} value={entry.phone}>{entry.name} · {entry.phone}</option>)}</select><small className="quotation-history-note">Only customer details are reused. Previous quotation items and prices are never copied.</small></div>}
          <div className="col-md-3"><label className="form-label">Customer Name</label><input className="form-control" value={customer.name} onChange={(e) => updateCustomer('name', e.target.value)} placeholder="Enter customer name" /></div>
          <div className="col-md-3"><label className="form-label">WhatsApp Number</label><input className="form-control" inputMode="numeric" value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} placeholder="10-digit mobile number" /></div>
          <div className="col-md-3"><label className="form-label">Customer Address</label><input className="form-control" value={customer.address} onChange={(e) => updateCustomer('address', e.target.value)} placeholder="Enter address" /></div>
          <div className="col-md-3"><label className="form-label optional-label">Customer GSTIN</label><input data-optional className="form-control text-uppercase" value={customer.gstin} onChange={(e) => updateCustomer('gstin', e.target.value.toUpperCase())} placeholder="Enter GSTIN if available" maxLength="15" /></div>
          <div className="col-md-3"><label className="form-label">Type of Battery</label><input className="form-control" list="quotation-battery-types" value={customer.batteryType} onChange={(e) => updateCustomer('batteryType', e.target.value)} placeholder="Select or type battery type" /><datalist id="quotation-battery-types">{BATTERY_TYPES.map((type) => <option key={type} value={type} />)}</datalist></div>
          {includeGst && <div className="col-12 edit-only">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">CGST Rate</label>
                <div className="gst-rate-input-group"><input type="number" className="form-control" value={gst.cgstRate} readOnly /><span>%</span></div>
              </div>
              <div className="col-md-4">
                <label className="form-label">SGST Rate</label>
                <div className="gst-rate-input-group"><input type="number" className="form-control" value={gst.sgstRate} readOnly /><span>%</span></div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Total GST</label>
                <select className="form-select" value={gst.totalRate} onChange={(event) => { const totalRate = event.target.value === '' ? '' : Number(event.target.value); setGst((current) => ({ ...current, totalRate, cgstRate: totalRate === '' ? 0 : totalRate / 2, sgstRate: totalRate === '' ? 0 : totalRate / 2 })) }}>
                  <option value="">Select GST</option>
                  {gstRateOptions.map((rate) => <option key={rate} value={rate}>{rate}% (CGST {rate / 2}% + SGST {rate / 2}%)</option>)}
                </select>
                <small className="quotation-history-note">Used for this quotation only. These GST controls are not printed.</small>
              </div>
            </div>
          </div>}
          <div className="col-12"><label className="form-label">Quotation Type</label><div className="quotation-type-options"><button type="button" className={quotationType === 'gst' ? 'active' : ''} onClick={() => setQuotationType('gst')}><i className="fa-solid fa-file-invoice"></i><span><strong>1. GST Quotation</strong><small>Regular batteries · GSTIN, CGST and SGST</small></span><i className="fa-solid fa-circle-check quotation-type-check"></i></button><button type="button" className={quotationType === 'without-gst' ? 'active' : ''} onClick={() => setQuotationType('without-gst')}><i className="fa-solid fa-battery-half"></i><span><strong>2. Without GST</strong><small>Secondary-market batteries · Direct grand total</small></span><i className="fa-solid fa-circle-check quotation-type-check"></i></button></div></div>
        </div>
      </section>

      <article className={`quotation-paper quotation-paper-${quotationType}`}>
        <header className="quotation-invoice-header">
          <div className="quotation-invoice-logo"><img src={salesLogo} alt="Kalyankar Batteries" /></div>
          <div className="quotation-invoice-shop">
            <h3>KALYANKAR BATTERIES</h3>
            <div><span>Address:</span><strong> Gargoti - Kolhapur Main Road, Gargoti 416209</strong></div>
            <div><span>Landmark:</span><strong> Near Swami Samarth Mangal Karyalay</strong></div>
            <div><span>Contact:</span><strong> +91 9420007273</strong></div>
            <div><span>WhatsApp:</span><strong> +91 7745047273</strong></div>
            {includeGst && <div><span>GSTIN:</span><strong> 27ARIPK2620F1Z2</strong></div>}
          </div>
        </header>

        <div className="quotation-invoice-info">
          <div className="quotation-invoice-customer">
            <b>Bill to:</b>
            <div><span>Customer Name:</span><strong data-no-translate>{customer.name || ''}</strong></div>
            <div><span>Address:</span><strong data-no-translate>{customer.address || ''}</strong></div>
            <div><span>Contact No:</span><strong data-no-translate>{customer.phone || ''}</strong></div>
            {includeGst && customer.gstin && <div><span>Customer GSTIN:</span><strong data-no-translate>{customer.gstin}</strong></div>}
            <div><span>Battery Type:</span><strong data-no-translate>{customer.batteryType || ''}</strong></div>
          </div>
          <div className="quotation-invoice-meta">
            <h3>QUOTATION</h3>
            <div><span>Quotation No.:</span><strong data-no-translate>{quotationNo}</strong></div>
            <div><span>Date:</span><strong data-no-translate>{date}</strong></div>
          </div>
        </div>

        {false && <>
        <header className="quotation-brand">
          <img src={salesLogo} alt="Kalyankar Batteries" />
          <div className="quotation-shop"><strong>KALYANKAR BATTERIES</strong><span>Gargoti - Kolhapur Road, Gargoti</span><span>Mob: 9420007273 · WhatsApp: 7745047273</span>{includeGst && <span>GSTIN: 27ARIPK2620F1Z2</span>}</div>
          <div className="quotation-meta"><strong>{quotationNo}</strong><span>{date}</span></div>
        </header>

        <div className="quotation-customer">
          <div><small>BILL TO</small><strong>{customer.name || 'Customer Name'}</strong><span>{customer.address || 'Customer address'}</span><span>{customer.phone || 'Mobile number'}{customer.vehicle ? ` · Vehicle: ${customer.vehicle}` : ''}</span></div>
          <div className="quotation-document"><strong>{includeGst ? 'GST QUOTATION' : 'WITHOUT GST QUOTATION'}</strong>{!includeGst && <small>SECONDARY MARKET</small>}<span><b>Date:</b> {date}</span><span><b>Quotation No:</b> {quotationNo}</span></div>
        </div>

        </>}
        <div className="quotation-table-wrap">
          <table className="quotation-table">
            <thead><tr><th>SR.</th><th>Brand Name *</th><th>Product Description *</th><th>Qty *</th><th>Rate</th>{includeGst && <><th data-no-translate>CGST ({gst.cgstRate}%)</th><th data-no-translate>SGST ({gst.sgstRate}%)</th></>}<th>Grand Total *</th><th className="edit-only"></th></tr></thead>
            <tbody>
              {items.map((item, index) => {
                const continuesBrand = index > 0 && item.brand && String(items[index - 1].brand).toUpperCase() === String(item.brand).toUpperCase()
                const brandNumber = items.slice(0, index + 1).reduce((count, row, rowIndex, rows) => count + (rowIndex === 0 || String(rows[rowIndex - 1].brand).toUpperCase() !== String(row.brand).toUpperCase() ? 1 : 0), 0)
                const matchingModels = options.models.filter((model) => String(model.brand).toUpperCase() === String(item.brand).toUpperCase() && (!item.model || String(model.name).toUpperCase().includes(String(item.model).toUpperCase())))
                return (
                  <tr key={item.id} className={`${continuesBrand ? 'quotation-same-brand' : ''} ${includeGst ? 'quotation-gst-row' : 'quotation-non-gst-row'}`}>
                    <td data-label="Sr.">{continuesBrand ? '' : String(brandNumber).padStart(2, '0')}</td>
                    <td data-label="Brand Name" className="quotation-brand-cell">
                      {continuesBrand ? '' : includeGst ? (
                        <select data-quotation-item-id={item.id} data-quotation-field="brand" aria-label="Brand" value={item.brand} onFocus={() => setOptions(quotationOptions())} onChange={(event) => selectBrand(item.id, event.target.value)}>
                          <option value="">Select brand</option>
                          {options.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                      ) : (
                        <input data-quotation-item-id={item.id} data-quotation-field="brand" aria-label="Battery name" value={item.brand} onChange={(event) => updateItem(item.id, 'brand', event.target.value)} placeholder="Enter full battery name" autoComplete="off" />
                      )}
                    </td>
                    <td data-label="Product Description">
                      <div className={`battery-fields ${includeGst ? '' : 'quotation-non-gst-fields'}`}>
                        {includeGst ? (
                          <>
                            <select aria-label="Brand" value={item.brand} onFocus={() => setOptions(quotationOptions())} onChange={(event) => selectBrand(item.id, event.target.value)}>
                              <option value="">Select brand</option>
                              {options.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                            </select>
                            <div className="quotation-model-search-wrap">
                              <input data-quotation-item-id={item.id} data-quotation-field="model" className="quotation-model-search" aria-label="Search model" value={item.model} onFocus={() => { setOptions(quotationOptions()); setOpenModelSearch(item.id) }} onBlur={() => setTimeout(() => setOpenModelSearch((current) => current === item.id ? null : current), 150)} onChange={(event) => { searchModel(item.id, item.brand, event.target.value); setOpenModelSearch(item.id) }} disabled={!item.brand} placeholder={item.brand ? 'Search or select model' : 'Select brand first'} autoComplete="off" />
                              <button type="button" className="quotation-model-toggle" aria-label="Show model options" disabled={!item.brand} onMouseDown={(event) => event.preventDefault()} onClick={() => { setOptions(quotationOptions()); setOpenModelSearch((current) => current === item.id ? null : item.id) }}><i className={`fa-solid fa-chevron-${openModelSearch === item.id ? 'up' : 'down'}`}></i></button>
                              {openModelSearch === item.id && item.brand && <div className="quotation-model-dropdown">{matchingModels.map((model) => <button type="button" key={model.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { selectModel(item.id, String(model.id)); setOpenModelSearch(null) }}>{model.name}</button>)}{matchingModels.length === 0 && <span>No matching models</span>}</div>}
                            </div>
                          </>
                        ) : (
                          <input data-quotation-item-id={item.id} data-quotation-field="model" className="quotation-description-input" aria-label="Product description" value={item.model} onChange={(event) => updateItem(item.id, 'model', event.target.value)} placeholder="Enter full product description" autoComplete="off" />
                        )}
                        <input data-quotation-item-id={item.id} data-quotation-field="warranty" className="quotation-warranty-input" aria-label="Warranty" inputMode="numeric" value={item.warranty} onChange={(event) => updateManualWarranty(item.id, event.target.value)} onKeyDown={(event) => handleManualWarrantyKeyDown(event, item)} placeholder="Warranty: 15F + 12P" />
                      </div>
                    </td>
                    <td data-label="Qty"><input data-quotation-item-id={item.id} data-quotation-field="quantity" className="number-field" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></td>
                    <td data-no-translate data-label="Rate" className="line-total">{money((includeGst && gst.totalRate > 0 ? Number(item.rate || 0) / (1 + gst.totalRate / 100) : Number(item.rate || 0)) / Math.max(1, Number(item.quantity || 1)))}</td>
                    {includeGst && <><td data-no-translate data-label={`CGST (${gst.cgstRate}%)`} className="quotation-tax-amount">{money((Number(item.rate || 0) / (1 + gst.totalRate / 100)) * gst.cgstRate / 100)}</td><td data-no-translate data-label={`SGST (${gst.sgstRate}%)`} className="quotation-tax-amount">{money((Number(item.rate || 0) / (1 + gst.totalRate / 100)) * gst.sgstRate / 100)}</td></>}
                    <td data-label="Grand Total"><div className="money-input"><span>₹</span><input data-quotation-item-id={item.id} data-quotation-field="rate" type="number" min="0" value={item.rate} onChange={(event) => updateItem(item.id, 'rate', event.target.value)} placeholder="Enter G.Total" /></div></td>
                    <td className="edit-only"><div className="quotation-row-actions"><button type="button" aria-label="Add model for this brand" title="Add model for this brand" onClick={() => addModelForBrand(index, item.brand)} disabled={!item.brand}><i className="fa-solid fa-plus"></i></button><button type="button" aria-label="Remove battery" onClick={() => removeItem(item.id)}><i className="fa-solid fa-xmark"></i></button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button className="quotation-add edit-only" onClick={() => setItems((current) => [...current, newItem()])}><i className="fa-solid fa-plus"></i> Add another brand / model</button>
        </div>

        <div className="quotation-combined-print">
          {[quotationType].map((type) => {
            const rows = (pdfItemsSnapshot || itemsByType)[type].filter((item) => item.brand || item.model || item.warranty || Number(item.rate || 0) > 0)
            if (!rows.length) return null
            const isGstSection = type === 'gst'
            return <section key={type} className={`quotation-print-section quotation-print-section-${type}`}><table><colgroup>{isGstSection ? <><col className="print-col-sr" /><col className="print-col-brand" /><col className="print-col-description" /><col className="print-col-qty" /><col className="print-col-rate" /><col className="print-col-tax" /><col className="print-col-tax" /><col className="print-col-total" /></> : <><col className="print-col-sr" /><col className="print-col-brand" /><col className="print-col-description" /><col className="print-col-qty" /><col className="print-col-rate" /><col className="print-col-total" /></>}</colgroup><thead><tr><th>SR.</th><th>Brand Name</th><th>Product Description</th><th>Qty</th><th>Rate</th>{isGstSection && <><th>CGST ({gst.cgstRate}%)</th><th>SGST ({gst.sgstRate}%)</th></>}<th>Grand Total</th></tr></thead><tbody>{rows.map((item, index) => {
              const taxable = isGstSection && gst.totalRate > 0 ? Number(item.rate || 0) / (1 + gst.totalRate / 100) : Number(item.rate || 0)
              const normalizedBrand = String(item.brand || '').trim().toUpperCase()
              const startsBrand = index === 0 || String(rows[index - 1].brand || '').trim().toUpperCase() !== normalizedBrand
              const brandRowSpan = startsBrand
                ? rows.slice(index).findIndex((row) => String(row.brand || '').trim().toUpperCase() !== normalizedBrand)
                : 0
              const brandNumber = rows.slice(0, index + 1).reduce((count, row, rowIndex, allRows) => count + (rowIndex === 0 || String(allRows[rowIndex - 1].brand || '').trim().toUpperCase() !== String(row.brand || '').trim().toUpperCase() ? 1 : 0), 0)
              const rowSpan = brandRowSpan === -1 ? rows.length - index : brandRowSpan
              return <tr key={item.id}>
                {startsBrand && <td rowSpan={rowSpan} className="quotation-print-group-cell">{String(brandNumber).padStart(2, '0')}</td>}
                {startsBrand && <td rowSpan={rowSpan} className="quotation-print-group-cell quotation-print-brand"><strong>{item.brand}</strong></td>}
                <td><strong>{item.model}</strong><small>{item.warranty}</small></td><td>{item.quantity}</td><td data-print-rate-id={`${type}:${item.id}`}>{money(taxable / Math.max(1, Number(item.quantity || 1)))}</td>{isGstSection && <><td data-print-cgst-id={`${type}:${item.id}`}>{money(taxable * gst.cgstRate / 100)}</td><td data-print-sgst-id={`${type}:${item.id}`}>{money(taxable * gst.sgstRate / 100)}</td></>}<td><strong data-print-total-id={`${type}:${item.id}`}>{money(item.rate)}</strong></td>
              </tr>
            })}</tbody></table></section>
          })}
        </div>

        {includeGst && <div className="quotation-gst-summary edit-only">
          <div className="quotation-gst-rate-control">
            <label htmlFor="quotation-total-gst">Total GST</label>
            <select id="quotation-total-gst" value={gst.totalRate} onChange={(event) => { const totalRate = event.target.value === '' ? '' : Number(event.target.value); setGst((current) => ({ ...current, totalRate, cgstRate: totalRate === '' ? 0 : totalRate / 2, sgstRate: totalRate === '' ? 0 : totalRate / 2 })) }}>
              <option value="">Select GST</option>
              {gstRateOptions.map((rate) => <option key={rate} value={rate}>{rate}% (CGST {rate / 2}% + SGST {rate / 2}%)</option>)}
            </select>
          </div>
          <div><span>Taxable Amount</span><strong>{money(taxableAmount)}</strong></div>
          <div><span>CGST ({gst.cgstRate}%)</span><strong>{money(cgstAmount)}</strong></div>
          <div><span>SGST ({gst.sgstRate}%)</span><strong>{money(sgstAmount)}</strong></div>
          <div className="quotation-gst-total-row"><span>Total GST ({gst.totalRate}%)</span><strong>{money(totalGstAmount)}</strong></div>
          <div className="quotation-gst-grand-row"><span>Grand Total</span><strong>{money(grandTotal)}</strong></div>
        </div>}

        <div className="quotation-print-totals">
          {includeGst && <>
            <div><span>Taxable Amount</span><strong data-no-translate>{money(printTaxableAmount)}</strong></div>
            <div><span>CGST ({gst.cgstRate}%)</span><strong data-no-translate>{money(printCgstAmount)}</strong></div>
            <div><span>SGST ({gst.sgstRate}%)</span><strong data-no-translate>{money(printSgstAmount)}</strong></div>
          </>}
          <div className="quotation-print-grand-total"><span>Grand Total</span><strong data-no-translate>{money(printEnteredTotal)}</strong></div>
        </div>

        <div className="quotation-print-signature">
          <span>Authorized Signature</span>
          <strong>KALYANKAR BATTERIES</strong>
        </div>

      </article>

      <section className="quotation-toolbar quotation-toolbar-bottom">
        <div className="quotation-actions">
          <button className="btn btn-outline-primary" data-quotation-print onClick={printQuotation}><i className="fa-solid fa-print me-2"></i>Print / Save PDF</button>
          <button className="btn btn-success" data-quotation-whatsapp onClick={() => sendQuotationPdf()} disabled={sharingPdf}><i className={`fa-solid ${sharingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'} me-2`}></i>{sharingPdf ? 'Creating PDF...' : 'Send PDF on WhatsApp'}</button>
        </div>
      </section>

      <section className="quotation-history card-box">
        <div className="quotation-history-header">
          <div><h4>Quotation History</h4><small>GST and Without GST quotations are saved separately.</small></div>
          <div className="quotation-history-tabs">
            <button type="button" className={historyType === 'gst' ? 'active' : ''} onClick={() => setHistoryType('gst')}>GST Quotations</button>
            <button type="button" className={historyType === 'without-gst' ? 'active' : ''} onClick={() => setHistoryType('without-gst')}>Without GST</button>
          </div>
        </div>
        {visibleQuotationHistory.length ? <div className="table-responsive">
          <table className="table quotation-history-table mb-0">
            <thead><tr><th>Quotation No.</th><th>Date</th><th>Customer</th><th>Phone</th><th>Type</th><th className="text-end">Grand Total</th><th>Saved By</th><th>Actions</th></tr></thead>
            <tbody>{visibleQuotationHistory.map((quote) => <tr key={quote.id}>
              <td><strong>{quote.quotationNo || '—'}</strong></td>
              <td>{quote.date || '—'}</td>
              <td>{quote.customer?.name || '—'}</td>
              <td>{quote.customer?.phone || '—'}</td>
              <td><span className={`quotation-history-badge ${historyType === 'gst' ? 'gst' : 'without-gst'}`}>{historyType === 'gst' ? 'GST' : 'Without GST'}</span></td>
              <td className="text-end"><strong>{money(quote.totals?.grandTotal)}</strong></td>
              <td>{quote.lastAction === 'whatsapp' ? 'WhatsApp PDF' : 'Print / PDF'}</td>
              <td><div className="quotation-history-actions"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedHistoryQuote(quote)}><i className="fa-solid fa-eye"></i> See</button><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editHistoryQuotation(quote)}><i className="fa-solid fa-pen"></i> Edit</button><button type="button" className="btn btn-sm btn-outline-success" onClick={() => printHistoryQuotation(quote)}><i className="fa-solid fa-print"></i> Print</button><button type="button" className="btn btn-sm btn-success" onClick={() => shareHistoryQuotation(quote)} disabled={sharingPdf}><i className="fa-brands fa-whatsapp"></i> WhatsApp</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteHistoryQuotation(quote)}><i className="fa-solid fa-trash"></i> Delete</button></div></td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="quotation-history-empty"><i className="fa-solid fa-clock-rotate-left"></i><span>No {historyType === 'gst' ? 'GST' : 'Without GST'} quotation history yet.</span></div>}
      </section>
    </div>

    {selectedHistoryQuote && (
      <div className="modal d-block quotation-history-modal" role="dialog" aria-modal="true" style={{ background: 'rgba(0, 0, 0, 0.55)' }}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Quotation {selectedHistoryQuote.quotationNo}</h5><button type="button" className="btn-close" onClick={() => setSelectedHistoryQuote(null)} aria-label="Close"></button></div>
            <div className="modal-body">
              <div className="quotation-history-details">
                <div><span>Date</span><strong>{selectedHistoryQuote.date || '—'}</strong></div><div><span>Type</span><strong>{(selectedHistoryQuote.quotationType || (selectedHistoryQuote.gst ? 'gst' : 'without-gst')) === 'gst' ? 'GST' : 'Without GST'}</strong></div>
                <div><span>Customer</span><strong>{selectedHistoryQuote.customer?.name || '—'}</strong></div><div><span>Phone</span><strong>{selectedHistoryQuote.customer?.phone || '—'}</strong></div>
                <div><span>Address</span><strong>{selectedHistoryQuote.customer?.address || '—'}</strong></div><div><span>Battery Type</span><strong>{selectedHistoryQuote.customer?.batteryType || '—'}</strong></div>
                <div><span>GSTIN</span><strong>{selectedHistoryQuote.customer?.gstin || '—'}</strong></div><div><span>Grand Total</span><strong>{money(selectedHistoryQuote.totals?.grandTotal)}</strong></div>
              </div>
              <div className="table-responsive mt-3"><table className="table table-bordered align-middle"><thead><tr><th>Brand</th><th>Description</th><th>Warranty</th><th>Qty</th><th className="text-end">Total</th></tr></thead><tbody>{(selectedHistoryQuote.items || []).map((item, index) => <tr key={item.id || index}><td>{item.brand || '—'}</td><td>{item.model || '—'}</td><td>{item.warranty || '—'}</td><td>{item.quantity || 1}</td><td className="text-end">{money(item.rate)}</td></tr>)}</tbody></table></div>
              {selectedHistoryQuote.notes && <div className="quotation-history-notes"><span>Notes</span><p>{selectedHistoryQuote.notes}</p></div>}
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-primary" onClick={() => { const quote = selectedHistoryQuote; setSelectedHistoryQuote(null); editHistoryQuotation(quote) }}>Edit</button><button type="button" className="btn btn-outline-success" onClick={() => { const quote = selectedHistoryQuote; setSelectedHistoryQuote(null); printHistoryQuotation(quote) }}>Print</button><button type="button" className="btn btn-success" onClick={() => { const quote = selectedHistoryQuote; setSelectedHistoryQuote(null); shareHistoryQuotation(quote) }} disabled={sharingPdf}><i className="fa-brands fa-whatsapp me-2"></i>WhatsApp</button><button type="button" className="btn btn-secondary" onClick={() => setSelectedHistoryQuote(null)}>Close</button></div>
          </div>
        </div>
      </div>
    )}

    {showCloudLogin && (
      <div className="modal d-block" role="dialog" aria-modal="true" style={{ background: 'rgba(0, 0, 0, 0.55)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Sign in to Send Quotation</h5>
              <button type="button" className="btn-close" onClick={() => setShowCloudLogin(false)} aria-label="Close"></button>
            </div>
            <form onSubmit={loginAndSendQuotation}>
              <div className="modal-body">
                <div className="alert alert-info py-2">Sign in once with the Supabase Admin account to upload and share the secure quotation PDF.</div>
                <label className="form-label fw-bold">Supabase Admin Email</label>
                <input type="email" className="form-control mb-3" required value={cloudLogin.email} onChange={(event) => setCloudLogin((current) => ({ ...current, email: event.target.value }))} />
                <label className="form-label fw-bold">Supabase Admin Password</label>
                <input type="password" className="form-control" required autoFocus value={cloudLogin.password} onChange={(event) => setCloudLogin((current) => ({ ...current, password: event.target.value }))} />
                {cloudError && <div className="alert alert-danger py-2 mt-3 mb-0">{cloudError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCloudLogin(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={cloudBusy}>{cloudBusy ? 'Signing in...' : 'Login & Send PDF Link'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
  </>
}

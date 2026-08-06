import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import purchasePrintLogo from '../assets/purchase-print-logo.png'
import { useLanguage } from '../language.jsx'
import { formatIndianPhone, isValidIndianPhone } from '../phoneFormat.js'

const STORAGE_KEY = 'purchaseStockHistory'
const PRODUCT_MODELS_STORAGE_KEY = 'kalyankar-product-models'

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  date: today(),
  company: '',
  address: '',
  contact: '',
  email: '',
  gstin: '',
  brands: '',
  models: '',
  hsns: '8507',
  units: '',
  prices: '',
  discounts: '',
  paidAmount: '',
  paymentMethod: 'Cash',
}

const formatMoney = (amount) =>
  'Rs. ' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

function createLedgerPdf({ company, address, contact, gstin, period, entries, creditTotal, debitTotal, closingBalance }) {
  const clean = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1')
  const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const text = (x, y, value, size = 7, bold = false) => `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${clean(value)}) Tj ET\n`
  const line = (x1, y1, x2, y2, width = .5) => `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`
  const fill = (x, y, width, height, color) => `${color} rg ${x} ${y} ${width} ${height} re f 0 0 0 rg\n`
  const columns = [65, 185, 45, 75, 80, 60, 80, 98, 98]
  const headings = ['Date', 'Description', 'Qty', 'Rate', 'Total', 'Discount', 'G.Total', 'Credit (Purchase)', 'Debit (Payment)']
  const pageChunks = []
  for (let index = 0; index < Math.max(entries.length, 1); index += 16) pageChunks.push(entries.slice(index, index + 16))

  const streams = pageChunks.map((pageEntries, pageIndex) => {
    let content = fill(590, 525, 224, 46, '.75 .91 .97')
    content += text(28, 562, 'Company Purchase Ledger', 18, true)
    content += text(28, 546, company || '-', 10, true)
    content += text(605, 556, 'Kalyankar Batteries', 10, true)
    content += text(605, 543, 'Gargoti - Kolhapur Main Road, Gargoti 416209', 7)
    content += text(525, 532, '+91 9420007273 | WhatsApp: 7745047273 | kalyankarbatteries7273@gmail.com', 5.5)
    content += line(28, 518, 814, 518, 1.5)
    content += text(28, 501, `Company Name: ${company || '-'}`, 8, true)
    content += text(430, 501, `Period: ${period}`, 8, true)
    content += text(28, 487, `Address: ${address || '-'}`, 7)
    content += text(430, 487, `Contact: ${contact || '-'}`, 7)
    content += text(28, 473, `GSTIN: ${gstin || '-'}`, 7)
    content += text(772, 473, `Page ${pageIndex + 1}/${pageChunks.length}`, 7)

    const tableTop = 455
    const rowHeight = 20
    content += fill(28, tableTop - rowHeight, 786, rowHeight, '.93 .96 .99')
    let x = 28
    headings.forEach((heading, index) => {
      content += text(x + 3, tableTop - 13, heading, index > 6 ? 6.2 : 6.7, true)
      x += columns[index]
    })
    content += line(28, tableTop, 814, tableTop, .8)
    content += line(28, tableTop - rowHeight, 814, tableTop - rowHeight, .8)

    pageEntries.forEach((entry, rowIndex) => {
      const yTop = tableTop - rowHeight - rowIndex * rowHeight
      const values = [
        entry.date || '-', entry.description, entry.quantity ?? '-', entry.rate === null ? '-' : money(entry.rate),
        entry.total === null ? '-' : money(entry.total), entry.discountPercent === null ? '-' : `${entry.discountPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`,
        entry.grandTotal === null ? '-' : money(entry.grandTotal), entry.credit ? money(entry.credit) : '-', entry.debit ? money(entry.debit) : '-',
      ]
      let cellX = 28
      values.forEach((value, index) => {
        const maxChars = Math.max(Math.floor(columns[index] / 4.2), 4)
        content += text(cellX + 3, yTop - 13, String(value).slice(0, maxChars), 6.6, index === 1)
        cellX += columns[index]
      })
      content += line(28, yTop - rowHeight, 814, yTop - rowHeight, .35)
    })

    let bottom = tableTop - rowHeight - pageEntries.length * rowHeight
    const isLastPage = pageIndex === pageChunks.length - 1
    if (isLastPage) {
      content += text(621, bottom - 13, money(creditTotal), 7, true)
      content += text(719, bottom - 13, money(debitTotal), 7, true)
      content += line(28, bottom - 20, 814, bottom - 20, .7)
      content += text(31, bottom - 34, 'By', 8)
      content += text(96, bottom - 34, 'Closing Balance', 9, true)
      content += text(719, bottom - 34, money(closingBalance), 7, true)
      content += fill(28, bottom - 62, 786, 20, '.93 .96 .99')
      content += line(28, bottom - 42, 814, bottom - 42, 1.2)
      content += text(621, bottom - 56, money(creditTotal), 8, true)
      content += text(719, bottom - 56, money(debitTotal + closingBalance), 8, true)
      content += line(28, bottom - 62, 814, bottom - 62, 1.2)
    }
    x = 28
    columns.forEach((width) => { content += line(x, tableTop, x, isLastPage ? bottom - 62 : bottom, .3); x += width })
    content += line(814, tableTop, 814, isLastPage ? bottom - 62 : bottom, .3)
    content += text(690, 18, `Printed on ${new Date().toLocaleDateString('en-IN')}`, 6.5)
    return content
  })

  const fontObject = 3 + streams.length * 2
  const boldFontObject = fontObject + 1
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${streams.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${streams.length} >>`,
  ]
  streams.forEach((content, index) => {
    const pageObject = 3 + index * 2
    const contentObject = pageObject + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function nextPurchaseInvoice(history) {
  const highestInvoice = history.reduce((highest, row) => {
    const match = String(row.invoice || '').match(/\d+/)
    return Math.max(highest, match ? Number(match[0]) : 0)
  }, 0)
  return String(Math.max(highestInvoice, history.length) + 1).padStart(3, '0')
}

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())

function buildItems(form, stockModels = []) {
  const brands = splitList(form.brands)
  const models = splitList(form.models).filter(Boolean)
  const hsns = splitList(form.hsns)
  const units = splitList(form.units)
  const prices = splitList(form.prices)
  const discounts = splitList(form.discounts)
  const count = Math.max(models.length, hsns.length, units.length, prices.length, discounts.length)

  return Array.from({ length: count }, (_, index) => {
    const unit = Number(units[index] || 0)
    const price = Number(prices[index] || 0)
    const subtotal = unit * price
    const discountPercent = Math.min(Math.max(Number(discounts[index] || 0), 0), 100)
    const discountAmount = subtotal * discountPercent / 100

    return {
      brand:
        brands[index] ||
        stockModels.find((stockModel) =>
          String(stockModel.name || '').trim().toUpperCase() === String(models[index] || '').trim().toUpperCase(),
        )?.brand ||
        '',
      model: models[index] || '',
      hsn: hsns[index] || hsns[0] || '8507',
      units: unit,
      price,
      subtotal,
      discountPercent,
      discountAmount,
      total: Math.max(subtotal - discountAmount, 0),
    }
  }).filter((item) => item.model || item.units || item.price)
}

function paidAmount(row) {
  return (row.ledger || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

function itemDiscountPercent(item) {
  if (item.discountPercent !== undefined) return Number(item.discountPercent || 0)
  const subtotal = Number(item.subtotal || (Number(item.units || 0) * Number(item.price || 0)))
  return subtotal > 0 ? Number(item.discount || 0) * 100 / subtotal : 0
}

function paymentDescription(entry) {
  const method = String(entry.method || 'Cash').trim()
  const note = String(entry.note || '').trim()
  if (!note) return `${method} Payment`

  if (method.toUpperCase() === 'UPI') {
    const upiNote = /^UPI\s*ID\s*[-:]/i.test(note) ? note : `UPI ID- ${note}`
    return `UPI Payment (${upiNote})`
  }

  return `${method} Payment (${note})`
}

export default function PurchaseStock() {
  const { language } = useLanguage()
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [dueRow, setDueRow] = useState(null)
  const [ledgerDateFrom, setLedgerDateFrom] = useState('')
  const [ledgerDateTo, setLedgerDateTo] = useState('')
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [payment, setPayment] = useState({ date: today(), amount: '', method: 'Cash', note: '' })
  const [stockModels] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PRODUCT_MODELS_STORAGE_KEY) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY)) || [])
  }, [])

  const items = useMemo(() => buildItems(form, stockModels), [form, stockModels])
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0)
  const formPaidAmount = Number(form.paidAmount || 0)
  const formRemainingDue = Math.max(grandTotal - formPaidAmount, 0)
  const nextInvoice = nextPurchaseInvoice(history)
  const companyPurchases = useMemo(() => {
    if (!dueRow) return []
    const companyKey = String(dueRow.company || '').trim().toLowerCase()
    return history
      .filter((row) => String(row.company || '').trim().toLowerCase() === companyKey)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || Number(a.id) - Number(b.id))
  }, [history, dueRow])

  const companyLedgerEntries = useMemo(() => {
    const entries = companyPurchases.flatMap((row) => [
      ...(row.items || []).map((item, index) => ({
        key: `purchase-${row.id}-${index}`,
        date: row.date,
        order: Number(row.id),
        lineOrder: index,
        typeOrder: 0,
        description: [item.brand, item.model].filter(Boolean).join(' + ') || 'Purchase',
        quantity: Number(item.units || 0),
        rate: Number(item.price || 0),
        total: Number(item.subtotal || (Number(item.units || 0) * Number(item.price || 0))),
        discountPercent: itemDiscountPercent(item),
        grandTotal: Number(item.total || 0),
        credit: Number(item.total || 0),
        debit: 0,
      })),
      ...(row.ledger || []).map((entry, index) => ({
        key: `payment-${row.id}-${entry.id}`,
        date: entry.date || row.date,
        order: Number(entry.id || row.id),
        lineOrder: index,
        typeOrder: 1,
        description: paymentDescription(entry),
        quantity: null,
        rate: null,
        total: null,
        discountPercent: null,
        grandTotal: null,
        credit: 0,
        debit: Number(entry.amount || 0),
      })),
    ])

    return entries.sort((a, b) =>
      String(a.date || '').localeCompare(String(b.date || '')) ||
      a.order - b.order ||
      a.typeOrder - b.typeOrder ||
      a.lineOrder - b.lineOrder,
    )
  }, [companyPurchases])

  const filteredCompanyLedgerEntries = useMemo(() => companyLedgerEntries.filter((entry) =>
    (!ledgerDateFrom || entry.date >= ledgerDateFrom) && (!ledgerDateTo || entry.date <= ledgerDateTo),
  ), [companyLedgerEntries, ledgerDateFrom, ledgerDateTo])

  const companyClosingBalance = filteredCompanyLedgerEntries.reduce(
    (balance, entry) => balance + entry.credit - entry.debit,
    0,
  )
  const companyCreditTotal = filteredCompanyLedgerEntries.reduce((total, entry) => total + entry.credit, 0)
  const companyDebitTotal = filteredCompanyLedgerEntries.reduce((total, entry) => total + entry.debit, 0)

  function saveHistory(nextHistory) {
    setHistory(nextHistory)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory))
  }

  function handleSavePurchase(e) {
    e.preventDefault()

    if (!form.company.trim() || !items.length) {
      alert('Please add company name and at least one purchase model.')
      return
    }
    if (form.contact && !isValidIndianPhone(form.contact)) return alert('Please enter a valid 10-digit contact number.')

    const row = {
      id: Date.now(),
      ...form,
      contact: form.contact ? formatIndianPhone(form.contact) : '',
      invoice: nextInvoice,
      items,
      grandTotal,
      ledger:
        formPaidAmount > 0
          ? [
              {
                id: Date.now(),
                date: form.date,
                amount: formPaidAmount,
                method: form.paymentMethod,
                note: 'Opening payment',
              },
            ]
          : [],
    }

    saveHistory([row, ...history])
    setForm(emptyForm)
    setShowAdd(false)
  }

  function savePayment(e) {
    e.preventDefault()

    if (!paymentTarget || Number(payment.amount) <= 0) {
      alert('Please enter payment amount.')
      return
    }

    const remainingDue = Math.max(Number(paymentTarget.grandTotal || 0) - paidAmount(paymentTarget), 0)
    if (Number(payment.amount) > remainingDue) {
      alert(`Payment cannot be more than the remaining due (${formatMoney(remainingDue)}).`)
      return
    }

    const nextHistory = history.map((row) =>
      row.id === paymentTarget.id
        ? {
            ...row,
            ledger: [
              ...(row.ledger || []),
              {
                id: Date.now(),
                date: payment.date,
                amount: Number(payment.amount),
                method: payment.method,
                note: payment.note,
              },
            ],
          }
        : row,
    )

    saveHistory(nextHistory)
    setDueRow(nextHistory.find((row) => row.id === dueRow.id))
    setPaymentTarget(null)
    setPayment({ date: today(), amount: '', method: 'Cash', note: '' })
  }

  function printCompanyLedger() {
    if (!dueRow) return
    const win = window.open('', '_blank')
    if (!win) return

    const ledgerRows = filteredCompanyLedgerEntries.map((entry) => `
      <tr><td>${entry.date || '-'}</td><td>${entry.description}</td><td class="num">${entry.quantity ?? '-'}</td><td class="num">${entry.rate === null ? '-' : formatMoney(entry.rate)}</td><td class="num">${entry.total === null ? '-' : formatMoney(entry.total)}</td><td class="num">${entry.discountPercent === null ? '-' : `${entry.discountPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`}</td><td class="num">${entry.grandTotal === null ? '-' : formatMoney(entry.grandTotal)}</td><td class="num">${entry.credit ? formatMoney(entry.credit) : '-'}</td><td class="num">${entry.debit ? formatMoney(entry.debit) : '-'}</td></tr>
    `).join('')

    win.document.write(`
      <html><head><title>${dueRow.company} - Purchase Ledger</title><style>
        @page { size: A4 landscape; margin: 9mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { font-family: Arial, sans-serif; color: #172033; margin: 0; font-size: 10px; }
        h1 { margin: 0 0 3px; color: #123b7a; font-size: 20px; } h2 { margin: 18px 0 6px; color: #4b5563; font-size: 13px; }
        .head { display: flex; justify-content: space-between; border-bottom: 2px solid #123b7a; padding-bottom: 8px; }
        .shop { text-align: right; line-height: 1.5; background-color:#bfe8f7 !important; box-shadow:inset 0 0 0 1000px #bfe8f7; border:1px solid #8fcfe5; border-radius:10px; padding:9px 12px; } .details { width: 100%; margin-top: 10px; border-collapse: collapse; }
        .details th { width: 140px; text-align: left; } table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #d7deea; padding: 5px; text-align: left; vertical-align: top; }
        thead th { background: #edf3fb; color: #173b70; border-top: 1px solid #9fb0ca; white-space: nowrap; }
        .num { text-align: right; white-space: nowrap; } tfoot td { font-weight: 700; } tfoot .balance-row td { border-top: 1px solid #6b7280; } tfoot .ledger-total td { background: #edf3fb; border-top: 2px solid #123b7a; border-bottom: 2px solid #123b7a; font-size: 11px; } .footer { margin-top: 16px; text-align: right; color: #6b7280; }
      </style></head><body>
        <div class="head"><div><h1>Company Purchase Ledger</h1><strong>${dueRow.company || '-'}</strong></div><div class="shop"><strong>Kalyankar Batteries</strong><br>Gargoti - Kolhapur Main Road, Gargoti 416209<br>+91 9420007273<br>WhatsApp No: 7745047273<br>kalyankarbatteries7273@gmail.com</div></div>
        <table class="details"><tbody><tr><th>Company Name</th><td>${dueRow.company || '-'}</td><th>Period</th><td>${ledgerDateFrom || 'Beginning'} to ${ledgerDateTo || 'Today'}</td></tr><tr><th>Address</th><td>${dueRow.address || '-'}</td><th>Contact</th><td>${dueRow.contact || '-'}</td></tr><tr><th>GSTIN</th><td>${dueRow.gstin || '-'}</td><th></th><td></td></tr></tbody></table>
        <h2>Purchase Ledger</h2>
        <table><thead><tr><th>Date</th><th>Description</th><th class="num">Quantity</th><th class="num">Rate</th><th class="num">Total</th><th class="num">Discount</th><th class="num">G.Total</th><th class="num">Credit (Purchase)</th><th class="num">Debit (Payment)</th></tr></thead><tbody>${ledgerRows}</tbody><tfoot><tr><td colspan="7"></td><td class="num">${formatMoney(companyCreditTotal)}</td><td class="num">${formatMoney(companyDebitTotal)}</td></tr><tr class="balance-row"><td>By</td><td colspan="6">Closing Balance</td><td></td><td class="num">${formatMoney(companyClosingBalance)}</td></tr><tr class="ledger-total"><td colspan="7"></td><td class="num">${formatMoney(companyCreditTotal)}</td><td class="num">${formatMoney(companyDebitTotal + companyClosingBalance)}</td></tr></tfoot></table>
        <div class="footer">Printed on ${new Date().toLocaleDateString('en-IN')}</div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  async function shareCompanyLedgerOnWhatsApp() {
    if (!dueRow) return
    const period = `${ledgerDateFrom || 'Beginning'} to ${ledgerDateTo || 'Today'}`
    const safeCompany = String(dueRow.company || 'Company').replace(/[\\/:*?"<>|]/g, '-').trim()
    const sharingDate = new Date().toLocaleDateString('en-CA')
    const fileName = `${safeCompany}-${sharingDate}.pdf`
    const pdf = createLedgerPdf({
      company: dueRow.company,
      address: dueRow.address,
      contact: dueRow.contact,
      gstin: dueRow.gstin,
      period,
      entries: filteredCompanyLedgerEntries,
      creditTotal: companyCreditTotal,
      debitTotal: companyDebitTotal,
      closingBalance: companyClosingBalance,
    })
    const file = new File([pdf], fileName, { type: 'application/pdf' })

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${dueRow.company} Purchase Ledger`, text: `Purchase ledger for ${period}`, files: [file] })
        return
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
    }

    const downloadUrl = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    alert('The ledger PDF was downloaded. Please attach it in WhatsApp. Direct PDF sharing is not supported by this browser.')
  }

  function printPurchase(row) {
    const win = window.open('', '_blank')
    const ledger = row.ledger || []
    const totalPaid = paidAmount(row)
    const remainingDue = Math.max(row.grandTotal - totalPaid, 0)
    const purchaseInvoice = row.invoice || '001'
    const printableLogo = new URL(purchasePrintLogo, window.location.origin).href
    let ledgerBalance = Number(row.grandTotal || 0)
    const printableLedgerRows = [
      `<tr><td>${row.date}</td><td>Purchase - ${(row.items || []).map((item) => [item.brand, item.model].filter(Boolean).join(' ')).join(', ')}</td><td class="num">${formatMoney(row.grandTotal)}</td><td class="num">-</td><td class="num"><strong>${formatMoney(ledgerBalance)}</strong></td></tr>`,
      ...ledger.map((entry) => {
        ledgerBalance -= Number(entry.amount || 0)
        return `<tr><td>${entry.date}</td><td>Payment - ${entry.method || 'Payment'}${entry.note ? ` (${entry.note})` : ''}</td><td class="num">-</td><td class="num">${formatMoney(entry.amount)}</td><td class="num"><strong>${formatMoney(Math.max(ledgerBalance, 0))}</strong></td></tr>`
      }),
    ].join('')

    win.document.write(`
      <html>
        <head>
          <title>${purchaseInvoice} - Purchase Stock Bill</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: A4 portrait; margin: 7mm; }
            html, body { width: 196mm; height: 283mm; overflow: hidden; }
            body { font-family: Arial, sans-serif; color: #172033; margin: 0; font-size: 10.5px; line-height: 1.25; }
            .bill { width: 196mm; height: 283mm; border: 1px solid #243b64; padding: 7mm; display: flex; flex-direction: column; overflow: hidden; }
            .top { display: grid; grid-template-columns: 1fr 78mm; gap: 7mm; align-items: start; padding-bottom: 4mm; border-bottom: 2px solid #0b3475; }
            .company { align-self:start; height:auto; background-color:#bfe8f7 !important; box-shadow:inset 0 0 0 1000px #bfe8f7; border:1px solid #8fcfe5; border-radius:3mm; padding:3mm; }
            .company h2 { margin: 0 0 2mm; font-size: 17px; color: #0b3475; }
            .detail { display: grid; grid-template-columns: 25mm 1fr; gap: 1mm; margin: .7mm 0; }
            .detail span { color: #4b5563; }
            .right-head { display: flex; flex-direction: column; align-items: center; }
            .right-head img { display: block; width: 100%; height: 42mm; object-fit: contain; object-position: center top; margin: 0 0 1.5mm; }
            .meta { width: 62mm; align-self: flex-end; margin-top: 2mm; transform: translateX(-00mm, 0.5mm); }
            .meta .detail { grid-template-columns: 12mm 1fr; }
            .supplier { padding: 3.5mm 0; break-inside: avoid; }
            .supplier h3 { margin: 0 0 1.5mm; font-size: 14px; color: #0b3475; }
            .supplier-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .5mm 8mm; }
            table { width: 100%; border-collapse: collapse; margin-top: 1.5mm; break-inside: avoid; }
            th { background: #eaf1fb; color: #0b3475; border-top: 1px solid #8da5c7; border-bottom: 1px solid #8da5c7; padding: 2mm 1.5mm; text-align: left; font-size: 9px; text-transform: uppercase; }
            td { border-bottom: 1px solid #d8e0ec; padding: 1.8mm 1.5mm; font-size: 9.5px; }
            .num { text-align: right; }
            .summary { width: 70mm; margin: 3mm 0 2mm auto; break-inside: avoid; }
            .summary-line { display: flex; justify-content: space-between; padding: .8mm 0; }
            .summary-line.grand { border-top: 2px solid #0b3475; margin-top: .5mm; padding-top: 1.5mm; font-size: 13px; font-weight: 700; color: #0b3475; }
            .payment-section { break-inside: avoid; }
            .payment-section h3 { margin: 2mm 0 .5mm; font-size: 11px; color: #0b3475; }
            .payment-section table { margin-top: .5mm; }
            .payment-section th, .payment-section td { padding-top: 1.2mm; padding-bottom: 1.2mm; }
            .footer { margin-top: auto; display: flex; justify-content: flex-end; padding-top: 4mm; break-inside: avoid; }
            .signature { width: 62mm; text-align: center; padding-top: 10mm; border-top: 1px solid #243b64; font-weight: 700; font-size: 12px; color: #0b3475; }
            .signature small { color: #4b5563; font-weight: 400; }
            @media print { html, body, .bill { width: 196mm; height: 283mm; } }
          </style>
        </head>
        <body>
          <main class="bill">
          <section class="top">
            <div class="company">
              <h2>Kalyankar Batteries</h2>
              <div class="detail"><span>Address:</span><strong>Gargoti - Kolhapur Main Road, Gargoti 416209</strong></div>
              <div class="detail"><span>Landmark:</span><strong>Near Swami Samarth Mangal Karyalay</strong></div>
              <div class="detail"><span>Contact:</span><strong>+91 9420007273</strong></div>
              <div class="detail"><span>WhatsApp No:</span><strong>7745047273</strong></div>
              <div class="detail"><span>GSTIN:</span><strong>27ARIPK2620F1Z2</strong></div>
              <div class="detail"><span>Email:</span><strong>kalyankarbatteries7273@gmail.com</strong></div>
            </div>
            <div class="right-head">
              <img src="${printableLogo}" alt="Kalyankar Batteries" />
              <div class="meta">
                <div class="detail"><span>Date:</span><strong>${row.date}</strong></div>
                <div class="detail"><span>Invoice No.:</span><strong>${purchaseInvoice}</strong></div>
                <div class="detail"><span>Payment:</span><strong>${row.paymentMethod || '-'}</strong></div>
                <div class="detail"><span>Status:</span><strong>${remainingDue > 0 ? 'Due Pending' : 'Paid'}</strong></div>
              </div>
            </div>
          </section>

          <section class="supplier">
            <h3>PURCHASE FROM:</h3>
            <div class="supplier-grid">
              <div class="detail"><span>Company:</span><strong>${row.company}</strong></div>
              <div class="detail"><span>Contact:</span><strong>${row.contact || '-'}</strong></div>
              <div class="detail"><span>Address:</span><strong>${row.address || '-'}</strong></div>
              <div class="detail"><span>Email:</span><strong>${row.email || '-'}</strong></div>
              <div class="detail"><span>Company GSTIN:</span><strong>${row.gstin || '-'}</strong></div>
            </div>
          </section>

          <table>
            <thead>
              <tr><th>Sr.</th><th>Product Description</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Discount</th><th class="num">Total</th></tr>
            </thead>
            <tbody>
              ${row.items
                .map(
                  (item, index) =>
                    `<tr><td>${index + 1}</td><td><strong>${[item.brand, item.model].filter(Boolean).join(' ')}</strong></td><td>${item.hsn || '8507'}</td><td class="num">${item.units}</td><td class="num">${formatMoney(item.price)}</td><td class="num">${itemDiscountPercent(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%</td><td class="num">${formatMoney(item.total)}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-line"><span>Total Amount</span><strong>${formatMoney(row.grandTotal)}</strong></div>
            <div class="summary-line"><span>Paid Amount</span><strong>${formatMoney(totalPaid)}</strong></div>
            <div class="summary-line"><span>Remaining Due</span><strong>${formatMoney(remainingDue)}</strong></div>
            <div class="summary-line grand"><span>Grand Total</span><strong>${formatMoney(row.grandTotal)}</strong></div>
          </div>

          <section class="payment-section"><h3>Purchase / Payment Ledger</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th class="num">Credit (Purchase)</th><th class="num">Debit (Payment)</th><th class="num">Balance</th></tr>
            </thead>
            <tbody>${printableLedgerRows}</tbody>
          </table>

          <h3>Due Payment List</h3>
          <table>
            <thead>
              <tr><th>Total Amount</th><th>Paid Amount</th><th>Remaining Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${formatMoney(row.grandTotal)}</td>
                <td>${formatMoney(totalPaid)}</td>
                <td>${formatMoney(remainingDue)}</td>
                <td>${remainingDue > 0 ? 'Due Pending' : 'Paid'}</td>
              </tr>
            </tbody>
          </table>
          </section>

          <footer class="footer">
            <div class="signature">Kalyankar Batteries<br><small>Authorised Signature</small></div>
          </footer>
          </main>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  return (
    <>
      <Topbar title="Purchase Stock" subtitle="Add purchase entries, dues, ledger, and print records" />

      <style>{`
        input[type='number'] { appearance: textfield; -moz-appearance: textfield; }
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ledger-date-panel { background: #f8f9fa; color: #27354d; border-color: #dce3ee !important; }
        .ledger-date-panel h6, .ledger-date-panel .form-label { color: #27354d; }
        :root[data-theme='dark'] .ledger-date-panel { background: #243044 !important; color: #f1f5f9; border-color: #43516a !important; }
        :root[data-theme='dark'] .ledger-date-panel h6 { color: #ffffff !important; }
        :root[data-theme='dark'] .ledger-date-panel .form-label { color: #c8d5e8 !important; }
      `}</style>

      <div className="card-box">
        <div className="section-title">
          <span>Purchase History</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <i className="fa-solid fa-plus me-1"></i>Add Purchase
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Brand &amp; Model</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const paid = paidAmount(row)
                const due = row.grandTotal - paid

                return (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      <strong>{row.company}</strong>
                      <div className="text-muted small">{row.contact}</div>
                      {row.email && <div className="text-muted small">{row.email}</div>}
                    </td>
                    <td>{row.items.map((item) => [item.brand, item.model].filter(Boolean).join(' ')).join(', ')}</td>
                    <td>{formatMoney(row.grandTotal)}</td>
                    <td>{formatMoney(paid)}</td>
                    <td><span className={due > 0 ? 'badge-due' : 'badge-paid'}>{formatMoney(due)}</span></td>
                    <td>
                      <button className="btn btn-outline-primary btn-sm me-1" onClick={() => setViewRow(row)}>See</button>
                      <button className="btn btn-outline-warning btn-sm me-1" onClick={() => { setDueRow(row); setLedgerDateFrom(''); setLedgerDateTo('') }}>Ledger</button>
                      <button className="btn btn-success btn-sm" onClick={() => printPurchase(row)}>Print</button>
                    </td>
                  </tr>
                )
              })}
              {!history.length && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">No purchase stock added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal d-block" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <form className="modal-content" onSubmit={handleSavePurchase}>
              <div className="modal-header">
                <h5 className="modal-title">Add Purchase</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Invoice Number</label>
                    <input className="form-control" value={nextInvoice} readOnly />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Company Name</label>
                    <input className="form-control" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Contact Number (Optional)</label>
                    <input type="tel" className="form-control" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Company Email (Optional)</label>
                    <input type="email" className="form-control" placeholder="supplier@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">GSTIN</label>
                    <input className="form-control" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Brand</label>
                    <textarea className="form-control" rows="3" placeholder="AMARON, EXIDE" value={form.brands} onChange={(e) => setForm({ ...form, brands: e.target.value.toUpperCase() })} />
                    <div className="form-text">Enter brands in the same order as the models. Known stock models fill the brand automatically.</div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Purchase Model</label>
                    <textarea className="form-control" rows="3" placeholder="Model A, Model B" value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">HSN Number</label>
                    <textarea className="form-control" rows="3" placeholder="8507, 8507" value={form.hsns} onChange={(e) => setForm({ ...form, hsns: e.target.value.replace(/[^\d,\s]/g, '') })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Add Units</label>
                    <textarea className="form-control" rows="3" placeholder="10, 5" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Rate Per Unit</label>
                    <textarea className="form-control" rows="3" placeholder="4500, 5200" value={form.prices} onChange={(e) => setForm({ ...form, prices: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Discount (%)</label>
                    <textarea className="form-control" rows="3" placeholder="0, 5" value={form.discounts} onChange={(e) => setForm({ ...form, discounts: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Paid Amount</label>
                    <input type="number" className="form-control" placeholder="0" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Card</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Remaining Due</label>
                    <input className="form-control" value={formatMoney(formRemainingDue)} disabled />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="section-title mb-2">Preview</div>
                  <table className="table table-bordered">
                    <thead>
                      <tr><th>Brand</th><th>Model</th><th>HSN</th><th>Units</th><th>Rate</th><th>Discount</th><th>Final Total</th></tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.brand || '-'}</td>
                          <td>{item.model}</td>
                          <td>{item.hsn || '8507'}</td>
                          <td>{item.units}</td>
                          <td>{formatMoney(item.price)}</td>
                          <td>{itemDiscountPercent(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%</td>
                          <td>{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-end mt-3">
                    <h5>Last Total Price: {formatMoney(grandTotal)}</h5>
                    <div className="text-muted">Paid: {formatMoney(formPaidAmount)} | Remaining Due: {formatMoney(formRemainingDue)}</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewRow && (
        <div className="modal d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{viewRow.company}</h5>
                <button type="button" className="btn-close" onClick={() => setViewRow(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-1"><strong>Date:</strong> {viewRow.date}</p>
                <p className="mb-1"><strong>Address:</strong> {viewRow.address || '-'}</p>
                <p className="mb-1"><strong>Email:</strong> {viewRow.email || '-'}</p>
                <p className="mb-3"><strong>Contact:</strong> {viewRow.contact || '-'} | <strong>GSTIN:</strong> {viewRow.gstin || '-'}</p>
                <p className="mb-3">
                  <strong>Paid:</strong> {formatMoney(paidAmount(viewRow))} | <strong>Remaining Due:</strong> {formatMoney(Math.max(viewRow.grandTotal - paidAmount(viewRow), 0))}
                </p>
                <table className="table table-bordered">
                  <thead><tr><th>Brand</th><th>Model</th><th>HSN</th><th>Units</th><th>Rate</th><th>Discount</th><th>Final Total</th></tr></thead>
                  <tbody>
                    {viewRow.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.brand || '-'}</td>
                        <td>{item.model}</td>
                        <td>{item.hsn || '8507'}</td>
                        <td>{item.units}</td>
                        <td>{formatMoney(item.price)}</td>
                        <td>{itemDiscountPercent(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%</td>
                        <td>{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => printPurchase(viewRow)}>Print</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dueRow && (
        <div className="modal d-block" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-file-invoice me-2"></i>Company Details</h5>
                <button type="button" className="btn-close" onClick={() => { setDueRow(null); setPaymentTarget(null) }}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 align-items-stretch mb-4">
                  <div className="col-lg-7">
                    <div className="table-responsive border rounded h-100">
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr><th style={{ width: 180 }}>Company Name</th><td>{dueRow.company || '-'}</td></tr>
                          <tr><th>Address</th><td>{dueRow.address || '-'}</td></tr>
                          <tr><th>Contact</th><td>{dueRow.contact || '-'}</td></tr>
                          <tr><th>GSTIN</th><td>{dueRow.gstin || '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-lg-5">
                    <div className="ledger-date-panel border rounded p-3 h-100">
                      <h6 className="mb-3"><i className="fa-solid fa-calendar-days me-2"></i>Select Ledger Date Range</h6>
                      <div className="row g-2">
                        <div className="col-sm-6"><label className="form-label small">From Date</label><input type="date" className="form-control" value={ledgerDateFrom} max={ledgerDateTo || undefined} onChange={(e) => setLedgerDateFrom(e.target.value)} /></div>
                        <div className="col-sm-6"><label className="form-label small">To Date</label><input type="date" className="form-control" value={ledgerDateTo} min={ledgerDateFrom || undefined} onChange={(e) => setLedgerDateTo(e.target.value)} /></div>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <button type="button" className="btn btn-primary btn-sm" onClick={printCompanyLedger}><i className="fa-solid fa-print me-2"></i>Print Ledger</button>
                        <button type="button" className="btn btn-success btn-sm" onClick={shareCompanyLedgerOnWhatsApp}><i className="fa-brands fa-whatsapp me-2"></i>Share PDF on WhatsApp</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  {companyPurchases.map((row) => {
                    const due = Math.max(Number(row.grandTotal || 0) - paidAmount(row), 0)
                    return due > 0.005 && <button key={row.id} type="button" className="btn btn-sm btn-outline-success" onClick={() => { setPaymentTarget(row); setPayment({ date: today(), amount: '', method: 'Cash', note: '' }) }}><i className="fa-solid fa-money-bill-wave me-1"></i>Pay {formatMoney(due)} for Invoice {row.invoice || '-'}</button>
                  })}
                </div>

                {paymentTarget && <form className="border rounded bg-light p-3 mb-4" onSubmit={savePayment}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <strong>Pay Due — {(paymentTarget.items || []).map((item) => [item.brand, item.model].filter(Boolean).join(' ')).join(', ')}</strong>
                    <button type="button" className="btn-close" onClick={() => setPaymentTarget(null)}></button>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-3"><input type="date" className="form-control" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} /></div>
                    <div className="col-md-3"><input type="number" className="form-control" placeholder={`Due ${formatMoney(Math.max(paymentTarget.grandTotal - paidAmount(paymentTarget), 0))}`} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
                    <div className="col-md-2"><select className="form-select" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option><option>Card</option></select></div>
                    <div className="col-md-3"><input className="form-control" placeholder={payment.method === 'UPI' ? 'UPI ID (e.g. kiran@sbin)' : 'Note'} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} /></div>
                    <div className="col-md-1"><button className="btn btn-success w-100" type="submit">Pay</button></div>
                  </div>
                </form>}

                <h6 className="mb-2 text-secondary">Purchase Ledger</h6>
                <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle mb-0">
                  <thead className="table-light"><tr><th>Date</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Total</th><th>Discount</th><th>G.Total</th><th>Credit (Purchase)</th><th>Debit (Payment)</th></tr></thead>
                  <tbody>
                    {filteredCompanyLedgerEntries.map((entry) => (
                      <tr key={entry.key}>
                        <td>{entry.date}</td>
                        <td><strong>{entry.description}</strong></td>
                        <td>{entry.quantity ?? '-'}</td>
                        <td>{entry.rate === null ? '-' : formatMoney(entry.rate)}</td>
                        <td>{entry.total === null ? '-' : formatMoney(entry.total)}</td>
                        <td>{entry.discountPercent === null ? '-' : `${entry.discountPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`}</td>
                        <td>{entry.grandTotal === null ? '-' : formatMoney(entry.grandTotal)}</td>
                        <td>{entry.credit ? formatMoney(entry.credit) : '-'}</td>
                        <td>{entry.debit ? formatMoney(entry.debit) : '-'}</td>
                      </tr>
                    ))}
                    {!filteredCompanyLedgerEntries.length && <tr><td colSpan="9" className="text-center text-muted py-4">No transactions found for the selected date range.</td></tr>}
                  </tbody>
                  <tfoot className="table-light">
                    <tr><td colSpan="7"></td><th className="text-end">{formatMoney(companyCreditTotal)}</th><th className="text-end">{formatMoney(companyDebitTotal)}</th></tr>
                    <tr><th>By</th><th colSpan="6">Closing Balance</th><td></td><th className="text-end">{formatMoney(companyClosingBalance)}</th></tr>
                    <tr className="border-top border-2"><td colSpan="7"></td><th className="text-end">{formatMoney(companyCreditTotal)}</th><th className="text-end">{formatMoney(companyDebitTotal + companyClosingBalance)}</th></tr>
                  </tfoot>
                </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setDueRow(null); setPaymentTarget(null) }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

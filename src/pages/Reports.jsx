import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import { useChart } from '../components/useChart.js'
import { useLanguage } from '../language.jsx'

const SALES_STORAGE_KEY = 'kalyankar-sales'
const PURCHASE_STORAGE_KEY = 'purchaseStockHistory'
const PRODUCT_STOCK_STORAGE_KEY = 'kalyankar-product-stock'
const PRODUCT_MODELS_STORAGE_KEY = 'kalyankar-product-models'
const SCRAP_SALES_STORAGE_KEY = 'kalyankar-scrap-sales'
const SCRAP_PAYMENTS_STORAGE_KEY = 'kalyankar-scrap-company-payments'
const STOCK_REPORT_INITIAL_ROWS = 5

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function formatCurrency(value) {
  return 'Rs. ' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function paidPurchase(row) {
  return (row.ledger || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

function recordDate(row) {
  return String(row.invoiceDate || row.date || '').slice(0, 10)
}

function localDateValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function pdfText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?')
}

function formatPdfDate(value) {
  const date = String(value || '')
  if (!date) return '-'
  const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return date
  return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPdfMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function shortenPdfText(value, maxLength) {
  const text = String(value || '-').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, Math.max(1, maxLength - 1))}.` : text
}

function pdfColor(hex) {
  const color = hex.replace('#', '')
  return [0, 2, 4].map((index) => (parseInt(color.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ')
}

function pdfTextAt(value, x, y, size, options = {}) {
  const font = options.bold ? 'F2' : 'F1'
  const color = pdfColor(options.color || '#172033')
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(value)}) Tj ET`
}

function pdfFillRect(x, y, width, height, color) {
  return `q ${pdfColor(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`
}

function pdfStrokeRect(x, y, width, height, color = '#d7deea') {
  return `q ${pdfColor(color)} RG 0.45 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S Q`
}

function createDailyTablePdf({ title, date, summary, columns, rows, emptyMessage, sections }) {
  const pageWidth = 842
  const pageHeight = 595
  const margin = 22
  const tableWidth = pageWidth - margin * 2
  const headerHeight = 28
  const rowHeight = 32
  const tableTop = 473
  const tableBottom = 42
  const rowsPerPage = Math.max(1, Math.floor((tableTop - tableBottom - headerHeight) / rowHeight))
  const reportSections = sections || [{ title, summary, columns, rows, emptyMessage }]
  const pages = reportSections.flatMap((section) => {
    const sectionPages = []
    for (let index = 0; index < section.rows.length; index += rowsPerPage) {
      sectionPages.push({ ...section, rows: section.rows.slice(index, index + rowsPerPage) })
    }
    return sectionPages.length ? sectionPages : [{ ...section, rows: [] }]
  })

  const pageCount = pages.length
  const fontId = 3 + pageCount * 2
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`,
  ]

  pages.forEach((page, pageIndex) => {
    const pageRows = page.rows
    const commands = [
      pdfFillRect(0, pageHeight - 78, pageWidth, 78, '#172b4d'),
      pdfTextAt('KALYANKAR BATTERIES', margin, pageHeight - 34, 16, { bold: true, color: '#ffffff' }),
      pdfTextAt(page.title.toUpperCase(), margin, pageHeight - 54, 8, { color: '#bdd5ff' }),
      pdfTextAt(`Date: ${formatPdfDate(date)}`, pageWidth - 157, pageHeight - 34, 9, { bold: true, color: '#ffffff' }),
      pdfTextAt(`Page ${pageIndex + 1} of ${pageCount}`, pageWidth - 157, pageHeight - 54, 8, { color: '#bdd5ff' }),
      pdfFillRect(margin, 486, tableWidth, 22, '#eef4ff'),
      pdfTextAt(page.summary, margin + 8, 494, 7.5, { bold: true, color: '#1e3a5f' }),
      pdfFillRect(margin, tableTop - headerHeight, tableWidth, headerHeight, '#223a5d'),
    ]

    let columnX = margin
    page.columns.forEach((column) => {
      const headerLines = column.label.split('\n')
      headerLines.forEach((line, lineIndex) => {
        commands.push(pdfTextAt(line, columnX + 3, tableTop - 11 - lineIndex * 8, 5.8, { bold: true, color: '#dceaff' }))
      })
      commands.push(pdfStrokeRect(columnX, tableTop - headerHeight, column.width, headerHeight, '#385276'))
      columnX += column.width
    })

    if (!pageRows.length) {
      commands.push(pdfStrokeRect(margin, tableTop - headerHeight - rowHeight, tableWidth, rowHeight))
      commands.push(pdfTextAt(page.emptyMessage, margin + 8, tableTop - headerHeight - 20, 8, { color: '#5f6f82' }))
    }

    pageRows.forEach((row, rowIndex) => {
      const rowTop = tableTop - headerHeight - rowIndex * rowHeight
      const rowBottom = rowTop - rowHeight
      if (rowIndex % 2 === 1) commands.push(pdfFillRect(margin, rowBottom, tableWidth, rowHeight, '#f8faff'))

      let currentX = margin
      page.columns.forEach((column) => {
        const lines = Array.isArray(row[column.key]) ? row[column.key] : [row[column.key]]
        lines.slice(0, 2).forEach((line, lineIndex) => {
          commands.push(pdfTextAt(shortenPdfText(line, column.maxLength || 18), currentX + 3, rowTop - 12 - lineIndex * 9, 6.2, {
            bold: column.bold && lineIndex === 0,
            color: column.key === 'due' && Number(row._due || 0) > 0 ? '#cf1f2e' : '#172033',
          }))
        })
        commands.push(pdfStrokeRect(currentX, rowBottom, column.width, rowHeight))
        currentX += column.width
      })
    })

    commands.push(pdfTextAt('System-generated daily report', margin, 22, 7, { color: '#738197' }))
    commands.push(pdfFillRect(pageWidth - 320, 15, 310, 15, '#bfe8f7'))
    commands.push(pdfTextAt('Kalyankar Batteries | 9420007273 | WhatsApp 7745047273 | kalyankarbatteries7273@gmail.com', pageWidth - 390, 22, 7, { color: '#173b70' }))

    const pageId = 3 + pageIndex * 2
    const contentId = pageId + 1
    const content = commands.join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontId + 1} 0 R >> >> /Contents ${contentId} 0 R >>`)
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

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function inDateRange(row, fromDate, toDate) {
  const date = recordDate(row)
  if (fromDate && date < fromDate) return false
  if (toDate && date > toDate) return false
  return true
}

export default function Reports() {
  const { t } = useLanguage()
  const [reportType, setReportType] = useState('overview')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stock, setStock] = useState([])
  const [stockModels, setStockModels] = useState([])
  const [scrapSales, setScrapSales] = useState([])
  const [scrapPayments, setScrapPayments] = useState([])
  const [isStockReportExpanded, setIsStockReportExpanded] = useState(false)

  useEffect(() => {
    setSales(readStorage(SALES_STORAGE_KEY))
    setPurchases(readStorage(PURCHASE_STORAGE_KEY))
    setStock(readStorage(PRODUCT_STOCK_STORAGE_KEY))
    setStockModels(readStorage(PRODUCT_MODELS_STORAGE_KEY))
    setScrapSales(readStorage(SCRAP_SALES_STORAGE_KEY))
    setScrapPayments(readStorage(SCRAP_PAYMENTS_STORAGE_KEY))
  }, [])

  const filteredSales = useMemo(
    () => sales.filter((sale) => inDateRange(sale, fromDate, toDate)),
    [sales, fromDate, toDate],
  )

  const filteredPurchases = useMemo(
    () => purchases.filter((row) => inDateRange(row, fromDate, toDate)),
    [purchases, fromDate, toDate],
  )

  const regularSales = useMemo(
    () => filteredSales.filter((sale) => sale.saleType !== 'Exchange'),
    [filteredSales],
  )

  const oldStockSales = useMemo(
    () => filteredSales.filter((sale) => sale.saleType === 'Exchange'),
    [filteredSales],
  )

  const filteredScrapSales = useMemo(
    () => scrapSales.filter((sale) => inDateRange(sale, fromDate, toDate)),
    [scrapSales, fromDate, toDate],
  )

  const dailySales = useMemo(
    () => sales.filter((sale) => recordDate(sale) === localDateValue()),
    [sales],
  )

  const dailyScrapSales = useMemo(
    () => scrapSales.filter((sale) => recordDate(sale) === localDateValue()),
    [scrapSales],
  )

  const stockRows = useMemo(() => {
    const stockCount = stock.reduce((map, item) => {
      const key = String(item.modelId || `${item.brand}|${item.model}`)
      map[key] = (map[key] || 0) + 1
      return map
    }, {})

    return stockModels.map((model) => ({
      id: model.id,
      brand: model.brand,
      model: model.name,
      units: stockCount[String(model.id)] || 0,
      purchasePrice: model.purchasePrice,
      sellingPrice: model.sellingPrice,
      warranty: `${model.warrantyValue || 0} ${model.warrantyUnit || ''}`.trim(),
    }))
  }, [stock, stockModels])

  const brandStockRows = useMemo(() => {
    const rowsByBrand = new Map()

    stockModels.forEach((model) => {
      const brand = String(model.brand || 'Unknown').trim() || 'Unknown'
      const key = brand.toUpperCase()
      if (!rowsByBrand.has(key)) rowsByBrand.set(key, { brand, modelIds: new Set(), modelNames: new Set(), serials: 0 })
      const row = rowsByBrand.get(key)
      if (model.id != null) row.modelIds.add(String(model.id))
      if (model.name) row.modelNames.add(String(model.name).trim().toUpperCase())
    })

    stock.forEach((item) => {
      const brand = String(item.brand || 'Unknown').trim() || 'Unknown'
      const key = brand.toUpperCase()
      if (!rowsByBrand.has(key)) rowsByBrand.set(key, { brand, modelIds: new Set(), modelNames: new Set(), serials: 0 })
      const row = rowsByBrand.get(key)
      if (item.modelId != null) row.modelIds.add(String(item.modelId))
      if (item.model) row.modelNames.add(String(item.model).trim().toUpperCase())
      if (item.serialNo || item.serialNumber) row.serials += 1
    })

    return Array.from(rowsByBrand.values())
      .map((row) => ({
        brand: row.brand,
        models: Math.max(row.modelIds.size, row.modelNames.size),
        serials: row.serials,
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand))
  }, [stock, stockModels])

  const brandRows = useMemo(() => {
    const map = {}
    filteredSales.forEach((sale) => {
      const brand = sale.brand || 'Unknown'
      map[brand] = map[brand] || { brand, units: 0, revenue: 0, due: 0 }
      map[brand].units += Number(sale.qty || 1)
      map[brand].revenue += Number(sale.amount || 0)
      map[brand].due += Number(sale.dueAmount || 0)
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  const modelRows = useMemo(() => {
    const map = {}
    filteredSales.forEach((sale) => {
      const model = sale.model || sale.product || 'Unknown'
      const brand = sale.brand || '-'
      const key = `${brand}|${model}`
      map[key] = map[key] || { brand, model, units: 0, revenue: 0 }
      map[key].units += Number(sale.qty || 1)
      map[key].revenue += Number(sale.amount || 0)
    })
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 10)
  }, [filteredSales])

  const purchaseDueRows = filteredPurchases
    .map((row) => ({ ...row, paid: paidPurchase(row), due: Math.max(Number(row.grandTotal || 0) - paidPurchase(row), 0) }))
    .filter((row) => row.due > 0)

  const salesDueRows = filteredSales.filter((sale) => Number(sale.dueAmount || 0) > 0)

  const summary = useMemo(() => {
    const salesAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
    const salesDue = filteredSales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0)
    const purchaseAmount = filteredPurchases.reduce((sum, row) => sum + Number(row.grandTotal || 0), 0)
    const purchaseDue = filteredPurchases.reduce((sum, row) => sum + Math.max(Number(row.grandTotal || 0) - paidPurchase(row), 0), 0)
    const unitsSold = filteredSales.reduce((sum, sale) => sum + Number(sale.qty || 1), 0)
    const scrapAmount = filteredScrapSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)

    return {
      salesAmount,
      salesDue,
      purchaseAmount,
      purchaseDue,
      scrapAmount,
      unitsSold,
      invoiceCount: filteredSales.length,
      purchaseCount: filteredPurchases.length,
      averageBill: filteredSales.length ? salesAmount / filteredSales.length : 0,
    }
  }, [filteredSales, filteredPurchases, filteredScrapSales])

  const brandChartRef = useChart({
    type: 'doughnut',
    data: {
      labels: brandRows.length ? brandRows.map((row) => row.brand) : ['No sales'],
      datasets: [{
        data: brandRows.length ? brandRows.map((row) => row.revenue) : [1],
        backgroundColor: ['#00AEEF', '#16a34a', '#f97316', '#ED1C24', '#7c3aed', '#172033'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${brandRows.length ? formatCurrency(ctx.parsed) : 'No sales'}` } },
      },
    },
  })

  const moneyChartRef = useChart({
    type: 'bar',
    data: {
      labels: ['Sales', 'Purchase', 'Sales Due', 'Purchase Due'],
      datasets: [{
        data: [summary.salesAmount, summary.purchaseAmount, summary.salesDue, summary.purchaseDue],
        backgroundColor: ['#00AEEF', '#172033', '#ED1C24', '#f97316'],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => 'Rs. ' + Number(value).toLocaleString('en-IN') } },
      },
    },
  })

  const showSales = reportType === 'overview' || reportType === 'sales'
  const showPurchase = reportType === 'overview' || reportType === 'purchase'
  const showDue = reportType === 'overview' || reportType === 'dues'
  const showStockAndScrap = reportType === 'overview'
  const visibleStockRows = isStockReportExpanded ? stockRows : stockRows.slice(0, STOCK_REPORT_INITIAL_ROWS)
  const hasMoreStockRows = stockRows.length > STOCK_REPORT_INITIAL_ROWS

  async function sharePdfFile(pdfFile, message) {
    if (navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: 'Daily Sales Report',
          text: `Daily sales report for ${localDateValue()}`,
          files: [pdfFile],
        })
        return
      } catch (error) {
        if (error.name === 'AbortError') return
      }
    }

    const downloadUrl = URL.createObjectURL(pdfFile)
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadUrl
    downloadLink.download = pdfFile.name
    downloadLink.click()
    URL.revokeObjectURL(downloadUrl)
    window.open(`https://wa.me/917745047273?text=${encodeURIComponent(`${message}\n\nPDF downloaded as ${pdfFile.name}. Please attach it to this chat.`)}`, '_blank', 'noopener,noreferrer')
  }

  async function sendDailySalesToWhatsApp() {
    const today = localDateValue()
    const oldBatterySales = dailySales.filter((sale) => sale.saleType === 'Exchange')
    const oldBatteryWeight = oldBatterySales.reduce(
      (sum, sale) => sum + Number(sale.oldBatteryWeight || sale.exchange?.weight || 0),
      0,
    )
    const totals = dailySales.reduce((result, sale) => ({
      amount: result.amount + Number(sale.amount || 0),
      paid: result.paid + Number(sale.paidAmount || 0),
      due: result.due + Number(sale.dueAmount || 0),
      units: result.units + Number(sale.qty || 1),
    }), { amount: 0, paid: 0, due: 0, units: 0 })

    const details = dailySales.length
      ? dailySales.map((sale, index) => `${index + 1}. ${sale.invoice || 'Invoice'} | ${sale.customer || 'Customer'} | ${sale.brand || ''} ${sale.model || sale.product || ''} | Qty: ${sale.qty || 1} | ${formatCurrency(sale.amount)}`).join('\n')
      : 'No sales recorded today.'

    const message = [
      '*Kalyankar Batteries - Daily Sales Report*',
      `Date: ${today}`,
      '',
      `Invoices: ${dailySales.length}`,
      `Units Sold: ${totals.units}`,
      `Total Sales: ${formatCurrency(totals.amount)}`,
      `Paid Amount: ${formatCurrency(totals.paid)}`,
      `Due Amount: ${formatCurrency(totals.due)}`,
      `Old Batteries Collected: ${oldBatterySales.length} (${oldBatteryWeight} Kg)`,
      '',
      '*Sales Details*',
      details,
    ].join('\n')

    const salesColumns = [
      { key: 'invoice', label: 'INVOICE\nNO.', width: 62, maxLength: 12, bold: true },
      { key: 'date', label: 'DATE', width: 43, maxLength: 11 },
      { key: 'customer', label: 'NAME', width: 59, maxLength: 12, bold: true },
      { key: 'contact', label: 'ADDRESS /\nPHONE', width: 94, maxLength: 18 },
      { key: 'battery', label: 'BRAND &\nCAPACITY', width: 90, maxLength: 17, bold: true },
      { key: 'serial', label: 'SERIAL\nNO.', width: 51, maxLength: 12 },
      { key: 'hsn', label: 'HSN', width: 33, maxLength: 8 },
      { key: 'vehicle', label: 'TYPE OF\nVEHICLE', width: 75, maxLength: 15 },
      { key: 'qty', label: 'UNIT', width: 27, maxLength: 4 },
      { key: 'warranty', label: 'WARRANTY', width: 54, maxLength: 12 },
      { key: 'total', label: 'TOTAL\nAMOUNT', width: 58, maxLength: 13, bold: true },
      { key: 'paid', label: 'PAID\nAMOUNT', width: 55, maxLength: 13 },
      { key: 'due', label: 'DUE\nAMOUNT', width: 54, maxLength: 13, bold: true },
      { key: 'status', label: 'STATUS', width: 43, maxLength: 9, bold: true },
    ]
    const salesRows = dailySales.map((sale) => {
      const due = Number(sale.dueAmount || 0)
      const paid = Number(sale.paidAmount || 0)
      return {
        invoice: [sale.invoice || 'Invoice', sale.saleType || 'Regular'],
        date: formatPdfDate(sale.invoiceDate || sale.date),
        customer: [sale.customer || 'Customer', sale.salesPerson || ''],
        contact: [sale.address || '-', sale.phone || '-'],
        battery: [sale.brand || '-', sale.model || sale.product || '-'],
        serial: sale.serialNumber || '-',
        hsn: sale.hsn || '-',
        vehicle: [sale.vehicleName || '-', sale.vehicleNumber || ''],
        qty: sale.qty || 1,
        warranty: sale.warrantyPeriod || sale.warrantyDigits || '-',
        total: formatPdfMoney(sale.amount || sale.grandTotal || sale.totalAmount),
        paid: formatPdfMoney(paid),
        due: formatPdfMoney(due),
        status: due > 0 ? (paid > 0 ? 'Partial' : 'Due') : 'Paid',
        _due: due,
      }
    })
    const oldBatteryColumns = [
      { key: 'date', label: 'DATE', width: 100, maxLength: 16 },
      { key: 'invoice', label: 'INVOICE', width: 115, maxLength: 20, bold: true },
      { key: 'customer', label: 'CUSTOMER NAME / ADDRESS / PHONE', width: 290, maxLength: 55, bold: true },
      { key: 'batteryType', label: 'BATTERY TYPE', width: 135, maxLength: 25, bold: true },
      { key: 'brand', label: 'BRAND', width: 100, maxLength: 20 },
      { key: 'weight', label: 'WEIGHT (KG)', width: 58, maxLength: 10, bold: true },
    ]
    const oldBatteryRows = oldBatterySales.map((sale) => ({
      date: formatPdfDate(sale.invoiceDate || sale.date),
      invoice: sale.invoice || 'Invoice',
      customer: [sale.customer || 'Customer', `${sale.address || '-'} | ${sale.phone || '-'}`],
      batteryType: sale.batteryType || sale.exchange?.batteryType || '-',
      brand: sale.brand || '-',
      weight: `${sale.oldBatteryWeight || sale.exchange?.weight || 0}`,
    }))
    const filename = `daily-sales-${today}.pdf`
    const pdfFile = new File([createDailyTablePdf({
      date: today,
      sections: [
        {
          title: 'Daily Sales Report',
          summary: `Invoices: ${dailySales.length}   |   Units Sold: ${totals.units}   |   Total Sales: ${formatPdfMoney(totals.amount)}   |   Paid: ${formatPdfMoney(totals.paid)}   |   Due: ${formatPdfMoney(totals.due)}`,
          columns: salesColumns,
          rows: salesRows,
          emptyMessage: 'No sales recorded today.',
        },
        {
          title: 'Old Batteries Collected',
          summary: `Old Batteries: ${oldBatterySales.length}   |   Total Weight: ${oldBatteryWeight} Kg`,
          columns: oldBatteryColumns,
          rows: oldBatteryRows,
          emptyMessage: 'No old batteries were collected today.',
        },
      ],
    })], filename, { type: 'application/pdf' })

    await sharePdfFile(pdfFile, message)
  }

  async function sendDailyScrapSalesToWhatsApp() {
    const today = localDateValue()
    const scrapPaymentFor = (sale) => scrapPayments
      .filter((payment) => String(payment.saleId || '') === String(sale.id || ''))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), Number(sale.paidAmount || 0))
    const totals = dailyScrapSales.reduce((result, sale) => {
      const paid = scrapPaymentFor(sale)
      const amount = Number(sale.totalAmount || 0)
      return {
        amount: result.amount + amount,
        paid: result.paid + paid,
        due: result.due + Math.max(0, amount - paid),
        quantity: result.quantity + Number(sale.quantity || 0),
        weight: result.weight + Number(sale.weight || 0),
      }
    }, { amount: 0, paid: 0, due: 0, quantity: 0, weight: 0 })

    const details = dailyScrapSales.length
      ? dailyScrapSales.map((sale, index) => `${index + 1}. ${sale.invoiceNo || 'Scrap Invoice'} | ${sale.company || 'Company'} | ${sale.category || 'Scrap'} | Qty: ${sale.quantity || 0} | ${sale.weight || 0} Kg | ${formatCurrency(sale.totalAmount)}`).join('\n')
      : 'No scrap sales recorded today.'

    const message = [
      '*Kalyankar Batteries - Daily Scrap Sales Report*',
      `Date: ${today}`,
      '',
      `Invoices: ${dailyScrapSales.length}`,
      `Quantity Sold: ${totals.quantity}`,
      `Total Weight: ${totals.weight} Kg`,
      `Total Scrap Sales: ${formatCurrency(totals.amount)}`,
      '',
      '*Scrap Sales Details*',
      details,
    ].join('\n')
    const scrapColumns = [
      { key: 'invoice', label: 'INVOICE\nNO.', width: 70, maxLength: 15, bold: true },
      { key: 'date', label: 'DATE', width: 55, maxLength: 11 },
      { key: 'company', label: 'COMPANY', width: 81, maxLength: 17, bold: true },
      { key: 'contact', label: 'ADDRESS /\nPHONE', width: 101, maxLength: 22 },
      { key: 'type', label: 'SCRAP TYPE', width: 76, maxLength: 16, bold: true },
      { key: 'hsn', label: 'HSN', width: 39, maxLength: 8 },
      { key: 'quantity', label: 'QTY', width: 35, maxLength: 6 },
      { key: 'weight', label: 'WEIGHT', width: 49, maxLength: 10 },
      { key: 'rate', label: 'RATE / KG', width: 60, maxLength: 11 },
      { key: 'total', label: 'TOTAL\nAMOUNT', width: 63, maxLength: 13, bold: true },
      { key: 'paid', label: 'PAID\nAMOUNT', width: 59, maxLength: 13 },
      { key: 'due', label: 'DUE\nAMOUNT', width: 58, maxLength: 13, bold: true },
      { key: 'status', label: 'STATUS', width: 52, maxLength: 9, bold: true },
    ]
    const scrapRows = dailyScrapSales.map((sale) => {
      const paid = scrapPaymentFor(sale)
      const due = Math.max(0, Number(sale.totalAmount || 0) - paid)
      return {
        invoice: sale.invoiceNo || `SCRAP-${sale.id || '-'}`,
        date: formatPdfDate(sale.date),
        company: sale.company || 'Company',
        contact: [sale.companyAddress || '-', sale.contact || '-'],
        type: sale.category === 'all' ? 'Bike + Car' : sale.category === 'bike' ? 'Bike Batteries' : sale.category === 'other' ? 'Car Batteries' : sale.category || 'Scrap',
        hsn: sale.hsn || '8507',
        quantity: sale.quantity || 0,
        weight: `${sale.weight || 0} Kg`,
        rate: formatPdfMoney(sale.ratePerKg),
        total: formatPdfMoney(sale.totalAmount),
        paid: formatPdfMoney(paid),
        due: formatPdfMoney(due),
        status: due > 0 ? (paid > 0 ? 'Partial' : 'Due') : 'Paid',
        _due: due,
      }
    })
    const filename = `daily-scrap-sales-${today}.pdf`
    const pdfFile = new File([createDailyTablePdf({
      title: 'Daily Scrap Sales Report',
      date: today,
      summary: `Invoices: ${dailyScrapSales.length}   |   Quantity: ${totals.quantity}   |   Weight: ${totals.weight} Kg   |   Total: ${formatPdfMoney(totals.amount)}   |   Paid: ${formatPdfMoney(totals.paid)}   |   Due: ${formatPdfMoney(totals.due)}`,
      columns: scrapColumns,
      rows: scrapRows,
      emptyMessage: 'No scrap sales recorded today.',
    })], filename, { type: 'application/pdf' })

    await sharePdfFile(pdfFile, message)
  }

  return (
    <>
      <Topbar title="Reports" subtitle="Sales, purchase, due, and brand performance" />

      <div className="card-box mb-4 report-filter">
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label mb-1 small">{t('Report Type')}</label>
            <select className="form-select form-select-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="overview">{t('Full Overview')}</option>
              <option value="sales">{t('Sales Only')}</option>
              <option value="purchase">{t('Purchase Only')}</option>
              <option value="dues">{t('Dues Only')}</option>
            </select>
          </div>
          <div>
            <label className="form-label mb-1 small">{t('From')}</label>
            <input type="date" className="form-control form-control-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label mb-1 small">{t('To')}</label>
            <input type="date" className="form-control form-control-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => { setFromDate(''); setToDate(''); }}>
            <i className="fa-solid fa-rotate-left me-1"></i>{t('Reset')}
          </button>
          <button className="btn btn-primary btn-sm ms-auto" onClick={() => window.print()}>
            <i className="fa-solid fa-print me-1"></i>{t('Print Report')}
          </button>
          <button className="btn btn-success btn-sm" onClick={sendDailySalesToWhatsApp}>
            <i className="fa-brands fa-whatsapp me-1"></i>Send Daily Sales
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={sendDailyScrapSalesToWhatsApp}>
            <i className="fa-brands fa-whatsapp me-1"></i>Send Daily Scrap Sales
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>{t('Total Sales')}</small><h4>{formatCurrency(summary.salesAmount)}</h4><span className="stat-change stat-muted">{summary.invoiceCount} invoices</span></div><div className="stat-icon icon-blue"><i className="fa-solid fa-indian-rupee-sign"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>{t('Units Sold')}</small><h4>{summary.unitsSold}</h4><span className="stat-change stat-muted">Battery quantity</span></div><div className="stat-icon icon-green"><i className="fa-solid fa-car-battery"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>{t('Purchase Amount')}</small><h4>{formatCurrency(summary.purchaseAmount)}</h4><span className="stat-change stat-muted">{summary.purchaseCount} entries</span></div><div className="stat-icon icon-navy"><i className="fa-solid fa-truck-ramp-box"></i></div></div></div>
        <div className="col-md-6 col-xl-3"><div className="card-box stat-card"><div><small>{t('Total Outstanding')}</small><h4 className="text-danger">{formatCurrency(summary.salesDue + summary.purchaseDue)}</h4><span className="stat-change down">Customer + purchase dues</span></div><div className="stat-icon icon-red"><i className="fa-solid fa-wallet"></i></div></div></div>
      </div>

      {showStockAndScrap && (
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="card-box">
              <div className="section-title">{t('Brand Stock Summary')}</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>{t('Brand')}</th><th>{t('Total Models')}</th><th>{t('Total Serial Numbers')}</th></tr></thead>
                  <tbody>
                    {brandStockRows.map((row) => (
                      <tr key={row.brand}><td><strong>{row.brand}</strong></td><td>{row.models}</td><td>{row.serials}</td></tr>
                    ))}
                    {!brandStockRows.length && <tr><td colSpan="3" className="text-center text-muted py-4">{t('No brands found.')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card-box">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
                <div className="section-title mb-0">{t('Stock Report')}</div>
                {hasMoreStockRows && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setIsStockReportExpanded((expanded) => !expanded)}
                    aria-expanded={isStockReportExpanded}
                  >
                    {isStockReportExpanded ? 'Show less' : 'See more'}
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>{t('Brand')}</th><th>{t('Model')}</th><th>{t('Units')}</th><th>Purchase</th><th>Selling</th><th>Warranty</th></tr></thead>
                  <tbody>
                    {visibleStockRows.map((row) => (
                      <tr key={row.id}><td>{row.brand}</td><td>{row.model}</td><td>{row.units}</td><td>{formatCurrency(row.purchasePrice)}</td><td>{formatCurrency(row.sellingPrice)}</td><td>{row.warranty}</td></tr>
                    ))}
                    {!stockRows.length && <tr><td colSpan="6" className="text-center text-muted py-4">No stock found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card-box">
            <div className="section-title">Money Report</div>
            <div className="chart-wrap"><canvas ref={moneyChartRef}></canvas></div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card-box">
            <div className="section-title">Sales By Brand</div>
            <div className="chart-wrap"><canvas ref={brandChartRef}></canvas></div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {showSales && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">{t('Regular Sale Report')}</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>{t('Date')}</th><th>{t('Invoice')}</th><th>{t('Customer')}</th><th>{t('Model')}</th><th>{t('Amount')}</th></tr></thead>
                  <tbody>
                    {regularSales.map((sale) => (
                      <tr key={sale.id || sale.invoice}>
                        <td>{sale.date || sale.invoiceDate}</td><td>{sale.invoice}</td><td>{sale.customer}</td><td>{sale.brand} {sale.model || sale.product}</td><td>{formatCurrency(sale.amount)}</td>
                      </tr>
                    ))}
                    {!regularSales.length && <tr><td colSpan="5" className="text-center text-muted py-4">{t('No sales found.')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showSales && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">{t('Old Stock Sale Report')}</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>{t('Date')}</th><th>{t('Invoice')}</th><th>{t('Customer')}</th><th>{t('Model')}</th><th>{t('Weight')}</th><th>{t('Amount')}</th></tr></thead>
                  <tbody>
                    {oldStockSales.map((sale) => (
                      <tr key={sale.id || sale.invoice}><td>{sale.date || sale.invoiceDate}</td><td>{sale.invoice}</td><td>{sale.customer}</td><td>{sale.brand} {sale.model || sale.product}</td><td>{sale.oldBatteryWeight || sale.exchange?.weight || 0} Kg</td><td>{formatCurrency(sale.amount)}</td></tr>
                    ))}
                    {!oldStockSales.length && <tr><td colSpan="6" className="text-center text-muted py-4">No old stock sales found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showDue && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Customer Due Report</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Due</th></tr></thead>
                  <tbody>
                    {salesDueRows.map((sale) => (
                      <tr key={sale.id || sale.invoice}><td>{sale.date || sale.invoiceDate}</td><td>{sale.invoice}</td><td>{sale.customer}</td><td><span className="payment-amount">{formatCurrency(sale.dueAmount)}</span></td></tr>
                    ))}
                    {!salesDueRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No customer dues found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showPurchase && (
          <div className="col-lg-6">
            <div className="card-box">
              <div className="section-title">Purchase Due Report</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Date</th><th>Company</th><th>Total</th><th>Due</th></tr></thead>
                  <tbody>
                    {purchaseDueRows.map((row) => (
                      <tr key={row.id}><td>{row.date}</td><td>{row.company}</td><td>{formatCurrency(row.grandTotal)}</td><td><span className="payment-amount">{formatCurrency(row.due)}</span></td></tr>
                    ))}
                    {!purchaseDueRows.length && <tr><td colSpan="4" className="text-center text-muted py-4">No purchase dues found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showStockAndScrap && (
          <div className="col-12">
            <div className="card-box">
              <div className="section-title">{t('Scrap Stock Sell Report')}</div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>{t('Date')}</th><th>Invoice</th><th>{t('Company')}</th><th>Category</th><th>{t('Quantity')}</th><th>{t('Weight')}</th><th>{t('Amount')}</th></tr></thead>
                  <tbody>
                    {filteredScrapSales.map((sale) => (
                      <tr key={sale.id}><td>{sale.date}</td><td>{sale.invoiceNo}</td><td>{sale.company}</td><td>{sale.category}</td><td>{sale.quantity}</td><td>{sale.weight} Kg</td><td>{formatCurrency(sale.totalAmount)}</td></tr>
                    ))}
                    {!filteredScrapSales.length && <tr><td colSpan="7" className="text-center text-muted py-4">No scrap stock sales found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

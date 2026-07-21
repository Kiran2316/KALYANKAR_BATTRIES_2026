import { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const brands = ['Exide', 'Amaron', 'SF Sonic', 'Tata Green', 'Power Zone']

const batteryTypes = [
  'Car Battery',
  'Bike Battery',
  'Inverter Battery',
  'Truck Battery',
  'Commercial Vehicle Battery',
  'Solar Battery',
]

const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']

const warrantyTypes = [
  'Full Replacement',
  'Pro-Rata',
  'Full Replacement + Pro-Rata',
  'No Warranty',
]

function parseBatteryBarcode(rawValue) {
  const raw = String(rawValue || '').trim()
  if (!raw) return { model: '', serialNumber: '' }

  try {
    const data = JSON.parse(raw)
    const model = String(data.model || data.capacity || data.modelCapacity || '').trim()
    const serialNumber = String(data.serialNumber || data.serial || data.serialNo || '').trim()
    if (model && serialNumber) return { model, serialNumber: serialNumber.toUpperCase() }
  } catch {
    // The barcode is plain text, so continue with the text formats below.
  }

  const labelledModel = raw.match(/(?:model|capacity)\s*[:=]\s*([^|,;]+?)(?=\s+(?:serial|s\/n|sn)\s*[:=]|[|,;]|$)/i)
  const labelledSerial = raw.match(/(?:serial(?:\s*(?:number|no))?|s\/n|sn)\s*[:=]\s*([^|,;\s]+)/i)
  if (labelledModel && labelledSerial) {
    return {
      model: labelledModel[1].trim(),
      serialNumber: labelledSerial[1].trim().toUpperCase(),
    }
  }

  const separated = raw.split(/\s*[|,;]+\s*/).filter(Boolean)
  if (separated.length >= 2) {
    return {
      model: separated.slice(0, -1).join(' ').trim(),
      serialNumber: separated.at(-1).trim().toUpperCase(),
    }
  }

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return {
      model: parts.slice(0, -1).join(' '),
      serialNumber: parts.at(-1).toUpperCase(),
    }
  }

  return { model: raw, serialNumber: raw.toUpperCase() }
}

function formatWarrantyPeriod(warrantyDigits) {
  const digits = String(warrantyDigits || '').replace(/\D/g, '').slice(0, 4)

  if (digits.length < 2) return digits

  const full = digits.slice(0, 2)
  const proRata = digits.slice(2, 4)

  if (!proRata) return `${full}F + `
  if (proRata.length < 2) return `${full}F + ${proRata}`
  return `${full}F + ${proRata}P`
}

function calculateTotalWarranty(warrantyDigits) {
  const digits = String(warrantyDigits || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length < 4) return 0
  return Number(digits.slice(0, 2)) + Number(digits.slice(2, 4))
}

// Shop details used on the printed invoice.
// logo / stamp are embedded below as base64 data URIs (your actual
// Kalyankar Batteries logo and rubber stamp), so they always render inside
// the print pop-up window with no extra setup or hosting required.
const SHOP_INFO = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay',
  phone: '9420007273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
  // Color logo shown at the top of the invoice
  logo: 'data:image/png;base64,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',
  // Ink stamp shown near the signature at the bottom of the invoice
  stamp: 'data:image/png;base64,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',
}

const initialSales = []
const SALES_STORAGE_KEY = 'kalyankar-sales'

function loadStoredSales() {
  try {
    const savedSales = JSON.parse(localStorage.getItem(SALES_STORAGE_KEY) || '[]')
    return Array.isArray(savedSales) ? savedSales : initialSales
  } catch {
    return initialSales
  }
}

function generateInvoiceNumber(seq) {
  return `INV-2026-${String(seq).padStart(3, '0')}`
}

const createEmptyForm = (seq = 1) => ({
  invoice: generateInvoiceNumber(seq),
  invoiceDate: new Date().toISOString().split('T')[0],
  salesPerson: 'Admin',

  customer: '',
  phone: '',
  address: '',
  gstNumber: '',

  vehicleName: '',
  vehicleNumber: '',

  saleType: 'Regular', // 'Regular' | 'Exchange'
  brand: '',
  batteryType: '',
  model: '',
  serialNumber: '',
  oldBatteryWeight: '',
  qty: 1,
  totalAmount: '',
  paidAmount: '',
  unitPrice: '',
  discount: 0,

  warrantyDigits: '',
  warrantyPeriod: '',
  totalWarranty: 0,
  warrantyType: '',

  cgstRate: 9,
  sgstRate: 9,

  paymentMethod: '',
  status: 'Paid',
  notes: '',
})

const emptyPaymentForm = {
  amount: '',
  method: 'Cash',
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitWords(n) {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const rest = n % 10
  return `${TENS[tens]}${rest ? ' ' + ONES[rest] : ''}`
}

function threeDigitWords(n) {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  if (hundred && rest) return `${ONES[hundred]} Hundred ${twoDigitWords(rest)}`
  if (hundred) return `${ONES[hundred]} Hundred`
  return twoDigitWords(rest)
}

function amountInWords(value) {
  let n = Math.round(Number(value || 0))
  if (n === 0) return 'Zero Rupees Only'

  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  const hundred = n

  const parts = []
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`)
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`)
  if (hundred) parts.push(threeDigitWords(hundred))

  return `${parts.join(' ')} Rupees Only`
}

function choosePrintLanguage() {
  return window.confirm('Bill Marathi madhe print karaycha ka?\nOK = Marathi, Cancel = English') ? 'mr' : 'en'
}

function openPrintWindow(html) {
  const printWindow = window.open('', '_blank', 'width=950,height=1050')
  if (!printWindow) {
    alert('Please allow pop-ups to print the invoice.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 350)
}

function renderInvoiceHTML(fields, printLanguage = 'en') {
  const {
    invoice, date, salesPerson, customer, phone, address, gstNumber,
    vehicleName, vehicleNumber, saleType, exchange,
    brand, batteryType, model, serialNumber, oldBatteryWeight, qty, unitPrice, discount, taxableAmount,
    cgstRate, sgstRate, cgstAmount, sgstAmount, grandTotal,
    paidAmount, dueAmount, status, warrantyPeriod, totalWarranty, warrantyType, paymentMethod, notes,
    paymentHistory,
  } = fields

  const exchangeRow = ''

  // Builds the "Payment History" block for the print-out — every payment
  // (the original amount paid at sale time, plus any later due settlements)
  // is listed with its own date, amount and method, so a customer who pays
  // off a due balance later gets a printed record showing what was paid
  // when.
  const paymentHistoryBlock =
    paymentHistory && paymentHistory.length > 0
      ? `<div class="payment-history-block">
          <h4>Payment History</h4>
          <table class="payment-history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date Paid</th>
                <th class="num">Amount Paid</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              ${paymentHistory
                .map(
                  (entry, index) => `<tr>
                    <td>${index + 1}</td>
                    <td>${entry.date || '—'}</td>
                    <td class="num">&#8377; ${formatCurrency(entry.amount)}</td>
                    <td>${entry.method || '—'}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : ''

  const labels = printLanguage === 'mr'
    ? {
        title: 'कर बिल',
        gstin: 'GSTIN',
        date: 'तारीख',
        customerName: 'ग्राहकाचे नाव',
        address: 'पत्ता',
        phone: 'फोन नं.',
        customerGstin: 'ग्राहक GSTIN',
        invoiceNo: 'बिल नं.',
        vehicleName: 'वाहनाचे नाव',
        vehicleNo: 'वाहन नं.',
        sr: 'क्र.',
        desc: 'मालाचे वर्णन',
        serial: 'सिरीयल नं.',
        hsn: 'HSN',
        qty: 'नग',
        rate: 'दर',
        discount: 'सवलत',
        total: 'एकूण',
        batteryName: 'बॅटरी नाव',
        model: 'मॉडेल',
        warranty: 'वॉरंटी',
        amountWords: 'अक्षरी रु',
        cgst: 'CGST%',
        sgst: 'SGST%',
        grandTotal: 'एकूण',
        customerCopy: 'ग्राहक प्रत',
        officeCopy: 'ऑफिस प्रत',
        signature: 'kalyankar batteries',
      }
    : {
        title: 'Tax Invoice',
        gstin: 'GSTIN',
        date: 'Date',
        customerName: 'Customer Name',
        address: 'Address',
        phone: 'Phone no',
        customerGstin: 'Customer GSTIN',
        invoiceNo: 'Invoice No',
        vehicleName: 'Vehicle Name',
        vehicleNo: 'Vehicle No',
        sr: 'sr.',
        desc: 'Product Description',
        serial: 'sr.no',
        hsn: 'HSN',
        qty: 'Qty',
        rate: 'Rate',
        discount: 'Dis.',
        total: 'Total',
        batteryName: 'Battery name',
        model: 'model',
        warranty: 'warranty',
        amountWords: 'Amount in words',
        cgst: 'CGST%',
        sgst: 'SGST%',
        grandTotal: 'G. Total',
        customerCopy: 'Customer Copy',
        officeCopy: 'Office Copy',
        signature: 'kalyankar batteries',
      }

  const hsnCode = fields.hsn || '8507'
  const copyMarkup = (copyLabel) => `
    <section class="bill-copy">
      <div class="copy-label">${copyLabel}</div>
      <div class="bill-header">
        <img src="${mainLogo}" alt="${SHOP_INFO.name}" class="shop-logo" onerror="this.style.display='none'" />
        <div class="shop-address">
          ${printLanguage === 'mr'
            ? 'शिंदे कॉम्प्लेक्स, मेन रोड, गारगोटी<br/>ता भुदरगड, जि कोल्हापूर, 416209'
            : 'Shinde Complex, Main Road, Gargoti<br/>Tal. Bhudargad, Dist. Kolhapur, 416209'}
        </div>
        <div class="shop-contact"><span>Phone no: ${SHOP_INFO.phone}</span><span>Email: ${SHOP_INFO.email}</span></div>
      </div>
      <div class="bill-line"></div>
      <div class="gst-date-row"><span>${labels.gstin}: ${SHOP_INFO.gstin}</span><span>${labels.date}: ${date}</span></div>
      <div class="customer-grid">
        <div>
          <div class="field-row">${labels.customerName}: ${customer || ''}</div>
          <div class="field-row">${labels.address}: ${address || ''}</div>
          <div class="field-row">${labels.address}: </div>
          <div class="field-row">${labels.phone}: ${phone || ''}</div>
          <div class="field-row">${labels.customerGstin}: ${gstNumber || ''}</div>
        </div>
        <div>
          <div class="field-row">${labels.invoiceNo}: ${invoice || ''}</div>
          <div class="field-row">${labels.vehicleName}: ${vehicleName || ''}</div>
          <div class="field-row">${labels.vehicleNo}: ${vehicleNumber || ''}</div>
        </div>
      </div>
      <table class="items">
        <thead><tr><th>${labels.sr}</th><th>${labels.desc}</th><th>${labels.serial}</th><th>${labels.hsn}</th><th>${labels.qty}</th><th>${labels.rate}</th><th>${labels.discount}</th><th>${labels.total}</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>${brand || ''} ${batteryType || ''}</td><td>${serialNumber || ''}</td><td>${hsnCode}</td><td>${qty || ''}</td><td class="num">${formatCurrency(unitPrice)}</td><td class="num">${formatCurrency(discount)}</td><td class="num">${formatCurrency(taxableAmount)}</td></tr>
          <tr><td></td><td>${labels.batteryName}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td>${labels.model}: ${model || ''}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td>${labels.warranty}: ${warrantyPeriod || ''}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          ${Array.from({ length: 3 }).map(() => '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
        </tbody>
      </table>
      <div class="below-table">
        <div class="amount-words">${labels.amountWords}</div>
        <div class="totals-box">
          <div class="line"><span>add: ${labels.cgst} :</span><strong>${formatCurrency(cgstAmount)}</strong></div>
          <div class="line"><span>${labels.sgst} :</span><strong>${formatCurrency(sgstAmount)}</strong></div>
          <div class="line"><span>${labels.grandTotal} :</span><strong>${formatCurrency(grandTotal)}</strong></div>
        </div>
      </div>
      <div class="signature-space"></div>
      <div class="signature-line"><div class="line-mark">${labels.signature}</div></div>
    </section>
  `

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoice} — Tax Invoice</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    margin: 0;
    padding: 18px;
    font-size: 13px;
    line-height: 1.15;
  }
  .invoice-sheet { display: none; }
  .print-page { width: 190mm; margin: 0 auto; }
  .bill-copy { position: relative; min-height: 138mm; padding: 4mm 5mm 3mm; border-bottom: 1px dashed #777; page-break-inside: avoid; break-inside: avoid; }
  .bill-copy:last-child { border-bottom: 0; }
  .copy-label { position: absolute; right: 5mm; top: 3mm; font-size: 10px; font-weight: 700; color: #666; }

  .bill-header { text-align: center; margin-bottom: 4px; }
  .shop-logo { width: 290px; max-width: 80%; height: auto; object-fit: contain; display: block; margin: 0 auto 4px; }
  .shop-address { font-size: 16px; font-weight: 700; line-height: 1.18; margin-top: 4px; }
  .shop-contact { width: 100%; margin-top: 4px; font-size: 14px; display: grid; grid-template-columns: 1fr 1fr; text-align: left; }
  .shop-contact span:last-child { text-align: left; }

  .bill-line { border-top: 1px solid #111; margin: 2px 0; }
  .gst-date-row { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #111; padding: 3px 0 2px; font-size: 14px; }
  .gst-date-row span:first-child { padding-left: 48px; }
  .gst-date-row span:last-child { text-align: right; padding-right: 34px; }

  .customer-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; padding: 4px 32px 0; font-size: 14px; }
  .field-row { min-height: 18px; white-space: nowrap; }
  .field-row strong { font-weight: 500; }

  table.items { width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 13px; }
  table.items th, table.items td { border: 1px solid #111; padding: 2px 4px; height: 20px; font-weight: 400; }
  table.items th { text-align: center; }
  table.items .desc { width: 32%; }
  table.items .sr { width: 6%; text-align: center; }
  table.items .num { text-align: right; }
  .product-line td { height: 22px; }
  .num { text-align: right; }

  .below-table { display: grid; grid-template-columns: 1fr 170px; gap: 12px; align-items: start; margin-top: 0; }
  .amount-words { padding-left: 48px; padding-top: 4px; font-weight: 700; min-height: 44px; }
  .totals-box { font-size: 14px; }
  .totals-box .line { display: grid; grid-template-columns: 1fr 72px; align-items: center; min-height: 20px; }
  .totals-box .line span { text-align: right; padding-right: 4px; }
  .totals-box .line strong { border: 1px solid #111; height: 20px; padding: 2px 4px; font-weight: 400; text-align: right; }

  .payment-history-block {
    margin-top: 12px; font-family: Arial, sans-serif;
    border: 1px solid #e3e8f0; border-radius: 6px; padding: 10px 12px; background: #fbfcfe;
  }
  .payment-history-block h4 {
    margin: 0 0 8px; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase;
    color: #6b7688; border-bottom: 1px solid #eef1f7; padding-bottom: 6px;
  }
  table.payment-history-table { width: 100%; border-collapse: collapse; }
  table.payment-history-table th {
    background: #f2f5fa; color: #4f5e75; font-size: 10px; text-transform: uppercase;
    padding: 5px 7px; text-align: left; border-bottom: 1px solid #e3e8f0;
  }
  table.payment-history-table td { padding: 5px 7px; font-size: 10.5px; border-bottom: 1px solid #eef1f7; color: #26314a; }
  table.payment-history-table tr:last-child td { border-bottom: none; }

  .notes { margin-top: 10px; font-size: 11px; color: #333; }
  .signature-space { height: 82px; }
  .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; font-family: Arial, sans-serif; }
  .signature-line { width: 220px; text-align: center; }
  .signature-line .line-mark { border-top: 1px solid #111; padding-top: 4px; font-size: 13px; color: #111; }
  .shop-stamp {
    width: 210px; height: auto; max-height: 92px; object-fit: contain; margin: 0 auto 4px; display: block;
  }

  .doc-footer {
    text-align: center; margin-top: 8px; font-family: Arial, sans-serif; font-size: 10px; color: #333;
  }

  @page { size: A4 portrait; margin: 8mm; }
  @media print {
    html, body { width: 210mm; min-height: 297mm; margin: 0; padding: 0; }
    body { padding: 0; font-size: 13px; line-height: 1.15; }
    .print-page { width: 100%; }
    .bill-copy { min-height: 140mm; padding: 3mm 4mm 2mm; }
    .invoice-sheet { display: none; }
    .doc-header, .info-grid, table.items, .totals-wrap, .payment-history-block, .words-box, .warranty-note, .signatures, .doc-footer {
      page-break-inside: avoid; break-inside: avoid;
    }
  }
</style>
</head>
<body>
  <main class="print-page">
    ${copyMarkup(labels.customerCopy)}
    ${copyMarkup(labels.officeCopy)}
  </main>
  <div class="invoice-sheet">
    <div class="doc-header">
      <div class="shop-brand">
        <div>
          <img
            src="${SHOP_INFO.logo}"
            alt="${SHOP_INFO.name} logo"
            class="shop-logo"
            onerror="this.style.display='none'"
          />
          <div class="shop-meta">
            <strong>${SHOP_INFO.address}</strong><br/>
            Phone: ${SHOP_INFO.phone} &nbsp;|&nbsp; ${SHOP_INFO.email}<br/>
            GSTIN: ${SHOP_INFO.gstin}
          </div>
        </div>
      </div>
      <div class="invoice-tag">
        <div class="badge-title">TAX INVOICE</div>
        <div class="row"><strong>Invoice No:</strong> ${invoice}</div>
        <div class="row"><strong>Date:</strong> ${date}</div>
        <div class="row"><strong>Sale Type:</strong> ${saleType}</div>
        <div class="row"><strong>Sales Person:</strong> ${salesPerson || 'Admin'}</div>
        <div><span class="status-pill ${status === 'Paid' ? 'status-paid' : 'status-due'}">${status}</span></div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h4>Bill To</h4>
        <p><strong>${customer || '—'}</strong></p>
        <p><span class="label">Phone:</span> ${phone || '—'}</p>
        <p><span class="label">Address:</span> ${address || '—'}</p>
        ${gstNumber ? `<p><span class="label">GSTIN:</span> ${gstNumber}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>${saleType === 'Exchange' ? 'Vehicle &amp; Old Battery' : 'Vehicle &amp; Warranty'}</h4>
        <p><span class="label">Vehicle:</span> ${vehicleName || '—'} ${vehicleNumber ? `(${vehicleNumber})` : ''}</p>
        ${saleType === 'Regular' ? `<p><span class="label">Warranty Period:</span> ${warrantyPeriod || '—'}</p>` : ''}
        ${saleType === 'Regular' ? `<p><span class="label">Total Warranty:</span> ${totalWarranty ? `${totalWarranty} Months` : '—'}</p>` : ''}
        ${saleType === 'Regular' && warrantyType ? `<p><span class="label">Warranty Type:</span> ${warrantyType}</p>` : ''}
        ${saleType === 'Exchange' ? `<p><span class="label">Old Battery Weight:</span> ${oldBatteryWeight ? `${oldBatteryWeight} Kg` : '—'}</p>` : ''}
        <p><span class="label">Payment Method:</span> ${paymentMethod || '—'}</p>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Serial No.</th>
          <th>Battery Type</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Discount</th>
          <th class="num">Taxable Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>${brand || ''} ${model || ''}</strong></td>
          <td>${serialNumber || '—'}</td>
          <td>${batteryType || '—'}</td>
          <td class="num">${qty}</td>
          <td class="num">&#8377; ${formatCurrency(unitPrice)}</td>
          <td class="num">&#8377; ${formatCurrency(discount)}</td>
          <td class="num">&#8377; ${formatCurrency(taxableAmount)}</td>
        </tr>
        ${exchangeRow}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="line"><span>Taxable Amount</span><strong>&#8377; ${formatCurrency(taxableAmount)}</strong></div>
        <div class="line"><span>CGST (${cgstRate}%)</span><strong>&#8377; ${formatCurrency(cgstAmount)}</strong></div>
        <div class="line"><span>SGST (${sgstRate}%)</span><strong>&#8377; ${formatCurrency(sgstAmount)}</strong></div>
        <div class="grand"><span>Grand Total</span><strong>&#8377; ${formatCurrency(grandTotal)}</strong></div>
        <div class="line" style="margin-top:8px;"><span>Payment Method</span><strong>${paymentMethod || '—'}</strong></div>
        <div class="line"><span>Total Paid Till Date</span><strong>&#8377; ${formatCurrency(paidAmount)}</strong></div>
        <div class="line"><span>Due Payment</span><strong>&#8377; ${formatCurrency(dueAmount)}</strong></div>
      </div>
    </div>

    ${paymentHistoryBlock}

    <div class="words-box">
      <strong>Amount in Words:</strong> ${amountInWords(grandTotal)}
      ${notes ? `<br/><strong>Notes:</strong> ${notes}` : ''}
    </div>

    ${saleType === 'Regular' ? `<div class="warranty-note">
      Warranty is applicable strictly as per the manufacturer's terms and conditions. Please retain this invoice
      as proof of purchase for any warranty claim.
    </div>` : ''}

    <div class="signatures">
      <div class="signature-line"><div class="line-mark">Customer Signature</div></div>
      <div class="signature-line">
        <img
          src="${SHOP_INFO.stamp}"
          alt="${SHOP_INFO.name} stamp"
          class="shop-stamp"
          onerror="this.style.display='none'"
        />
        <div class="line-mark">Authorized Signatory — ${SHOP_INFO.name}</div>
      </div>
    </div>

    <div class="doc-footer">
      This is a system generated invoice. For any query, contact ${SHOP_INFO.phone}.
    </div>
  </div>
</body>
</html>`
}

export default function Sales() {
  const [sales, setSales] = useState(loadStoredSales)
  const [nextInvoiceSeq, setNextInvoiceSeq] = useState(() => loadStoredSales().length + 1)
  const [activeTab, setActiveTab] = useState('regular') // 'regular' | 'exchange'
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(createEmptyForm(1))
  const [selectedSale, setSelectedSale] = useState(null)
  const [customerMode, setCustomerMode] = useState('new')

  const [paymentSale, setPaymentSale] = useState(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)

  // One barcode scan fills both Model / Capacity and Serial Number.
  const [scannerField, setScannerField] = useState(null)
  const [scannerError, setScannerError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanRafRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales))
  }, [sales])

  useEffect(() => {
    return () => {
      if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  async function startScanner(field) {
    setScannerError('')

    if (!('BarcodeDetector' in window)) {
      alert('Barcode scanning is not supported on this browser/device. Please type the value in manually.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setScannerField(field)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
          runScanLoop(field)
        }
      }, 60)
    } catch (error) {
      alert('Unable to access the camera. Please check camera permissions or enter the value manually.')
    }
  }

  function runScanLoop(field) {
    const detector = new window.BarcodeDetector({
      formats: ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
    })

    const scan = async () => {
      if (!videoRef.current) return

      try {
        const results = await detector.detect(videoRef.current)
        if (results && results.length > 0) {
          const value = results[0].rawValue
          const battery = parseBatteryBarcode(value)
          setForm((previous) => ({
            ...previous,
            model: battery.model,
            serialNumber: battery.serialNumber,
          }))
          stopScanner()
          return
        }
      } catch (error) {
        // Ignore per-frame detection errors and keep scanning
      }

      scanRafRef.current = requestAnimationFrame(scan)
    }

    scanRafRef.current = requestAnimationFrame(scan)
  }

  function stopScanner() {
    if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScannerField(null)
  }

  const customers = useMemo(() => {
    const uniqueCustomers = new Map()

    sales.forEach((sale) => {
      const phone = String(sale.phone || '').trim()
      if (!phone) return

      uniqueCustomers.set(phone, {
        name: sale.customer,
        phone,
        address: sale.address || '',
      })
    })

    return Array.from(uniqueCustomers.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [sales])

  const regularSales = useMemo(() => sales.filter((sale) => sale.saleType !== 'Exchange'), [sales])
  const exchangeSales = useMemo(() => sales.filter((sale) => sale.saleType === 'Exchange'), [sales])

  function matchesSearch(sale, q) {
    return [
      sale.invoice,
      sale.customer,
      sale.phone,
      sale.brand,
      sale.batteryType,
      sale.model,
      sale.serialNumber,
      sale.qty,
      sale.amount,
      sale.date,
      sale.status,
      sale.warrantyPeriod,
      sale.vehicleName,
      sale.vehicleNumber,
      sale.saleType,
      sale.exchange?.brand,
      sale.exchange?.model,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }

  const filteredRegular = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return regularSales
    return regularSales.filter((sale) => matchesSearch(sale, q))
  }, [regularSales, search])

  const filteredExchange = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exchangeSales
    return exchangeSales.filter((sale) => matchesSearch(sale, q))
  }, [exchangeSales, search])

  const summary = useMemo(() => {
    let total = 0
    let paid = 0
    let due = 0

    sales.forEach((sale) => {
      total += Number(sale.amount || 0)

      if (sale.status === 'Paid') {
        paid += 1
      } else {
        due += 1
      }
    })

    return { total, orders: sales.length, paid, due }
  }, [sales])

  const priceSummary = useMemo(() => {
    const cgstRate = Math.max(0, Number(form.cgstRate || 0))
    const sgstRate = Math.max(0, Number(form.sgstRate || 0))
    const totalGstRate = cgstRate + sgstRate
    const enteredTotal = Math.max(0, Number(form.totalAmount || 0))
    const grandTotal = enteredTotal

    const paidAmount = Math.min(
      grandTotal,
      Math.max(0, Number(form.paidAmount || 0))
    )
    const dueAmount = Math.max(0, grandTotal - paidAmount)

    const taxableAmount =
      totalGstRate > 0
        ? grandTotal / (1 + totalGstRate / 100)
        : grandTotal

    const cgstAmount = taxableAmount * (cgstRate / 100)
    const sgstAmount = taxableAmount * (sgstRate / 100)

    const discount = form.saleType === 'Regular' ? Math.max(0, Number(form.discount || 0)) : 0
    const qty = form.saleType === 'Regular' ? Math.max(1, Number(form.qty || 1)) : 1

    const subtotal = taxableAmount + discount
    const unitPrice = subtotal / qty

    return {
      enteredTotal,
      subtotal,
      unitPrice,
      discount,
      taxableAmount,
      cgstRate,
      sgstRate,
      totalGstRate,
      cgstAmount,
      sgstAmount,
      gstAmount: cgstAmount + sgstAmount,
      grandTotal,
      paidAmount,
      dueAmount,
    }
  }, [
    form.totalAmount,
    form.paidAmount,
    form.qty,
    form.discount,
    form.saleType,
    form.cgstRate,
    form.sgstRate,
  ])

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateWarranty(value) {
    const warrantyDigits = value.replace(/\D/g, '').slice(0, 4)

    setForm((previous) => ({
      ...previous,
      warrantyDigits,
      warrantyPeriod: formatWarrantyPeriod(warrantyDigits),
      totalWarranty: calculateTotalWarranty(warrantyDigits),
    }))
  }

  function handleWarrantyKeyDown(event) {
    if (event.key !== 'Backspace') return

    event.preventDefault()
    setForm((previous) => {
      const warrantyDigits = previous.warrantyDigits.slice(0, -1)
      return {
        ...previous,
        warrantyDigits,
        warrantyPeriod: formatWarrantyPeriod(warrantyDigits),
        totalWarranty: calculateTotalWarranty(warrantyDigits),
      }
    })
  }

  function decreaseQuantity() {
    setForm((previous) => ({ ...previous, qty: Math.max(1, Number(previous.qty || 1) - 1) }))
  }

  function increaseQuantity() {
    setForm((previous) => ({ ...previous, qty: Number(previous.qty || 1) + 1 }))
  }

  function changeCustomerMode(mode) {
    setCustomerMode(mode)
    setForm((previous) => ({ ...previous, customer: '', phone: '', address: '' }))
  }

  function selectExistingCustomer(phone) {
    const selectedCustomer = customers.find((customer) => customer.phone === phone)

    setForm((previous) => ({
      ...previous,
      customer: selectedCustomer?.name || '',
      phone: selectedCustomer?.phone || '',
      address: selectedCustomer?.address || previous.address,
    }))
  }

  // Switches between a normal sale and an exchange sale. Clears the
  // exchange-only fields when going back to Regular so stale data
  // doesn't silently get submitted.
  function changeSaleType(type) {
    setForm((previous) => ({
      ...previous,
      saleType: type,
      discount: type === 'Exchange' ? 0 : previous.discount,
      warrantyDigits: type === 'Exchange' ? '' : previous.warrantyDigits,
      warrantyPeriod: type === 'Exchange' ? '' : previous.warrantyPeriod,
      totalWarranty: type === 'Exchange' ? 0 : previous.totalWarranty,
      warrantyType: type === 'Exchange' ? '' : previous.warrantyType,
    }))
  }

  function closeModal() {
    const modalElement = document.getElementById('addSaleModal')
    if (modalElement && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    }
  }

  function closeViewModal() {
    const modalElement = document.getElementById('viewSaleModal')
    if (modalElement && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    }
  }

  function closePaymentModal() {
    const modalElement = document.getElementById('paymentModal')
    if (modalElement && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    }
  }

  function resetForm() {
    setForm(createEmptyForm(nextInvoiceSeq))
    setCustomerMode(customers.length > 0 ? 'existing' : 'new')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.invoice.trim()) return alert('Please enter invoice number.')
    if (!form.customer.trim()) return alert('Please enter customer name.')
    if (!form.phone.trim()) return alert('Please enter customer phone number.')
    if (!form.address.trim()) return alert('Please enter customer address.')
    if (!form.brand) return alert('Please select battery brand.')
    if (!form.batteryType) return alert('Please select battery type.')
    if (!form.model.trim()) return alert('Please enter battery model or capacity.')
    if (!form.serialNumber.trim()) return alert('Please enter battery serial number.')
    if (form.saleType === 'Exchange' && (!form.oldBatteryWeight || Number(form.oldBatteryWeight) <= 0)) {
      return alert('Please enter a valid old battery weight in Kg.')
    }
    if (form.paidAmount === '') return alert('Please enter the paid amount.')
    if (!form.paymentMethod) return alert('Please select a payment method.')
    if (priceSummary.grandTotal <= 0) {
      return alert(form.saleType === 'Exchange'
        ? 'Please enter a valid old battery total including GST.'
        : 'Please enter a valid total amount.')
    }
    if (Number(form.paidAmount || 0) < 0) {
      return alert('Paid amount cannot be negative.')
    }
    if (Number(form.paidAmount || 0) > priceSummary.grandTotal) {
      return alert('Paid amount cannot be greater than the final payable amount.')
    }
    if (form.saleType === 'Regular' && form.warrantyDigits.length !== 4) {
      return alert('Please enter four warranty digits, for example 4518 for 45F + 18P.')
    }
    if (Number(form.cgstRate) < 0 || Number(form.sgstRate) < 0) {
      return alert('GST rate cannot be negative.')
    }

    const saleDate = todayLabel()

    const newSale = {
      id: Date.now(),
      invoice: form.invoice.trim(),
      invoiceDate: form.invoiceDate,
      salesPerson: form.salesPerson,

      customer: form.customer.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gstNumber: form.gstNumber.trim(),

      vehicleName: form.vehicleName.trim(),
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),

      saleType: form.saleType,
      exchange:
        form.saleType === 'Exchange'
          ? {
              brand: form.brand,
              batteryType: form.batteryType,
              model: form.model.trim(),
              serialNumber: form.serialNumber.trim().toUpperCase(),
              weight: Number(form.oldBatteryWeight || 0),
              value: priceSummary.grandTotal,
            }
          : null,

      brand: form.brand,
      batteryType: form.batteryType,
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim().toUpperCase(),
      oldBatteryWeight: form.saleType === 'Exchange' ? Number(form.oldBatteryWeight || 0) : 0,
      product: `${form.brand} ${form.model.trim()}`,
      qty: Number(form.qty || 1),
      unitPrice: priceSummary.unitPrice,
      batteryPrice: priceSummary.taxableAmount,
      discount: form.saleType === 'Regular' ? Number(form.discount || 0) : 0,

      warrantyPeriod: form.saleType === 'Regular' ? form.warrantyPeriod : '',
      totalWarranty: form.saleType === 'Regular' ? form.totalWarranty : 0,
      warrantyType: form.saleType === 'Regular' ? form.warrantyType.trim() : '',

      cgstRate: priceSummary.cgstRate,
      sgstRate: priceSummary.sgstRate,
      cgstAmount: priceSummary.cgstAmount,
      sgstAmount: priceSummary.sgstAmount,

      paymentMethod: form.paymentMethod,
      paidAmount: priceSummary.paidAmount,
      dueAmount: priceSummary.dueAmount,
      notes: form.notes.trim(),
      amount: priceSummary.grandTotal,
      date: saleDate,
      status: priceSummary.dueAmount > 0 ? 'Due' : 'Paid',

      // Log of every payment made against this sale (initial + later due settlements)
      paymentHistory:
        priceSummary.paidAmount > 0
          ? [
              {
                amount: priceSummary.paidAmount,
                date: saleDate,
                method: form.paymentMethod,
              },
            ]
          : [],
    }

    setSales((previous) => [newSale, ...previous])
    setNextInvoiceSeq((previous) => previous + 1)
    setActiveTab(newSale.saleType === 'Exchange' ? 'exchange' : 'regular')

    resetForm()
    closeModal()
  }

  function viewSale(sale) {
    setSelectedSale(sale)
  }

  function deleteSale(id) {
    const shouldDelete = window.confirm('Are you sure you want to delete this sale?')
    if (!shouldDelete) return
    setSales((previous) => previous.filter((sale) => sale.id !== id))
  }

  function openPaymentModal(sale) {
    setPaymentSale(sale)
    setPaymentForm({ amount: '', method: sale.paymentMethod || 'Cash' })
  }

  function submitPayment(event) {
    event.preventDefault()

    if (!paymentSale) return

    const dueNow = Number(paymentSale.dueAmount || 0)
    const amount = Number(paymentForm.amount || 0)

    if (!amount || amount <= 0) {
      return alert('Please enter a valid payment amount.')
    }
    if (amount > dueNow) {
      return alert('Payment amount cannot be greater than the due amount.')
    }
    if (!paymentForm.method) {
      return alert('Please select a payment method.')
    }

    const paymentDate = todayLabel()

    setSales((previous) =>
      previous.map((sale) => {
        if (sale.id !== paymentSale.id) return sale

        const newPaidAmount = Number(sale.paidAmount || 0) + amount
        const newDueAmount = Math.max(0, Number(sale.amount || 0) - newPaidAmount)

        return {
          ...sale,
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newDueAmount > 0 ? 'Due' : 'Paid',
          paymentMethod: paymentForm.method,
          paymentHistory: [
            ...(sale.paymentHistory || []),
            {
              amount,
              date: paymentDate,
              method: paymentForm.method,
            },
          ],
        }
      })
    )

    // Keep the View Sale modal (if open on this sale) in sync
    setSelectedSale((previous) => {
      if (!previous || previous.id !== paymentSale.id) return previous

      const newPaidAmount = Number(previous.paidAmount || 0) + amount
      const newDueAmount = Math.max(0, Number(previous.amount || 0) - newPaidAmount)

      return {
        ...previous,
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newDueAmount > 0 ? 'Due' : 'Paid',
        paymentMethod: paymentForm.method,
        paymentHistory: [
          ...(previous.paymentHistory || []),
          { amount, date: paymentDate, method: paymentForm.method },
        ],
      }
    })

    setPaymentForm(emptyPaymentForm)
    setPaymentSale(null)
    closePaymentModal()
  }

  function printFormInvoice() {
    // The form hasn't been saved yet, so there's no stored payment history.
    // If an amount has been entered as "paid" in the form, show it as a
    // single payment entry dated today, so the print preview matches what
    // will actually be saved.
    const previewPaymentHistory =
      priceSummary.paidAmount > 0
        ? [
            {
              amount: priceSummary.paidAmount,
              date: form.invoiceDate
                ? new Date(form.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : todayLabel(),
              method: form.paymentMethod,
            },
          ]
        : []

    const fields = {
      invoice: form.invoice,
      date: form.invoiceDate
        ? new Date(form.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : todayLabel(),
      salesPerson: form.salesPerson,
      customer: form.customer,
      phone: form.phone,
      address: form.address,
      gstNumber: form.gstNumber,
      vehicleName: form.vehicleName,
      vehicleNumber: form.vehicleNumber,
      saleType: form.saleType,
      exchange: form.saleType === 'Exchange'
        ? {
            brand: form.brand,
            batteryType: form.batteryType,
            model: form.model,
            serialNumber: form.serialNumber,
            weight: Number(form.oldBatteryWeight || 0),
            value: priceSummary.grandTotal,
          }
        : null,
      brand: form.brand,
      batteryType: form.batteryType,
      model: form.model,
      serialNumber: form.serialNumber,
      oldBatteryWeight: Number(form.oldBatteryWeight || 0),
      qty: Number(form.qty || 1),
      unitPrice: priceSummary.unitPrice,
      discount: priceSummary.discount,
      taxableAmount: priceSummary.taxableAmount,
      cgstRate: priceSummary.cgstRate,
      sgstRate: priceSummary.sgstRate,
      cgstAmount: priceSummary.cgstAmount,
      sgstAmount: priceSummary.sgstAmount,
      grandTotal: priceSummary.grandTotal,
      paidAmount: priceSummary.paidAmount,
      dueAmount: priceSummary.dueAmount,
      status: priceSummary.dueAmount > 0 ? 'Due' : 'Paid',
      warrantyPeriod: form.warrantyPeriod,
      totalWarranty: form.totalWarranty,
      warrantyType: form.warrantyType,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      paymentHistory: previewPaymentHistory,
    }
    openPrintWindow(renderInvoiceHTML(fields, choosePrintLanguage()))
  }

  function printSavedInvoice(sale) {
    if (!sale) return
    const fields = {
      invoice: sale.invoice,
      date: sale.date,
      salesPerson: sale.salesPerson || 'Admin',
      customer: sale.customer,
      phone: sale.phone,
      address: sale.address,
      gstNumber: sale.gstNumber,
      vehicleName: sale.vehicleName,
      vehicleNumber: sale.vehicleNumber,
      saleType: sale.saleType,
      exchange: sale.exchange,
      brand: sale.brand,
      batteryType: sale.batteryType,
      model: sale.model || sale.product,
      serialNumber: sale.serialNumber,
      oldBatteryWeight: sale.oldBatteryWeight || sale.exchange?.weight || 0,
      qty: sale.qty,
      unitPrice: sale.unitPrice,
      discount: sale.discount,
      taxableAmount: sale.batteryPrice ?? (Number(sale.amount || 0) / 1.18),
      cgstRate: sale.cgstRate ?? 9,
      sgstRate: sale.sgstRate ?? 9,
      cgstAmount: sale.cgstAmount ?? 0,
      sgstAmount: sale.sgstAmount ?? 0,
      grandTotal: sale.amount,
      paidAmount: sale.paidAmount ?? (sale.status === 'Paid' ? sale.amount : 0),
      dueAmount: sale.dueAmount ?? (sale.status === 'Due' ? sale.amount : 0),
      status: sale.status,
      warrantyPeriod: sale.warrantyPeriod,
      totalWarranty: sale.totalWarranty,
      warrantyType: sale.warrantyType,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes,
      // Full trail of payments (original + any due settlements), each with
      // its own date, amount and method — printed as a dedicated table.
      paymentHistory: sale.paymentHistory || [],
    }
    openPrintWindow(renderInvoiceHTML(fields, choosePrintLanguage()))
  }

  function renderSalesTable(list, isExchange) {
    const groupedRows = []

    const customerGroups = list.reduce((groups, sale) => {
      const key = String(sale.phone || sale.customer || '').trim().toLowerCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(sale)
      return groups
    }, {})

    Object.values(customerGroups).forEach((customerSales) => {
      customerSales.forEach((sale, index) => {
        groupedRows.push({
          sale,
          customerRowSpan: index === 0 ? customerSales.length : 0,
          purchaseNumber: index + 1,
          totalPurchases: customerSales.length,
        })
      })
    })

    return (
      <div className="table-responsive">
        <table className="table sales-table align-middle mb-0">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Date</th>
              <th>Name</th>
              <th>Address / Phone</th>
              <th>{isExchange ? 'Old Battery' : 'Brand & Capacity'}</th>
              <th>Serial No.</th>
              {isExchange && <th>Weight (Kg)</th>}
              <th>Type of Vehicle</th>
              {!isExchange && <th>Unit</th>}
              {!isExchange && <th>Warranty</th>}
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Due Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {groupedRows.map(({ sale, customerRowSpan, purchaseNumber, totalPurchases }) => (
              <tr key={sale.id}>
                <td>
                  <strong>{sale.invoice}</strong>
                  <div className="sales-brand-label">Purchase #{purchaseNumber}</div>
                </td>
                <td>{sale.date}</td>

                {customerRowSpan > 0 && (
                  <td rowSpan={customerRowSpan} className="align-middle">
                    <strong>{sale.customer}</strong>
                    <div className="sales-brand-label mt-1">
                      {totalPurchases} purchase{totalPurchases > 1 ? 's' : ''}
                    </div>
                  </td>
                )}

                {customerRowSpan > 0 && (
                  <td rowSpan={customerRowSpan} className="align-middle">
                    <div>{sale.address || '—'}</div>
                    <div className="sales-brand-label">{sale.phone}</div>
                  </td>
                )}

                <td>
                  <div className="sales-product-cell">
                    <div className="sales-product-thumb"><i className="fa-solid fa-car-battery"></i></div>
                    <div>
                      <strong>{sale.model || sale.product}</strong>
                      <div className="sales-brand-label">{sale.brand}</div>
                    </div>
                  </div>
                </td>

                <td>{sale.serialNumber || '—'}</td>
                {isExchange && <td>{sale.oldBatteryWeight ? `${sale.oldBatteryWeight} Kg` : '—'}</td>}

                <td>
                  {sale.vehicleName || '—'}
                  {sale.vehicleNumber && <div className="sales-brand-label">{sale.vehicleNumber}</div>}
                </td>

                {!isExchange && <td>{sale.qty}</td>}
                {!isExchange && <td>{sale.warrantyPeriod}</td>}

                <td><strong>₹ {Number(sale.amount).toLocaleString('en-IN')}</strong></td>
                <td>₹ {Number(sale.paidAmount ?? (sale.status === 'Paid' ? sale.amount : 0)).toLocaleString('en-IN')}</td>
                <td className={Number(sale.dueAmount || 0) > 0 ? 'text-danger fw-bold' : ''}>
                  ₹ {Number(sale.dueAmount || 0).toLocaleString('en-IN')}
                </td>

                <td>
                  <span className={sale.status === 'Paid' ? 'sales-badge-paid' : 'sales-badge-due'}>
                    {sale.status}
                  </span>
                </td>

                <td>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      data-bs-toggle="modal"
                      data-bs-target="#viewSaleModal"
                      onClick={() => viewSale(sale)}
                      title="View sale"
                    >
                      <i className="fa-solid fa-eye"></i>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      data-bs-toggle="modal"
                      data-bs-target="#paymentModal"
                      onClick={() => openPaymentModal(sale)}
                      title="Record payment"
                      disabled={Number(sale.dueAmount || 0) <= 0}
                    >
                      <i className="fa-solid fa-money-bill-wave"></i>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteSale(sale.id)}
                      title="Delete sale"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const activeList = activeTab === 'exchange' ? filteredExchange : filteredRegular

  return (
    <>
      <Topbar title="Sales" subtitle="Create and manage battery sales invoices" />

      <style>{`
        .sales-stat-card {
          min-height: 125px;
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          background: #ffffff;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .sales-stat-card small { color: #718096; font-size: 13px; font-weight: 600; }
        .sales-stat-card h4 { margin: 8px 0 5px; font-size: 24px; font-weight: 700; color: #17213a; }

        .sales-stat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; font-size: 21px;
        }

        .sales-icon-blue { background: #e8f1ff; color: #1769e8; }
        .sales-icon-navy { background: #edf0f8; color: #273454; }
        .sales-icon-green { background: #e9f9ef; color: #189447; }
        .sales-icon-red { background: #fff0f0; color: #e44747; }

        .sales-main-card {
          background: #ffffff; border: 1px solid #e5eaf2; border-radius: 14px;
          padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .sales-section-title { font-size: 17px; font-weight: 700; color: #17213a; }
        .sales-search { max-width: 340px; }

        .sales-type-tabs {
          display: inline-flex; gap: 6px; padding: 5px; border-radius: 10px; background: #f1f5f9;
        }

        .sales-type-tab {
          border: 0; border-radius: 8px; padding: 9px 16px; background: transparent;
          color: #64748b; font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;
        }

        .sales-type-tab.active { background: #ffffff; color: #1769e8; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08); }

        .sales-type-tab .count-pill {
          background: #eef2f9; color: #506079; border-radius: 20px; padding: 1px 8px; font-size: 11px;
        }

        .sales-type-tab.active .count-pill { background: #eaf2ff; color: #1769e8; }

        .sales-table thead th {
          background: #f7f9fc; color: #506079; font-size: 12px; font-weight: 700;
          padding: 13px 12px; white-space: nowrap; border-bottom: 1px solid #e7ebf2;
        }

        .sales-table tbody td {
          padding: 13px 12px; vertical-align: middle; border-bottom: 1px solid #edf0f5;
          font-size: 13px; color: #25324a;
        }

        .sales-product-cell { display: flex; align-items: center; gap: 10px; }

        .sales-product-thumb {
          width: 40px; height: 40px; border-radius: 9px; background: #eef5ff; color: #1769e8;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .sales-brand-label { font-size: 11px; color: #7b879b; }

        .sales-badge-paid, .sales-badge-due, .sales-badge-regular, .sales-badge-exchange {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 58px; padding: 5px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
        }

        .sales-badge-paid { color: #16733a; background: #e8f8ee; }
        .sales-badge-due { color: #b93838; background: #fff0f0; }
        .sales-badge-regular { color: #506079; background: #f0f2f7; }
        .sales-badge-exchange { color: #4338ca; background: #eef2ff; }

        .invoice-modal .modal-dialog { max-width: 1350px; }
        .invoice-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; }
        .invoice-modal .modal-dialog { height: calc(100vh - 1rem); margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .invoice-modal .modal-content { max-height: 100%; }
        .invoice-modal .modal-content > form { display: flex; flex-direction: column; min-height: 0; max-height: 100%; }
        .invoice-modal .modal-header, .invoice-modal .modal-footer { flex-shrink: 0; }
        .invoice-modal .modal-header { padding: 18px 22px; border-bottom: 1px solid #e5eaf2; }
        .invoice-modal .modal-title { font-size: 20px; font-weight: 700; color: #17213a; }

        .invoice-modal .modal-body {
          padding: 20px; background: #f6f8fc; overflow-y: auto; overflow-x: hidden;
          min-height: 0; overscroll-behavior: contain;
        }

        .invoice-grid { display: grid; grid-template-columns: 1fr 1.45fr 1.15fr; gap: 16px; align-items: start; }
        .invoice-right-column { display: grid; gap: 16px; }

        .invoice-card {
          background: #ffffff; border: 1px solid #e3e8f0; border-radius: 12px;
          padding: 17px; box-shadow: 0 5px 16px rgba(15, 23, 42, 0.03);
        }

        .invoice-card-title {
          display: flex; align-items: center; gap: 9px; margin-bottom: 16px; padding-bottom: 11px;
          position: relative; font-size: 15px; font-weight: 700; color: #17213a;
        }

        .invoice-card-title::after {
          content: ""; position: absolute; bottom: 0; left: 0; width: 30px; height: 3px;
          border-radius: 10px; background: #1769e8;
        }

        .invoice-card-title.green::after { background: #1aa34a; }
        .invoice-card-title i { color: #1769e8; }
        .invoice-card-title.green i { color: #1aa34a; }

        .invoice-label { margin-bottom: 6px; color: #26344c; font-size: 12px; font-weight: 700; }
        .required-star { color: #e74343; }

        .invoice-input, .invoice-select, .invoice-textarea {
          min-height: 42px; border: 1px solid #d8dfeb; border-radius: 8px; font-size: 13px;
        }

        .invoice-input:focus, .invoice-select:focus, .invoice-textarea:focus {
          border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .scan-btn {
          border: 1px solid #d8dfeb; color: #1769e8; background: #eef5ff;
        }
        .scan-btn:hover { background: #dfeaff; color: #1769e8; }

        .scanner-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.78);
          display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px;
        }

        .scanner-box {
          background: #ffffff; border-radius: 14px; overflow: hidden; width: 100%; max-width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }

        .scanner-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: #17213a; color: #fff; font-size: 14px; font-weight: 700;
        }

        .scanner-header button {
          background: transparent; border: 0; color: #fff; font-size: 20px; line-height: 1;
        }

        .scanner-video { width: 100%; display: block; background: #000; max-height: 320px; object-fit: cover; }

        .scanner-hint {
          padding: 10px 16px; font-size: 12px; color: #64748b; text-align: center; background: #f7f9fc;
        }

        .customer-mode-switch {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;
          padding: 5px; border-radius: 10px; background: #f1f5f9;
        }

        .customer-mode-button {
          border: 0; border-radius: 8px; padding: 9px 10px; background: transparent;
          color: #64748b; font-size: 12px; font-weight: 700;
        }

        .customer-mode-button.active {
          background: #ffffff; color: #1769e8; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        }

        .customer-helper { margin-top: 8px; color: #718096; font-size: 11px; }

        .brand-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }

        .brand-choice {
          border: 1px solid #d7deea; background: #ffffff; color: #3b475d;
          border-radius: 7px; padding: 7px 11px; font-size: 12px; font-weight: 600;
        }

        .brand-choice.active { border-color: #1769e8; background: #eaf2ff; color: #1769e8; }

        .quantity-box { display: grid; grid-template-columns: 38px 1fr 38px; }

        .quantity-box button {
          border: 1px solid #d8dfeb; background: #f8fafc; color: #26344c;
          font-size: 17px; font-weight: 700;
        }

        .quantity-box button:first-child { border-radius: 8px 0 0 8px; }
        .quantity-box button:last-child { border-radius: 0 8px 8px 0; }
        .quantity-box input { border-radius: 0; text-align: center; border-left: none; border-right: none; }

        .warranty-message {
          margin-top: 14px; padding: 11px 13px; background: #edf9f1; border: 1px solid #c3eccf;
          border-radius: 8px; color: #277640; font-size: 12px;
        }

        .exchange-message {
          margin-top: 14px; padding: 11px 13px; background: #eef2ff; border: 1px solid #d7dcfb;
          border-radius: 8px; color: #4338ca; font-size: 12px;
        }

        .invoice-lower-grid { display: grid; grid-template-columns: minmax(0, 2fr) 390px; gap: 16px; margin-top: 16px; }
        .invoice-left-lower { display: grid; gap: 16px; }

        .product-preview-table th { background: #f7f9fc; color: #4f5e75; font-size: 11px; white-space: nowrap; }
        .product-preview-table td { font-size: 12px; vertical-align: middle; }

        .preview-battery {
          width: 43px; height: 43px; border-radius: 8px; background: #edf8f0;
          display: flex; align-items: center; justify-content: center; color: #1aa34a; font-size: 19px;
        }

        .summary-panel { position: sticky; top: 10px; }

        .price-summary-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; color: #59657a; font-size: 13px;
        }

        .price-summary-row strong { color: #202d44; }
        .summary-divider { border-top: 1px dashed #cfd7e4; margin: 5px 0; }

        .grand-total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
        .grand-total-row span { font-size: 18px; font-weight: 700; color: #17213a; }
        .grand-total-row strong { color: #1769e8; font-size: 24px; }

        .invoice-modal .modal-footer { padding: 15px 20px; border-top: 1px solid #e5eaf2; background: #ffffff; }

        .view-detail-row {
          display: flex; justify-content: space-between; gap: 15px; padding: 9px 0;
          border-bottom: 1px solid #edf0f5; font-size: 13px;
        }

        .view-detail-row span { color: #718096; }
        .view-detail-row strong { color: #1f2c44; text-align: right; }

        .gst-rate-input-group { display: flex; align-items: stretch; }
        .gst-rate-input-group input { border-top-right-radius: 0; border-bottom-right-radius: 0; }
        .gst-rate-input-group span {
          display: flex; align-items: center; padding: 0 10px; border: 1px solid #d8dfeb; border-left: none;
          border-top-right-radius: 8px; border-bottom-right-radius: 8px; background: #f7f9fc; color: #506079; font-size: 12px; font-weight: 700;
        }

        .payment-history-table th { background: #f7f9fc; color: #4f5e75; font-size: 11px; white-space: nowrap; }
        .payment-history-table td { font-size: 12.5px; vertical-align: middle; }

        @media (max-width: 1100px) {
          .invoice-grid { grid-template-columns: 1fr 1fr; }
          .invoice-right-column { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; }
          .invoice-lower-grid { grid-template-columns: 1fr; }
          .summary-panel { position: static; }
        }

        @media (max-width: 768px) {
          .invoice-grid { grid-template-columns: 1fr; }
          .invoice-right-column { grid-column: auto; grid-template-columns: 1fr; }
          .invoice-modal .modal-body { padding: 12px; }
          .brand-buttons { display: grid; grid-template-columns: 1fr 1fr; }
          .grand-total-row strong { font-size: 20px; }
        }
      `}</style>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="sales-stat-card">
            <div>
              <small>Total Sales</small>
              <h4>₹ {summary.total.toLocaleString('en-IN')}</h4>
              <span className="text-muted small">All invoices</span>
            </div>
            <div className="sales-stat-icon sales-icon-blue"><i className="fa-solid fa-indian-rupee-sign"></i></div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="sales-stat-card">
            <div>
              <small>Total Orders</small>
              <h4>{summary.orders}</h4>
              <span className="text-muted small">Invoices raised</span>
            </div>
            <div className="sales-stat-icon sales-icon-navy"><i className="fa-solid fa-receipt"></i></div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="sales-stat-card">
            <div>
              <small>Paid</small>
              <h4 className="text-success">{summary.paid}</h4>
              <span className="text-muted small">Invoices settled</span>
            </div>
            <div className="sales-stat-icon sales-icon-green"><i className="fa-solid fa-circle-check"></i></div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="sales-stat-card">
            <div>
              <small>Due</small>
              <h4 className="text-danger">{summary.due}</h4>
              <span className="text-danger small">Pending collection</span>
            </div>
            <div className="sales-stat-icon sales-icon-red"><i className="fa-solid fa-clock"></i></div>
          </div>
        </div>
      </div>

      <div className="sales-main-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <span className="sales-section-title">Sales</span>

          <button
            type="button"
            className="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#addSaleModal"
            onClick={resetForm}
          >
            <i className="fa-solid fa-plus me-2"></i>
            Create New Sale
          </button>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div className="sales-type-tabs">
            <button
              type="button"
              className={`sales-type-tab ${activeTab === 'regular' ? 'active' : ''}`}
              onClick={() => setActiveTab('regular')}
            >
              <i className="fa-solid fa-cart-shopping"></i>
              Regular Sales
              <span className="count-pill">{regularSales.length}</span>
            </button>

            <button
              type="button"
              className={`sales-type-tab ${activeTab === 'exchange' ? 'active' : ''}`}
              onClick={() => setActiveTab('exchange')}
            >
              <i className="fa-solid fa-right-left"></i>
              Exchange Sales
              <span className="count-pill">{exchangeSales.length}</span>
            </button>
          </div>

          <div className="input-group sales-search">
            <span className="input-group-text bg-white">
              <i className="fa-solid fa-magnifying-glass text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search invoice, customer, model or serial no..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {renderSalesTable(activeList, activeTab === 'exchange')}

        {activeList.length === 0 && (
          <div className="text-center py-5 text-muted">
            <i className="fa-solid fa-receipt fs-2 mb-3 d-block"></i>
            No {activeTab === 'exchange' ? 'exchange' : 'regular'} sales found.
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      <div className="modal fade invoice-modal" id="addSaleModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">
                    <i className="fa-solid fa-cart-shopping text-primary me-2"></i>
                    Sales Invoice
                  </h5>
                  <small className="text-muted">Create a new battery sales invoice</small>
                </div>

                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>

              <div className="modal-body">
                <div className="invoice-grid">
                  {/* Customer Information */}
                  <div className="invoice-card">
                    <div className="invoice-card-title">
                      <i className="fa-regular fa-user"></i>
                      Customer Information
                    </div>

                    <div className="customer-mode-switch">
                      <button
                        type="button"
                        className={`customer-mode-button ${customerMode === 'existing' ? 'active' : ''}`}
                        onClick={() => changeCustomerMode('existing')}
                        disabled={customers.length === 0}
                      >
                        <i className="fa-solid fa-user-check me-1"></i>
                        Existing Customer
                      </button>

                      <button
                        type="button"
                        className={`customer-mode-button ${customerMode === 'new' ? 'active' : ''}`}
                        onClick={() => changeCustomerMode('new')}
                      >
                        <i className="fa-solid fa-user-plus me-1"></i>
                        New Customer
                      </button>
                    </div>

                    {customerMode === 'existing' && customers.length > 0 ? (
                      <>
                        <div className="mb-3">
                          <label className="invoice-label">
                            Select Customer <span className="required-star">*</span>
                          </label>

                          <select
                            className="form-select invoice-select"
                            required
                            value={form.phone}
                            onChange={(event) => selectExistingCustomer(event.target.value)}
                          >
                            <option value="">Select existing customer</option>
                            {customers.map((customer) => (
                              <option key={customer.phone} value={customer.phone}>
                                {customer.name} - {customer.phone}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mb-3">
                          <label className="invoice-label">Customer Name</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            value={form.customer}
                            readOnly
                            placeholder="Customer name will appear here"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="invoice-label">Phone Number</label>
                          <input
                            type="tel"
                            className="form-control invoice-input"
                            value={form.phone}
                            readOnly
                            placeholder="Phone number will appear here"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="invoice-label">
                            Address <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="Enter customer address"
                            required
                            value={form.address}
                            onChange={(event) => updateForm('address', event.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3">
                          <label className="invoice-label">
                            Customer Name <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="Enter new customer name"
                            required
                            value={form.customer}
                            onChange={(event) => updateForm('customer', event.target.value)}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="invoice-label">
                            Phone Number <span className="required-star">*</span>
                          </label>
                          <input
                            type="tel"
                            className="form-control invoice-input"
                            placeholder="Enter 10-digit phone number"
                            maxLength="10"
                            required
                            value={form.phone}
                            onChange={(event) => updateForm('phone', event.target.value.replace(/\D/g, ''))}
                          />
                          <div className="customer-helper">
                            This customer will be available in the existing customer list after saving the sale.
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="invoice-label">
                            Address <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="Enter customer address"
                            required
                            value={form.address}
                            onChange={(event) => updateForm('address', event.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="invoice-label">GST Number (Optional)</label>
                      <input
                        type="text"
                        className="form-control invoice-input"
                        placeholder="Enter customer GST number, if any"
                        maxLength="15"
                        value={form.gstNumber}
                        onChange={(event) => updateForm('gstNumber', event.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* Battery Details */}
                  <div className="invoice-card">
                    <div className="invoice-card-title green">
                      <i className="fa-solid fa-car-battery"></i>
                      {form.saleType === 'Exchange' ? 'Old Battery Details' : 'Battery Details'}
                    </div>

                    {/* Regular vs Exchange */}
                    <div className="customer-mode-switch">
                      <button
                        type="button"
                        className={`customer-mode-button ${form.saleType === 'Regular' ? 'active' : ''}`}
                        onClick={() => changeSaleType('Regular')}
                      >
                        <i className="fa-solid fa-cart-shopping me-1"></i>
                        Regular Sale
                      </button>

                      <button
                        type="button"
                        className={`customer-mode-button ${form.saleType === 'Exchange' ? 'active' : ''}`}
                        onClick={() => changeSaleType('Exchange')}
                      >
                        <i className="fa-solid fa-right-left me-1"></i>
                        Old Battery
                      </button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Brand' : 'Brand'} <span className="required-star">*</span>
                        </label>
                        <select
                          className="form-select invoice-select"
                          required
                          value={form.brand}
                          onChange={(event) => updateForm('brand', event.target.value)}
                        >
                          <option value="">Select Brand</option>
                          {brands.map((brand) => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Type' : 'Type of Battery'} <span className="required-star">*</span>
                        </label>
                        <select
                          className="form-select invoice-select"
                          required
                          value={form.batteryType}
                          onChange={(event) => updateForm('batteryType', event.target.value)}
                        >
                          <option value="">Select Battery Type</option>
                          {batteryTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="brand-buttons">
                      {brands.map((brand) => (
                        <button
                          type="button"
                          key={brand}
                          className={`brand-choice ${form.brand === brand ? 'active' : ''}`}
                          onClick={() => updateForm('brand', brand)}
                        >
                          <i className="fa-solid fa-car-battery me-1"></i>
                          {brand}
                        </button>
                      ))}
                    </div>

                    <hr className="my-3" />

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Model' : 'Model / Capacity'} <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          placeholder="Example: EXIDE MLDIN60"
                          required
                          value={form.model}
                          onChange={(event) => updateForm('model', event.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Serial Number' : 'Serial Number'} <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          placeholder="e.g. M6L5G234778"
                          required
                          value={form.serialNumber}
                          onChange={(event) => updateForm('serialNumber', event.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="col-md-12">
                        <button
                          type="button"
                          className="btn scan-btn w-100"
                          onClick={() => startScanner('battery')}
                          title="Scan once to fill model and serial number"
                        >
                          <i className="fa-solid fa-barcode me-2"></i>
                          Scan Model / Capacity and Serial Number
                        </button>
                      </div>

                      {form.saleType === 'Exchange' && (
                        <div className="col-md-4">
                          <label className="invoice-label">
                            Old Battery Weight (Kg) <span className="required-star">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="0.1"
                            step="0.1"
                            placeholder="Example: 12.5"
                            required
                            value={form.oldBatteryWeight}
                            onChange={(event) => updateForm('oldBatteryWeight', event.target.value)}
                          />
                        </div>
                      )}

                      {form.saleType === 'Regular' && <div className="col-md-4">
                        <label className="invoice-label">
                          Quantity <span className="required-star">*</span>
                        </label>
                        <div className="quantity-box">
                          <button type="button" onClick={decreaseQuantity}>−</button>
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="1"
                            required
                            value={form.qty}
                            onChange={(event) => updateForm('qty', Math.max(1, Number(event.target.value)))}
                          />
                          <button type="button" onClick={increaseQuantity}>+</button>
                        </div>
                      </div>}

                      <div className="col-md-4">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Total Including GST' : 'Battery Total Including GST'} (₹) <span className="required-star">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control invoice-input"
                          min="0"
                          step="0.01"
                          placeholder="Example: 6500"
                          required
                          value={form.totalAmount}
                          onChange={(event) => updateForm('totalAmount', event.target.value)}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Price Before GST' : 'Battery Price Before GST'} (₹)
                        </label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          value={formatCurrency(priceSummary.taxableAmount)}
                          readOnly
                        />
                      </div>

                      {form.saleType === 'Regular' && <div className="col-md-4">
                        <label className="invoice-label">Discount (₹)</label>
                        <input
                          type="number"
                          className="form-control invoice-input"
                          min="0"
                          value={form.discount}
                          onChange={(event) => updateForm('discount', event.target.value)}
                        />
                      </div>}

                      <div className="col-md-4">
                        <label className="invoice-label">CGST Rate</label>
                        <div className="gst-rate-input-group">
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="0"
                            step="0.1"
                            value={form.cgstRate}
                            onChange={(event) => updateForm('cgstRate', event.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="invoice-label">SGST Rate</label>
                        <div className="gst-rate-input-group">
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="0"
                            step="0.1"
                            value={form.sgstRate}
                            onChange={(event) => updateForm('sgstRate', event.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <div className="col-md-12">
                        <label className="invoice-label">Total GST</label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          value={`${Number(form.cgstRate || 0) + Number(form.sgstRate || 0)}%  (CGST + SGST)`}
                          readOnly
                        />
                      </div>
                    </div>

                    {form.saleType === 'Regular' && (
                      <>
                        <hr className="my-3" />

                        <div className="row g-3">
                      <div className="col-md-6">
                        <label className="invoice-label">
                          Warranty <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control invoice-input"
                          placeholder="45F + 18P"
                          required
                          value={form.warrantyPeriod}
                          onChange={(event) => updateWarranty(event.target.value)}
                          onKeyDown={handleWarrantyKeyDown}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="invoice-label">Total Warranty</label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          value={form.totalWarranty ? `${form.totalWarranty} Months` : ''}
                          placeholder="63 Months"
                          readOnly
                        />
                      </div>

                      <div className="col-md-12">
                          <label className="invoice-label">Warranty Type (Optional)</label>
                          <select
                            className="form-select invoice-select"
                            value={form.warrantyType}
                            onChange={(event) => updateForm('warrantyType', event.target.value)}
                          >
                            <option value="">Select Warranty Type</option>
                            {warrantyTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                      </div>
                        </div>

                        <div className="warranty-message">
                          <i className="fa-solid fa-circle-info me-2"></i>
                          Warranty will be applicable according to the manufacturer&apos;s terms and conditions.
                        </div>
                      </>
                    )}
                  </div>

                  <div className="invoice-right-column">
                    {/* Invoice Info */}
                    <div className="invoice-card">
                      <div className="invoice-card-title">
                        <i className="fa-solid fa-file-invoice"></i>
                        Invoice Information
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="invoice-label">
                            Invoice Number <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            required
                            value={form.invoice}
                            onChange={(event) => updateForm('invoice', event.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Invoice Date</label>
                          <input
                            type="date"
                            className="form-control invoice-input"
                            value={form.invoiceDate}
                            onChange={(event) => updateForm('invoiceDate', event.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Sales Person</label>
                          <select
                            className="form-select invoice-select"
                            value={form.salesPerson}
                            onChange={(event) => updateForm('salesPerson', event.target.value)}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Sales Executive">Sales Executive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="invoice-card">
                      <div className="invoice-card-title">
                        <i className="fa-solid fa-motorcycle"></i>
                        Vehicle Information
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="invoice-label">Vehicle Name</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="e.g. Access / Activa"
                            value={form.vehicleName}
                            onChange={(event) => updateForm('vehicleName', event.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Vehicle Number</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="e.g. MH09AD9090"
                            value={form.vehicleNumber}
                            onChange={(event) => updateForm('vehicleNumber', event.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="invoice-lower-grid">
                  <div className="invoice-left-lower">
                    {/* Payment and Notes */}
                    <div className="invoice-card">
                      <div className="invoice-card-title">
                        <i className="fa-solid fa-credit-card"></i>
                        Payment and Notes
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="invoice-label">
                            Payment Method <span className="required-star">*</span>
                          </label>
                          <select
                            className="form-select invoice-select"
                            required
                            value={form.paymentMethod}
                            onChange={(event) => updateForm('paymentMethod', event.target.value)}
                          >
                            <option value="">Select Payment Method</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Debit / Credit Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">
                            Paid Amount (₹) <span className="required-star">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="0"
                            step="0.01"
                            placeholder="Enter amount received"
                            required
                            value={form.paidAmount}
                            onChange={(event) => updateForm('paidAmount', event.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Due Amount (₹)</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            value={formatCurrency(priceSummary.dueAmount)}
                            readOnly
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Payment Status</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            value={priceSummary.dueAmount > 0 ? 'Due' : 'Paid'}
                            readOnly
                          />
                        </div>

                        <div className="col-12">
                          <label className="invoice-label">Notes</label>
                          <textarea
                            className="form-control invoice-textarea"
                            rows="3"
                            placeholder="Add invoice notes or additional information..."
                            value={form.notes}
                            onChange={(event) => updateForm('notes', event.target.value)}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="invoice-card summary-panel">
                    <div className="invoice-card-title">
                      <i className="fa-solid fa-indian-rupee-sign"></i>
                      Price Summary
                    </div>

                    <div className="price-summary-row">
                      <span>Subtotal</span>
                      <strong>₹ {formatCurrency(priceSummary.subtotal)}</strong>
                    </div>

                    {form.saleType === 'Regular' && <div className="price-summary-row">
                      <span>Discount</span>
                      <strong>− ₹ {formatCurrency(priceSummary.discount)}</strong>
                    </div>}

                    <div className="price-summary-row">
                      <span>{form.saleType === 'Exchange' ? 'Old Battery Total Including GST' : 'Battery Total'}</span>
                      <strong>₹ {formatCurrency(priceSummary.enteredTotal)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>Taxable Amount</span>
                      <strong>₹ {formatCurrency(priceSummary.taxableAmount)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>CGST ({priceSummary.cgstRate}%)</span>
                      <strong>+ ₹ {formatCurrency(priceSummary.cgstAmount)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>SGST ({priceSummary.sgstRate}%)</span>
                      <strong>+ ₹ {formatCurrency(priceSummary.sgstAmount)}</strong>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="grand-total-row">
                      <span>Grand Total</span>
                      <strong>₹ {formatCurrency(priceSummary.grandTotal)}</strong>
                    </div>

                    <div className="price-summary-row mt-3">
                      <span>Paid Amount</span>
                      <strong className="text-success">₹ {formatCurrency(priceSummary.paidAmount)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>Due Amount</span>
                      <strong className={priceSummary.dueAmount > 0 ? 'text-danger' : 'text-success'}>
                        ₹ {formatCurrency(priceSummary.dueAmount)}
                      </strong>
                    </div>

                    <div className="alert alert-primary mt-4 mb-0 small">
                      <strong>Invoice:</strong> {form.invoice}<br />
                      <strong>Customer:</strong> {form.customer || 'Not entered'}<br />
                      <strong>Payment:</strong> {form.paymentMethod}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" className="btn btn-outline-primary" onClick={printFormInvoice}>
                  <i className="fa-solid fa-print me-2"></i>
                  Print Preview
                </button>
                <button type="submit" className="btn btn-primary px-4">
                  <i className="fa-solid fa-check me-2"></i>
                  Save Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* View Sale Modal */}
      <div className="modal fade" id="viewSaleModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0 rounded-4">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fa-solid fa-file-invoice text-primary me-2"></i>
                Sale Details
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div className="modal-body">
              {selectedSale && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="invoice-card h-100">
                      <div className="invoice-card-title">Customer and Invoice</div>

                      <div className="view-detail-row"><span>Invoice Number</span><strong>{selectedSale.invoice}</strong></div>
                      <div className="view-detail-row"><span>Customer</span><strong>{selectedSale.customer}</strong></div>
                      <div className="view-detail-row"><span>Phone</span><strong>{selectedSale.phone}</strong></div>
                      <div className="view-detail-row"><span>Address</span><strong>{selectedSale.address || '—'}</strong></div>
                      {selectedSale.gstNumber && (
                        <div className="view-detail-row"><span>GST Number</span><strong>{selectedSale.gstNumber}</strong></div>
                      )}
                      <div className="view-detail-row"><span>Vehicle</span>
                        <strong>{selectedSale.vehicleName || '—'} {selectedSale.vehicleNumber ? `(${selectedSale.vehicleNumber})` : ''}</strong>
                      </div>
                      <div className="view-detail-row"><span>Date</span><strong>{selectedSale.date}</strong></div>
                      <div className="view-detail-row">
                        <span>Status</span>
                        <strong>
                          <span className={selectedSale.status === 'Paid' ? 'sales-badge-paid' : 'sales-badge-due'}>
                            {selectedSale.status}
                          </span>
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="invoice-card h-100">
                      <div className="invoice-card-title green">
                        {selectedSale.saleType === 'Exchange' ? 'Old Battery Details' : 'Battery and Warranty'}
                      </div>

                      <div className="view-detail-row"><span>Sale Type</span>
                        <strong>
                          <span className={selectedSale.saleType === 'Exchange' ? 'sales-badge-exchange' : 'sales-badge-regular'}>
                            {selectedSale.saleType}
                          </span>
                        </strong>
                      </div>
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Brand' : 'Brand'}</span><strong>{selectedSale.brand}</strong></div>
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Type' : 'Battery Type'}</span><strong>{selectedSale.batteryType}</strong></div>
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Model' : 'Model'}</span><strong>{selectedSale.model || selectedSale.product}</strong></div>
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Serial Number' : 'Serial Number'}</span><strong>{selectedSale.serialNumber || '—'}</strong></div>
                      {selectedSale.saleType === 'Exchange' && (
                        <div className="view-detail-row"><span>Old Battery Weight</span><strong>{selectedSale.oldBatteryWeight ? `${selectedSale.oldBatteryWeight} Kg` : '—'}</strong></div>
                      )}
                      {selectedSale.saleType === 'Regular' && (
                        <>
                          <div className="view-detail-row"><span>Warranty</span><strong>{selectedSale.warrantyPeriod}</strong></div>
                          <div className="view-detail-row"><span>Total Warranty</span><strong>{selectedSale.totalWarranty ? `${selectedSale.totalWarranty} Months` : '—'}</strong></div>
                          <div className="view-detail-row"><span>Warranty Type</span><strong>{selectedSale.warrantyType || '—'}</strong></div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="invoice-card">
                      <div className="invoice-card-title">Payment Summary</div>

                      {selectedSale.saleType === 'Regular' && <div className="view-detail-row"><span>Quantity</span><strong>{selectedSale.qty}</strong></div>}
                      {selectedSale.saleType === 'Regular' && <div className="view-detail-row"><span>Unit Price</span><strong>₹ {formatCurrency(selectedSale.unitPrice)}</strong></div>}
                      {selectedSale.saleType === 'Regular' && <div className="view-detail-row"><span>Discount</span><strong>₹ {formatCurrency(selectedSale.discount)}</strong></div>}
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Price Before GST' : 'Battery Price Before GST'}</span><strong>₹ {formatCurrency(selectedSale.batteryPrice ?? (Number(selectedSale.amount || 0) / 1.18))}</strong></div>
                      <div className="view-detail-row"><span>CGST</span><strong>{selectedSale.cgstRate ?? 9}% — ₹ {formatCurrency(selectedSale.cgstAmount ?? 0)}</strong></div>
                      <div className="view-detail-row"><span>SGST</span><strong>{selectedSale.sgstRate ?? 9}% — ₹ {formatCurrency(selectedSale.sgstAmount ?? 0)}</strong></div>
                      <div className="view-detail-row"><span>Paid Amount</span><strong className="text-success">₹ {formatCurrency(selectedSale.paidAmount ?? (selectedSale.status === 'Paid' ? selectedSale.amount : 0))}</strong></div>
                      <div className="view-detail-row"><span>Due Amount</span><strong className="text-danger">₹ {formatCurrency(selectedSale.dueAmount ?? (selectedSale.status === 'Due' ? selectedSale.amount : 0))}</strong></div>
                      <div className="view-detail-row border-0">
                        <span className="fw-bold">Grand Total</span>
                        <strong className="text-primary fs-5">₹ {formatCurrency(selectedSale.amount)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="invoice-card">
                      <div className="invoice-card-title">Payment History</div>

                      {selectedSale.paymentHistory && selectedSale.paymentHistory.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-sm payment-history-table mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Amount Paid</th>
                                <th>Date Paid</th>
                                <th>Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSale.paymentHistory.map((entry, index) => (
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>₹ {formatCurrency(entry.amount)}</td>
                                  <td>{entry.date}</td>
                                  <td>{entry.method}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted mb-0">No payments recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closeViewModal}>Close</button>
              {selectedSale && Number(selectedSale.dueAmount || 0) > 0 && (
                <button
                  type="button"
                  className="btn btn-success"
                  data-bs-toggle="modal"
                  data-bs-target="#paymentModal"
                  onClick={() => openPaymentModal(selectedSale)}
                >
                  <i className="fa-solid fa-money-bill-wave me-2"></i>
                  Record Payment
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => printSavedInvoice(selectedSale)}>
                <i className="fa-solid fa-print me-2"></i>
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <div className="modal fade" id="paymentModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 rounded-4">
            <form onSubmit={submitPayment}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-money-bill-wave text-success me-2"></i>
                  Record Payment
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>

              <div className="modal-body">
                {paymentSale && (
                  <>
                    <p className="mb-2">
                      <strong>{paymentSale.invoice}</strong> — {paymentSale.customer}
                    </p>

                    <p className="text-danger mb-3">
                      Current Due: ₹ {formatCurrency(paymentSale.dueAmount)}
                    </p>

                    <div className="mb-3">
                      <label className="invoice-label">
                        Amount Paying Now (₹) <span className="required-star">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control invoice-input"
                        min="0"
                        max={paymentSale.dueAmount}
                        step="0.01"
                        required
                        value={paymentForm.amount}
                        onChange={(event) =>
                          setPaymentForm((previous) => ({ ...previous, amount: event.target.value }))
                        }
                      />
                    </div>

                    <div className="mb-1">
                      <label className="invoice-label">
                        Payment Method <span className="required-star">*</span>
                      </label>
                      <select
                        className="form-select invoice-select"
                        required
                        value={paymentForm.method}
                        onChange={(event) =>
                          setPaymentForm((previous) => ({ ...previous, method: event.target.value }))
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>

                    <div className="customer-helper mt-2">
                      Today's date will be recorded automatically as the payment date.
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <i className="fa-solid fa-check me-2"></i>
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* One barcode scanner fills Model/Capacity and Serial Number together. */}
      {scannerField && (
        <div className="scanner-overlay">
          <div className="scanner-box">
            <div className="scanner-header">
              <span>Scan Model / Capacity and Serial Number</span>
              <button type="button" onClick={stopScanner} aria-label="Close scanner">&times;</button>
            </div>
            <video ref={videoRef} className="scanner-video" muted playsInline></video>
            <div className="scanner-hint">
              Point the camera steadily at the barcode. Both fields will be filled automatically.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

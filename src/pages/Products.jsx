import { useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const SHOP_INFO = {
  name: 'Kalyankar Batteries',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay',
  phone: '9420007273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
  logo: mainLogo
}

const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other']

const brandOptions = ['Exide', 'Amaron', 'SF Sonic', 'Tata Green', 'Power Zone']

function uid() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// A "purchase" is one line item bought from a company (a brand + model + qty),
// grouped under that company's record so multiple models bought from the same
// supplier all live together.
const initialCompanies = [
  {
    id: uid(),
    companyName: 'Exide Industries Ltd',
    companyAddress: 'MG Road, Pune, MH',
    companyContact: '9123456780',
    gstNumber: '27XYZAB5678G1Z2',
    purchases: [
      {
        id: uid(),
        date: '2026-07-15',
        brand: 'Exide',
        model: 'FXL0-50',
        units: 4,
        rate: 6100,
        total: 24400,
        paid: 24400,
        paymentHistory: [
          { amount: 24400, date: '2026-07-15', method: 'Cash', remark: 'Paid in full' }
        ]
      },
      {
        id: uid(),
        date: '2026-07-15',
        brand: 'Exide',
        model: 'FXL0-66',
        units: 5,
        rate: 7200,
        total: 36000,
        paid: 18000,
        paymentHistory: [
          { amount: 18000, date: '2026-07-15', method: 'Cash', remark: 'Paid half' }
        ]
      }
    ]
  },
  {
    id: uid(),
    companyName: 'Amaron Distributors Pvt Ltd',
    companyAddress: 'Plot 12, MIDC Industrial Area, Pune, MH',
    companyContact: '9876543210',
    gstNumber: '27ABCDE1234F1Z5',
    purchases: [
      {
        id: uid(),
        date: '2026-06-15',
        brand: 'Amaron',
        model: '45Ah',
        units: 45,
        rate: 6500,
        total: 292500,
        paid: 292500,
        paymentHistory: [
          { amount: 292500, date: '2026-06-15', method: 'Bank Transfer', remark: 'Full payment' }
        ]
      }
    ]
  }
]

function due(purchase) {
  return Math.max((Number(purchase.total) || 0) - (Number(purchase.paid) || 0), 0)
}

function purchaseStatus(purchase) {
  const d = due(purchase)
  if (d <= 0) return { label: 'Paid', cls: 'badge-paid' }
  if ((Number(purchase.paid) || 0) <= 0) return { label: 'Unpaid', cls: 'badge-due' }
  return { label: 'Partial', cls: 'badge-low-stock' }
}

function companyTotals(company) {
  let total = 0
  let paid = 0
  let items = 0
  let units = 0
  let lastDate = ''

  company.purchases.forEach((p) => {
    total += Number(p.total) || 0
    paid += Number(p.paid) || 0
    units += Number(p.units) || 0
    items += 1
    if (!lastDate || p.date > lastDate) lastDate = p.date
  })

  return { total, paid, due: Math.max(total - paid, 0), items, units, lastDate }
}

function buildPurchaseLedger(purchases) {
  const entries = []

  purchases.forEach((purchase, purchaseIndex) => {
    const label = `${purchase.brand} ${purchase.model}`.trim()

    entries.push({
      key: `purchase-${purchase.id}`,
      date: purchase.date,
      description: `Purchase - ${label}`,
      credit: Number(purchase.total) || 0,
      debit: 0,
      purchaseIndex,
      entryIndex: 0
    })

    ;(purchase.paymentHistory || []).forEach((payment, paymentIndex) => {
      const details = [payment.method, payment.remark].filter(Boolean).join(' - ')
      entries.push({
        key: `payment-${purchase.id}-${paymentIndex}`,
        date: payment.date || purchase.date,
        description: `Payment - ${label}${details ? ` (${details})` : ''}`,
        credit: 0,
        debit: Number(payment.amount) || 0,
        purchaseIndex,
        entryIndex: paymentIndex + 1
      })
    })
  })

  entries.sort((a, b) => {
    const dateOrder = String(a.date).localeCompare(String(b.date))
    if (dateOrder !== 0) return dateOrder
    if (a.purchaseIndex !== b.purchaseIndex) return a.purchaseIndex - b.purchaseIndex
    return a.entryIndex - b.entryIndex
  })

  let balance = 0
  return entries.map((entry) => {
    balance = Math.max(0, balance + entry.credit - entry.debit)
    return { ...entry, balance }
  })
}

const emptyForm = {
  companyName: '',
  companyAddress: '',
  companyContact: '',
  gstNumber: '',
  date: today(),
  brand: '',
  model: '',
  units: '',
  rate: '',
  discount: '',
  paid: '',
  paymentMethod: ''
}

const emptyPayForm = {
  amount: '',
  method: '',
  remark: '',
  date: today()
}

// Simple, dependency-free modal shell (doesn't need Bootstrap's JS bundle)
function Modal({ open, onClose, title, icon, children, footer, size = '' }) {
  if (!open) {
    return null
  }

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={`modal-dialog modal-dialog-centered ${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {icon}
              {title}
            </h5>

            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body">{children}</div>

          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

// Builds and opens a print-friendly receipt for a single purchase (stock) entry,
// including its full dated payment / due-clearance history.
function printPurchaseReceipt(company, purchase) {
  const status = purchaseStatus(purchase)
  const d = due(purchase)
  const ledger = buildPurchaseLedger([purchase])

  const historyRows = ledger
    .map(
      (entry) => `
            <tr>
              <td>${entry.date}</td>
              <td>${entry.description}</td>
              <td>${entry.credit ? `₹ ${entry.credit.toLocaleString('en-IN')}` : '—'}</td>
              <td>${entry.debit ? `₹ ${entry.debit.toLocaleString('en-IN')}` : '—'}</td>
              <td>₹ ${entry.balance.toLocaleString('en-IN')}</td>
            </tr>`
    )
    .join('')

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) {
    alert('Please allow pop-ups to print the receipt.')
    return
  }

  win.document.write(`
    <html>
      <head>
        <title>Purchase Receipt - ${purchase.brand} ${purchase.model}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #222; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin: 24px 0 8px; }
          .muted { color: #666; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; font-size: 13px; text-align: left; }
          th { background: #f4f4f4; }
          .totals td { font-weight: bold; }
          .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .status.paid { background: #d1f7dd; color: #1a7f37; }
          .status.due { background: #fde2e1; color: #c62828; }
          .status.partial { background: #fff3cd; color: #8a6100; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
          .shop-details { flex: 1; padding-right: 24px; }
          .shop-logo { display: block; width: 330px; max-width: 100%; height: auto; margin-bottom: 8px; }
          .shop-meta { color: #333; font-size: 12px; line-height: 1.55; }
          .receipt-date { min-width: 150px; text-align: right; font-size: 13px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div class="shop-details">
            <img class="shop-logo" src="${SHOP_INFO.logo}" alt="${SHOP_INFO.name} logo" />
            <div class="shop-meta">
              <strong>${SHOP_INFO.address}</strong><br>
              Phone: ${SHOP_INFO.phone} &nbsp;|&nbsp; Email: ${SHOP_INFO.email}<br>
              GSTIN: ${SHOP_INFO.gstin}
            </div>
          </div>
          <div class="receipt-date">
            <strong>Date:</strong> ${purchase.date || today()}
          </div>
        </div>

        <h2>Supplier Details</h2>
        <table>
          <tr><th style="width:30%;">Company Name</th><td>${company.companyName}</td></tr>
          <tr><th>Address</th><td>${company.companyAddress || '-'}</td></tr>
          <tr><th>Contact</th><td>${company.companyContact || '-'}</td></tr>
          <tr><th>GSTIN</th><td>${company.gstNumber || '-'}</td></tr>
        </table>

        <h2>Stock Purchased</h2>
        <table>
          <tr><th>Date</th><th>Brand</th><th>Model</th><th>Units</th><th>Rate (₹)</th><th>Final Total (₹)</th></tr>
          <tr>
            <td>${purchase.date}</td>
            <td>${purchase.brand}</td>
            <td>${purchase.model}</td>
            <td>${purchase.units}</td>
            <td>₹ ${Number(purchase.rate).toLocaleString('en-IN')}</td>
            <td>₹ ${Number(purchase.total).toLocaleString('en-IN')}</td>
          </tr>
          <tr class="totals">
            <td colspan="4" style="text-align:right;">Gross Total</td>
            <td colspan="2">₹ ${Number(purchase.grossTotal ?? (Number(purchase.units) * Number(purchase.rate))).toLocaleString('en-IN')}</td>
          </tr>
          <tr class="totals">
            <td colspan="4" style="text-align:right;">Discount</td>
            <td colspan="2">₹ ${Number(purchase.discount || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr class="totals">
            <td colspan="4" style="text-align:right;">Paid</td>
            <td colspan="2">₹ ${Number(purchase.paid).toLocaleString('en-IN')}</td>
          </tr>
          <tr class="totals">
            <td colspan="4" style="text-align:right;">Due</td>
            <td colspan="2">₹ ${d.toLocaleString('en-IN')} &nbsp;
              <span class="status ${status.label.toLowerCase()}">${status.label}</span>
            </td>
          </tr>
        </table>

        <h2>Purchase / Payment History</h2>
        <table>
          <tr><th>Date</th><th>Description</th><th>Credit (Purchase)</th><th>Debit (Payment)</th><th>Balance</th></tr>
          ${historyRows}
        </table>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  win.document.close()
}

export default function Products() {
  const [companies, setCompanies] = useState(initialCompanies)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [payForm, setPayForm] = useState(emptyPayForm)

  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null)

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  )

  const selectedPurchase = useMemo(
    () =>
      selectedCompany
        ? selectedCompany.purchases.find((p) => p.id === selectedPurchaseId) || null
        : null,
    [selectedCompany, selectedPurchaseId]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return companies

    return companies.filter((c) => {
      const haystack = [
        c.companyName,
        c.companyContact,
        c.gstNumber,
        ...c.purchases.map((p) => `${p.brand} ${p.model}`)
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [companies, search])

  const summary = useMemo(() => {
    let totalValue = 0
    let totalPaid = 0
    let totalDue = 0
    let totalItems = 0

    companies.forEach((c) => {
      const t = companyTotals(c)
      totalValue += t.total
      totalPaid += t.paid
      totalDue += t.due
      totalItems += t.items
    })

    return {
      companies: companies.length,
      items: totalItems,
      totalValue,
      totalDue
    }
  }, [companies])

  const newGrossTotal = useMemo(() => {
    const units = Number(form.units) || 0
    const rate = Number(form.rate) || 0
    return units * rate
  }, [form.units, form.rate])

  const newTotal = useMemo(() => {
    const discount = Math.max(0, Number(form.discount) || 0)
    return Math.max(newGrossTotal - discount, 0)
  }, [newGrossTotal, form.discount])

  const newDue = useMemo(() => {
    const paid = Number(form.paid) || 0
    return Math.max(newTotal - paid, 0)
  }, [newTotal, form.paid])

  const payDueAmount = useMemo(() => (selectedPurchase ? due(selectedPurchase) : 0), [selectedPurchase])

  // Looks up an existing company by exact (case-insensitive) name match.
  function findCompanyByName(name) {
    const key = name.trim().toLowerCase()
    if (!key) return null
    return companies.find((c) => c.companyName.trim().toLowerCase() === key) || null
  }

  // Looks up an existing company by exact contact number match.
  function findCompanyByContact(contact) {
    const key = contact.trim()
    if (!key) return null
    return companies.find((c) => c.companyContact.trim() === key) || null
  }

  // When the company name matches an existing supplier, auto-fill the rest
  // of that supplier's details (address, contact, GSTIN).
  function handleCompanyNameChange(value) {
    const match = findCompanyByName(value)

    setForm((prev) => ({
      ...prev,
      companyName: value,
      ...(match
        ? {
            companyAddress: match.companyAddress,
            companyContact: match.companyContact,
            gstNumber: match.gstNumber
          }
        : {})
    }))
  }

  // When the contact number matches an existing supplier, auto-fill the rest
  // of that supplier's details (name, address, GSTIN).
  function handleCompanyContactChange(value) {
    const match = findCompanyByContact(value)

    setForm((prev) => ({
      ...prev,
      companyContact: value,
      ...(match
        ? {
            companyName: match.companyName,
            companyAddress: match.companyAddress,
            gstNumber: match.gstNumber
          }
        : {})
    }))
  }

  function openAddModal() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openViewModal(company) {
    setSelectedCompanyId(company.id)
    setViewOpen(true)
  }

  function openPayModal(company, purchase) {
    setSelectedCompanyId(company.id)
    setSelectedPurchaseId(purchase.id)
    setPayForm(emptyPayForm)
    setPayOpen(true)
  }

  function handleSubmit(e) {
    e.preventDefault()

    const {
      companyName,
      companyAddress,
      companyContact,
      gstNumber,
      date,
      brand,
      model,
      units,
      rate,
      discount,
      paid,
      paymentMethod
    } = form

    if (!companyName.trim() || !brand.trim() || !model.trim()) {
      return
    }

    const unitsNum = parseInt(units, 10) || 0
    const rateNum = parseFloat(rate) || 0
    const grossTotal = unitsNum * rateNum
    if ((parseFloat(discount) || 0) > grossTotal) {
      alert('Discount cannot be greater than the gross purchase total.')
      return
    }
    const discountNum = Math.min(Math.max(parseFloat(discount) || 0, 0), grossTotal)
    const total = Math.max(grossTotal - discountNum, 0)
    const paidNum = Math.min(parseFloat(paid) || 0, total)

    const newPurchase = {
      id: uid(),
      date: date || today(),
      brand: brand.trim(),
      model: model.trim(),
      units: unitsNum,
      rate: rateNum,
      grossTotal,
      discount: discountNum,
      total,
      paid: paidNum,
      paymentHistory:
        paidNum > 0
          ? [
              {
                amount: paidNum,
                date: date || today(),
                method: paymentMethod || 'Other',
                remark: 'Initial payment'
              }
            ]
          : []
    }

    setCompanies((prev) => {
      const nameKey = companyName.trim().toLowerCase()
      const contactKey = companyContact.trim()
      const existing =
        prev.find((c) => c.companyName.trim().toLowerCase() === nameKey) ||
        (contactKey ? prev.find((c) => c.companyContact.trim() === contactKey) : null)

      if (existing) {
        return prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                companyAddress: companyAddress.trim() || c.companyAddress,
                companyContact: companyContact.trim() || c.companyContact,
                gstNumber: gstNumber.trim() || c.gstNumber,
                purchases: [newPurchase, ...c.purchases]
              }
            : c
        )
      }

      return [
        {
          id: uid(),
          companyName: companyName.trim(),
          companyAddress: companyAddress.trim(),
          companyContact: companyContact.trim(),
          gstNumber: gstNumber.trim(),
          purchases: [newPurchase]
        },
        ...prev
      ]
    })

    setForm(emptyForm)
    setAddOpen(false)
  }

  function handlePaySubmit(e) {
    e.preventDefault()

    if (!selectedCompany || !selectedPurchase) return

    const amount = Math.min(parseFloat(payForm.amount) || 0, payDueAmount)
    if (amount <= 0) return

    const entryDate = payForm.date || today()

    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCompany.id) return c

        return {
          ...c,
          purchases: c.purchases.map((p) => {
            if (p.id !== selectedPurchase.id) return p

            return {
              ...p,
              paid: Math.min((Number(p.paid) || 0) + amount, Number(p.total) || 0),
              paymentHistory: [
                ...(p.paymentHistory || []),
                {
                  amount,
                  date: entryDate,
                  method: payForm.method || 'Other',
                  remark: payForm.remark.trim() || '-'
                }
              ]
            }
          })
        }
      })
    )

    setPayForm(emptyPayForm)
    setPayOpen(false)
  }

  return (
    <>
      <Topbar title="Purchase" subtitle="Manage battery purchases from suppliers" />

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Total Suppliers</small>
              <h4>{summary.companies}</h4>
              <span className="stat-change stat-muted" title="Companies you have purchased batteries from">
                Companies purchased from
              </span>
            </div>

            <div className="stat-icon icon-navy">
              <i className="fa-solid fa-building"></i>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Purchase Entries</small>
              <h4 className="text-success">{summary.items}</h4>
              <span className="stat-change stat-muted" title="Total number of brand/model purchase entries recorded">
                Brand &amp; model line items
              </span>
            </div>

            <div className="stat-icon icon-green">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Total Purchase Value</small>
              <h4>₹ {summary.totalValue.toLocaleString('en-IN')}</h4>
              <span className="stat-change stat-muted" title="Total value of all batteries purchased">
                All purchases combined
              </span>
            </div>

            <div className="stat-icon icon-orange">
              <i className="fa-solid fa-file-invoice"></i>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Outstanding Due</small>
              <h4 className="text-danger">₹ {summary.totalDue.toLocaleString('en-IN')}</h4>
              <span className="stat-change down" title="Total unpaid amount owed to suppliers">
                Pending payment to suppliers
              </span>
            </div>

            <div className="stat-icon icon-red">
              <i className="fa-solid fa-money-bill-wave"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="section-title d-flex justify-content-between align-items-center">
          <span>All Purchases</span>

          <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
            <i className="fa-solid fa-plus me-1"></i>
            Add Purchase
          </button>
        </div>

        <div className="mb-3">
          <input
            type="text"
            className="form-control form-control-sm w-auto d-inline-block"
            placeholder="Search company, brand or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Models Purchased</th>
                <th>Units</th>
                <th>Total Value (₹)</th>
                <th>Paid (₹)</th>
                <th>Due (₹)</th>
                <th>Last Purchase</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => {
                const t = companyTotals(c)

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">
                          <i className="fa-solid fa-building"></i>
                        </div>
                        <div>
                          <div>{c.companyName}</div>
                          {c.gstNumber && <small className="text-muted">GSTIN: {c.gstNumber}</small>}
                        </div>
                      </div>
                    </td>

                    <td>{c.companyContact || '-'}</td>

                    <td>
                      {c.purchases.map((p) => (
                        <div key={p.id}>
                          <small>
                            {p.brand} {p.model}
                          </small>
                        </div>
                      ))}
                    </td>

                    <td>{t.units}</td>

                    <td>₹ {t.total.toLocaleString('en-IN')}</td>

                    <td>₹ {t.paid.toLocaleString('en-IN')}</td>

                    <td>
                      {t.due > 0 ? (
                        <span className="badge-due">₹ {t.due.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="badge-paid">Paid</span>
                      )}
                    </td>

                    <td>{t.lastDate || '-'}</td>

                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="View Details"
                          onClick={() => openViewModal(c)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="text-muted text-center py-4">No purchases found.</p>}
      </div>

      {/* Add Purchase Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Purchase"
        icon={<i className="fa-solid fa-plus me-2"></i>}
        size="modal-lg"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>

            <button type="submit" form="addPurchaseForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i>
              Save Purchase
            </button>
          </>
        }
      >
        <form id="addPurchaseForm" onSubmit={handleSubmit}>
          <h6 className="mb-3">Company Details</h6>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Company Name</label>

              <input
                type="text"
                className="form-control"
                list="companyNameOptions"
                placeholder="e.g. Exide Industries Ltd"
                required
                value={form.companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
              />
              <datalist id="companyNameOptions">
                {companies.map((c) => (
                  <option key={c.id} value={c.companyName} />
                ))}
              </datalist>
              <small className="text-muted">
                Matching an existing company name or contact number auto-fills the rest of its details.
              </small>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Company Contact Number</label>

              <input
                type="text"
                className="form-control"
                list="companyContactOptions"
                placeholder="e.g. 9876543210"
                value={form.companyContact}
                onChange={(e) => handleCompanyContactChange(e.target.value)}
              />
              <datalist id="companyContactOptions">
                {companies.map((c) => (
                  <option key={c.id} value={c.companyContact} />
                ))}
              </datalist>
            </div>

            <div className="col-12 mb-3">
              <label className="form-label">Company Address</label>

              <input
                type="text"
                className="form-control"
                placeholder="e.g. MG Road, Pune, MH"
                value={form.companyAddress}
                onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">GSTIN</label>

              <input
                type="text"
                className="form-control"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Purchase Date</label>

              <input
                type="date"
                className="form-control"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <hr />
          <h6 className="mb-3">Battery Purchased</h6>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Brand</label>

              <select
                className="form-select"
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              >
                <option value="">Select Brand</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Model</label>

              <input
                type="text"
                className="form-control"
                placeholder="e.g. FXL0-50"
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Units</label>

              <input
                type="number"
                className="form-control"
                min="0"
                placeholder="e.g. 5"
                required
                value={form.units}
                onChange={(e) => setForm({ ...form, units: e.target.value })}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Rate per Unit (₹)</label>

              <input
                type="number"
                className="form-control"
                min="0"
                placeholder="e.g. 7200"
                required
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Discount (₹) <span className="text-muted">(Optional)</span></label>
              <input
                type="number"
                className="form-control"
                min="0"
                max={newGrossTotal}
                placeholder="e.g. 1000"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Final Total (₹)</label>
              <input type="text" className="form-control" disabled value={newTotal.toLocaleString('en-IN')} />
              {Number(form.discount) > 0 && (
                <small className="text-muted">
                  Before discount: ₹ {newGrossTotal.toLocaleString('en-IN')}
                </small>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Paid Now (₹)</label>

              <input
                type="number"
                className="form-control"
                min="0"
                placeholder="e.g. 20000"
                value={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.value })}
              />
            </div>

            {Number(form.paid) > 0 && (
              <div className="col-md-6 mb-3">
                <label className="form-label">Paid Via</label>

                <select
                  className="form-select"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  <option value="">Select Method</option>
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-12">
              <div className="alert alert-secondary py-2 mb-0">
                Due Amount: <strong>₹ {newDue.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Company / Purchase Details Modal */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Company Details"
        icon={<i className="fa-solid fa-file-invoice me-2"></i>}
        size="modal-lg"
        footer={
          <button type="button" className="btn btn-outline-secondary" onClick={() => setViewOpen(false)}>
            Close
          </button>
        }
      >
        {selectedCompany && (
          <>
            <table className="table table-sm mb-4">
              <tbody>
                <tr>
                  <th style={{ width: '35%' }}>Company Name</th>
                  <td>{selectedCompany.companyName}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{selectedCompany.companyAddress || '-'}</td>
                </tr>
                <tr>
                  <th>Contact</th>
                  <td>{selectedCompany.companyContact || '-'}</td>
                </tr>
                <tr>
                  <th>GSTIN</th>
                  <td>{selectedCompany.gstNumber || '-'}</td>
                </tr>
              </tbody>
            </table>

            <h6 className="mb-2">Batteries Purchased</h6>

            <div className="table-responsive mb-4">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Units</th>
                    <th>Rate (₹)</th>
                    <th>Discount (₹)</th>
                    <th>Final Total (₹)</th>
                    <th>Credit (Paid)</th>
                    <th>Debit (Due)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCompany.purchases.map((p) => {
                    const status = purchaseStatus(p)
                    const d = due(p)

                    return (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td>{p.brand}</td>
                        <td>{p.model}</td>
                        <td>{p.units}</td>
                        <td>₹ {Number(p.rate).toLocaleString('en-IN')}</td>
                        <td>₹ {Number(p.discount || 0).toLocaleString('en-IN')}</td>
                        <td>₹ {Number(p.total).toLocaleString('en-IN')}</td>
                        <td>₹ {Number(p.paid).toLocaleString('en-IN')}</td>
                        <td>₹ {d.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={status.cls}>{status.label}</span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {d > 0 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                title="Pay Due"
                                onClick={() => openPayModal(selectedCompany, p)}
                              >
                                <i className="fa-solid fa-money-bill me-1"></i>
                                Pay Due
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              title="Print Receipt"
                              onClick={() => printPurchaseReceipt(selectedCompany, p)}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <h6 className="mb-2">Purchase / Payment History</h6>

            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Credit (Purchase)</th>
                    <th>Debit (Payment)</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {buildPurchaseLedger(selectedCompany.purchases).map((entry) => (
                    <tr key={entry.key}>
                      <td>{entry.date}</td>
                      <td>{entry.description}</td>
                      <td>{entry.credit ? `₹ ${entry.credit.toLocaleString('en-IN')}` : '—'}</td>
                      <td>{entry.debit ? `₹ ${entry.debit.toLocaleString('en-IN')}` : '—'}</td>
                      <td><strong>₹ {entry.balance.toLocaleString('en-IN')}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* Pay Due Modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pay Due"
        icon={<i className="fa-solid fa-money-bill-wave me-2"></i>}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </button>

            <button type="submit" form="payDueForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i>
              Save Payment
            </button>
          </>
        }
      >
        {selectedCompany && selectedPurchase && (
          <form id="payDueForm" onSubmit={handlePaySubmit}>
            <p className="mb-2">
              <strong>
                {selectedPurchase.brand} {selectedPurchase.model}
              </strong>{' '}
              — {selectedCompany.companyName}
            </p>

            <p className="text-danger mb-3">
              Current Due: ₹ {payDueAmount.toLocaleString('en-IN')}
            </p>

            <div className="mb-3">
              <label className="form-label">Amount Paying Now (₹)</label>

              <input
                type="number"
                className="form-control"
                min="0"
                max={payDueAmount}
                required
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Payment Date</label>

              <input
                type="date"
                className="form-control"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Payment Method</label>

              <select
                className="form-select"
                required
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
              >
                <option value="">Select Method</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-1">
              <label className="form-label">Remark</label>

              <input
                type="text"
                className="form-control"
                placeholder="e.g. Second payment"
                value={payForm.remark}
                onChange={(e) => setPayForm({ ...payForm, remark: e.target.value })}
              />
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

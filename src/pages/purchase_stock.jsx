import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import mainLogo from '../assets/mainlogo.png'

const STORAGE_KEY = 'purchaseStockHistory'

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  date: today(),
  company: '',
  address: '',
  contact: '',
  gstin: '',
  models: '',
  units: '',
  prices: '',
  paidAmount: '',
  paymentMethod: 'Cash',
}

const formatMoney = (amount) =>
  'Rs. ' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())

function buildItems(form) {
  const models = splitList(form.models).filter(Boolean)
  const units = splitList(form.units)
  const prices = splitList(form.prices)
  const count = Math.max(models.length, units.length, prices.length)

  return Array.from({ length: count }, (_, index) => {
    const unit = Number(units[index] || 0)
    const price = Number(prices[index] || 0)

    return {
      model: models[index] || '',
      units: unit,
      price,
      total: unit * price,
    }
  }).filter((item) => item.model || item.units || item.price)
}

function paidAmount(row) {
  return (row.ledger || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

export default function PurchaseStock() {
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [dueRow, setDueRow] = useState(null)
  const [payment, setPayment] = useState({ date: today(), amount: '', method: 'Cash', note: '' })

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY)) || [])
  }, [])

  const items = useMemo(() => buildItems(form), [form])
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0)
  const formPaidAmount = Number(form.paidAmount || 0)
  const formRemainingDue = Math.max(grandTotal - formPaidAmount, 0)

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

    const row = {
      id: Date.now(),
      ...form,
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

    if (!dueRow || Number(payment.amount) <= 0) {
      alert('Please enter payment amount.')
      return
    }

    const nextHistory = history.map((row) =>
      row.id === dueRow.id
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
    setPayment({ date: today(), amount: '', method: 'Cash', note: '' })
  }

  function printPurchase(row) {
    const win = window.open('', '_blank')
    const ledger = row.ledger || []
    const totalPaid = paidAmount(row)
    const remainingDue = Math.max(row.grandTotal - totalPaid, 0)

    win.document.write(`
      <html>
        <head>
          <title>Purchase Print</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 28px; }
            .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 14px; }
            .header img { width: 110px; height: auto; }
            .header h1 { margin: 0; font-size: 24px; }
            .muted { color: #4b5563; margin: 3px 0; font-size: 13px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin: 18px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #111827; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #f3f4f6; }
            .right { text-align: right; }
            .total { margin-top: 14px; font-size: 17px; font-weight: 700; text-align: right; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${mainLogo}" alt="Kalyankar Batteries" />
            <div>
              <h1>Kalyankar Batteries</h1>
              <p class="muted">Gargoti - Kolhapur main road, Gargoti 416209</p>
              <p class="muted">Near Swami Samarth Mangal Karyalay</p>
              <p class="muted">Contact: +91 9420007273</p>
            </div>
          </div>

          <h2>Purchase Stock</h2>
          <div class="info">
            <div><strong>Date:</strong> ${row.date}</div>
            <div><strong>Company:</strong> ${row.company}</div>
            <div><strong>Address:</strong> ${row.address || '-'}</div>
            <div><strong>Contact:</strong> ${row.contact || '-'}</div>
            <div><strong>GSTIN:</strong> ${row.gstin || '-'}</div>
          </div>

          <table>
            <thead>
              <tr><th>Model</th><th>HSN</th><th>Units</th><th>Per Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${row.items
                .map(
                  (item) =>
                    `<tr><td>${item.model}</td><td>8507</td><td>${item.units}</td><td>${formatMoney(item.price)}</td><td>${formatMoney(item.total)}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <div class="total">Grand Total: ${formatMoney(row.grandTotal)}</div>

          <h3>Payment History</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr>
            </thead>
            <tbody>
              ${
                ledger.length
                  ? ledger
                      .map(
                        (entry) =>
                          `<tr><td>${entry.date}</td><td>${formatMoney(entry.amount)}</td><td>${entry.method || '-'}</td><td>${entry.note || '-'}</td></tr>`,
                      )
                      .join('')
                  : '<tr><td colspan="4">No payment added</td></tr>'
              }
            </tbody>
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
          <div class="total">Paid: ${formatMoney(totalPaid)} | Remaining Due: ${formatMoney(remainingDue)}</div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <>
      <Topbar title="Purchase Stock" subtitle="Add purchase entries, dues, ledger, and print records" />

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
                <th>Models</th>
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
                    </td>
                    <td>{row.items.map((item) => item.model).join(', ')}</td>
                    <td>{formatMoney(row.grandTotal)}</td>
                    <td>{formatMoney(paid)}</td>
                    <td><span className={due > 0 ? 'badge-due' : 'badge-paid'}>{formatMoney(due)}</span></td>
                    <td>
                      <button className="btn btn-outline-primary btn-sm me-1" onClick={() => setViewRow(row)}>See</button>
                      <button className="btn btn-outline-warning btn-sm me-1" onClick={() => setDueRow(row)}>Due</button>
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
                  <div className="col-md-5">
                    <label className="form-label">Company Name</label>
                    <input className="form-control" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Contact Number</label>
                    <input className="form-control" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">GSTIN</label>
                    <input className="form-control" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Purchase Model</label>
                    <textarea className="form-control" rows="3" placeholder="Model A, Model B" value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Add Units</label>
                    <textarea className="form-control" rows="3" placeholder="10, 5" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Per Total Price</label>
                    <textarea className="form-control" rows="3" placeholder="4500, 5200" value={form.prices} onChange={(e) => setForm({ ...form, prices: e.target.value })} />
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
                      <tr><th>Model</th><th>Units</th><th>Per Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.model}</td>
                          <td>{item.units}</td>
                          <td>{formatMoney(item.price)}</td>
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
                <p className="mb-3"><strong>Contact:</strong> {viewRow.contact || '-'} | <strong>GSTIN:</strong> {viewRow.gstin || '-'}</p>
                <p className="mb-3">
                  <strong>Paid:</strong> {formatMoney(paidAmount(viewRow))} | <strong>Remaining Due:</strong> {formatMoney(Math.max(viewRow.grandTotal - paidAmount(viewRow), 0))}
                </p>
                <table className="table table-bordered">
                  <thead><tr><th>Model</th><th>Units</th><th>Per Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {viewRow.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.model}</td>
                        <td>{item.units}</td>
                        <td>{formatMoney(item.price)}</td>
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ledger - {dueRow.company}</h5>
                <button type="button" className="btn-close" onClick={() => setDueRow(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4"><strong>Total:</strong> {formatMoney(dueRow.grandTotal)}</div>
                  <div className="col-md-4"><strong>Paid:</strong> {formatMoney(paidAmount(dueRow))}</div>
                  <div className="col-md-4"><strong>Due:</strong> {formatMoney(dueRow.grandTotal - paidAmount(dueRow))}</div>
                </div>

                <form className="row g-2 mb-3" onSubmit={savePayment}>
                  <div className="col-md-3">
                    <input type="date" className="form-control" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <input type="number" className="form-control" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <select className="form-select" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Card</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <input className="form-control" placeholder="Note" value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
                  </div>
                  <div className="col-md-1">
                    <button className="btn btn-primary w-100" type="submit">Add</button>
                  </div>
                </form>

                <table className="table table-bordered">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
                  <tbody>
                    {(dueRow.ledger || []).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{formatMoney(entry.amount)}</td>
                        <td>{entry.method || '-'}</td>
                        <td>{entry.note || '-'}</td>
                      </tr>
                    ))}
                    {!(dueRow.ledger || []).length && (
                      <tr><td colSpan="4" className="text-center text-muted">No payment history added.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => printPurchase(dueRow)}>Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

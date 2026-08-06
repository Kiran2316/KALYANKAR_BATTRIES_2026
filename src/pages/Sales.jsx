import { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import paymentQr from '../assets/payment-qr.jpg'
import { getPaymentSettings } from '../appSettings.js'
import salesPrintLogo from '../assets/sales-print-logo.png'
import { getGstSettings } from '../gstSettings.js'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { INVOICE_SHORT_LINK_BASE, supabase } from '../supabaseClient.js'
import { formatIndianPhone, isValidIndianPhone } from '../phoneFormat.js'

const defaultSalesBrands = ['Exide', 'Amaron', 'SF Sonic', 'Tata Green', 'Power Zone']

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

  const serialLabel = String.raw`(?:serial(?:\s*(?:number|no\.?))?|s\/n|sn)`
  const labelledModel = raw.match(new RegExp(`(?:model(?:\\s*(?:number|no\\.?))?|capacity)\\s*[:=]\\s*([^|,;]+?)(?=\\s+${serialLabel}\\s*[:=]|[|,;]|$)`, 'i'))
  const labelledSerial = raw.match(new RegExp(`${serialLabel}\\s*[:=]\\s*([^|,;\\s]+)`, 'i'))
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

function normalizeScanValue(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function resolveBatteryScan(rawValue, stockProducts) {
  const raw = String(rawValue || '').trim()
  const normalizedRaw = normalizeScanValue(raw)

  // Most manufacturer barcodes contain only the serial number. The stock
  // record is the trusted source for its corresponding model number.
  const stockMatch = stockProducts.find((product) => {
    const serial = normalizeScanValue(product.serialNo)
    return serial && (normalizedRaw === serial || normalizedRaw.includes(serial))
  })
  if (stockMatch) {
    return {
      model: String(stockMatch.model || '').trim().toUpperCase(),
      serialNumber: String(stockMatch.serialNo || '').trim().toUpperCase(),
    }
  }

  const parsed = parseBatteryBarcode(raw)
  const parsedSerial = normalizeScanValue(parsed.serialNumber)
  const parsedStockMatch = stockProducts.find((product) => normalizeScanValue(product.serialNo) === parsedSerial)
  if (parsedStockMatch) {
    return {
      model: String(parsedStockMatch.model || '').trim().toUpperCase(),
      serialNumber: String(parsedStockMatch.serialNo || '').trim().toUpperCase(),
    }
  }

  const isWebsiteOrToken = /^(?:https?:\/\/|www\.)/i.test(raw) || (!/[|,;\s]/.test(raw) && parsed.model === parsed.serialNumber)
  if (isWebsiteOrToken) return { model: '', serialNumber: '' }

  return {
    model: String(parsed.model || '').trim().toUpperCase(),
    serialNumber: String(parsed.serialNumber || '').trim().toUpperCase(),
  }
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
const SHOP_INFO = {
  name: 'Kalyankar Batteries',
  tagline: 'Certified With Excellent Quality',
  address: 'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay',
  phone: '9420007273',
  whatsapp: '7745047273',
  email: 'kalyankarbatteries7273@gmail.com',
  gstin: '27ARIPK2620F1Z2',
  upiId: 'sidkalyankar23-4@okicici',
  bankName: 'State Bank of India',
  companyName: 'Exide care of Kalyankar',
  accountHolderName: 'Kalyankar Siddhesh Ranjit',
  accountNumber: '00000043183306202',
  ifsc: 'SBIN0015563',
  termsAndConditions: [
    'Goods once sold will not be taken back.',
    'Warranty Card or Invoice are mandatory for warranty claim.',
    'Total warranty includes pro-rata warranty. Please refer to the warranty card for terms and conditions.',
    'Misuse, bulging, and physical damage are not covered in warranty.',
    'A discharged battery is not covered in warranty. An extra charging fee will apply.',
  ],
  termsAndConditionsMr: [
    'एकदा विकलेला माल परत घेतला जाणार नाही.',
    'वॉरंटी दाव्यासाठी वॉरंटी कार्ड किंवा बिल अनिवार्य आहे.',
    'एकूण वॉरंटीमध्ये प्रो-राटा वॉरंटीचा समावेश आहे. अटी व शर्तींसाठी कृपया वॉरंटी कार्ड पहा.',
    'गैरवापर, फुगणे आणि भौतिक नुकसान वॉरंटीमध्ये समाविष्ट नाही.',
    'डिस्चार्ज झालेली बॅटरी वॉरंटीमध्ये समाविष्ट नाही. अतिरिक्त चार्जिंग शुल्क लागू होईल.',
  ],
  // Ink stamp shown near the signature at the bottom of the invoice
  stamp: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABtCAMAAADTV97xAAAA/1BMVEUaGSEWJFETFCglMEscKUoVJkwODyZgYF0kRnVjXSb//f0PUlYQDyFSJR///wAAAP+qbWRWMlCwpGL/AADv7KixqxUmVh8hRWsoUIVNUXL/f3///38jTG6xcSP/cQD/qlVkaJSqnZKqAAC/f7/AW2LRfIHMmZnZg4fgzNUAAAAKGUkPJVUNFDcJCy8UFy0TFi8RFTEPFTQAADkAAFUQFTITNmgXGCspJy0MDCgAAH4nJzUTJk4MDCYTJksQLGI1NjUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7YYiBAAAAQHRSTlMc7lsfX5uUC/sIAQriCQEBCA4FAQQECqL97wICagQCA/sKAwROvQV8dAD8+/X3T2+QzwQDsP0wFdACLc+vr/wRRLXohgAADsFJREFUeNrtXQl72rq3PYDwZ4te7GAbCDbBENKbkDmd5///r94ZJFkGktDmrvWaELUFY0uytLXP6KEAr+W1vJbX8lpey2v5z0r3FQLotgO95xBMu+12O9hzEII2l73GoG3L3iqGqtuuS1fvtShcft5fkbA0GLfGn/eVDIYGn8ctLG/b+0gGA0H7bUuKRSHo7h0E7cuWLVYkEIZsH3SBg+Ati0IrapLhxZpLq/F0jYCFoNX7MDBkqGGopUK/XA4gBFYSFGRQRBswEA7Vi+KB1l0fAA+CKIECFLwxZGhdvvWrIRDY9nkLQJdK0Jh9QxCIBjDDiiMAFbU22WCgCALs51kHBRsI1Bahl0AYSixZAAzc/su397bWzx+Ez28vHQlaKdLge90A0RhEzmBevv38/EHQm/P3AUBloNaboExAL6prIBCbSOhnZS4s+alcNqZPZZBYleEKciHTTRgICYKCivOrnxsIR4eXrS1lQCRQ1ZrCdC2TQbSl0dnR0fMLLmjEh51363OJBkVyXSiVke/s0YClfXEL5Wi2HYezzuGzcya7AkJDDNJejzmAZiFTGpnQwAzKyS3iAHc3M8ZBDSIfifEzByGNBoOBUgfmEIEgUVQTBCod+ZWpkUiGwpa91APBpGRDBoqrzkbOvsxG9bayinc0C13VzBybuRgtHKnQVTSd2Op+b/VZYKSkjMLdQDgkECLXOkP3T2efxIcESqLYQuKgJ3jgAoyHiKNz9iPdAMGV9Yhzev+QQv97+ugyju5p7leZ7gxCTylUAirLNu3mPaXrrRO17a2BEEKS9hJmFXqavTcylmnSS3t2wCrtfZDtHvojodlHW9TY7JJ6yZTaT2dUMYNZ2qtC6dn2NoVrOmb1NrGTikp+Qxx6YDtI9N0ECy42fU10luns58+fzAU+Irs/NZdXwToII+IGdVuQbJkTZEAqZEC+J04ukt3cNiXmZlR1fAA/pglJVxLSScIYO0pp0Quq2IOZTr2GHNyhU5ukfBaBMq31VG8Z7swEA0KGSxBFvQFZSPyMojR16KatKBJ8cfRp0mD5Jgg8xxSUYCBDlVooe0zjEz5vIVNvDWhW59gm+hoW4p7TLuznRrZHGMEMqEtGCLEopDcmjJIWEQPCPdeqHrLfZkIlUVIqY0c5MYzNfinfhqj4ESYwCJHhAfZPIykgcpE50pvnVhjStNTUrqySeSMVRDLsdhMEhwHT5U3dc8g9R0lRKFNj9LsgkITWICS+elO+Kwk7gaA9Hpj5MDYKQSgtCMhlXsUi4T2yrJERFgtC+gEtQ68GIfMxUHSausWJ9CNWrjm3h0AY1BWzmayhtJ/V88yUF1BMFrsxwWDAbZjlKe3JSJMtzYISvgPejkQRsOYYYIfRaupA4CHSPgEhEgwSbo9HqEUhhDEgoLouimxXEM6aIECRDSwTVOiYlGUfmHG981VZlkvcE+8AQiIYFGIPVrxWMi5PHKxADAQvmba69n8xPMoTh4FBdyamgQBVgqppIUwYrK3kgyBEHgjmXIpxtUol40m13n3pSLmYhzDxQYhqt9kDgdfwh/g6zNnWTYhwjWm9VjUIYba0WkzZBTdMMpCwlg0HNROk9sxbggMed4wjXbLvLxq8FVXho4rxaAOEERSWyMq6HwqYB6eHnU6/32cY+rmHgiylHzuE4BzqyONsFM6UEWUPBGs3WglOAb7R8hVFj1dhJiCIcNZMMPZPhh3GEbs60vM1LP1AKIFdQDitrZaZkFoHoYAETzM+vTgvyWlRJeNQ1ihMDROONkCI7FhD0yM7lwS6D0I4qqTiSE7fop2GygwCg5T4IHDUwtpGVPZXAPE8Zj4IardQmkFoLWEbCILiVMY1hpIOxzFNfUFc0LHDoKJOTjdBYEFlsWIDh0OPzOjD0gPBGHqSkozhMNWi2IhDqIlGHgjRjegbbDFihEwLmsmSe75+XCG4zFLnuOUTfxOETPTLGOOF8pymPYHbEt4jCgs4ty7w0gMBahBuxEpF33CwlR9wkiYW5zEMQ+ft4PkySHxXB1eSfhdgDTRqBlKZ0UTIEcEsbNAfpz1dGsXY2wEFH4Si9qsYhNSBoOAA+Ts+03Bzx8djGF4gB4adzhByCwKP/FhA4PSaNZEFpEYgVCP3EIdaRmxCUuE7xoJGOzh9YsTB+EYWBKTQ6Dz1vSbXohImhMUsqT2JR9Jrh8drjkKTCTNOtI+Pb0EgQB6sOjGsYvBAyEiXYqVOnWgVEKpRNjLGjH8v4Qf8WBY8eDZkJ9fX10nywcyExCbhmaI/9qOiXddGlSiVGItg3WbjvSkDN7a4rsTKChMKwT1ahI9fc93wlhpMEHVwdtgXhYAlh34H2ZAjFRwIxk04PFwHgdoLbVei3wVHXmKf9r2pEYeC4TRjkdkKCCMZifMTkOVWIJRzC+DA9TzgC0bRo86SBWHNRvogsKeKWr9zBcZFjFEb9FEXnDdBGKynE0Y2SMS/Kbs67CSMwtDECBA3ohzet5rKCdEtwaIqjh9nhtNyEownEyvqomaYMOhohlPbs3WWQ5ac9GEQGo7CaAsIX4F95TMyh8YS2MnnMX2XUM+4mWJklS1hboZExv5SE+nCdLqkbZQzWygTwMdHONexDXnYqFI4i6aAGs4ITXISe+S7s8pWrmdpEeKpBuAqjCRFlu3oKLCZ3WRCT7Ty6YVzks9RGhgE/LbITOHruoVkfrhAK+agU9W5otUWlX1jFmzmLVxyw5/OEpsuZy6nn6sVGq3Zegulrca+Ubs4Cs5GZk0QCmNwiIRjcJSKGYQYy33GoVvnusItSbN628sPckQlGIVevXAtN2eOrfU89VpMQVIKdk8G8FiaMajNQ60+PCYICr2mdkEvCUFALN7njSh7DJ3mxYkwbCb/woezgdNwo5nZDhu/kVTh9N6epZe6QvgYBlVQX3kYbANBLI6JxYxvFyIIFcAc7aSVkS168ZESU47OSVjOLpgpckwOm03boI5VJu4ATPK8fHrSfT168EBgEhTgMj6GCZ1F3pcQarEZQ+5y1SG2UMBaSL61mteAgCkbTXJ4uI9dL8SJUnDRVsNP6HGiClywAjGDABJJoobjJt+26cWHSpnnizw3g8/ntJS5KaDdFrgNeO8alFfkpbgDkA/n89GTUDBKQRznTRCuRxLyzeLIJutIGaBKhHJIKCxoMY3rdtzZ8TbHXxx4mGh8EuekZFC8TOnbjU6Z211gtvpz4HDFVp5DLtXzp6CwzWdsMGH2lX2egjPa16jFzxkE4iUHknTyzbTSw2XBcceQ8hJlnDOpSpwN5yn6/aHd6BPOfSpDaTDsMwfxnH1zICc4eH/5BBR8pZBPtwVQ4Uqy/DfkBa9GIbnLtAIIQ86jvzMB49nO0rCAmNaetMt7FHFa/KHRNnOpMZTjc/niHR2pMATad+EOSNP+k0DY5in44oAWPLwRE6Ekhy/gkz7KZWiL35UGBqETrqijkqLRfk4b8TkKyTw/z/M4x31Vfk4ghKHW7KUSCIjXEJ32IicQVroU2ZznoXqafdgiD14Uec2Jf+WjoA0TSFWXDIcxkCZ62kUrwtDIdAyxpj7ECS2p44V45sj53FVj+elfkBC8J3XQvzAqoqQ2tBE/STM2wodwa1JFItLCJvFHcxrruXMe88yXhmBXJojkl0QHpn8Sk5LxQWCqsOgvLBxzqOhreCEH5uQcz/tip56Agm7X9sHELRvptRnvSOxFxTmt4IKtdp9jKOX5zLArCOR29XGurOOYFJsgDBs6ocTqZTlHe/De6YR4iCrhBru7sEmuPylVsHHxYQMEkwT/IJcIB04X58wE7UtD8BsgEJH6WtaUreTDICiifp+1YK0YS9KttOviv5AHjiSr7YlWcz04MumfYzzjwqZXStDL3/WUGIQFLiqZN5nOkK1kEwRWh3MqrB1Czugt8km/HyMIcqBC+PLV0DR8sjyMnU8ol8obIHAMby+EjY9jCWVpKZdyTXB8LGrx+24gLKwXtEQuxXl8rkn73XU6tzUIk/PagWJxiBe84oBuw4W9BATvxVm60PHT7YNQIf1Acy7kQo8yCW0PhZ7xi+QqWjxZ4QL8MpdddlaLjPztkEo5ggUrN9QxQ00SbsBdDHOKE8o5uklYMEaZs8u8uEWMrtBVH0pZsNss3//BLZ2HLvE+9S7IeplHJWkdyM8kvlYVEaHU25yEN8s3D5fKVvyK/6ic8Lf5QRtgvkw92UGJn5OT8pt34Jskg1YPn3G5hKrahQrvxEri2kv6kpIq0dKF6tOMUEhuO4d87XTFDt0QMrlZyU+xPsvS9akQguYsfmouxNNVru9y31YWpzjbzu21XJ3WV4dztI+JRwSjFquDfw8O/q3LwX9Ztvb375Za5txu42Em/GzLna3vJDObmoTSj9Tk+evyI0rhli8mRq0xfFmt3bXWXgp1//3f31j+qR58QKVBhRv49OnjR8qZ6Y8fP3769Kkrdzh//w7Zr1+/JvojsgJrcJ2PutgggoZ//koQ/vcwCDqoqRB9CoIAAvogddEscCoN+IsqfP4UcXLxqCYCnungn7+xHMCHHWJJoUIvu9HNcme+S311dfXllj7KxcXVF/zO+Z4x4yM89+fjDBXI+mHkeG+5+oIfX77dXlUrdFq+wHHphU61aai2GCliCJy8OTlBc3hCP05oB/8W+8h2sHrDVHqDB5yJxE1uxP8qtpXmh5hUXt8TV6viHrjGxhB2SSscsduY3nctm9N7q9sr/PyW35ar8uoq9ZzFR7wRI2BGC9Gfegc9SIH/dAAVah9Nf2Q/yWBDkDW2q+2wvoM7+EaPX9U1JtS3/nMqtA9PW2s3cd0TdVWS7GeteHq4i7OIM+4GrDbR4OJWF9r2ubHlHR2hfShRNJ826httG2Fswj+0PEoSkC6a0I3XOH+ePFXi50y0PHHTxs+Abr7W1R9lmI747tZWcu/Fu3gSTzTIjRo6YxdhfHy0SzIlsEvbJW1LT1G0adrymxEMlqySNR+RxZUVpnmbil3+ETCirL9xru2M+u0SfrITuAdEYvkUjyn6ph6/wXxayC19O2pFAaFNw6UPmQwOFn/TZJAPvIHCIMc049KmeTNBBJI21+FeuHIXhF+4HWRUVWrooPqzBxSbAjF7tL65m/jscLfIKaD16vJzNIEBQTMIXSsoXV5aEBC0Jl1g6NMGA0KXmUDL3nUgQFv8GP4dCDo68DXObxTfb3zsvgZ3U6LF4PGEEo1Oxi3CH7jpQGAG3KZFx9nTat4JCPa4VA0cgwI7aekZz49dtmm3MKGNhPqjtwF1PQtRX3N7GIPx7i6CzJQ+2BSQlu/KbyP6rPbpmKajbCC65rlbQiKgB9nFrmCDE7Nh8KU6AR9gu6O7XfjDlzwEBgVzU/lDt4aPzL02BoP//xdR6U3Mn+IyGbWQLqf339+RwTISYfhrXzDS/f6nLWVK4jhG1b2GMgsXfzsGT71IbZVjdHCPXshAblZ9Z5TiS3unhlWO78yt0bMHZMF6SS/vnWwNExFtsxEFJGkDgxf43qXARwFthNrAQNJuL5cHFM0YFE7HJsvWuPEpVOamtvHpy+WBxwWDwgAaz8SYe6ktBu2fLxMDk2xrtw0K0dKhMIPlwGDw4t9AZlE4emcfOeBnmLKRvbXxnaHBi35XZ2JROHP3c6pMubfKnFkMvsOLLhaFU3MPegLu/UJOHbz8N9fa9zCe2teO2VcsOXWwF2/i23wHny8K+/K61mCNDD4N9ubFlD+662S4dO8Ygz0qjfew1e9b2683F+v67Zzj/aRBw0q09/sF1s13bu3tC92D9ut7zGuZ2PP/4+H1vzYQGF4heC2v5bW83PJ/tIZjzvxLLoYAAAAASUVORK5CYII=',
}

// Manual PDF logo size controls (millimetres).
// Change only these two values whenever the printed logo needs resizing.
const INVOICE_LOGO_WIDTH_MM = 60
const INVOICE_LOGO_HEIGHT_MM = 40

const initialSales = []
const SALES_STORAGE_KEY = 'kalyankar-sales'
const PRODUCT_STOCK_STORAGE_KEY = 'kalyankar-product-stock'
const PRODUCT_MODELS_STORAGE_KEY = 'kalyankar-product-models'
const PRODUCT_BRANDS_STORAGE_KEY = 'kalyankar-product-brands'
const SOLD_SERIALS_STORAGE_KEY = 'kalyankar-sold-serials'

function loadStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function loadSalesBrands() {
  const uniqueBrands = new Map(defaultSalesBrands.map((brand) => [brand.toUpperCase(), brand]))
  loadStoredList(PRODUCT_BRANDS_STORAGE_KEY).forEach((brand) => {
    const cleanBrand = String(brand || '').trim()
    if (cleanBrand && !uniqueBrands.has(cleanBrand.toUpperCase())) uniqueBrands.set(cleanBrand.toUpperCase(), cleanBrand)
  })
  return [...uniqueBrands.values()].sort((a, b) => a.localeCompare(b))
}

function loadStoredSales() {
  try {
    const savedSales = JSON.parse(localStorage.getItem(SALES_STORAGE_KEY) || '[]')
    return Array.isArray(savedSales) ? savedSales : initialSales
  } catch {
    return initialSales
  }
}

function loadSoldSerialNumbers() {
  const serials = new Set(loadStoredList(SOLD_SERIALS_STORAGE_KEY).map((serial) => String(serial).toUpperCase()))
  loadStoredSales().forEach((sale) => {
    const items = Array.isArray(sale.items) && sale.items.length ? sale.items : [sale]
    items.forEach((item) => {
      const serial = String(item.serialNumber || '').trim().toUpperCase()
      if (sale.saleType !== 'Exchange' && serial) serials.add(serial)
    })
  })
  return serials
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
  hsn: '',
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

  cgstRate: getGstSettings().cgstRate,
  sgstRate: getGstSettings().sgstRate,

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

const MARATHI_NUMBERS = [
  'शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा',
  'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस', 'वीस',
  'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस', 'तीस',
  'एकतीस', 'बत्तीस', 'तेहतीस', 'चौतीस', 'पस्तीस', 'छत्तीस', 'सदतीस', 'अडतीस', 'एकोणचाळीस', 'चाळीस',
  'एकेचाळीस', 'बेचाळीस', 'त्रेचाळीस', 'चव्वेचाळीस', 'पंचेचाळीस', 'सेहेचाळीस', 'सत्तेचाळीस', 'अठ्ठेचाळीस', 'एकोणपन्नास', 'पन्नास',
  'एकावन्न', 'बावन्न', 'त्रेपन्न', 'चौपन्न', 'पंचावन्न', 'छप्पन्न', 'सत्तावन्न', 'अठ्ठावन्न', 'एकोणसाठ', 'साठ',
  'एकसष्ट', 'बासष्ट', 'त्रेसष्ट', 'चौसष्ट', 'पासष्ट', 'सहासष्ट', 'सदुसष्ट', 'अडुसष्ट', 'एकोणसत्तर', 'सत्तर',
  'एकाहत्तर', 'बहात्तर', 'त्र्याहत्तर', 'चौऱ्याहत्तर', 'पंच्याहत्तर', 'शहात्तर', 'सत्याहत्तर', 'अठ्ठ्याहत्तर', 'एकोणऐंशी', 'ऐंशी',
  'एक्याऐंशी', 'ब्याऐंशी', 'त्र्याऐंशी', 'चौऱ्याऐंशी', 'पंच्याऐंशी', 'शहाऐंशी', 'सत्याऐंशी', 'अठ्ठ्याऐंशी', 'एकोणनव्वद', 'नव्वद',
  'एक्याण्णव', 'ब्याण्णव', 'त्र्याण्णव', 'चौऱ्याण्णव', 'पंच्याण्णव', 'शहाण्णव', 'सत्त्याण्णव', 'अठ्ठ्याण्णव', 'नव्याण्णव',
]

function marathiThreeDigitWords(number) {
  const n = Math.floor(Number(number || 0))
  if (n < 100) return MARATHI_NUMBERS[n]
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100
  return `${MARATHI_NUMBERS[hundreds]}शे${remainder ? ` ${MARATHI_NUMBERS[remainder]}` : ''}`
}

function marathiAmountInWords(value) {
  let n = Math.round(Number(value || 0))
  if (n === 0) return 'शून्य रुपये फक्त'

  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  const parts = []
  if (crore) parts.push(`${marathiThreeDigitWords(crore)} कोटी`)
  if (lakh) parts.push(`${marathiThreeDigitWords(lakh)} लाख`)
  if (thousand) parts.push(`${marathiThreeDigitWords(thousand)} हजार`)
  if (n) parts.push(marathiThreeDigitWords(n))
  return `${parts.join(' ')} रुपये फक्त`
}

function amountInWords(value, outputLanguage = 'en') {
  if (outputLanguage === 'mr') return marathiAmountInWords(value)
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

function openPrintWindow(html, afterPrintUrl = '') {
  const printWindow = window.open('', '_blank', 'width=950,height=1050')
  if (!printWindow) {
    alert('Please allow pop-ups to print the invoice.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  if (afterPrintUrl) {
    printWindow.onafterprint = () => { printWindow.location.href = afterPrintUrl }
  }
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 350)
}

function safeFilePart(value) {
  return String(value || 'Customer').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 70) || 'Customer'
}

function customerWhatsAppUrl(phone, customer, fileName) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = `91${digits}`
  else if (digits.startsWith('0') && digits.length === 11) digits = `91${digits.slice(1)}`
  const message = `Hello ${customer || 'Customer'}, your invoice PDF ${fileName} is ready. Please attach the downloaded PDF to this chat.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

async function downloadInvoicePdf(html, fileName) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1120px;height:800px;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)
  try {
    frame.contentDocument.open()
    frame.contentDocument.write(html)
    frame.contentDocument.close()
    const pdfLayout = frame.contentDocument.createElement('style')
    const singleCopy = Boolean(frame.contentDocument.querySelector('.print-page.single-copy'))
    pdfLayout.textContent = `
      html, body {
        width: ${singleCopy ? '138mm' : '287mm'} !important;
        height: 200mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .print-page {
        width: ${singleCopy ? '138mm' : '287mm'} !important;
        height: 198mm !important;
        display: flex !important;
        ${singleCopy ? 'padding: 1mm !important;' : ''}
      }
      .bill-copy {
        height: ${singleCopy ? '196mm' : '198mm'} !important;
        ${singleCopy ? 'width: 136mm !important;' : ''}
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
    `
    frame.contentDocument.head.appendChild(pdfLayout)
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    const images = [...frame.contentDocument.images]
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve })))
    const invoicePage = frame.contentDocument.querySelector('.print-page')
    const canvas = await html2canvas(invoicePage, {
      scale: 1.6,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: invoicePage.scrollWidth,
      height: invoicePage.scrollHeight,
      windowWidth: invoicePage.scrollWidth,
      windowHeight: invoicePage.scrollHeight,
    })
    const pdf = new jsPDF({ orientation: singleCopy ? 'portrait' : 'landscape', unit: 'mm', format: singleCopy ? 'a5' : 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 5
    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin * 2
    const imageRatio = canvas.width / canvas.height
    let imageWidth = maxWidth
    let imageHeight = imageWidth / imageRatio
    if (imageHeight > maxHeight) {
      imageHeight = maxHeight
      imageWidth = imageHeight * imageRatio
    }
    const imageX = (pageWidth - imageWidth) / 2
    const imageY = (pageHeight - imageHeight) / 2
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST')
    const blob = pdf.output('blob')
    const file = new File([blob], fileName, { type: 'application/pdf' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    return file
  } finally {
    frame.remove()
  }
}

function renderInvoiceHTML(fields, printLanguage = 'en', options = {}) {
  const copies = options.copies === 1 ? 1 : 2
  const {
    invoice, date, salesPerson, customer, phone, address, gstNumber,
    vehicleName, vehicleNumber, saleType, exchange,
    brand, batteryType, model, serialNumber, oldBatteryWeight, qty, unitPrice, discount, discountPercent, taxableAmount,
    hsn, cgstRate, sgstRate, cgstAmount, sgstAmount, grandTotal,
    paidAmount, dueAmount, status, warrantyPeriod, totalWarranty, warrantyType, paymentMethod, notes,
    paymentHistory, items = [],
  } = fields

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
        vehicle: 'वाहन नाव व नं.',
        sr: 'क्र.',
        desc: 'मालाचे वर्णन',
        serial: 'सिरीयल नं.',
        hsn: 'HSN',
        qty: 'नग',
        rate: 'दर',
        discount: 'सवलत (%)',
        total: 'एकूण',
        batteryName: 'बॅटरी नाव',
        model: 'मॉडेल',
        warranty: 'वॉरंटी',
        amountWords: 'अक्षरी रु',
        cgst: 'CGST',
        sgst: 'SGST',
        grandTotal: 'एकूण',
        taxableAmount: 'करपात्र रक्कम',
        paymentMethod: 'पेमेंट पद्धत',
        paidAmount: 'भरलेली रक्कम',
        duePayment: 'बाकी पेमेंट',
        billTo: 'बिल:',
        contactNo: 'संपर्क नं.',
        bankDetails: 'बँक तपशील',
        companyName: 'कंपनी नाव',
        accountHolderName: 'A/C धारक नाव',
        accountNumber: 'A/C नंबर',
        ifsCode: 'IFS कोड',
        customerCopy: 'ग्राहक प्रत',
        officeCopy: 'ऑफिस प्रत',
        signature: 'kalyankar batteries',
        terms: 'अटी व शर्ती',
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
        vehicle: 'Vehicle Name & No.',
        sr: 'sr.',
        desc: 'Product Description',
        serial: 'sr.no',
        hsn: 'HSN',
        qty: 'Qty',
        rate: 'Rate',
        discount: 'Dis. (%)',
        total: 'Total',
        batteryName: 'Battery name',
        model: 'model',
        warranty: 'warranty',
        amountWords: 'Amount in words',
        cgst: 'CGST',
        sgst: 'SGST',
        grandTotal: 'G. Total',
        taxableAmount: 'Taxable Amount',
        paymentMethod: 'Payment Method',
        paidAmount: 'Paid Amount',
        duePayment: 'Due Payment',
        billTo: 'Bill to',
        contactNo: 'Contact No',
        bankDetails: 'Bank Details',
        companyName: 'Company name',
        accountHolderName: 'A/C holder name',
        accountNumber: 'A/C number',
        ifsCode: 'IFS code',
        customerCopy: 'Customer Copy',
        officeCopy: 'Office Copy',
        signature: 'kalyankar batteries',
        terms: 'T&C',
      }

  const hsnCode = hsn || ''
  const shopDetails = printLanguage === 'mr'
    ? {
        name: '\u0915\u0932\u094d\u092f\u093e\u0923\u0915\u0930 \u092c\u0945\u091f\u0930\u0940\u091c',
        address: '\u0917\u093e\u0930\u0917\u094b\u091f\u0940 - \u0915\u094b\u0932\u094d\u0939\u093e\u092a\u0942\u0930 \u092e\u0947\u0928 \u0930\u094b\u0921, \u0917\u093e\u0930\u0917\u094b\u091f\u0940 416209',
        addressLabel: '\u092a\u0924\u094d\u0924\u093e',
        landmark: '\u0938\u094d\u0935\u093e\u092e\u0940 \u0938\u092e\u0930\u094d\u0925 \u092e\u0902\u0917\u0932 \u0915\u093e\u0930\u094d\u092f\u093e\u0932\u092f\u093e\u091c\u0935\u0933',
        landmarkLabel: '\u0913\u0933\u0916',
        contactLabel: '\u0938\u0902\u092a\u0930\u094d\u0915',
        whatsappLabel: 'व्हाट्सअँप',
        emailLabel: '\u0908\u092e\u0947\u0932',
        gstinLabel: 'GSTIN',
      }
    : {
        name: SHOP_INFO.name,
        address: 'Gargoti - Kolhapur Main Road, Gargoti 416209',
        addressLabel: 'Address',
        landmark: 'Near Swami Samarth Mangal Karyalay',
        landmarkLabel: 'Landmark',
        contactLabel: 'Contact',
        whatsappLabel: 'WhatsApp No',
        emailLabel: 'Email',
        gstinLabel: 'GSTIN',
      }
  // Resolve the supplied print logo so it also loads correctly in the print popup.
  const printableLogo = new URL(salesPrintLogo, window.location.origin).href
  const paymentSettings = getPaymentSettings()
  const printableQr = paymentSettings.qrImage || new URL(paymentQr, window.location.origin).href
  const itemTotal = saleType === 'Exchange' ? taxableAmount : Math.max(Number(qty || 1) * Number(unitPrice || 0), 0)
  const printDiscountPercent = saleType === 'Regular' ? Number(discountPercent || 0) : 0
  const printTerms = printLanguage === 'mr' ? SHOP_INFO.termsAndConditionsMr : SHOP_INFO.termsAndConditions

  const isOldStock = saleType === 'Exchange'
  const serialHeader = isOldStock ? '' : `<th>${labels.serial}</th>`
  const serialCell = isOldStock ? '' : `<td>${serialNumber || ''}</td>`
  const discountHeader = isOldStock ? '' : `<th>${labels.discount}</th>`
  const discountCell = isOldStock ? '' : `<td class="num">${formatCurrency(printDiscountPercent)}%</td>`
  const productDescription = [brand, model].filter(Boolean).join(' ')
  const warrantyDescription = warrantyPeriod
    ? `${warrantyPeriod}${totalWarranty ? ` (${totalWarranty} Months)` : ''}${warrantyType ? ` — ${warrantyType}` : ''}`
    : ''
  const multiItems = Array.isArray(items) ? items : []
  const multiRows = multiItems.map((item, index) => {
    const warranty = item.warrantyPeriod
      ? `${item.warrantyPeriod}${item.totalWarranty ? ` (${item.totalWarranty} Months)` : ''}${item.warrantyType ? ` — ${item.warrantyType}` : ''}`
      : ''
    return `<tr>
      <td>${index + 1}</td>
      <td class="product-description"><strong>${[item.brand, item.model].filter(Boolean).join(' ')}</strong>${warranty ? `<small>${labels.warranty}: ${warranty}</small>` : ''}<small>GST: ${Number(item.cgstRate || 0) + Number(item.sgstRate || 0)}%</small></td>
      <td>${item.serialNumber || ''}</td><td>${item.hsn || ''}</td><td>${item.qty || 1}</td>
      <td class="num">${formatCurrency(item.unitPrice)}</td><td class="num">${formatCurrency(item.discountPercent || 0)}%</td>
      <td class="num">${formatCurrency(item.taxableAmount)}</td>
    </tr>`
  }).join('')
  const multiTable = multiItems.length >= 2 ? `<table class="items open-items multi-items">
    <thead><tr><th>${labels.sr}</th><th>${labels.desc}</th><th>${labels.serial}</th><th>${labels.hsn}</th><th>${labels.qty}</th><th>${labels.rate}</th><th>${labels.discount}</th><th>${labels.total}</th></tr></thead>
    <tbody>${multiRows}</tbody></table>` : ''
  const copyMarkup = () => `
    <section class="bill-copy${multiItems.length >= 2 ? ' multi-copy' : ''}">
      <div class="header-row">
        <div class="shop-header">
          <div class="logo-box">
            <img src="${printableLogo}" alt="${SHOP_INFO.name}" onerror="this.style.display='none'" />
          </div>
        </div>
        <div class="qr-box">
          <img src="${printableQr}" alt="Scan to pay" onerror="this.style.display='none'" />
          <small>${paymentSettings.upiId || SHOP_INFO.upiId}</small>
        </div>
      </div>

      <div class="shop-details">
        <h3>${shopDetails.name || SHOP_INFO.name}</h3>
        <div class="shop-detail-row"><span>${shopDetails.addressLabel}:</span><strong>${shopDetails.address}</strong></div>
        <div class="shop-detail-row"><span>${shopDetails.landmarkLabel}:</span><strong>${shopDetails.landmark}</strong></div>
        <div class="shop-detail-row"><span>${shopDetails.contactLabel}:</span><strong>+91 ${SHOP_INFO.phone}</strong></div>
        <div class="shop-detail-row"><span>${shopDetails.gstinLabel}:</span><strong>${SHOP_INFO.gstin}</strong></div>
        <div class="shop-detail-row"><span>${shopDetails.emailLabel}:</span><strong>${SHOP_INFO.email}</strong></div>
      </div>

      <div class="bill-info-row">
        <div class="bill-info-col bill-to-box">
          <div class="field-label">${labels.billTo}:</div>
          <div class="field-row"><span>${labels.customerName}:</span> <strong>${customer || ''}</strong></div>
          <div class="field-row"><span>${labels.address}:</span> <strong>${address || ''}</strong></div>
          <div class="field-row"><span>${labels.contactNo}:</span> <strong>${phone || ''}</strong></div>
          <div class="field-row"><span>${labels.customerGstin}:</span> <strong>${gstNumber || '—'}</strong></div>
        </div>
        <div class="bill-info-col align-right">
          <div class="invoice-heading">GST INVOICE</div>
          <div class="field-row"><span>${labels.date}:</span> <strong>${date || ''}</strong></div>
          <div class="field-row"><span>${labels.invoiceNo}:</span> <strong>${invoice || ''}</strong></div>
          <div class="field-row"><span>${printLanguage === 'mr' ? '\u092a\u0947\u092e\u0947\u0902\u091f' : 'Payment'}:</span> <strong>${paymentMethod || ''}</strong></div>
          <div class="field-row"><span>${printLanguage === 'mr' ? '\u0938\u094d\u0925\u093f\u0924\u0940' : 'Status'}:</span> <strong>${status || ''}</strong></div>
        </div>
      </div>

      ${multiItems.length >= 2 ? multiTable : `<table class="items open-items">
        <thead>
          <tr>
            <th>${labels.sr}</th><th>${labels.desc}</th>${serialHeader}<th>${labels.hsn}</th>
            <th>${labels.qty}</th><th>${labels.rate}</th>${discountHeader}<th>${labels.total}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td class="product-description"><strong>${productDescription || ''}</strong>${warrantyDescription ? `<small>Warranty: ${warrantyDescription}</small>` : ''}</td>
            ${serialCell}
            <td>${hsnCode}</td>
            <td>${qty || ''}</td>
            <td class="num">${formatCurrency(unitPrice)}</td>
            ${discountCell}
            <td class="num">${formatCurrency(itemTotal)}</td>
          </tr>
        </tbody>
      </table>`}

      <div class="spacer"></div>

      <div class="amount-row">
        <div class="amount-words"><strong>${labels.amountWords}:</strong> ${amountInWords(grandTotal, printLanguage)}</div>
        <div class="totals-box">
          <div class="totals-line"><span>${labels.taxableAmount}</span><strong>${formatCurrency(taxableAmount)}</strong></div>
          <div class="totals-line"><span>${labels.cgst} (${cgstRate || 0}%)</span><strong>${formatCurrency(cgstAmount)}</strong></div>
          <div class="totals-line"><span>${labels.sgst} (${sgstRate || 0}%)</span><strong>${formatCurrency(sgstAmount)}</strong></div>
          <div class="totals-line grand"><span>${labels.grandTotal}</span><strong>${formatCurrency(grandTotal)}</strong></div>
          <div class="totals-line soft"><span>${labels.paymentMethod}</span><strong>${paymentMethod || ''}</strong></div>
          <div class="totals-line soft"><span>${labels.paidAmount}</span><strong>${formatCurrency(paidAmount)}</strong></div>
          <div class="totals-line soft"><span>${labels.duePayment}</span><strong>${formatCurrency(dueAmount)}</strong></div>
        </div>
      </div>

      <div class="footer-row">
        <div class="terms-block">
          <div class="field-label">${labels.terms}:</div>
          <ol>${printTerms.map((term) => `<li>${term}</li>`).join('')}</ol>
        </div>
        <div class="signature-block">
          <h3>KALYANKAR BATTERIES</h3>
          <span>Authorised Signature</span>
        </div>
      </div>
    </section>
  `

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoice} — Tax Invoice</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    margin: 0;
    padding: 0;
    font-size: 11px;
    line-height: 1.2;
    overflow: hidden;
  }

  .print-page {
    width: 100%;
    display: flex;
    gap: 8mm;
    position: relative;
  }
  .print-page.single-copy { width: 138mm; gap: 0; padding: 1mm; }
  .print-page.single-copy::before { display: none; }
  .print-page.single-copy .bill-copy { width: 136mm; height: 196mm; }
  .print-page::before {
    content: '';
    position: absolute;
    top: -3mm;
    bottom: -3mm;
    left: 50%;
    border-left: 1px dashed #111;
  }

  .bill-copy {
    width: calc(50% - 4mm);
    height: 198mm;
    border: 1px solid #111;
    padding: 4mm;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 1mm;
    flex-shrink: 0;
  }
  .shop-header { width: ${INVOICE_LOGO_WIDTH_MM}mm; }
  .logo-box {
    width: ${INVOICE_LOGO_WIDTH_MM}mm; height: ${INVOICE_LOGO_HEIGHT_MM}mm;
    display: flex; align-items: center; justify-content: center; overflow: visible;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
  }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; }
  .shop-details { width: calc(100% - 36mm); min-height: 32mm; margin: 0 0 3mm; color: #172033; font-size: 9.5px; line-height: 1.22; background-color:#bfe8f7 !important; box-shadow:inset 0 0 0 1000px #bfe8f7; border:1px solid #79c9e7; border-radius:4mm; padding:3mm 4mm; flex-shrink: 0; }
  .shop-details h3 { margin: 0 0 1.2mm; color: #0b3475; font-size: 14px; line-height: 1.1; font-weight: 900; }
  .shop-detail-row { display: flex; gap: 0; margin: .65mm 0; align-items: baseline; }
  .shop-details span { color: #334155; font-weight: 500; }
  .shop-details strong { color: inherit; font-weight: 900 !important; }
  body.marathi-print, body.marathi-print .shop-details { font-family: "Nirmala UI", Mangal, Arial, sans-serif; }
  body.marathi-print .shop-details, body.marathi-print .shop-details span, body.marathi-print .shop-details strong, body.marathi-print .shop-details h3 { font-weight: 900 !important; }
  .qr-box {
    width: 32mm; height: 32mm;
    display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;
    font-size: 10px; color: #888;
  }
  .qr-box img { width: 27mm; height: 27mm; object-fit: contain; }
  .qr-box small { width: 100%; margin-top: .5mm; color: #172033; font-size: 6px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }

  .bill-info-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;
    margin-bottom: 1.5mm; padding: 1.5mm;
    border: 1px solid #8fcfe5; border-radius: 2mm; background: #ffffff;
    flex-shrink: 0;
  }
  .bill-to-box { background: #eefaff; border-left: 3px solid #66c5e8; border-radius: 1.5mm; padding: 1.5mm; }
  .bill-info-col.align-right { text-align: left; transform: translateX(0.5mm); padding: 0; }
  .invoice-heading { margin: 0 0 1mm; padding: 1.5mm 2mm; background-color: #bfe8f7 !important; box-shadow: inset 0 0 0 1000px #bfe8f7; border: 1px solid #8fcfe5; color: #0f2747; font-size: 14px; font-weight: 900; letter-spacing: .16em; text-align: center; }
  .bill-info-col.align-right .field-row span { color: #111; font-weight: 700; }
  .field-label { font-weight: 700; margin-bottom: 1mm; font-size: 10px; }
  .field-row { margin-bottom: 0.75mm; font-size: 9.5px; }
  .field-row span { color: #444; margin-right: 3px; }
  .field-row.terms { font-size: 9px; color: #555; }

  table.items { width: 100%; border-collapse: collapse; font-size: 8.8px; border: 1px solid #d7e0ea; flex-shrink: 0; }
  table.items th, table.items td {
    border: 0;
    padding: 1.5mm 1.2mm;
    text-align: left;
  }
  table.items th {
    background-color: #bfe8f7 !important;
    box-shadow: inset 0 0 0 1000px #bfe8f7;
    color: #173b70;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
  }
  table.items tbody tr { border-bottom: 1px solid #d9dee8; }
  table.items tbody td { color: #172033; font-weight: 700; }
  table.items .num, table.items td:nth-child(6),
  table.items td:nth-child(7), table.items td:nth-child(8) { text-align: right; }
  .product-description small { display: block; margin-top: 1mm; color: #475569; font-size: 8px; font-weight: 600; }
  table.multi-items { font-size: 7.5px; }
  table.multi-items th { font-size: 6.8px; padding: 1.7mm 1mm; }
  table.multi-items td { padding: 1.8mm 1mm; vertical-align: top; }

  .spacer { flex: 0 0 2mm; min-height: 2mm; }

  .amount-row {
    display: grid; grid-template-columns: 1fr 52mm; gap: 4mm; align-items: start;
    margin-top: 1mm;
    margin-bottom: 1.5mm;
    flex-shrink: 0;
  }
  .amount-words { align-self: end; font-size: 10px; padding-bottom: 1mm; }
  .totals-box { width: 52mm; color: #1f2a44; }
  .totals-line {
    display: flex; justify-content: space-between; gap: 8mm;
    padding: 0.55mm 0;
    border-bottom: none;
    font-size: 10.5px;
  }
  .totals-line strong { min-width: 26mm; text-align: right; color: #111827; }
  .totals-line.grand {
    margin-top: 1mm;
    padding: 1.2mm 1.5mm;
    border-top: 2px solid #5fb9dd;
    border-bottom: 1px solid #8fcfe5;
    background-color: #bfe8f7 !important;
    box-shadow: inset 0 0 0 1000px #bfe8f7;
    font-size: 14px;
    font-weight: 700;
  }
  .totals-line.grand strong { font-size: 17px; }
  .totals-line.soft { color: #3f4b62; padding-top: 0.8mm; padding-bottom: 0.8mm; }

  .footer-row { min-height: 22mm; margin-top: 0; display: grid; grid-template-columns: 1.85fr 1fr; gap: 4mm; border-top: 1px solid #d9e2ec; padding-top: 1mm; padding-bottom: 1mm; flex: 0 0 auto; }
  .terms-block { min-width: 0; font-size: 6.4px; line-height: 1.08; color: #334155; overflow-wrap: anywhere; }
  .terms-block .field-label { color: #0f2747; margin-bottom: 1mm; }
  .terms-block ol { margin: 0; padding-left: 3.5mm; }
  .terms-block li { margin-bottom: 0.15mm; }
  .signature-block { min-height: 18mm; align-self: stretch; display: flex; flex-direction: column; justify-content: center; gap: 1mm; text-align: right; padding: 1mm 0; font-weight: 700; }
  .signature-block h3 { margin: 0; font-size: 13px; font-weight: 800; }
  .signature-block span { font-size: 8px; color: #334155; font-weight: 700; }

  .multi-copy .logo-box { width: ${INVOICE_LOGO_WIDTH_MM}mm; height: ${INVOICE_LOGO_HEIGHT_MM}mm; }
  .multi-copy .shop-header { width: ${INVOICE_LOGO_WIDTH_MM}mm; }
  .multi-copy .header-row, .multi-copy .bill-info-row { margin-bottom: 2mm; }
  .multi-copy .bill-to-box { padding: 2mm; }
  .multi-copy .field-row { margin-bottom: 1mm; }
  .multi-copy .amount-row { margin-top: 1mm; margin-bottom: 2mm; }
  .multi-copy .totals-line { padding-top: 0.75mm; padding-bottom: 0.75mm; }

  @page { size: A4 landscape; margin: 5mm; }
  @media print {
    html, body { width: 287mm; height: 200mm; margin: 0; padding: 0; overflow: hidden; }
    .print-page { width: 100%; display: flex; gap: 8mm; }
    .print-page::before {
      content: '';
      position: fixed;
      top: 3mm;
      bottom: 3mm;
      left: 50%;
      border-left: 1px dashed #111;
    }
    .bill-copy { page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body class="${printLanguage === 'mr' ? 'marathi-print' : ''}">
  <main class="print-page${copies === 1 ? ' single-copy' : ''}">
    ${copyMarkup()}
    ${copies === 2 ? copyMarkup() : ''}
  </main>
</body>
</html>`
}

function savedSalePrintFields(sale) {
  return {
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
    hsn: sale.hsn || '',
    oldBatteryWeight: sale.oldBatteryWeight || sale.exchange?.weight || 0,
    qty: sale.qty,
    unitPrice: sale.unitPrice,
    discount: sale.discount,
    discountPercent: sale.discountPercent,
    taxableAmount: sale.batteryPrice ?? (Number(sale.amount || 0) / (1 + getGstSettings().totalRate / 100)),
    cgstRate: sale.cgstRate ?? getGstSettings().cgstRate,
    sgstRate: sale.sgstRate ?? getGstSettings().sgstRate,
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
    paymentHistory: sale.paymentHistory || [],
    items: sale.items || [],
  }
}

export default function Sales() {
  const [sales, setSales] = useState(loadStoredSales)
  const [nextInvoiceSeq, setNextInvoiceSeq] = useState(() => loadStoredSales().length + 1)
  const [activeTab, setActiveTab] = useState('regular') // 'regular' | 'exchange'
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(createEmptyForm(1))
  const [gstRateOptions, setGstRateOptions] = useState(() => getGstSettings().rates)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [stockModels] = useState(() => loadStoredList(PRODUCT_MODELS_STORAGE_KEY))
  const [stockProducts, setStockProducts] = useState(() => loadStoredList(PRODUCT_STOCK_STORAGE_KEY))
  const [availableBrands, setAvailableBrands] = useState(loadSalesBrands)
  const [soldSerialNumbers, setSoldSerialNumbers] = useState(loadSoldSerialNumbers)
  const [selectedSale, setSelectedSale] = useState(null)
  const [editingSaleDetails, setEditingSaleDetails] = useState(null)
  const [customerMode, setCustomerMode] = useState('new')
  const [printLanguage, setPrintLanguage] = useState('en')
  const [pendingWhatsAppShare, setPendingWhatsAppShare] = useState(null)
  const [showCloudLogin, setShowCloudLogin] = useState(false)
  const [cloudLogin, setCloudLogin] = useState({ email: 'bodakekiran63@gmail.com', password: '' })
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudError, setCloudError] = useState('')

  const [paymentSale, setPaymentSale] = useState(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)

  // One barcode scan fills both Model and Serial Number.
  const [scannerField, setScannerField] = useState(null)
  const [scannerError, setScannerError] = useState('')
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanRafRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales))
  }, [sales])

  useEffect(() => {
    const refreshGstRates = () => setGstRateOptions(getGstSettings().rates)
    window.addEventListener('kalyankar-gst-settings-changed', refreshGstRates)
    window.addEventListener('storage', refreshGstRates)
    return () => {
      window.removeEventListener('kalyankar-gst-settings-changed', refreshGstRates)
      window.removeEventListener('storage', refreshGstRates)
    }
  }, [])

  useEffect(() => {
    const refreshBrands = () => setAvailableBrands(loadSalesBrands())
    window.addEventListener('focus', refreshBrands)
    window.addEventListener('storage', refreshBrands)
    return () => {
      window.removeEventListener('focus', refreshBrands)
      window.removeEventListener('storage', refreshBrands)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  async function startScanner(field, deviceId = '') {
    setScannerError('')

    if (!('BarcodeDetector' in window)) {
      alert('Barcode scanning is not supported on this browser/device. Please type the value in manually.')
      return
    }

    try {
      if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setScannerField(field)
      const activeCameraId = stream.getVideoTracks()[0]?.getSettings().deviceId || deviceId
      setSelectedCameraId(activeCameraId || '')
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCameraDevices(devices.filter((device) => device.kind === 'videoinput'))

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

  function changeScannerCamera(event) {
    const deviceId = event.target.value
    setSelectedCameraId(deviceId)
    startScanner(scannerField, deviceId)
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
          const battery = resolveBatteryScan(value, stockProducts)
          const needsSerial = form.saleType !== 'Exchange'
          if (!battery.model || (needsSerial && !battery.serialNumber)) {
            setScannerError('This QR/barcode does not contain both values and could not be matched with available stock. Add this serial number to Product Stock first, or enter the values manually.')
            scanRafRef.current = requestAnimationFrame(scan)
            return
          }
          setForm((previous) => ({
            ...previous,
            model: battery.model.toUpperCase(),
            serialNumber: previous.saleType === 'Exchange' ? '' : battery.serialNumber,
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

  const modelSuggestions = useMemo(() => {
    const selectedBrand = form.brand.trim().toUpperCase()
    return [...new Set(stockModels
      .filter((model) => !selectedBrand || String(model.brand || '').toUpperCase() === selectedBrand)
      .map((model) => String(model.name || '').trim().toUpperCase())
      .filter(Boolean))].sort()
  }, [stockModels, form.brand])

  const serialSuggestions = useMemo(() => {
    const selectedBrand = form.brand.trim().toUpperCase()
    const selectedModel = form.model.trim().toUpperCase()
    return stockProducts
      .filter((product) => (!selectedBrand || String(product.brand || '').toUpperCase() === selectedBrand)
        && (!selectedModel || String(product.model || '').toUpperCase() === selectedModel)
        && !soldSerialNumbers.has(String(product.serialNo || '').toUpperCase()))
      .map((product) => String(product.serialNo || '').trim().toUpperCase())
      .filter(Boolean)
      .sort()
  }, [stockProducts, soldSerialNumbers, form.brand, form.model])

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
    const subtotal =
      totalGstRate > 0
        ? enteredTotal / (1 + totalGstRate / 100)
        : enteredTotal

    const discountPercent = form.saleType === 'Regular'
      ? Math.min(99.99, Math.max(0, Number(form.discount || 0)))
      : 0
    const qty = form.saleType === 'Regular' ? Math.max(1, Number(form.qty || 1)) : 1
    const discount = subtotal * (discountPercent / 100)
    const taxableAmount = subtotal - discount
    const cgstAmount = taxableAmount * (cgstRate / 100)
    const sgstAmount = taxableAmount * (sgstRate / 100)
    const grandTotal = taxableAmount + cgstAmount + sgstAmount
    const paidAmount = Math.min(grandTotal, Math.max(0, Number(form.paidAmount || 0)))
    const dueAmount = Math.max(0, grandTotal - paidAmount)
    const unitPrice = subtotal / qty

    return {
      enteredTotal,
      subtotal,
      unitPrice,
      discount,
      discountPercent,
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

  function makeCurrentItem() {
    return {
      brand: form.brand, batteryType: form.batteryType, model: form.model.trim(),
      serialNumber: form.serialNumber.trim().toUpperCase(), hsn: form.hsn.trim(), qty: Number(form.qty || 1),
      unitPrice: priceSummary.unitPrice, discount: priceSummary.discount, discountPercent: priceSummary.discountPercent,
      taxableAmount: priceSummary.taxableAmount,
      cgstRate: priceSummary.cgstRate, sgstRate: priceSummary.sgstRate,
      cgstAmount: priceSummary.cgstAmount, sgstAmount: priceSummary.sgstAmount, grandTotal: priceSummary.grandTotal,
      warrantyPeriod: form.warrantyPeriod, totalWarranty: form.totalWarranty, warrantyType: form.warrantyType.trim(),
      vehicleName: form.vehicleName.trim(), vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
    }
  }

  function validateBattery() {
    if (!form.brand) return alert('Please select battery brand.'), false
    if (!form.batteryType) return alert('Please select battery type.'), false
    if (!form.model.trim()) return alert('Please enter battery model.'), false
    if (!form.serialNumber.trim()) return alert('Please enter battery serial number.'), false
    const serial = form.serialNumber.trim().toUpperCase()
    if (soldSerialNumbers.has(serial)) return alert('This serial number has already been sold and cannot be used again.'), false
    if (invoiceItems.some((item) => item.serialNumber === serial)) return alert('This serial number is already added to the current bill.'), false
    if (!form.hsn.trim()) return alert('Please enter HSN number.'), false
    if (form.warrantyDigits.length !== 4) return alert('Please enter four warranty digits, for example 4518 for 45F + 18P.'), false
    if (Number(form.discount || 0) < 0 || Number(form.discount || 0) >= 100) return alert('Discount percentage must be between 0 and 99.99.'), false
    if (priceSummary.grandTotal <= 0) return alert('Please enter a valid total amount.'), false
    return true
  }

  const currentItemComplete = form.saleType === 'Regular' && Boolean(
    form.brand && form.batteryType && form.model.trim() && form.serialNumber.trim() && form.hsn.trim() &&
    form.warrantyDigits.length === 4 && priceSummary.grandTotal > 0
  )
  const billItems = currentItemComplete ? [...invoiceItems, makeCurrentItem()] : invoiceItems
  const billTotals = billItems.reduce((sum, item) => ({
    taxable: sum.taxable + Number(item.taxableAmount || 0), cgst: sum.cgst + Number(item.cgstAmount || 0),
    sgst: sum.sgst + Number(item.sgstAmount || 0), total: sum.total + Number(item.grandTotal || 0),
    discount: sum.discount + Number(item.discount || 0),
  }), { taxable: 0, cgst: 0, sgst: 0, total: 0, discount: 0 })
  const billGrandTotal = form.saleType === 'Regular' && billItems.length ? billTotals.total : priceSummary.grandTotal
  const billPaid = Math.min(billGrandTotal, Math.max(0, Number(form.paidAmount || 0)))
  const billDue = Math.max(0, billGrandTotal - billPaid)

  function addBattery() {
    if (form.saleType !== 'Regular' || !validateBattery()) return
    setInvoiceItems((items) => [...items, makeCurrentItem()])
    setForm((previous) => ({ ...previous, batteryType: '', model: '', serialNumber: '', qty: 1,
      totalAmount: '', discount: 0, warrantyDigits: '', warrantyPeriod: '', totalWarranty: 0,
      warrantyType: '', vehicleName: '', vehicleNumber: '' }))
  }

  function removeBattery(index) {
    setInvoiceItems((items) => items.filter((_, itemIndex) => itemIndex !== index))
  }


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
    if (type === 'Exchange') setInvoiceItems([])
    setForm((previous) => ({
      ...previous,
      saleType: type,
      serialNumber: type === 'Exchange' ? '' : previous.serialNumber,
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

  function openEditSaleDetails(sale) {
    setEditingSaleDetails({
      id: sale.id,
      invoice: sale.invoice,
      customer: sale.customer || '',
      phone: sale.phone || '',
      address: sale.address || '',
      gstNumber: sale.gstNumber || '',
      vehicleName: sale.vehicleName || '',
      vehicleNumber: sale.vehicleNumber || '',
    })
  }

  function saveEditedSaleDetails(event) {
    event.preventDefault()
    if (!editingSaleDetails) return
    if (!editingSaleDetails.customer.trim()) return alert('Please enter customer name.')
    if (!isValidIndianPhone(editingSaleDetails.phone)) return alert('Please enter a valid 10-digit customer phone number.')
    const matches = (sale) => editingSaleDetails.id != null ? sale.id === editingSaleDetails.id : sale.invoice === editingSaleDetails.invoice
    const changes = {
      customer: editingSaleDetails.customer.trim(),
      phone: formatIndianPhone(editingSaleDetails.phone),
      address: editingSaleDetails.address.trim(),
      gstNumber: editingSaleDetails.gstNumber.trim().toUpperCase(),
      vehicleName: editingSaleDetails.vehicleName.trim(),
      vehicleNumber: editingSaleDetails.vehicleNumber.trim().toUpperCase(),
    }
    setSales((rows) => rows.map((sale) => matches(sale) ? { ...sale, ...changes } : sale))
    setSelectedSale((sale) => sale && matches(sale) ? { ...sale, ...changes } : sale)
    const modalElement = document.getElementById('editSaleDetailsModal')
    if (modalElement && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(modalElement).hide()
    setEditingSaleDetails(null)
  }

  function resetForm() {
    setForm(createEmptyForm(nextInvoiceSeq))
    setInvoiceItems([])
    setCustomerMode(customers.length > 0 ? 'existing' : 'new')
  }

  function completeSaleWorkflow(sale) {
    const invoiceDate = String(sale.invoiceDate || new Date().toLocaleDateString('en-CA')).slice(0, 10)
    const fileName = `${safeFilePart(sale.customer)}_${invoiceDate}.pdf`
    const printHtml = renderInvoiceHTML(savedSalePrintFields(sale), printLanguage || 'en')
    const shareHtml = renderInvoiceHTML(savedSalePrintFields(sale), printLanguage || 'en', { copies: 1 })
    openPrintWindow(printHtml)
    downloadInvoicePdf(shareHtml, fileName)
      .then((file) => {
        setPendingWhatsAppShare({ file, sale })
        const createdAt = Date.now()
        localStorage.setItem('kalyankar-system-notifications', JSON.stringify([{
          id: `sale-invoice-${createdAt}`,
          message: `${sale.customer} invoice PDF saved and is ready to share on WhatsApp.`,
          messageMr: `${sale.customer} यांची बिल PDF जतन झाली. प्रिंट आणि व्हाट्सअँप उघडले.`,
          icon: 'fa-file-circle-check', color: 'success', path: '/sales',
        }]))
        window.dispatchEvent(new Event('kalyankar-notifications-changed'))
      })
      .catch(() => alert('Sale saved, but the invoice PDF could not be downloaded. Please use Print Invoice.'))
  }

  async function sharePendingInvoice() {
    if (!pendingWhatsAppShare) return
    const whatsappWindow = window.open('about:blank', '_blank')
    if (!whatsappWindow) return alert('Please allow pop-ups for this site to open WhatsApp in a new tab.')
    setCloudError('')
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      if (whatsappWindow) whatsappWindow.close()
      setShowCloudLogin(true)
      return
    }
    await uploadInvoiceAndOpenWhatsApp(whatsappWindow)
  }

  async function uploadInvoiceAndOpenWhatsApp(openedWindow = null) {
    if (!pendingWhatsAppShare || cloudBusy) return
    const whatsappWindow = openedWindow || window.open('about:blank', '_blank')
    if (!whatsappWindow) return alert('Please allow pop-ups for this site to open WhatsApp in a new tab.')
    const { file, sale } = pendingWhatsAppShare
    setCloudBusy(true)
    setCloudError('')
    try {
      const year = String(sale.invoiceDate || sale.date || new Date().getFullYear()).slice(0, 4)
      const objectPath = `${year}/${Date.now()}-${safeFilePart(sale.customer)}-${safeFilePart(sale.invoice || 'invoice')}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(objectPath, file, { contentType: 'application/pdf', upsert: false })
      if (uploadError) throw uploadError

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
      let shortCode = ''
      let shortLinkError = null
      for (let attempt = 0; attempt < 4; attempt += 1) {
        shortCode = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => alphabet[byte % alphabet.length]).join('')
        const { error } = await supabase.from('invoice_links').insert({
          code: shortCode,
          object_path: objectPath,
          expires_at: expiresAt,
        })
        if (!error) {
          shortLinkError = null
          break
        }
        shortLinkError = error
        if (error.code !== '23505') break
      }
      if (shortLinkError) throw shortLinkError
      const invoiceLink = `${INVOICE_SHORT_LINK_BASE}/${shortCode}`

      let digits = String(sale.phone || '').replace(/\D/g, '')
      if (digits.length === 10) digits = `91${digits}`
      else if (digits.startsWith('0') && digits.length === 11) digits = `91${digits.slice(1)}`
      const message = printLanguage === 'mr'
        ? `नमस्कार ${sale.customer || 'ग्राहक'},\n\nKalyankar Batteries कडून आपले बिल पाठवत आहोत.\nआपले PDF बिल पाहण्यासाठी खालील सुरक्षित लिंक उघडा:\n${invoiceLink}\n\nही लिंक ७ दिवसांसाठी उपलब्ध आहे.\nधन्यवाद! 🙏\nKalyankar Batteries, Gargoti`
        : `Hello ${sale.customer || 'Customer'},\n\nYour Kalyankar Batteries invoice is ready. Open the secure PDF link below:\n${invoiceLink}\n\nThis link is available for 7 days.\nThank you!\nKalyankar Batteries, Gargoti`
      const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      whatsappWindow.opener = null
      whatsappWindow.location.replace(whatsappUrl)
      setPendingWhatsAppShare(null)
      setShowCloudLogin(false)
    } catch (error) {
      if (whatsappWindow) whatsappWindow.close()
      setCloudError(error?.message || 'PDF upload failed. Please try again.')
    } finally {
      setCloudBusy(false)
    }
  }

  async function loginAndShareInvoice(event) {
    event.preventDefault()
    const whatsappWindow = window.open('about:blank', '_blank')
    if (!whatsappWindow) return setCloudError('Please allow pop-ups for this site to open WhatsApp in a new tab.')
    setCloudBusy(true)
    setCloudError('')
    const { error } = await supabase.auth.signInWithPassword(cloudLogin)
    setCloudBusy(false)
    if (error) {
      if (whatsappWindow) whatsappWindow.close()
      setCloudError('Login failed. Please check your Supabase email and password.')
      return
    }
    setShowCloudLogin(false)
    await uploadInvoiceAndOpenWhatsApp(whatsappWindow)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.invoice.trim()) return alert('Please enter invoice number.')
    if (!form.customer.trim()) return alert('Please enter customer name.')
    if (!isValidIndianPhone(form.phone)) return alert('Please enter a valid 10-digit customer phone number.')
    if (!form.address.trim()) return alert('Please enter customer address.')
    const currentStarted = Boolean(form.model.trim() || form.serialNumber.trim() || form.totalAmount)
    if (form.saleType === 'Regular') {
      if (currentStarted && !validateBattery()) return
      if (!currentStarted && invoiceItems.length === 0) return alert('Please enter at least one battery.')
    } else {
      if (!form.brand) return alert('Please select battery brand.')
      if (!form.batteryType) return alert('Please select battery type.')
      if (!form.model.trim()) return alert('Please enter battery model.')
      if (!form.hsn.trim()) return alert('Please enter HSN number.')
    }
    if (form.saleType === 'Exchange' && (!form.oldBatteryWeight || Number(form.oldBatteryWeight) <= 0)) {
      return alert('Please enter a valid old battery weight in Kg.')
    }
    if (form.paidAmount === '') return alert('Please enter the paid amount.')
    if (!form.paymentMethod) return alert('Please select a payment method.')
    if (billGrandTotal <= 0) {
      return alert(form.saleType === 'Exchange'
        ? 'Please enter a valid old battery total including GST.'
        : 'Please enter a valid total amount.')
    }
    if (Number(form.paidAmount || 0) < 0) {
      return alert('Paid amount cannot be negative.')
    }
    if (Number(form.paidAmount || 0) > billGrandTotal) {
      return alert('Paid amount cannot be greater than the final payable amount.')
    }
    if (Number(form.cgstRate) < 0 || Number(form.sgstRate) < 0) {
      return alert('GST rate cannot be negative.')
    }
    if (Number(form.discount || 0) < 0 || Number(form.discount || 0) >= 100) {
      return alert('Discount percentage must be between 0 and 99.99.')
    }

    const saleDate = todayLabel()
    const saleItems = form.saleType === 'Regular' ? billItems : []
    const firstItem = saleItems[0]
    const saleSerials = saleItems.map((item) => String(item.serialNumber || '').trim().toUpperCase()).filter(Boolean)
    if (new Set(saleSerials).size !== saleSerials.length) return alert('The same serial number cannot be added more than once.')
    if (saleSerials.some((serial) => soldSerialNumbers.has(serial))) return alert('One or more serial numbers have already been sold. Please select available serial numbers.')

    const newSale = {
      id: Date.now(),
      invoice: form.invoice.trim(),
      invoiceDate: form.invoiceDate,
      salesPerson: form.salesPerson,

      customer: form.customer.trim(),
      phone: formatIndianPhone(form.phone),
      address: form.address.trim(),
      gstNumber: form.gstNumber.trim(),

      vehicleName: firstItem?.vehicleName || form.vehicleName.trim(),
      vehicleNumber: firstItem?.vehicleNumber || form.vehicleNumber.trim().toUpperCase(),

      saleType: form.saleType,
      exchange:
        form.saleType === 'Exchange'
          ? {
              brand: form.brand,
              batteryType: form.batteryType,
              model: form.model.trim(),
              serialNumber: '',
              weight: Number(form.oldBatteryWeight || 0),
              value: priceSummary.grandTotal,
            }
          : null,

      brand: firstItem?.brand || form.brand,
      batteryType: firstItem?.batteryType || form.batteryType,
      model: firstItem?.model || form.model.trim(),
      serialNumber: form.saleType === 'Exchange' ? '' : (firstItem?.serialNumber || form.serialNumber.trim().toUpperCase()),
      hsn: firstItem?.hsn || form.hsn.trim(),
      oldBatteryWeight: form.saleType === 'Exchange' ? Number(form.oldBatteryWeight || 0) : 0,
      product: `${firstItem?.brand || form.brand} ${firstItem?.model || form.model.trim()}`,
      qty: firstItem?.qty || Number(form.qty || 1), unitPrice: firstItem?.unitPrice || priceSummary.unitPrice,
      batteryPrice: form.saleType === 'Regular' ? billTotals.taxable : priceSummary.taxableAmount,
      discount: form.saleType === 'Regular' ? billTotals.discount : 0,
      discountPercent: form.saleType === 'Regular' ? (firstItem?.discountPercent ?? priceSummary.discountPercent) : 0,
      items: saleItems,

      warrantyPeriod: form.saleType === 'Regular' ? firstItem?.warrantyPeriod : '',
      totalWarranty: form.saleType === 'Regular' ? firstItem?.totalWarranty : 0,
      warrantyType: form.saleType === 'Regular' ? firstItem?.warrantyType : '',

      cgstRate: priceSummary.cgstRate,
      sgstRate: priceSummary.sgstRate,
      cgstAmount: form.saleType === 'Regular' ? billTotals.cgst : priceSummary.cgstAmount,
      sgstAmount: form.saleType === 'Regular' ? billTotals.sgst : priceSummary.sgstAmount,

      paymentMethod: form.paymentMethod,
      paidAmount: billPaid, dueAmount: billDue,
      notes: form.notes.trim(),
      amount: billGrandTotal,
      date: saleDate,
      status: billDue > 0 ? 'Due' : 'Paid',

      // Log of every payment made against this sale (initial + later due settlements)
      paymentHistory:
        billPaid > 0
          ? [
              {
                amount: billPaid,
                date: saleDate,
                method: form.paymentMethod,
              },
            ]
          : [],
    }

    setSales((previous) => [newSale, ...previous])
    if (saleSerials.length > 0) {
      const soldNow = new Set(saleSerials)
      const remainingStock = loadStoredList(PRODUCT_STOCK_STORAGE_KEY)
        .filter((product) => !soldNow.has(String(product.serialNo || '').toUpperCase()))
      const updatedSoldSerials = new Set([...soldSerialNumbers, ...saleSerials])
      localStorage.setItem(PRODUCT_STOCK_STORAGE_KEY, JSON.stringify(remainingStock))
      localStorage.setItem(SOLD_SERIALS_STORAGE_KEY, JSON.stringify([...updatedSoldSerials]))
      setStockProducts(remainingStock)
      setSoldSerialNumbers(updatedSoldSerials)
    }
    setNextInvoiceSeq((previous) => previous + 1)
    setActiveTab(newSale.saleType === 'Exchange' ? 'exchange' : 'regular')
    completeSaleWorkflow(newSale)

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
    const currentStarted = Boolean(form.model.trim() || form.serialNumber.trim() || form.totalAmount)
    if (form.saleType === 'Regular') {
      if (currentStarted && !validateBattery()) return
      if (!currentStarted && invoiceItems.length === 0) return alert('Please enter at least one battery.')
    }
    const printItems = form.saleType === 'Regular' ? billItems : []
    const firstItem = printItems[0]
    // The form hasn't been saved yet, so there's no stored payment history.
    // If an amount has been entered as "paid" in the form, show it as a
    // single payment entry dated today, so the print preview matches what
    // will actually be saved.
    const previewPaymentHistory =
      billPaid > 0
        ? [
            {
              amount: billPaid,
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
      phone: formatIndianPhone(form.phone),
      address: form.address,
      gstNumber: form.gstNumber,
      vehicleName: firstItem?.vehicleName || form.vehicleName,
      vehicleNumber: firstItem?.vehicleNumber || form.vehicleNumber,
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
      brand: firstItem?.brand || form.brand, batteryType: firstItem?.batteryType || form.batteryType,
      model: firstItem?.model || form.model, serialNumber: firstItem?.serialNumber || form.serialNumber,
      hsn: firstItem?.hsn || form.hsn,
      oldBatteryWeight: Number(form.oldBatteryWeight || 0),
      qty: firstItem?.qty || Number(form.qty || 1), unitPrice: firstItem?.unitPrice || priceSummary.unitPrice,
      discount: firstItem?.discount ?? priceSummary.discount,
      discountPercent: firstItem?.discountPercent ?? priceSummary.discountPercent,
      taxableAmount: form.saleType === 'Regular' ? billTotals.taxable : priceSummary.taxableAmount,
      cgstRate: priceSummary.cgstRate,
      sgstRate: priceSummary.sgstRate,
      cgstAmount: form.saleType === 'Regular' ? billTotals.cgst : priceSummary.cgstAmount,
      sgstAmount: form.saleType === 'Regular' ? billTotals.sgst : priceSummary.sgstAmount,
      grandTotal: billGrandTotal, paidAmount: billPaid, dueAmount: billDue,
      status: billDue > 0 ? 'Due' : 'Paid',
      warrantyPeriod: firstItem?.warrantyPeriod || form.warrantyPeriod,
      totalWarranty: firstItem?.totalWarranty || form.totalWarranty,
      warrantyType: firstItem?.warrantyType || form.warrantyType,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      paymentHistory: previewPaymentHistory,
      items: printItems,
    }
    openPrintWindow(renderInvoiceHTML(fields, printLanguage || 'en'))
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
      hsn: sale.hsn || '',
      oldBatteryWeight: sale.oldBatteryWeight || sale.exchange?.weight || 0,
      qty: sale.qty,
      unitPrice: sale.unitPrice,
      discount: sale.discount,
      discountPercent: sale.discountPercent,
      taxableAmount: sale.batteryPrice ?? (Number(sale.amount || 0) / (1 + getGstSettings().totalRate / 100)),
      cgstRate: sale.cgstRate ?? getGstSettings().cgstRate,
      sgstRate: sale.sgstRate ?? getGstSettings().sgstRate,
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
      items: sale.items || [],
    }
    openPrintWindow(renderInvoiceHTML(fields, printLanguage || 'en'))
  }

  async function shareSavedInvoiceOnWhatsApp(sale) {
    if (!sale) return
    const phoneDigits = String(sale.phone || '').replace(/\D/g, '')
    if (phoneDigits.length < 10) return alert('Please add a valid customer WhatsApp number before sharing this invoice.')
    const invoiceDate = String(sale.invoiceDate || sale.date || new Date().toLocaleDateString('en-CA')).slice(0, 10)
    const fileName = `${safeFilePart(sale.customer)}_${invoiceDate}.pdf`
    const shareHtml = renderInvoiceHTML(savedSalePrintFields(sale), printLanguage || 'en', { copies: 1 })
    try {
      const file = await downloadInvoicePdf(shareHtml, fileName)
      setPendingWhatsAppShare({ file, sale })
    } catch {
      alert('The invoice PDF could not be prepared. Please try again.')
    }
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
              {!isExchange && <th>Serial No.</th>}
              <th>HSN</th>
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

                {!isExchange && <td>{sale.serialNumber || '—'}</td>}
                <td>{sale.hsn || '—'}</td>
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
                      className="btn btn-sm btn-outline-secondary"
                      data-bs-toggle="modal"
                      data-bs-target="#editSaleDetailsModal"
                      onClick={() => openEditSaleDetails(sale)}
                      title="Edit customer details"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => shareSavedInvoiceOnWhatsApp(sale)}
                      title={`Share invoice with ${sale.customer || 'customer'} on WhatsApp`}
                    >
                      <i className="fa-brands fa-whatsapp"></i>
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
        input[type='number'] { appearance: textfield; -moz-appearance: textfield; }
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

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
        .scanner-camera-choice { padding: 12px 16px; background: #fff; border-top: 1px solid #e5eaf2; }
        .scanner-camera-choice label { display: block; margin-bottom: 5px; color: #26344c; font-size: 11px; font-weight: 800; }
        .scanner-camera-choice select { width: 100%; padding: 8px 10px; color: #17213a; background: #fff; border: 1px solid #d8dfeb; border-radius: 7px; font-size: 12px; }

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

        .add-battery-btn { margin-top: 14px; background: #1769e8; color: #fff; font-weight: 700; }
        .add-battery-btn:hover { background: #1258c7; color: #fff; }
        .added-batteries-list { margin-top: 14px; border: 1px solid #dbe4f0; border-radius: 10px; overflow: hidden; }
        .added-batteries-heading { padding: 9px 12px; background: #f3f7fc; color: #24334d; font-size: 12px; font-weight: 700; }
        .added-battery-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 10px 12px; border-top: 1px solid #e7edf5; }
        .added-battery-row span { min-width: 0; }
        .added-battery-row small { display: block; color: #6c788b; margin-top: 2px; }
        .added-battery-row button { border: 0; background: #fff0f0; color: #c53434; width: 32px; height: 32px; border-radius: 7px; }

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
              Old Battery purchase
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
                          required={invoiceItems.length === 0}
                          value={form.brand}
                          onChange={(event) => updateForm('brand', event.target.value)}
                        >
                          <option value="">Select Brand</option>
                          {availableBrands.map((brand) => (
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
                          required={invoiceItems.length === 0}
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

                    <hr className="my-3" />

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="invoice-label">
                          {form.saleType === 'Exchange' ? 'Old Battery Model' : 'Model'} <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          placeholder="Example: EXIDE MLDIN60"
                          list={form.saleType === 'Regular' ? 'sales-model-options' : undefined}
                          required={invoiceItems.length === 0}
                          value={form.model}
                          onChange={(event) => setForm((previous) => ({ ...previous, model: event.target.value.toUpperCase(), serialNumber: '' }))}
                        />
                        {form.saleType === 'Regular' && (
                          <datalist id="sales-model-options">
                            {modelSuggestions.map((model) => <option key={model} value={model} />)}
                          </datalist>
                        )}
                      </div>

                      {form.saleType !== 'Exchange' && (
                        <div className="col-md-6">
                          <label className="invoice-label">
                            Serial Number <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            placeholder="e.g. M6L5G234778"
                            list="sales-serial-options"
                            required={invoiceItems.length === 0}
                            value={form.serialNumber}
                            onChange={(event) => updateForm('serialNumber', event.target.value.toUpperCase())}
                          />
                          <datalist id="sales-serial-options">
                            {serialSuggestions.map((serial) => <option key={serial} value={serial} />)}
                          </datalist>
                        </div>
                      )}

                      <div className="col-md-4">
                        <label className="invoice-label">
                          HSN Number <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control invoice-input"
                          placeholder="Enter HSN code, e.g. 8507"
                          required={invoiceItems.length === 0}
                          value={form.hsn}
                          onChange={(event) => updateForm('hsn', event.target.value.replace(/\D/g, ''))}
                        />
                      </div>

                      <div className="col-md-12">
                        <button
                          type="button"
                          className="btn scan-btn w-100"
                          onClick={() => startScanner('battery')}
                          title={form.saleType === 'Exchange' ? 'Scan QR or barcode to fill model' : 'Scan QR or barcode to fill model and serial number'}
                        >
                          <i className="fa-solid fa-barcode me-2"></i>
                          {form.saleType === 'Exchange' ? 'Scan QR / Barcode for Model' : 'Scan QR / Barcode — Fill Model & Serial Number'}
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
                            required={invoiceItems.length === 0}
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
                          required={invoiceItems.length === 0}
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
                        <label className="invoice-label">Discount (%)</label>
                        <div className="gst-rate-input-group">
                          <input
                            type="number"
                            className="form-control invoice-input"
                            min="0"
                            max="99.99"
                            step="0.01"
                            value={form.discount}
                            onChange={(event) => updateForm('discount', event.target.value)}
                          />
                          <span>%</span>
                        </div>
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
                            readOnly
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
                            readOnly
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <div className="col-md-12">
                        <label className="invoice-label">Total GST</label>
                        <select
                          className="form-select invoice-input"
                          value={Number(form.cgstRate || 0) + Number(form.sgstRate || 0)}
                          onChange={(event) => {
                            const totalRate = Number(event.target.value)
                            setForm((previous) => ({ ...previous, cgstRate: totalRate / 2, sgstRate: totalRate / 2 }))
                          }}
                        >
                          {gstRateOptions.map((rate) => <option key={rate} value={rate}>{rate}% (CGST {rate / 2}% + SGST {rate / 2}%)</option>)}
                        </select>
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
                          required={invoiceItems.length === 0}
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

                        {invoiceItems.length > 0 && (
                          <div className="added-batteries-list">
                            <div className="added-batteries-heading">Added Batteries ({invoiceItems.length})</div>
                            {invoiceItems.map((item, index) => (
                              <div className="added-battery-row" key={`${item.serialNumber}-${index}`}>
                                <span>
                                  <strong>{index + 1}. {item.brand} {item.model}</strong>
                                  <small>{item.serialNumber} · {item.vehicleName || 'No vehicle'} {item.vehicleNumber}</small>
                                </span>
                                <strong>₹ {formatCurrency(item.grandTotal)}</strong>
                                <button type="button" onClick={() => removeBattery(index)} aria-label={`Remove ${item.brand} ${item.model}`}>
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button type="button" className="btn add-battery-btn w-100" onClick={addBattery}>
                          <i className="fa-solid fa-plus me-2"></i>
                          Add Battery
                        </button>

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
                            value={formatCurrency(billDue)}
                            readOnly
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="invoice-label">Payment Status</label>
                          <input
                            type="text"
                            className="form-control invoice-input"
                            value={billDue > 0 ? 'Due' : 'Paid'}
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
                      <strong>₹ {formatCurrency(billItems.length ? billTotals.taxable + billTotals.discount : priceSummary.subtotal)}</strong>
                    </div>

                    {form.saleType === 'Regular' && <div className="price-summary-row">
                      <span>Discount ({billItems.length > 1 ? 'item-wise' : `${billItems[0]?.discountPercent ?? priceSummary.discountPercent}%`})</span>
                      <strong>− ₹ {formatCurrency(billItems.length ? billTotals.discount : priceSummary.discount)}</strong>
                    </div>}

                    <div className="price-summary-row">
                      <span>{form.saleType === 'Exchange' ? 'Old Battery Total Including GST' : 'Battery Total'}</span>
                      <strong>₹ {formatCurrency(billGrandTotal)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>Taxable Amount</span>
                      <strong>₹ {formatCurrency(billItems.length ? billTotals.taxable : priceSummary.taxableAmount)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>CGST ({priceSummary.cgstRate}%)</span>
                      <strong>+ ₹ {formatCurrency(billItems.length ? billTotals.cgst : priceSummary.cgstAmount)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>SGST ({priceSummary.sgstRate}%)</span>
                      <strong>+ ₹ {formatCurrency(billItems.length ? billTotals.sgst : priceSummary.sgstAmount)}</strong>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="grand-total-row">
                      <span>Grand Total</span>
                      <strong>₹ {formatCurrency(billGrandTotal)}</strong>
                    </div>

                    <div className="price-summary-row mt-3">
                      <span>Paid Amount</span>
                      <strong className="text-success">₹ {formatCurrency(billPaid)}</strong>
                    </div>

                    <div className="price-summary-row">
                      <span>Due Amount</span>
                      <strong className={billDue > 0 ? 'text-danger' : 'text-success'}>
                        ₹ {formatCurrency(billDue)}
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
                <select
                  className="form-select invoice-select w-auto"
                  aria-label="Language"
                  value={printLanguage}
                  onChange={(event) => setPrintLanguage(event.target.value)}
                >
                  <option value="en">English</option>
                  <option value="mr">Marathi</option>
                </select>
                <button type="button" className="btn btn-outline-primary" onClick={printFormInvoice}>
                  <i className="fa-solid fa-print me-2"></i>
                  Print Preview
                </button>
                <button type="submit" className="btn btn-primary px-4">
                  <i className="fa-solid fa-check me-2"></i>
                  Save, Print &amp; WhatsApp
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
                      {selectedSale.saleType !== 'Exchange' && (
                        <div className="view-detail-row"><span>Serial Number</span><strong>{selectedSale.serialNumber || '—'}</strong></div>
                      )}
                      <div className="view-detail-row"><span>HSN Number</span><strong>{selectedSale.hsn || '—'}</strong></div>
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
                      {selectedSale.saleType === 'Regular' && <div className="view-detail-row"><span>Discount</span><strong>{selectedSale.discountPercent != null ? `${formatCurrency(selectedSale.discountPercent)}% (₹ ${formatCurrency(selectedSale.discount)})` : `₹ ${formatCurrency(selectedSale.discount)}`}</strong></div>}
                      <div className="view-detail-row"><span>{selectedSale.saleType === 'Exchange' ? 'Old Battery Price Before GST' : 'Battery Price Before GST'}</span><strong>₹ {formatCurrency(selectedSale.batteryPrice ?? (Number(selectedSale.amount || 0) / (1 + getGstSettings().totalRate / 100)))}</strong></div>
                      <div className="view-detail-row"><span>CGST</span><strong>{selectedSale.cgstRate ?? getGstSettings().cgstRate}% — ₹ {formatCurrency(selectedSale.cgstAmount ?? 0)}</strong></div>
                      <div className="view-detail-row"><span>SGST</span><strong>{selectedSale.sgstRate ?? getGstSettings().sgstRate}% — ₹ {formatCurrency(selectedSale.sgstAmount ?? 0)}</strong></div>
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
              <select
                className="form-select invoice-select w-auto"
                aria-label="Language"
                value={printLanguage}
                onChange={(event) => setPrintLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="mr">Marathi</option>
              </select>
              <button type="button" className="btn btn-primary" onClick={() => printSavedInvoice(selectedSale)}>
                <i className="fa-solid fa-print me-2"></i>
                Print Invoice
              </button>
              <button type="button" className="btn btn-success" onClick={() => shareSavedInvoiceOnWhatsApp(selectedSale)}>
                <i className="fa-brands fa-whatsapp me-2"></i>
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <div className="modal fade" id="editSaleDetailsModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 rounded-4">
            <form onSubmit={saveEditedSaleDetails}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-user-pen text-primary me-2"></i>Edit Customer Details</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {editingSaleDetails && <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Customer Name *</label><input className="form-control" required value={editingSaleDetails.customer} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, customer: e.target.value })} /></div>
                  <div className="col-md-6"><label className="form-label">Phone / WhatsApp Number *</label><input className="form-control" required inputMode="numeric" value={editingSaleDetails.phone} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, phone: e.target.value.replace(/[^\d+\s-]/g, '') })} /></div>
                  <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows="2" value={editingSaleDetails.address} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, address: e.target.value })}></textarea></div>
                  <div className="col-md-6"><label className="form-label">Customer GST Number</label><input className="form-control text-uppercase" maxLength="15" value={editingSaleDetails.gstNumber} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, gstNumber: e.target.value })} /></div>
                  <div className="col-md-6"><label className="form-label">Vehicle Name</label><input className="form-control" value={editingSaleDetails.vehicleName} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, vehicleName: e.target.value })} /></div>
                  <div className="col-md-6"><label className="form-label">Vehicle Number</label><input className="form-control text-uppercase" value={editingSaleDetails.vehicleNumber} onChange={(e) => setEditingSaleDetails({ ...editingSaleDetails, vehicleNumber: e.target.value })} /></div>
                </div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-floppy-disk me-2"></i>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>

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

      {pendingWhatsAppShare && (
        <div className="modal d-block" role="dialog" aria-modal="true" style={{ background: 'rgba(0, 0, 0, 0.55)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {printLanguage === 'mr' ? 'इनव्हॉइस PDF तयार आहे' : 'Invoice PDF Ready'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setPendingWhatsAppShare(null)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  <strong>{pendingWhatsAppShare.sale.customer}</strong><br />
                  {pendingWhatsAppShare.file.name}
                </p>
                <p className="d-none">
                  {printLanguage === 'mr'
                    ? 'PDF शेअर करा वर क्लिक करा, व्हाट्सअँप निवडा आणि नंतर ग्राहक निवडा.'
                    : 'Click Share PDF, choose WhatsApp, and then select the customer.'}
                </p>
                <p className="mb-0 text-muted">
                  {printLanguage === 'mr'
                    ? 'सुरक्षित PDF लिंक पाठवा वर क्लिक केल्यावर ग्राहकाचा WhatsApp नंबर आणि संदेश आपोआप उघडेल.'
                    : 'Click Send Secure PDF Link. The saved customer number and message will open automatically in WhatsApp.'}
                </p>
                {showCloudLogin && (
                  <form id="supabaseInvoiceLogin" className="mt-3" onSubmit={loginAndShareInvoice}>
                    <div className="alert alert-info py-2">
                      Sign in once with the Supabase Admin account to upload private invoices securely.
                    </div>
                    <label className="form-label fw-bold">Supabase Admin Email</label>
                    <input
                      type="email"
                      className="form-control mb-2"
                      required
                      value={cloudLogin.email}
                      onChange={(event) => setCloudLogin((previous) => ({ ...previous, email: event.target.value }))}
                    />
                    <label className="form-label fw-bold">Supabase Admin Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      autoFocus
                      value={cloudLogin.password}
                      onChange={(event) => setCloudLogin((previous) => ({ ...previous, password: event.target.value }))}
                    />
                    {cloudError && <div className="alert alert-danger py-2 mt-2 mb-0">{cloudError}</div>}
                    <button type="submit" className="btn btn-primary w-100 mt-3" disabled={cloudBusy}>
                      {cloudBusy ? 'Signing in...' : 'Login & Send PDF Link'}
                    </button>
                  </form>
                )}
                {!showCloudLogin && cloudError && <div className="alert alert-danger py-2 mt-3 mb-0">{cloudError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setPendingWhatsAppShare(null)}>
                  {printLanguage === 'mr' ? 'नंतर' : 'Later'}
                </button>
                <button type="button" className="btn btn-success" onClick={sharePendingInvoice} disabled={cloudBusy || showCloudLogin}>
                  <i className="fa-brands fa-whatsapp me-2"></i>
                  {printLanguage === 'mr' ? 'PDF व्हाट्सअँपवर शेअर करा' : 'Share PDF on WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One barcode scanner fills Model and Serial Number together. */}
      {scannerField && (
        <div className="scanner-overlay">
          <div className="scanner-box">
            <div className="scanner-header">
              <span>Scan Model and Serial Number</span>
              <button type="button" onClick={stopScanner} aria-label="Close scanner">&times;</button>
            </div>
            <video ref={videoRef} className="scanner-video" muted playsInline></video>
            {cameraDevices.length > 1 && <div className="scanner-camera-choice">
              <label htmlFor="sales-scanner-camera">Camera (Optional)</label>
              <select id="sales-scanner-camera" value={selectedCameraId} onChange={changeScannerCamera}>
                {cameraDevices.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}
              </select>
            </div>}
            <div className="scanner-hint">
              Point the camera steadily at the QR code or barcode. Model number and serial number will be filled automatically. You may optionally select a mobile-as-webcam or external camera above.
            </div>
            {scannerError && <div className="alert alert-warning m-3 py-2 small">{scannerError}</div>}
          </div>
        </div>
      )}
    </>
  )
}

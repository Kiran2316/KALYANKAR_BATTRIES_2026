import { useEffect, useRef, useState, useMemo } from 'react'
import Topbar from '../components/Topbar.jsx'
import { Html5Qrcode } from 'html5-qrcode'

// This page lives in src/pages/product_stock.jsx and is routed at /stock — see src/App.jsx
//
// Structure: Brand -> Models -> Serial Numbers
//  - A Brand can have many Models (e.g. "XPLORE FXI0-DIN44").
//  - A Model holds the shared warranty / purchase price / selling price.
//  - Under a Model you add individual battery Serial Numbers, up to 15 at a
//    time (scan or type), and each one becomes a separate stock unit.
// This flow is fully dynamic — it applies automatically to any brand you add,
// including new ones you create later.

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

const warrantyUnits = ['Days', 'Months', 'Years']

const defaultStockBrands = ['AMARON', 'EXIDE', 'SF SONIC', 'TATA GREEN', 'YOKOHAMA', 'BOSCH']

// AMARON dealer catalogue (April 2026). Model names are the part numbers
// printed on the supplied dealer sheet. These are pre-loaded as AMARON
// models below — price/warranty default to 0 and can be filled in per
// model whenever you like (no separate "edit" UI yet, so for now re-enter
// them by deleting and re-adding the model if a value needs to change).
const amaronPartNumbers = [
  'AAM-PR-0055B24LS',
  'AAM-PR-574102069(DIN 74)',
  'AAM-PR-600109087(DIN 100)',
  'AAM-PR-0BH80D31L',
  'AAM-DR-EFB60B20L',
  'AAM-DR-EFB80B24L',
  'AAM-DR-EFBDIN47R',
  'AAM-ID-AGMDIN50L',
  'AAM-DR-EFBDIN70L',
  'AAM-DR-EF100D23R',
  'AAM-FL-545106036 (DIN 45)',
  'AAM-FL-550113042 (DIN 50R)',
  'AAM-FL-550114042 (DIN 50L)',
  'AAM-FL-555112054 (DIN 55L)',
  'AAM-FL-555111054 (DIN 55R)',
  'AAM-FL-565106590 (DIN 65)',
  'AAM-FL-566112060 (DIN66)',
  'AAM-FL-00080D23L',
  'AAM-FL-0BH45D20L',
  'AAM-FL-0BH90D23L',
  'AAM-FL-580112073 (DIN 80)',
  'AMS-FL-565106590',
  'AMS-FL-550114042',
  'AAM-FL-0BH40B20L',
  'AAM-FL-00040B20L',
  'AMS-FL-00040B20L (M)',
  'AAM-FL-00042B20L/R',
  'AAM-GO-00038B20L/R',
  'AAM-GO-0BH38B20R',
  'AAM-HW-HC620D31R',
  'AAM-HW-NT650H29R',
  'AAM-HW-NT800D04R',
  'AAM-HW-NTX00D04R',
  'AAM-HW-HC180D04R',
  'AAM-HW-HCX20H52R',
  'AAM-HW-NT800E41R',
  'AAM-HW-NT700E41R',
  'AAM-HW-NT800F51R',
  'AAM-HR-TR500D31L / R',
  'AAM-HR-NT600H29L / R',
  'AAM-HR-NT600E41L / R',
  'AAM-BL-0BL300 RMF',
  'AAM-BL-0BL400 L/R',
  'AAM-BL-BL00500LS/RS',
  'AAM-BL-0BL700 L/R MF',
  'AAM-BL-0BL600 L/R MF',
  'AAM-BL-0BL800 L/R MF',
  'AAM-BL-BL880D31L/RMF',
  'AAM-BL-0BL900 L/R MF',
  'AAM-BL-BL1000 L/R MF',
  'AAM-BL-BL1300RMF',
  'AAM-BL-BL1500RMF',
  'AAM-GO-00095D26L/R',
  'AAM-GO-00105D31 L/R',
  'AAM-GO-00135D31R',
  'AAM-GO-00050B24L',
  'AAM-GO-00085D23R',
  'AAM-BL-BL0030RMF',
  'AAM-BL-BL0040 L/R',
  'AAM-BL-BL0050 L/R',
  'AAM-BL-BL0060 L/R',
  'AAM-BL-BL0070 L/R',
  'AAM-BL-BL0080 L/R',
  'AAM-BL-BL0090 L/R',
  'AAM-BL-BL090E41 L/R',
  'AAM-BL-BL100E41L / R',
  'AAM-BL-0BL100 L/R',
  'AAM-BL-0BL130 RMF',
  'AAM-BL-0BL150 RMF',
  'AAM-CR-AM130ST36',
  'AAM-CR-AM145ST36',
  'AAM-CR-AM160ST36',
  'AAM-CR-AM180JT48',
  'AAM-CR-AR150TT60',
  'AAM-CR-AM180TT54',
  'AAM-CR-AR200TT60',
  'AAM-CR-AM230TT54',
  'AAM-CR-AM250TT54',
  'AAM-CR-AR150TN54',
  'AAM-HU-HB0001550',
  'AAM-HU-HB01000AP',
  'AAM-HU-HB01200AP',
  'AAM-HU-HB01850AP',
  'AAM-HU-HBP002500',
  'AAM-HU-HBP003500',
  'AAM-HU-HBP004000',
  'AAM-HU-HBP006000',
  'AAM-HU-HB00850AP',
  'AAM-HU-HB01300AP',
  'AAM-HU-HB01600AP',
  'AAM-HU-HE0000850',
  'AAM-HU-HE0001100',
  'AAM-HU-HE0001300',
  'AAM-HU-HE0001750',
  'ABR-PR-12APBTX25',
  'ABR-PR-12APBTX50',
  'ABR-PR-12APBTX7R',
  'ABR-PR-12APBTX90',
  'ABR-PR-APBTZ4L',
  'ABR-PR-APBTZ5L',
  'ABR-PR-APBTZ7L',
  'ABR-PR-APBTZ9R',
  'ABR-PR-HMATZ4L',
  'ABR-PR-HMATZ5L',
  'AAM-BA0A48ATZ6L',
  'AAM-BA-A48ATZ14R',
]

const exidePartNumbers = [
  'IGTT1500L',
  'IGST1500L',
  'IT500',
  'IT750',
  'IT900',
  'IT950',
  'IMST1000',
  'IMST1500',
  'IMTT1500',
  'IMTT1800',
  'IMTT2000',
  'IMTT2300',
  'IMTT2600',
  'IHST1000',
  'IHST1200',
  'IHST1350',
  'IHST1500',
  'IHST1650',
  'IHTT1650',
  'IHTT2000',
  'IHJT2000',
  'IBRST1350',
  'IBRTT1500',
  'IBRTT2000',
  'IBRFP4000',
  'IBRFP4500',
  'IBRFP5000',
  'GQP12V700',
  'GQP12V900',
  'GQP12V1125',
  'GQP12V1450N',
  'GQP24V1625',
  'STAR12V700',
  'STAR12V900',
  'STAR12V1125',
  'STAR12V1375',
  'STAR12V1625',
  'STAR24V1625',
  'STAR24V2550',
  'MAGIC12V800',
  'MAGIC12V875',
  'MAGIC12V1125',
  'MAGIC24V1625',
  '024EXIDEN020',
  '036EXIDEP025M',
  '048EXIDEP035M',
  '048EXIDEP052M',
  '048EXIDEP025M',
  '096EXIDEP052M',
  '120EXIDEP075M',
  '180EXIDEP100',
  '192EXIDE120',
  'GP110D31R',
  'GP115E41L',
  'EPIQ35L/R',
  'EPIQ40LBH',
  'EPIQDIN74L',
  'MT40B20L/R',
  'MTRED45L',
  'MTREDDIN100',
  'MLM42(ISS)',
  'MLN55(ISS)',
  'MLDIN70(ISS)',
  'ML38B20L/R',
  'ML40LBH/RBH',
  'MLDIN44R/LH',
  'ML45D21LBH',
  'ML55B24L(T1)',
  'MLDIN50',
  'ML55D23L',
  'MLDIN55/R',
  'MLDIN60',
  'MLDIN66',
  'ML75D23LBH',
  'ML85D26R',
  'MLDIN80',
  'EYDIN47RMFEFB',
  'EYDIN52RMFEFB',
  'EYDIN78LMFEFB',
  'EY34B19L/R',
  'EY700L/R',
  'EY700F/EY700LF',
  'EY80D23R',
  'EY105D31L/R',
  'RIDE35L/R',
  'RIDE45L',
  'RIDE700L/R',
  'RIDE700LF/RF',
  'EKO32',
  'EKO40L',
  'EKO50L',
  'EKO55L',
  'EKO60L/R',
  'FMS5-DIN70(ISS)',
  'FMS5-M42(ISS)',
  'FMS5-N55(ISS)',
  'XP800',
  'XP800F',
  'XP880',
  'XP1000',
  'XP1000H29R',
  'XP1200',
  'XP1200L(RH)',
  'XP1300',
  'XP1500',
  'XP1800',
  'XP2000',
  'KI75TF',
  'KI80T',
  'KI88TLH',
  'KI88T',
  'KI90H29L',
  'KI99T',
  'DRIVE35L',
  'DRIVE40LBH',
  'DRIVE45L/R',
  'DRIVE700R',
  'DRIVE700RF',
  'DRIVE80L/R',
  'DRIVE80LF/RF',
  'DRIVE88L',
  'DRIVE100L',
  'DRIVE100H29R',
  'DRIVE130R',
  'DRIVE150R',
  'DRIVE180R',
  '12XL2.5L-C',
  'XLTZ4A',
  'XLTZ5A',
  'XLTZ6',
  '12XL5L-B',
  'XLTZ7',
  '12XL7B-B',
  'XLTZ9',
  '12XL9-B',
  'XLTX14',
  '12XL14L-A2',
]

const yokohamaPartNumbers = [
  '36B20R',
  '36B20L',
  '70D26L',
  '38B20R',
  '38B20L',
  '80D26R',
  '80D26L',
  '105D31R',
  '105D31L',
  '115E41L',
  '125E41L',
  '145F51L',
  '195G51L',
  '245H52L',
  'BH40B20L',
  '55B24L',
  '95D23LBH',
  '90D26L',
  '90D26R',
  'DIN45LH',
  'DIN50L',
  'DIN50R',
  'DIN55LH',
  'DIN60L',
  'DIN65LH',
  'DIN66L',
  'DIN70L',
  'DIN80L',
  'DIN100L',
  '2.5LC',
  'MTZ4L',
  'MTZ5LA',
  'MTZ7L',
  'MTZ9R',
  'MTX50',
  'MTX90',
  '60B20L',
  '80B24L',
  '100D23L',
  '110D26L',
  '130D31L',
]

const tataGreenPartNumbers = [
  '36B19L-AM PR',
  '36B20L-AM PR',
  '40B20 R/L PR',
  '80D31R/L',
  '70D26R/L PR',
  '34B19L-(MSIL CO-BRD)',
  '34B20L-(MSIL CO-BRD)',
  'DIN44 R/L',
  'DIN50 R/L',
  'DIN60 R/L',
  'DIN65 L',
  'BH70D23R/L',
  '40B20 R/L PR3028',
  '40B20R/L(BH) PR 3028',
  '55B24LS T1',
  '70D26R/L PR 3028',
  'SLV600R/L',
  'SLV800R/L',
  'SLV900R/L',
  'SLV1000R/L',
  'TG300R/L',
  'TG350R/L',
  'TG400R/L',
  'TG550R/L',
  'TG700R/L',
  'TG800R/L',
  'TG 2.5 D',
  'YTZ4',
  'YTZ4-H HONDA',
  'YTZ5',
  'YT5A',
  'YTZ6 -HONDA',
  'YTZ7',
  'TG7D',
  'TG9D',
  'TGZ9',
  '75D31R/L',
  '95E41R/L',
  '105E41R',
  '135G51',
  '150G51',
  '130F51',
  '180H52',
  'INTT1800',
  'INTT2000',
  'INTT2200',
  'INTT2400',
  'INTT2600',
  'INTT2800',
  'INV100E41L',
  'INV150G1',
  'M-42 ISS',
]

const boschPartNumbers = [
  'F 002 H50 076',
  'F 002 H50 021',
  'F 002 H50 025',
  'F 002 H50 038',
  'F 002 H50 069',
  'F 002 H50 032',
  'F 002 H50 072',
  'F 002 H50 023',
  'F 002 H50 033',
  'F 002 H50 026',
  'F 002 H50 070',
  'F 002 H50 027',
  'F 002 H50 028',
  'F 002 H50 016',
  'F 002 H50 018',
  'F 002 H50 073',
  'F 002 H50 075',
  'F 002 H50 046',
  'F 002 H50 047',
  'F 002 H50 071',
  'F 002 H50 048',
  'F 002 H50 049',
  'F 002 H50 074',
  'F 002 H50 011',
  'F 002 H50 015',
  'F 002 H50 064',
  'F 002 H50 065',
  'F 002 H50 008',
  'F 002 H50 013',
  'F 002 H50 012',
  'F 002 H50 009',
  'F 002 H50 006',
  'F 002 H50 007',
  'F 002 H50 078',
  'F 002 H50 079',
  'F 002 H50 041',
  'F 002 H50 045',
  'F 002 H50 044',
  'F 002 H50 042',
  'F 002 H50 059',
  'F 002 H50 060',
  'F 002 H50 061',
  'F 002 H50 062',
  'F 002 H50 063',
  'F 002 H50 081',
]

const sfSonicPartNumbers = [
  'FTKO-42S-80R',
  'FTKO-42S-88L',
  'FTKO-42S-100R',
  'FTKO-42S-130R',
  'FTKO-42S-150R',
  'FTKO-42S-180R',
  'FTKO-36EWS-80L',
  'FTKO-36EWS-80R',
  'FTKO-36EWS-100R',
  'FTKO-36EWS-100L',
  'FTKO-36EWS-130R',
  'FTKO-36EWS-150R',
  'F2WO-48S-TZ2.5L',
  'F2WO-48S-TZ4',
  'F2WO-48S-TZ4A',
  'F2WO-48S-TZ5',
  'F2WO-48S-TZ7',
  'F2WO-48S-TZ9',
  'F2WO-48S-TZ5L-B',
  'F2WO-48S-T7B-B',
  'F2WO-48S-TZ9-B',
  'F2WO-48S-14L-A2',
  'F2WO-48S-TX14',
  'F2WO-HD-HD6',
  'F2WO-HX-HX4',
  'F4WS-72S-DIN74L',
  'F4WS-72S-35R',
  'F4WS-72S-35L',
  'F4WO-72S-55LS',
  'F4WO-72S-DIN100L',
  'F4WS-66S-36B19L',
  'F4WS-66S-40B20L',
  'F4WS-66S-40B20R',
  'F4WS-66S-35L',
  'F4WS-66S-35R',
  'F4WS-66S-40LBH',
  'F4WS-66S-40RBH',
  'F4WS-60S-DIN44R',
  'F4WS-60S-DIN44LH',
  'F4WS-60S-45LBH',
  'F4WS-60S-DIN50L',
  'F4WS-60S-55D23L',
  'F4WS-60S-DIN55L',
  'F4WS-60S-DIN55R',
  'F4WS-60S-DIN60L',
  'F4WS-60S-DIN65LH',
  'F4WS-60S-DIN66',
  'F4WS-60S-75D23LBH',
  'F4WS-60S-DIN80L',
  'F4WS-48S-32R',
  'F4WS-48S-36B19L',
  'F4WS-48S-70L',
  'F4WS-48S-70R',
  'F4WS-48S-80D26R',
  'F4WS-48S-105D31R',
  'F4WS-48S-105D31L',
  'F4WS-30S-35L',
  'F4WS-30S-35R',
  'F4WS-30S-70L',
  'F4WS-30S-70R',
]

const uniquePartNumbers = (partNumbers) => {
  const seen = new Set()
  return partNumbers.filter((partNumber) => {
    const key = partNumber.trim().toUpperCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const makeSeedModels = (partNumbers, brand) => uniquePartNumbers(partNumbers).map((partNumber, index) => ({
  id: `${brand.toLowerCase()}-seed-${index}`,
  brand,
  name: partNumber,
  warrantyValue: 0,
  warrantyUnit: 'Months',
  purchasePrice: 0,
  sellingPrice: 0,
  addedOn: todayLabel(),
}))

const initialModels = [
  ...makeSeedModels(amaronPartNumbers, 'AMARON'),
  ...makeSeedModels(exidePartNumbers, 'EXIDE'),
  ...makeSeedModels(yokohamaPartNumbers, 'YOKOHAMA'),
  ...makeSeedModels(tataGreenPartNumbers, 'TATA GREEN'),
  ...makeSeedModels(boschPartNumbers, 'BOSCH'),
  ...makeSeedModels(sfSonicPartNumbers, 'SF SONIC'),
] // { id, brand, name, warrantyValue, warrantyUnit, purchasePrice, sellingPrice, addedOn }
const initialProducts = [] // { id, modelId, brand, model, serialNo, warrantyValue, warrantyUnit, purchasePrice, sellingPrice, addedOn }

const emptyModelForm = {
  name: '',
  warrantyValue: '',
  warrantyUnit: 'Months',
  purchasePrice: '',
  sellingPrice: '',
}

const SERIAL_BATCH_SIZE = 15
const MODEL_BATCH_SIZE = 15

function stockStatus(count) {
  if (count <= 0) return { label: 'Out of Stock', cls: 'badge-out-stock' }
  if (count <= 5) return { label: 'Low Stock', cls: 'badge-low-stock' }
  return { label: 'In Stock', cls: 'badge-received' }
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function openPrintWindow(html) {
  const printWindow = window.open('', '_blank', 'width=950,height=1050')
  if (!printWindow) {
    alert('Please allow pop-ups to print the receipt.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  const printWhenReady = () => {
    const images = Array.from(printWindow.document.images)

    if (images.length === 0) {
      printWindow.focus()
      printWindow.print()
      return
    }

    let completed = 0
    const finishImage = () => {
      completed += 1
      if (completed >= images.length) {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 250)
      }
    }

    images.forEach((image) => {
      if (image.complete) {
        finishImage()
      } else {
        image.addEventListener('load', finishImage, { once: true })
        image.addEventListener('error', finishImage, { once: true })
      }
    })
  }

  if (printWindow.document.readyState === 'complete') {
    printWhenReady()
  } else {
    printWindow.addEventListener('load', printWhenReady, { once: true })
  }
}

function renderProductReceiptHTML(products) {
  const rows = products
    .map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${product.brand || '—'}</strong></td>
        <td>${product.model || '—'}</td>
        <td>${product.serialNo || '—'}</td>
        <td>${product.warrantyValue || 0} ${product.warrantyUnit || ''}</td>
        <td class="num">&#8377; ${formatCurrency(product.purchasePrice)}</td>
        <td class="num">&#8377; ${formatCurrency(product.sellingPrice)}</td>
        <td>${product.addedOn || '—'}</td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Product Stock Receipt</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#1c2436; margin:0; padding:18px; font-size:11px; }
  .sheet { max-width: 900px; margin:0 auto; }
  .doc-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #17213a; padding-bottom:10px; margin-bottom:14px; }
  .shop-logo { width:210px; height:auto; object-fit:contain; display:block; }
  .shop-name { font-family:Arial,sans-serif; font-size:22px; font-weight:800; color:#17213a; margin:0 0 2px; }
  .shop-tagline { font-family:Arial,sans-serif; font-size:10px; font-weight:700; color:#5f6b7d; margin-bottom:5px; text-transform:uppercase; letter-spacing:.6px; }
  .shop-meta { font-family:Arial,sans-serif; font-size:10px; color:#4a5468; margin-top:5px; line-height:1.4; max-width:390px; }
  .shop-meta strong { color:#17213a; }
  .receipt-tag { text-align:right; font-family:Arial,sans-serif; }
  .badge-title { display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; color:white; background:#17213a; padding:5px 12px; border-radius:3px; margin-bottom:8px; }
  .receipt-tag .row { font-size:12px; color:#354160; margin-top:3px; }
  table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; }
  th { background:#17213a; color:white; font-size:9.5px; text-transform:uppercase; letter-spacing:.3px; padding:7px 6px; text-align:left; }
  td { padding:7px 6px; font-size:10px; border-bottom:1px solid #e8edf4; vertical-align:top; }
  .num { text-align:right; }
  .summary { display:flex; justify-content:flex-end; margin-top:12px; font-family:Arial,sans-serif; }
  .summary-box { width:280px; border-top:2px solid #17213a; padding-top:8px; }
  .summary-line { display:flex; justify-content:space-between; padding:3px 0; }
  .footer { text-align:center; margin-top:22px; padding-top:10px; border-top:1px solid #eef1f7; font-family:Arial,sans-serif; font-size:9px; color:#929daf; }
  @page { size:A4 landscape; margin:8mm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body{padding:0;}
    .sheet, .doc-header, table, .summary, .footer{break-inside:avoid; page-break-inside:avoid;}
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="doc-header">
    <div>
      <img
        src="${SHOP_INFO.logo}"
        alt="${SHOP_INFO.name}"
        class="shop-logo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"
      />
      <div class="shop-text-fallback" style="display:none">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div class="shop-tagline">${SHOP_INFO.tagline}</div>
      </div>
      <div class="shop-meta">
        <strong>${SHOP_INFO.address}</strong><br/>
        Phone: ${SHOP_INFO.phone} &nbsp;|&nbsp; ${SHOP_INFO.email}<br/>
        GSTIN: ${SHOP_INFO.gstin}
      </div>
    </div>
    <div class="receipt-tag">
      <div class="badge-title">PRODUCT STOCK RECEIPT</div>
      <div class="row"><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
      <div class="row"><strong>Total Entries:</strong> ${products.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SR No.</th><th>Brand</th><th>Model</th><th>Serial No.</th><th>Warranty</th>
        <th class="num">Purchase Price</th><th class="num">Selling Price</th><th>Added On</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px">No product records available.</td></tr>'}</tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-line"><span>Total Serial Numbers</span><strong>${products.length}</strong></div>
    </div>
  </div>
  <div class="footer">This is a computer-generated stock receipt from ${SHOP_INFO.name}.</div>
</div>
</body>
</html>`
}

// Small CSV parser for "Import Excel" (export your sheet as .csv).
// Expected header row: brand,model,serialNo,warrantyValue,warrantyUnit,purchasePrice,sellingPrice
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(',').map((c) => c.trim())
      const row = {}
      headers.forEach((h, i) => (row[h] = cells[i] ?? ''))
      return {
        brand: row.brand || '',
        model: row.model || '',
        serialNo: row.serialno || row.serial || '',
        warrantyValue: Number(row.warrantyvalue) || 0,
        warrantyUnit: warrantyUnits.includes(row.warrantyunit) ? row.warrantyunit : 'Months',
        purchasePrice: Number(row.purchaseprice) || 0,
        sellingPrice: Number(row.sellingprice) || 0,
      }
    })
    .filter((r) => r.brand && r.model && r.serialNo)
}

// Simple, dependency-free modal shell.
function Modal({ open, onClose, title, icon, children, footer, size = '' }) {
  if (!open) return null

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className={`modal-dialog modal-dialog-centered ${size}`} onClick={(e) => e.stopPropagation()}>
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

// Shared scanner for serial/model barcodes, with hardware scanner and keyboard fallback.
function ScannerModal({ open, onClose, onResult, title = 'Scan Barcode', label = 'value', placeholder = 'Scan or type value' }) {
  const [manualValue, setManualValue] = useState('')
  const [cameraError, setCameraError] = useState('')
  const scannerRef = useRef(null)
  const scannerIdRef = useRef(`scanner-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (!open) return undefined

    let disposed = false
    const scanner = new Html5Qrcode(scannerIdRef.current)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 120 } },
        (decodedText) => {
          if (disposed || !decodedText.trim()) return
          onResult(decodedText.trim())
          onClose()
        },
        () => {},
      )
      .catch(() => {
        if (!disposed) setCameraError('Camera scanner could not start. You can still use a USB barcode scanner or type below.')
      })

    return () => {
      disposed = true
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => scanner.clear().catch(() => {}))
    }
  }, [open, onClose, onResult])

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualValue.trim()) return
    onResult(manualValue.trim())
    setManualValue('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={<i className="fa-solid fa-barcode me-2"></i>}
      footer={
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-muted small mb-3">
        Point the camera at the barcode, or click the box below and use your USB barcode scanner.
      </p>

      <div
        id={scannerIdRef.current}
        className="rounded mb-2 overflow-hidden"
        style={{ minHeight: 220, background: '#0b0f14' }}
      ></div>
      {cameraError && <div className="alert alert-warning py-2 small">{cameraError}</div>}

      <form onSubmit={handleManualSubmit}>
        <label className="form-label small">
          <i className="fa-solid fa-keyboard me-1"></i>
          Scan with barcode scanner or enter {label} manually
        </label>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">
            Use Value
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SharedModelFields({ form, setForm }) {
  return (
    <>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Warranty</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              min="0"
              placeholder="e.g. 24"
              value={form.warrantyValue}
              onChange={(e) => setForm({ ...form, warrantyValue: e.target.value })}
            />
            <select
              className="form-select"
              style={{ maxWidth: 120 }}
              value={form.warrantyUnit}
              onChange={(e) => setForm({ ...form, warrantyUnit: e.target.value })}
            >
              {warrantyUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Purchase Price (₹)</label>
          <input
            type="number"
            className="form-control"
            min="0"
            placeholder="e.g. 4200"
            value={form.purchasePrice}
            onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Selling Price (₹) *</label>
        <input
          type="number"
          className="form-control"
          min="0"
          placeholder="e.g. 5199"
          required
          value={form.sellingPrice}
          onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
        />
      </div>
    </>
  )
}

function AddModelModal({ onClose, brand, existingModelNames, onSave }) {
  const [form, setForm] = useState(emptyModelForm)
  const [slots, setSlots] = useState(Array(MODEL_BATCH_SIZE).fill(''))
  const [scannerOpen, setScannerOpen] = useState(false)
  const filledCount = slots.filter((s) => s.trim()).length

  function updateSlot(index, value) {
    setSlots((prev) => prev.map((v, i) => (i === index ? value.toUpperCase() : v)))
  }

  function handleScanResult(value) {
    setSlots((prev) => {
      const emptyIndex = prev.findIndex((v) => !v.trim())
      if (emptyIndex === -1) {
        alert(`You can only add ${MODEL_BATCH_SIZE} model names per batch. Save this batch first, then scan more.`)
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = value.trim().toUpperCase()
      return next
    })
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.sellingPrice) {
      alert('Selling price is required.')
      return
    }

    const filled = slots.map((s) => s.trim().toUpperCase()).filter(Boolean)
    if (filled.length === 0) {
      alert('Scan or type at least one model name.')
      return
    }

    const seen = new Set()
    const duplicatesInBatch = []
    filled.forEach((name) => {
      if (seen.has(name)) duplicatesInBatch.push(name)
      seen.add(name)
    })
    if (duplicatesInBatch.length > 0) {
      alert(`These model names are repeated in this batch: ${duplicatesInBatch.join(', ')}`)
      return
    }

    const clashes = filled.filter((name) => existingModelNames.has(name))
    if (clashes.length > 0) {
      alert(`These model names already exist for ${brand}: ${clashes.join(', ')}`)
      return
    }

    onSave(filled, form)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Add Models - ${brand || ''}`}
        icon={<i className="fa-solid fa-battery-full me-2"></i>}
        size="modal-lg"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="addModelBatchForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i> Save {filledCount > 0 ? `${filledCount} ` : ''}Model{filledCount === 1 ? '' : 's'}
            </button>
          </>
        }
      >
        <form id="addModelBatchForm" onSubmit={handleSave}>
          <button type="button" className="btn btn-outline-warning btn-sm mb-3" onClick={() => setScannerOpen(true)}>
            <i className="fa-solid fa-barcode me-1"></i> Scan Model Name
          </button>

          <p className="text-muted small mb-2">
            Add up to {MODEL_BATCH_SIZE} model names in this batch. Camera scan, USB barcode scanner, and typing all work here.
          </p>

          <div className="row">
            {slots.map((value, index) => (
              <div className="col-md-4 mb-2" key={index}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">{index + 1}</span>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder={`Model #${index + 1}`}
                    value={value}
                    onChange={(e) => updateSlot(index, e.target.value)}
                    autoFocus={index === 0}
                  />
                </div>
              </div>
            ))}
          </div>

          <hr />
          <SharedModelFields form={form} setForm={setForm} />
        </form>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResult={handleScanResult}
        title="Scan Model Name"
        label="model name"
        placeholder="e.g. AAM-FL-00080D23L"
      />
    </>
  )
}

// Add up to SERIAL_BATCH_SIZE (15) serial numbers at once, by scanning or typing.
// Only mounted while open, so its internal state always starts fresh.
function AddSerialModal({ onClose, brand, models, presetModelId, existingSerials, onSave }) {
  const [modelId, setModelId] = useState(presetModelId || '')
  const [slots, setSlots] = useState(Array(SERIAL_BATCH_SIZE).fill(''))
  const [scannerOpen, setScannerOpen] = useState(false)

  const selectedModel = models.find((m) => m.id === modelId)
  const filledCount = slots.filter((s) => s.trim()).length

  function updateSlot(index, value) {
    setSlots((prev) => prev.map((v, i) => (i === index ? value.toUpperCase() : v)))
  }

  function handleScanResult(value) {
    setSlots((prev) => {
      const emptyIndex = prev.findIndex((v) => !v.trim())
      if (emptyIndex === -1) {
        alert(`You can only add ${SERIAL_BATCH_SIZE} serial numbers per batch. Save this batch first, then scan more.`)
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = value.trim().toUpperCase()
      return next
    })
    setScannerOpen(false)
  }

  function handleSave(e) {
    e.preventDefault()

    if (!modelId) {
      alert('Please select a model first.')
      return
    }

    const filled = slots.map((s) => s.trim().toUpperCase()).filter(Boolean)
    if (filled.length === 0) {
      alert('Scan or type at least one serial number.')
      return
    }

    const seen = new Set()
    const duplicatesInBatch = []
    filled.forEach((sn) => {
      if (seen.has(sn)) duplicatesInBatch.push(sn)
      seen.add(sn)
    })
    if (duplicatesInBatch.length > 0) {
      alert(`These serial numbers are repeated in this batch: ${duplicatesInBatch.join(', ')}`)
      return
    }

    const clashes = filled.filter((sn) => existingSerials.has(sn))
    if (clashes.length > 0) {
      alert(`These serial numbers already exist in stock: ${clashes.join(', ')}`)
      return
    }

    onSave(modelId, filled)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Add Serial Numbers"
        icon={<i className="fa-solid fa-barcode me-2"></i>}
        size="modal-lg"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="addSerialForm" className="btn btn-primary">
              <i className="fa-solid fa-check me-1"></i> Save {filledCount > 0 ? `${filledCount} ` : ''}Serial Number{filledCount === 1 ? '' : 's'}
            </button>
          </>
        }
      >
        <form id="addSerialForm" onSubmit={handleSave}>
          {presetModelId ? (
            <p className="mb-3">
              <span className="text-muted">Model:</span> <strong>{selectedModel?.name}</strong>
            </p>
          ) : (
            <div className="mb-3">
              <label className="form-label">Model *</label>
              <select className="form-control" required value={modelId} onChange={(e) => setModelId(e.target.value)}>
                <option value="">Select model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {models.length === 0 && (
                <small className="text-danger">No models yet for {brand}. Add a model first.</small>
              )}
            </div>
          )}

          <button type="button" className="btn btn-outline-warning btn-sm mb-3" onClick={() => setScannerOpen(true)}>
            <i className="fa-solid fa-barcode me-1"></i> Scan Serial Number
          </button>

          <p className="text-muted small mb-2">
            Add up to {SERIAL_BATCH_SIZE} serial numbers in this batch — scan them one by one or type them in below.
          </p>

          <div className="row">
            {slots.map((value, index) => (
              <div className="col-md-4 mb-2" key={index}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">{index + 1}</span>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder={`Serial #${index + 1}`}
                    value={value}
                    onChange={(e) => updateSlot(index, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResult={handleScanResult}
        title="Scan Serial Number"
        label="serial number"
        placeholder="e.g. EX44DIN2409981"
      />
    </>
  )
}

// One model card inside a brand page — click to expand/collapse its serial list.
function ModelCard({ model, serials, expanded, onToggle, onAddSerial, onDeleteSerial, onDeleteModel }) {
  const status = stockStatus(serials.length)

  return (
    <div className="model-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div
        className="d-flex justify-content-between align-items-start"
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div>
          <strong>{model.name}</strong>
          <div className="small text-muted">
            &#8377; {formatCurrency(model.sellingPrice)} &middot; {model.warrantyValue || 0} {model.warrantyUnit}
          </div>
        </div>
        <span className={status.cls}>{serials.length} &middot; {status.label}</span>
      </div>

      <div className="d-flex gap-2 mt-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={(e) => { e.stopPropagation(); onAddSerial() }}
        >
          <i className="fa-solid fa-plus me-1"></i> Add Serial
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title="Delete model"
          onClick={(e) => { e.stopPropagation(); onDeleteModel() }}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      {expanded && (
        <div className="mt-2">
          {serials.length === 0 && <em className="text-muted small">No serial numbers yet.</em>}
          {serials.map((s) => (
            <div key={s.id} className="d-flex justify-content-between align-items-center border-bottom py-1">
              <span className="font-monospace small">{s.serialNo}</span>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger p-0"
                title="Remove serial number"
                onClick={() => onDeleteSerial(s.id)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductStock() {
  const [products, setProducts] = useState(initialProducts)
  const [models, setModels] = useState(initialModels)
  const [brands, setBrands] = useState(defaultStockBrands)

  const [selectedBrand, setSelectedBrand] = useState(null)
  const [brandOpen, setBrandOpen] = useState(false)
  const [newBrand, setNewBrand] = useState('')
  const [search, setSearch] = useState('')

  const [modelModalOpen, setModelModalOpen] = useState(false)

  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [serialModalModelId, setSerialModalModelId] = useState(null) // null = user must pick a model

  const [expandedModelId, setExpandedModelId] = useState(null)

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printForm, setPrintForm] = useState({ models: '', fromDate: '', toDate: '' })

  const fileInputRef = useRef(null)

  const brandModels = useMemo(
    () => models.filter((m) => m.brand.toUpperCase() === selectedBrand),
    [models, selectedBrand]
  )

  const filteredModels = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return brandModels
    return brandModels.filter((m) => m.name.toLowerCase().includes(q))
  }, [brandModels, search])

  const serialsByModel = useMemo(() => {
    const map = {}
    products.forEach((p) => {
      map[p.modelId] = map[p.modelId] || []
      map[p.modelId].push(p)
    })
    return map
  }, [products])

  const existingSerialSet = useMemo(
    () => new Set(products.map((p) => p.serialNo.toUpperCase())),
    [products]
  )

  const existingModelNameSet = useMemo(
    () => new Set(brandModels.map((m) => m.name.toUpperCase())),
    [brandModels]
  )

  const summary = useMemo(() => {
    let low = 0, out = 0
    models.forEach((m) => {
      const count = (serialsByModel[m.id] || []).length
      if (count <= 0) out++
      else if (count <= 5) low++
    })
    return { totalModels: models.length, units: products.length, low, out }
  }, [models, serialsByModel, products])

  function handleAddBrand(e) {
    e.preventDefault()
    const brand = newBrand.trim().toUpperCase()
    if (!brand) return
    if (brands.includes(brand)) {
      alert('This brand already exists.')
      return
    }
    // No extra setup needed — Add Model / Add Serial Number work the same
    // way for this brand automatically.
    setBrands((current) => [...current, brand])
    setNewBrand('')
    setBrandOpen(false)
  }

  function handleSaveModels(modelNames, form) {
    setModels((prev) => [
      ...prev,
      ...modelNames.map((name) => ({
        id: Date.now() + Math.random(),
        brand: selectedBrand,
        name,
        warrantyValue: Number(form.warrantyValue) || 0,
        warrantyUnit: form.warrantyUnit,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        addedOn: todayLabel(),
      })),
    ])
    setModelModalOpen(false)
  }

  function openAddSerialModal(modelId) {
    setSerialModalModelId(modelId) // null when opened from the toolbar (user picks the model)
    setSerialModalOpen(true)
  }

  function closeAddSerialModal() {
    setSerialModalOpen(false)
    setSerialModalModelId(null)
  }

  function handleSaveSerials(modelId, serialList) {
    const model = models.find((m) => m.id === modelId)
    if (!model) return

    const newEntries = serialList.map((sn) => ({
      id: Date.now() + Math.random(),
      modelId: model.id,
      brand: model.brand,
      model: model.name,
      serialNo: sn,
      warrantyValue: model.warrantyValue,
      warrantyUnit: model.warrantyUnit,
      purchasePrice: model.purchasePrice,
      sellingPrice: model.sellingPrice,
      addedOn: todayLabel(),
    }))

    setProducts((prev) => [...prev, ...newEntries])
    closeAddSerialModal()
  }

  function handleDeleteSerial(id) {
    if (window.confirm('Remove this serial number from stock?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  function handleDeleteModel(modelId) {
    const count = (serialsByModel[modelId] || []).length
    const msg = count > 0
      ? `This model has ${count} serial number(s) in stock. Delete the model and all its serial numbers?`
      : 'Delete this model?'
    if (window.confirm(msg)) {
      setModels((prev) => prev.filter((m) => m.id !== modelId))
      setProducts((prev) => prev.filter((p) => p.modelId !== modelId))
      setExpandedModelId((prev) => (prev === modelId ? null : prev))
    }
  }

  function toggleExpand(modelId) {
    setExpandedModelId((prev) => (prev === modelId ? null : modelId))
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function openPrintModal() {
    setPrintForm({ models: '', fromDate: '', toDate: '' })
    setPrintModalOpen(true)
  }

  function handlePrintSubmit(e) {
    e.preventDefault()

    // Comma-separated model names — leave blank to include every model.
    const wantedModels = printForm.models
      .split(',')
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean)

    if (printForm.fromDate && printForm.toDate && printForm.fromDate > printForm.toDate) {
      alert('"From" date must be on or before "To" date.')
      return
    }

    let brandProducts = products.filter((p) => p.brand === selectedBrand)

    if (wantedModels.length > 0) {
      brandProducts = brandProducts.filter((p) => wantedModels.includes(p.model.toUpperCase()))
    }
    if (printForm.fromDate) {
      brandProducts = brandProducts.filter((p) => p.addedOn >= printForm.fromDate)
    }
    if (printForm.toDate) {
      brandProducts = brandProducts.filter((p) => p.addedOn <= printForm.toDate)
    }

    if (brandProducts.length === 0) {
      alert('No serial numbers match that model / date filter.')
      return
    }

    openPrintWindow(renderProductReceiptHTML(brandProducts))
    setPrintModalOpen(false)
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Export your sheet as .csv (File > Save As > CSV in Excel) and import that. For direct .xlsx parsing, install the "xlsx" package (SheetJS) and swap this reader.')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const rows = parseCsv(String(evt.target.result || ''))
      if (rows.length === 0) {
        alert('No valid rows found. Make sure the first row has headers: brand, model, serialNo, warrantyValue, warrantyUnit, purchasePrice, sellingPrice')
        return
      }

      let modelsCopy = [...models]
      let brandsCopy = [...brands]
      const newProducts = []
      let newModelCount = 0

      rows.forEach((row) => {
        const brandUp = row.brand.trim().toUpperCase()
        if (!brandsCopy.includes(brandUp)) brandsCopy = [...brandsCopy, brandUp]

        let model = modelsCopy.find(
          (m) => m.brand.toUpperCase() === brandUp && m.name.toUpperCase() === row.model.trim().toUpperCase()
        )
        if (!model) {
          model = {
            id: Date.now() + Math.random(),
            brand: brandUp,
            name: row.model.trim(),
            warrantyValue: row.warrantyValue,
            warrantyUnit: row.warrantyUnit,
            purchasePrice: row.purchasePrice,
            sellingPrice: row.sellingPrice,
            addedOn: todayLabel(),
          }
          modelsCopy = [...modelsCopy, model]
          newModelCount += 1
        }

        const serialUp = row.serialNo.toUpperCase()
        if (!existingSerialSet.has(serialUp) && !newProducts.some((p) => p.serialNo === serialUp)) {
          newProducts.push({
            id: Date.now() + Math.random(),
            modelId: model.id,
            brand: model.brand,
            model: model.name,
            serialNo: serialUp,
            warrantyValue: model.warrantyValue,
            warrantyUnit: model.warrantyUnit,
            purchasePrice: model.purchasePrice,
            sellingPrice: model.sellingPrice,
            addedOn: todayLabel(),
          })
        }
      })

      setBrands(brandsCopy)
      setModels(modelsCopy)
      setProducts((prev) => [...prev, ...newProducts])
      alert(`Imported ${newProducts.length} serial number(s) across ${newModelCount} new model(s).`)
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Topbar title="Product Stock" subtitle="Track batteries by brand, model & serial number" />

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Total Models</small>
              <h4>{summary.totalModels}</h4>
              <span className="stat-change stat-muted">Across all brands</span>
            </div>
            <div className="stat-icon icon-navy"><i className="fa-solid fa-battery-full"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Live Stock Units</small>
              <h4 className="text-success">{summary.units}</h4>
              <span className="stat-change stat-muted">Serial numbers in stock</span>
            </div>
            <div className="stat-icon icon-green"><i className="fa-solid fa-boxes-stacked"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Low Stock</small>
              <h4 className="text-warning">{summary.low}</h4>
              <span className="stat-change stat-orange">5 or fewer units left</span>
            </div>
            <div className="stat-icon icon-orange"><i className="fa-solid fa-triangle-exclamation"></i></div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card-box stat-card">
            <div>
              <small>Out of Stock</small>
              <h4 className="text-danger">{summary.out}</h4>
              <span className="stat-change down">Needs restocking</span>
            </div>
            <div className="stat-icon icon-red"><i className="fa-solid fa-circle-xmark"></i></div>
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="section-title d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>{selectedBrand ? `${selectedBrand} Batteries` : 'Battery Brands'}</span>
          <div className="d-flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            {!selectedBrand ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setBrandOpen(true)}>
                <i className="fa-solid fa-plus me-1"></i> Add Brand
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => { setSelectedBrand(null); setSearch(''); setExpandedModelId(null) }}
                >
                  <i className="fa-solid fa-arrow-left me-1"></i> All Brands
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setModelModalOpen(true)}>
                  <i className="fa-solid fa-plus me-1"></i> Add Model
                </button>
                <button type="button" className="btn btn-outline-dark btn-sm" onClick={openPrintModal}>
                  <i className="fa-solid fa-print me-1"></i> Print Receipt
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleImportClick}>
                  <i className="fa-solid fa-file-excel me-1"></i> Import Excel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openAddSerialModal(null)}>
                  <i className="fa-solid fa-barcode me-1"></i> Add Serial Number
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedBrand ? (
          <div className="brand-card-grid">
            {brands.map((brand) => {
              const unitCount = products.filter((p) => p.brand.toUpperCase() === brand).length
              const modelCount = models.filter((m) => m.brand.toUpperCase() === brand).length
              return (
                <button
                  type="button"
                  className="brand-card-button"
                  key={brand}
                  onClick={() => { setSelectedBrand(brand); setSearch(''); setExpandedModelId(null) }}
                >
                  <span>{brand}</span>
                  <small>
                    {modelCount} {modelCount === 1 ? 'model' : 'models'}
                    {unitCount > 0 ? ` | ${unitCount} ${unitCount === 1 ? 'battery' : 'batteries'} in stock` : ''}
                  </small>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <input
                type="text"
                className="form-control form-control-sm w-auto"
                style={{ minWidth: 280 }}
                placeholder="Search by model name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="model-list-grid">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  serials={serialsByModel[model.id] || []}
                  expanded={expandedModelId === model.id}
                  onToggle={() => toggleExpand(model.id)}
                  onAddSerial={() => openAddSerialModal(model.id)}
                  onDeleteSerial={handleDeleteSerial}
                  onDeleteModel={() => handleDeleteModel(model.id)}
                />
              ))}
            </div>

            {filteredModels.length === 0 && (
              <p className="text-muted text-center py-4">
                {brandModels.length === 0
                  ? 'No models yet for this brand. Click "Add Model" to create one.'
                  : 'No models match your search.'}
              </p>
            )}
          </>
        )}
      </div>

      <Modal
        open={brandOpen}
        onClose={() => { setBrandOpen(false); setNewBrand('') }}
        title="Add Brand"
        icon={<i className="fa-solid fa-tags me-2"></i>}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setBrandOpen(false); setNewBrand('') }}>Cancel</button>
            <button type="submit" form="addBrandForm" className="btn btn-primary">Add Brand</button>
          </>
        }
      >
        <form id="addBrandForm" onSubmit={handleAddBrand}>
          <label className="form-label">Brand Name *</label>
          <input className="form-control text-uppercase" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Enter brand name" autoFocus required />
        </form>
      </Modal>

      {modelModalOpen && (
        <AddModelModal
          onClose={() => setModelModalOpen(false)}
          brand={selectedBrand}
          existingModelNames={existingModelNameSet}
          onSave={handleSaveModels}
        />
      )}

      <Modal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title={`Print Receipt — ${selectedBrand || ''}`}
        icon={<i className="fa-solid fa-print me-2"></i>}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPrintModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="printReceiptForm" className="btn btn-primary">
              <i className="fa-solid fa-print me-1"></i> Print
            </button>
          </>
        }
      >
        <form id="printReceiptForm" onSubmit={handlePrintSubmit}>
          <div className="mb-3">
            <label className="form-label">Model(s)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. AAM-FL-00080D23L, AAM-FL-0BH45D20L"
              value={printForm.models}
              onChange={(e) => setPrintForm({ ...printForm, models: e.target.value })}
            />
            <small className="text-muted">
              Separate multiple model names with a comma. Leave blank to include every model.
            </small>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={printForm.fromDate}
                onChange={(e) => setPrintForm({ ...printForm, fromDate: e.target.value })}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={printForm.toDate}
                onChange={(e) => setPrintForm({ ...printForm, toDate: e.target.value })}
              />
            </div>
          </div>
          <small className="text-muted">Leave both dates blank to include every date.</small>
        </form>
      </Modal>

      {serialModalOpen && (
        <AddSerialModal
          onClose={closeAddSerialModal}
          brand={selectedBrand}
          models={brandModels}
          presetModelId={serialModalModelId}
          existingSerials={existingSerialSet}
          onSave={handleSaveSerials}
        />
      )}
    </>
  )
}

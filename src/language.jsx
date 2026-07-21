import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const mr = {
  Dashboard: 'डॅशबोर्ड',
  'Product Stock': 'प्रॉडक्ट स्टॉक',
  'Purchase Stock': 'खरेदी स्टॉक',
  Sales: 'विक्री',
  'Scrap Stock': 'स्क्रॅप स्टॉक',
  Inventory: 'इन्व्हेंटरी',
  Reports: 'रिपोर्ट्स',
  Settings: 'सेटिंग्ज',
  Admin: 'अॅडमिन',
  English: 'इंग्रजी',
  Marathi: 'मराठी',
  Print: 'प्रिंट',
  Close: 'बंद करा',
  Cancel: 'रद्द करा',
  Save: 'सेव्ह करा',
  Edit: 'बदल करा',
  Delete: 'डिलीट',
  See: 'पहा',
  Search: 'शोधा',
  Date: 'तारीख',
  Customer: 'ग्राहक',
  Company: 'कंपनी',
  Invoice: 'बिल',
  'Invoice No.': 'बिल नं.',
  'Invoice Number': 'बिल नंबर',
  'Customer Name': 'ग्राहकाचे नाव',
  'Phone Number': 'फोन नंबर',
  Phone: 'फोन',
  Address: 'पत्ता',
  GSTIN: 'GSTIN',
  'Customer GSTIN': 'ग्राहक GSTIN',
  'Vehicle Name': 'वाहनाचे नाव',
  'Vehicle Number': 'वाहन नंबर',
  'Serial No.': 'सिरीयल नं.',
  'Serial Number': 'सिरीयल नंबर',
  HSN: 'HSN',
  Qty: 'नग',
  Quantity: 'नग',
  Rate: 'दर',
  Discount: 'सवलत',
  Total: 'एकूण',
  Amount: 'रक्कम',
  Status: 'स्थिती',
  Paid: 'भरले',
  Due: 'बाकी',
  'Paid Amount': 'भरलेली रक्कम',
  'Due Amount': 'बाकी रक्कम',
  'Total Amount': 'एकूण रक्कम',
  'Payment Method': 'पेमेंट पद्धत',
  'Payment History': 'पेमेंट इतिहास',
  'Battery Information': 'बॅटरी माहिती',
  'Customer Information': 'ग्राहक माहिती',
  'Company Details': 'कंपनी तपशील',
  'Sales Invoice': 'विक्री बिल',
  'Create a new battery sales invoice': 'नवीन बॅटरी विक्री बिल तयार करा',
  'Regular Sales': 'रेग्युलर विक्री',
  'Old Stock': 'जुना स्टॉक',
  'Sell Old Stock': 'जुना स्टॉक विक्री',
  'Scrap Stock Details': 'स्क्रॅप स्टॉक तपशील',
  'Scrap Sale Details': 'स्क्रॅप विक्री तपशील',
  'Customer Old Battery Scrap Report': 'ग्राहक जुनी बॅटरी स्क्रॅप रिपोर्ट',
  'Complete old battery information and stock search': 'जुन्या बॅटरीची संपूर्ण माहिती व स्टॉक शोध',
  'Kalyankar Batteries': 'कल्याणकर बॅटरीज',
  'Certified With Excellent Quality': 'उत्कृष्ट गुणवत्तेसह प्रमाणित',
  'Gargoti - Kolhapur main road, Gargoti 416209': 'शिंदे कॉम्प्लेक्स, मेन रोड, गारगोटी, ता. भुदरगड, जि. कोल्हापूर, 416209',
  'Gargoti - Kolhapur Road, Gargoti, Near Swami Samarth Mangal Karyalay': 'शिंदे कॉम्प्लेक्स, मेन रोड, गारगोटी, ता. भुदरगड, जि. कोल्हापूर, 416209',
  'Near Swami samarth mangal karyalay': 'स्वामी समर्थ मंगल कार्यालयाजवळ',
  'Daily battery shop overview': 'दैनिक बॅटरी दुकानाचा आढावा',
  "Today's Sales": 'आजची विक्री',
  'Sales Due': 'विक्री बाकी',
  'Purchase Total': 'एकूण खरेदी',
  'Purchase Due': 'खरेदी बाकी',
  'Money Position': 'पैशांची स्थिती',
  'Purchase Paid': 'खरेदी भरलेली',
  'Pending Customer Payments': 'ग्राहकांचे बाकी पेमेंट',
  'Open Sales': 'विक्री उघडा',
  'Open Purchase': 'खरेदी उघडा',
  'Recent Sales': 'अलीकडील विक्री',
  'View All': 'सर्व पहा',
  'Quick Actions': 'जलद कृती',
  'Add Purchase': 'खरेदी जोडा',
  'New Sale': 'नवीन विक्री',
  'Track batteries by brand, model & serial number': 'ब्रँड, मॉडेल आणि सिरीयल नंबरनुसार बॅटरी ट्रॅक करा',
  'Battery Brands': 'बॅटरी ब्रँड्स',
  'Total Models': 'एकूण मॉडेल्स',
  'Live Stock Units': 'उपलब्ध स्टॉक युनिट्स',
  'Low Stock': 'कमी स्टॉक',
  'Out of Stock': 'स्टॉक संपला',
  'Add Brand': 'ब्रँड जोडा',
  'All Brands': 'सर्व ब्रँड्स',
  'Add Model': 'मॉडेल जोडा',
  'Print Receipt': 'पावती प्रिंट करा',
  'Import Excel': 'एक्सेल इम्पोर्ट करा',
  'Add Serial Number': 'सिरीयल नंबर जोडा',
}

const translations = { en: {}, mr }
const LanguageContext = createContext(null)

function translateText(text, language) {
  if (language !== 'mr') return text
  return translations.mr[text] || text
}

function applyDocumentTranslation(language) {
  document.documentElement.lang = language === 'mr' ? 'mr' : 'en'
  document.querySelectorAll('[data-original-text]').forEach((node) => {
    node.textContent = translateText(node.dataset.originalText, language)
  })
  if (language !== 'mr') return

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)

  nodes.forEach((node) => {
    const original = node.parentElement?.dataset.originalText || node.nodeValue
    const key = String(original || '').trim()
    if (!key || !translations.mr[key]) return
    node.parentElement.dataset.originalText = key
    node.nodeValue = original.replace(key, translations.mr[key])
  })
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('kb-language') || 'en')
  const [theme, setThemeState] = useState(() => localStorage.getItem('kb-theme') || 'light')

  function setLanguage(nextLanguage) {
    setLanguageState(nextLanguage)
    localStorage.setItem('kb-language', nextLanguage)
  }

  function setTheme(nextTheme) {
    setThemeState(nextTheme)
    localStorage.setItem('kb-theme', nextTheme)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    applyDocumentTranslation(language)
    const observer = new MutationObserver(() => applyDocumentTranslation(language))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    theme,
    setTheme,
    t: (text) => translateText(text, language),
  }), [language, theme])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}

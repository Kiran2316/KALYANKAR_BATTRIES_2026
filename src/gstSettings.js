export const GST_SETTINGS_STORAGE_KEY = 'kalyankar-gst-settings'
export const DEFAULT_TOTAL_GST_RATE = 18
export const DEFAULT_GST_RATES = [18]

export function normalizeGstRate(value) {
  const rate = Number(value)
  if (!Number.isFinite(rate)) return DEFAULT_TOTAL_GST_RATE
  return Math.min(100, Math.max(0, rate))
}

export function getGstSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(GST_SETTINGS_STORAGE_KEY) || '{}')
    const totalRate = normalizeGstRate(saved.totalRate)
    const rates = [...new Set((Array.isArray(saved.rates) ? saved.rates : [totalRate]).map(normalizeGstRate))].sort((a, b) => a - b)
    if (!rates.includes(totalRate)) rates.push(totalRate)
    return { totalRate, rates: rates.sort((a, b) => a - b), cgstRate: totalRate / 2, sgstRate: totalRate / 2 }
  } catch {
    return { totalRate: DEFAULT_TOTAL_GST_RATE, rates: DEFAULT_GST_RATES, cgstRate: DEFAULT_TOTAL_GST_RATE / 2, sgstRate: DEFAULT_TOTAL_GST_RATE / 2 }
  }
}

export function saveGstSettings(totalRate) {
  const rate = normalizeGstRate(totalRate)
  const current = getGstSettings()
  const settings = { totalRate: rate, rates: [...new Set([...current.rates, rate])].sort((a, b) => a - b) }
  localStorage.setItem(GST_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent('kalyankar-gst-settings-changed', { detail: settings }))
  return getGstSettings()
}

export function deleteGstRate(totalRate) {
  const current = getGstSettings()
  const rate = normalizeGstRate(totalRate)
  const rates = current.rates.filter((item) => item !== rate)
  if (!rates.length) return current
  const nextTotalRate = current.totalRate === rate ? rates[0] : current.totalRate
  localStorage.setItem(GST_SETTINGS_STORAGE_KEY, JSON.stringify({ totalRate: nextTotalRate, rates }))
  window.dispatchEvent(new CustomEvent('kalyankar-gst-settings-changed', { detail: { totalRate: nextTotalRate, rates } }))
  return getGstSettings()
}

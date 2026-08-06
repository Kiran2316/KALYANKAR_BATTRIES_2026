export function indianPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

export function isValidIndianPhone(value) {
  return indianPhoneDigits(value).length === 10
}

export function formatIndianPhone(value) {
  const digits = indianPhoneDigits(value)
  return digits.length === 10 ? `+91 ${digits}` : String(value || '').trim()
}

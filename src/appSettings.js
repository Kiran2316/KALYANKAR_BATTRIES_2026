import { formatIndianPhone } from './phoneFormat.js'

export const ADMIN_PROFILE_STORAGE_KEY = 'kalyankar-admin-profile'
export const PAYMENT_SETTINGS_STORAGE_KEY = 'kalyankar-payment-settings'
export const APP_SETTINGS_CHANGED_EVENT = 'kalyankar-app-settings-changed'

export function getAdminProfile() {
  try {
    return { name: 'Admin', email: 'kalyankarbatteries7273@gmail.com', phone: '', photo: '', ...JSON.parse(localStorage.getItem(ADMIN_PROFILE_STORAGE_KEY) || '{}') }
  } catch {
    return { name: 'Admin', email: 'kalyankarbatteries7273@gmail.com', phone: '', photo: '' }
  }
}

export function getPaymentSettings() {
  try {
    return { upiId: 'sidkalyankar23-4@okicici', qrImage: '', ...JSON.parse(localStorage.getItem(PAYMENT_SETTINGS_STORAGE_KEY) || '{}') }
  } catch {
    return { upiId: 'sidkalyankar23-4@okicici', qrImage: '' }
  }
}

export function saveAdminProfile(profile) {
  localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify({ ...profile, phone: profile.phone ? formatIndianPhone(profile.phone) : '' }))
  window.dispatchEvent(new Event(APP_SETTINGS_CHANGED_EVENT))
}

export function savePaymentSettings(settings) {
  localStorage.setItem(PAYMENT_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event(APP_SETTINGS_CHANGED_EVENT))
}

export function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Please select an image file.'))
    if (file.size > 2 * 1024 * 1024) return reject(new Error('Image must be smaller than 2 MB.'))
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
}

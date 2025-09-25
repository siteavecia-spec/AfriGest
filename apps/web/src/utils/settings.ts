export type CompanySettings = {
  name: string
  slogan?: string
  address?: string
  phone?: string
  logoDataUrl?: string // base64 or external URL
  receiptPrefix?: string // e.g., AG- or store code prefix
}

const SETTINGS_KEY = 'afrigest_company_settings'

export function loadCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { name: 'AfriGest Client', slogan: 'La gestion moderne, simple et accessible' }
    return JSON.parse(raw)
  } catch {
    return { name: 'AfriGest Client', slogan: 'La gestion moderne, simple et accessible' }
  }
}

export function saveCompanySettings(s: CompanySettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

function counterKey(boutiqueId: string) {
  return `afrigest_receipt_counter_${boutiqueId}`
}

export function getNextReceiptNumber(boutiqueId: string, prefix?: string) {
  const key = counterKey(boutiqueId)
  const current = Number(localStorage.getItem(key) || '0')
  const next = current + 1
  localStorage.setItem(key, String(next))
  const padded = String(next).padStart(4, '0')
  return `${prefix ?? ''}${padded}`
}

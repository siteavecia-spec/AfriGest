export type CompanySettings = {
  name: string
  slogan?: string
  address?: string
  phone?: string
  logoDataUrl?: string // base64 or external URL
  receiptPrefix?: string // e.g., AG- or store code prefix
  currency?: string // e.g., XOF, GNF
  vatRate?: number // e.g., 18 for 18%
  // Optional: override currency/decimals per boutique
  boutiqueCurrencies?: Record<string, { currency: string; decimals?: number }>
}

const SETTINGS_KEY = 'afrigest_company_settings'

export function loadCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { name: 'AfriGest Client', slogan: 'La gestion moderne, simple et accessible', currency: 'XOF', vatRate: 18 }
    const parsed = JSON.parse(raw)
    return { currency: 'XOF', vatRate: 18, ...parsed }
  } catch {
    return { name: 'AfriGest Client', slogan: 'La gestion moderne, simple et accessible', currency: 'XOF', vatRate: 18 }
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

export function getCurrencyForBoutique(boutiqueId: string | undefined | null, settings: CompanySettings): { currency: string; decimals?: number } {
  try {
    const baseCurrency = settings.currency || 'XOF'
    if (!boutiqueId || boutiqueId === 'all') return { currency: baseCurrency, decimals: undefined }
    const map = settings.boutiqueCurrencies || {}
    const found = map[boutiqueId]
    if (found && found.currency) return { currency: found.currency, decimals: found.decimals }
    return { currency: baseCurrency, decimals: undefined }
  } catch {
    return { currency: settings.currency || 'XOF', decimals: undefined }
  }
}

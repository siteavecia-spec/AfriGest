export function formatGNF(amount: number) {
  // Format in French locale without decimals typically for GNF, but keep 0 decimals by default
  try {
    return amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' GNF'
  } catch {
    return `${Math.round(amount)} GNF`
  }
}

export function formatCurrency(amount: number, currency: string) {
  try {
    // Default to 0 decimals for West/Central African currencies; adjust if needed later
    return amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' ' + (currency || '')
  } catch {
    return `${Math.round(amount)} ${currency || ''}`
  }
}

export function formatCurrencyWithDecimals(amount: number, currency: string, decimals?: number) {
  try {
    const max = (decimals ?? 0)
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: max, maximumFractionDigits: max }) + ' ' + (currency || '')
  } catch {
    const rounded = (decimals ?? 0) > 0 ? Number(amount).toFixed(decimals as number) : String(Math.round(amount))
    return `${rounded} ${currency || ''}`
  }
}

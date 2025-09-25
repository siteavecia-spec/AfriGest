export function formatGNF(amount: number) {
  // Format in French locale without decimals typically for GNF, but keep 0 decimals by default
  try {
    return amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' GNF'
  } catch {
    return `${Math.round(amount)} GNF`
  }
}

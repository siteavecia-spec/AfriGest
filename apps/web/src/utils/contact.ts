export function getWhatsAppNumberE164(): string {
  // Read from Vite env; expected format: digits only, country code included (E.164 without plus), or with +
  const raw = (import.meta as any)?.env?.VITE_WHATSAPP_NUMBER as string | undefined
  // Default: Guinea number +224 620 63 57 64 in compact E.164
  const fallback = '+224620635764'
  const val = (raw && raw.trim()) ? raw.trim() : fallback
  // Normalize to +digits only
  const cleaned = val.replace(/\s+/g, '')
  if (cleaned.startsWith('+')) return cleaned
  return '+' + cleaned
}

export function getWhatsAppHref(message?: string): string {
  const num = getWhatsAppNumberE164().replace(/^\+/, '') // wa.me requires digits only
  const base = `https://wa.me/${num}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export type ParsedError = {
  message: string
  reqId?: string
  statusHint?: number
}

export function parseError(err: unknown): ParsedError {
  const raw = String((err as any)?.message || err || '')
  const match = raw.match(/ReqID:\s*([\w-]+)/i)
  const reqId = match?.[1]
  // Best-effort status extraction
  let statusHint: number | undefined
  if (/\b429\b/.test(raw)) statusHint = 429
  else if (/\b5\d{2}\b/.test(raw)) statusHint = 500
  const message = raw.replace(/\s*\(ReqID:[^)]+\)\s*$/, '')
  return { message, reqId, statusHint }
}

export function humanizeError(e: ParsedError): string {
  if (e.statusHint === 429) {
    return `${e.message || 'Trop de requêtes'}${e.reqId ? ` (ReqID: ${e.reqId})` : ''}`
  }
  return `${e.message || 'Une erreur est survenue'}${e.reqId ? ` (ReqID: ${e.reqId})` : ''}`
}

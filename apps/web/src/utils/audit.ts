export type AuditRecord = { at: string; actor?: string; action: string; module?: string; entityId?: string; details?: string }

const KEY = 'afrigest_audit_log'

export function appendAudit(rec: Omit<AuditRecord, 'at' | 'actor'>) {
  try {
    const now = new Date().toISOString()
    const actor = (typeof window !== 'undefined' ? localStorage.getItem('afrigest_user_name') : null) || undefined
    const raw = localStorage.getItem(KEY)
    const list: AuditRecord[] = raw ? JSON.parse(raw) : []
    list.push({ at: now, actor, ...rec })
    // Keep last 2000 entries to avoid unbounded growth
    const trimmed = list.slice(-2000)
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {}
}

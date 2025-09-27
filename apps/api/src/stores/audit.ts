export interface AuditEvent {
  at: string
  actor?: string
  action: string
  resource: string
  metadata?: any
  ip?: string
}

export const auditEvents: AuditEvent[] = []

export function pushAudit(e: AuditEvent) {
  auditEvents.push(e)
  // Trim to last 10k events to avoid unbounded growth
  if (auditEvents.length > 10000) auditEvents.splice(0, auditEvents.length - 10000)
}

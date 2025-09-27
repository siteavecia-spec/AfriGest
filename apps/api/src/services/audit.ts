// Minimal audit log utility (non-breaking). You can later persist to DB or external log service.
// Usage example:
//   await audit({ userId, tenantId, action: 'update', resource: 'stock', meta: { sku, qty } })

export type AuditEntry = {
  userId?: string | null
  tenantId?: string | null
  action: string
  resource: string
  meta?: Record<string, any>
  at?: string
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const payload: AuditEntry = {
      ...entry,
      at: entry.at || new Date().toISOString(),
    }
    // For now, console; replace with DB insert or external log pipeline
    // eslint-disable-next-line no-console
    console.info('[AUDIT]', JSON.stringify(payload))
  } catch {
    // ignore
  }
}

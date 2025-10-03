// Minimal audit log utility with optional Prisma persistence.
// Usage example:
//   await audit({ userId, tenantId, action: 'update', resource: 'stock', meta: { sku, qty } })
//   await auditReq(req, { userId, action: 'user.update', resource: userId, meta: {...} })

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

// Persist audit to tenant DB if Prisma is available; fallback to console
export async function auditReq(req: any, entry: AuditEntry): Promise<void> {
  try {
    const at = entry.at || new Date().toISOString()
    const prisma = await (async () => {
      try {
        const { getTenantClientFromReq } = await import('../db')
        return getTenantClientFromReq(req)
      } catch {
        return null
      }
    })()
    if (prisma && (prisma as any).auditLog) {
      const ip = (req.headers?.['x-forwarded-for'] || req.ip || '').toString()
      await (prisma as any).auditLog.create({ data: {
        actorId: entry.userId || (req as any)?.auth?.sub || null,
        role: (req as any)?.auth?.role || null,
        action: entry.action,
        resourceId: entry.resource,
        metadata: { ...(entry.meta || {}), module: entry.meta?.module },
        ip,
        at
      }})
      return
    }
  } catch {
    // fall through to console
  }
  return audit(entry)
}

import { getMasterPrisma } from './master'
import { getTenantPrisma } from './tenant'
import type { Request } from 'express'

export function getMasterClient() {
  return getMasterPrisma()
}

export function getTenantClientFromReq(req: Request) {
  const dbUrl = (req as any).tenantDbUrl as string | undefined
  if (!dbUrl) return null
  return getTenantPrisma(dbUrl)
}

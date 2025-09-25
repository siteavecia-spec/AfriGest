import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

// For MVP: read tenant key from header 'x-company' or query 'company'
export function tenantResolver(req: Request, _res: Response, next: NextFunction) {
  const key = (req.headers['x-company'] || req.query.company || '').toString()
  ;(req as any).tenantKey = key || null
  // Attach a tenant DB URL for the demo flow; later we will resolve from master DB
  if (key && key.toLowerCase() === 'demo') {
    ;(req as any).tenantDbUrl = env.TENANT_DATABASE_URL
  }
  next()
}

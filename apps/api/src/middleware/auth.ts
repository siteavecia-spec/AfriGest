import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { passwordRevokedAfter } from '../stores/memory'

export interface AuthPayload {
  sub: string
  role: 'super_admin' | 'support' | 'pdg' | 'dr' | 'dg' | 'manager_stock' | 'caissier' | 'employee' | 'ecom_manager' | 'ecom_ops' | 'marketing'
  support_until?: string
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Missing Authorization header' })
  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload & { iat?: number }
    // Optional invalidation: if client provides x-user-email, and we have a revocation timestamp for that email,
    // reject tokens issued before that timestamp (MVP until DB-backed users exist)
    const userEmailHeader = (req.headers['x-user-email'] || '').toString().trim()
    if (userEmailHeader) {
      const revokedAt = passwordRevokedAfter.get(userEmailHeader)
      if (revokedAt && payload.iat && payload.iat * 1000 < revokedAt) {
        return res.status(401).json({ error: 'Session invalidated, please login again' })
      }
    }
    // Allow support window override via header (MVP). Only attach if present and role is support or header provided.
    const supportUntilHeader = (req.headers['x-support-until'] || '').toString().trim()
    const enriched: AuthPayload = { ...payload }
    if (supportUntilHeader) enriched.support_until = supportUntilHeader
    ;(req as any).auth = enriched
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

import { Request, Response, NextFunction } from 'express'

export function requireRole(...allowed: Array<'super_admin' | 'pdg' | 'dg' | 'employee'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth
    if (!auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!allowed.includes(auth.role)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

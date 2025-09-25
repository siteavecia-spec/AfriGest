import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export type Role = 'super_admin' | 'pdg' | 'dg' | 'employee'

export function signAccessToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role, typ: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
}

export function verifyRefreshToken(token: string) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role: Role }
  return payload
}

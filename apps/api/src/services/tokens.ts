import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import type { SignOptions, Secret } from 'jsonwebtoken'

export type Role = 'super_admin' | 'pdg' | 'dg' | 'employee'

export function signAccessToken(userId: string, role: Role) {
  const opts: SignOptions = { expiresIn: env.ACCESS_TTL as any }
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET as Secret, opts)
}

export function signRefreshToken(userId: string, role: Role) {
  const opts: SignOptions = { expiresIn: env.REFRESH_TTL as any }
  return jwt.sign({ sub: userId, role, typ: 'refresh' }, env.JWT_REFRESH_SECRET as Secret, opts)
}

export function verifyRefreshToken(token: string) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role: Role }
  return payload
}

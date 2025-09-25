import { Router } from 'express'
import { z } from 'zod'
import { signAccessToken, signRefreshToken, verifyRefreshToken, Role } from '../services/tokens'
import bcrypt from 'bcryptjs'
import { getTenantPrisma } from '../db/tenant'
import { env } from '../config/env'
import crypto from 'crypto'
import { sendEmailVerification } from '../services/notify'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  company: z.string().min(1)
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })

  const { email, password, company } = parsed.data

  // Resolve tenant DB URL (MVP: support demo tenant)
  const headerDbUrl = (req as any).tenantDbUrl as string | undefined
  const dbUrl = headerDbUrl || (company.toLowerCase() === 'demo' ? env.TENANT_DATABASE_URL : undefined)
  if (!dbUrl) return res.status(400).json({ error: 'Unknown company/tenant' })

  try {
    const prisma = getTenantPrisma(dbUrl)
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.status && user.status !== 'active') return res.status(403).json({ error: 'User disabled' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    // Update last login (best-effort)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})

    const role = user.role as Role
    const accessToken = signAccessToken(user.id, role)
    const refreshToken = signRefreshToken(user.id, role)
    // Create refresh session (30 days)
    const ua = (req.headers['user-agent'] || '').toString()
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.refreshSession.create({ data: { userId: user.id, refreshToken, userAgent: ua, ip, expiresAt } })
    return res.json({ accessToken, refreshToken, role })
  } catch (e) {
    return res.status(500).json({ error: 'Login failed' })
  }
})

const refreshSchema = z.object({ refreshToken: z.string().min(10) })
router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  try {
    const token = parsed.data.refreshToken
    const payload = verifyRefreshToken(token)
    // Check session in tenant DB
    const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
    const prisma = getTenantPrisma(dbUrl)
    const session = await prisma.refreshSession.findUnique({ where: { refreshToken: token } })
    if (!session || session.revokedAt) return res.status(401).json({ error: 'Invalid refresh token' })
    if (session.expiresAt.getTime() < Date.now()) return res.status(401).json({ error: 'Refresh token expired' })
    // Rotate: revoke old and issue new
    const newAccess = signAccessToken(payload.sub, payload.role)
    const newRefresh = signRefreshToken(payload.sub, payload.role)
    const ua = (req.headers['user-agent'] || '').toString()
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.$transaction([
      prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      prisma.refreshSession.create({ data: { userId: payload.sub, refreshToken: newRefresh, userAgent: ua, ip, expiresAt } })
    ])
    return res.json({ accessToken: newAccess, refreshToken: newRefresh })
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

const logoutSchema = z.object({ refreshToken: z.string().min(10).optional() })
router.post('/logout', async (req, res) => {
  // Prefer revoking the refresh token if provided; still respond ok if not
  const parsed = logoutSchema.safeParse(req.body || {})
  const token = parsed.success ? parsed.data.refreshToken : undefined
  if (token) {
    try {
      const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
      const prisma = getTenantPrisma(dbUrl)
      await prisma.refreshSession.update({ where: { refreshToken: token }, data: { revokedAt: new Date() } })
    } catch {}
  }
  return res.json({ ok: true })
})

// Admin-only register, with bootstrap when tenant has no users yet
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(['super_admin', 'pdg', 'dg', 'employee']).optional().default('employee'),
  company: z.string().min(1)
})

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { email, password, fullName, role, company } = parsed.data

  const dbUrl = (req as any).tenantDbUrl || (company.toLowerCase() === 'demo' ? env.TENANT_DATABASE_URL : undefined)
  if (!dbUrl) return res.status(400).json({ error: 'Unknown company/tenant' })

  try {
    const prisma = getTenantPrisma(dbUrl)
    const count = await prisma.user.count()

    // Authorization: allow bootstrap if no users exist; otherwise require admin roles from JWT
    let canCreate = false
    let desiredRole = role
    if (count === 0) {
      // First user becomes super_admin by default
      desiredRole = 'super_admin'
      canCreate = true
    } else {
      const auth = (req as any).auth as { role?: Role } | undefined
      if (auth && ['super_admin', 'pdg', 'dg'].includes(auth.role as string)) {
        canCreate = true
      }
    }

    if (!canCreate) return res.status(403).json({ error: 'Forbidden' })

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (exists) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 10)
    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        role: desiredRole as any,
        status: 'active'
      },
      select: { id: true, email: true, fullName: true, role: true }
    })
    // Create email verification token (24h) and send email
    try {
      const token = crypto.randomBytes(24).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.emailVerification.create({ data: { userId: created.id, email: created.email, token, expiresAt } })
      const webUrl = process.env.WEB_URL || 'http://localhost:5173'
      const link = `${webUrl}/verify-email?token=${encodeURIComponent(token)}`
      await sendEmailVerification(created.email, link)
    } catch {}
    return res.status(201).json(created)
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed' })
  }
})

// Verify email by token
const verifyQuery = z.object({ token: z.string().min(10) })
router.get('/verify-email', async (req, res) => {
  const parsed = verifyQuery.safeParse({ token: req.query.token })
  if (!parsed.success) return res.status(400).json({ error: 'Invalid token' })
  const token = parsed.data.token
  const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
  const prisma = getTenantPrisma(dbUrl)
  try {
    const rec = await prisma.emailVerification.findUnique({ where: { token } })
    if (!rec || rec.usedAt) return res.status(400).json({ error: 'Invalid token' })
    if (rec.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' })
    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } })
    ])
    return res.json({ ok: true })
  } catch {
    return res.status(400).json({ error: 'Invalid token' })
  }
})

export default router


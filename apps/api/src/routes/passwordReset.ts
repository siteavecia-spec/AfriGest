import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { sendSMS } from '../services/sms'
import { sendPasswordResetEmail } from '../services/notify'
import { passwordRevokedAfter } from '../stores/memory'
import { getTenantPrisma } from '../db/tenant'
import { env } from '../config/env'
import bcrypt from 'bcryptjs'

const router = Router()

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'dev-reset-secret'
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173'

// Very basic rate limiting (per IP) for forgot password
const rl = new Map<string, { count: number; windowStart: number }>()
const RL_WINDOW = 60 * 60 * 1000 // 1 hour
const RL_MAX = 3

function ipOf(req: any) {
  const xf = (req.headers['x-forwarded-for'] || '').toString()
  if (xf) return xf.split(',')[0].trim()
  return req.ip || req.connection?.remoteAddress || 'unknown'
}

function checkRL(ip: string) {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry) { rl.set(ip, { count: 1, windowStart: now }); return true }
  if (now - entry.windowStart > RL_WINDOW) { rl.set(ip, { count: 1, windowStart: now }); return true }
  if (entry.count >= RL_MAX) return false
  entry.count += 1
  rl.set(ip, entry)
  return true
}

const forgotSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  method: z.enum(['email', 'sms']).default('email'),
  captcha: z.string().optional()
})

router.post('/forgot-password', async (req, res) => {
  const ip = ipOf(req)
  if (!checkRL(ip)) return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' })
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  // reCAPTCHA check if enabled
  const recaptchaSecret = process.env.RECAPTCHA_SECRET
  if (recaptchaSecret) {
    const token = (parsed.data.captcha || '').toString()
    if (!token) return res.status(400).json({ error: 'Captcha requis' })
    try {
      const params = new URLSearchParams()
      params.set('secret', recaptchaSecret)
      params.set('response', token)
      params.set('remoteip', ip)
      const g = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params as any })
      const json: any = await g.json()
      if (!json.success) return res.status(400).json({ error: 'Captcha invalide' })
    } catch {
      return res.status(400).json({ error: 'Vérification captcha échouée' })
    }
  }

  const { email, phone, method } = parsed.data
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (method === 'email' ? 15 : 10) * 60 * 1000)

  const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
  const prisma = getTenantPrisma(dbUrl)

  if (method === 'email') {
    if (!email) return res.status(400).json({ error: 'Email requis' })
    const token = jwt.sign({ sub: email, type: 'password_reset' }, RESET_TOKEN_SECRET, { expiresIn: '15m', issuer: 'afrigest' })
    await prisma.passwordResetRequest.create({
      data: {
        userEmail: email.toLowerCase(),
        resetMethod: 'email',
        resetToken: token,
        expiresAt,
        ip,
        userAgent: (req.headers['user-agent'] || '').toString()
      }
    })
    const resetLink = `${WEB_URL}/reset-password?token=${encodeURIComponent(token)}`
    try { await sendPasswordResetEmail(email, resetLink) } catch {}
    return res.json({ ok: true })
  } else {
    if (!phone) return res.status(400).json({ error: 'Téléphone requis' })
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString()
    await prisma.passwordResetRequest.create({
      data: {
        userEmail: (email || '').toLowerCase(),
        phone,
        resetMethod: 'sms',
        otpCode: otp,
        expiresAt,
        ip,
        userAgent: (req.headers['user-agent'] || '').toString()
      }
    })
    try {
      await sendSMS({ to: phone, message: `Votre code de réinitialisation AfriGest : ${otp}. Valide 10 minutes.`, from: process.env.SMS_FROM || 'AFRIGEST' })
    } catch {}
    return res.json({ ok: true, otpSent: true })
  }
})

const validateSchema = z.object({ token: z.string().min(10).optional(), phone: z.string().optional(), otp: z.string().length(6).optional() })
router.post('/validate-reset-token', async (req, res) => {
  const parsed = validateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { token, phone, otp } = parsed.data
  const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
  const prisma = getTenantPrisma(dbUrl)
  if (token) {
    try {
      const payload = jwt.verify(token, RESET_TOKEN_SECRET) as any
      const found = await prisma.passwordResetRequest.findFirst({ where: { resetToken: token, used: false } })
      if (!found) return res.status(400).json({ error: 'Invalid or used token' })
      if (found.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' })
      return res.json({ ok: true, email: payload.sub })
    } catch {
      return res.status(400).json({ error: 'Invalid token' })
    }
  }
  // OTP path
  if (phone && otp) {
    const found = await prisma.passwordResetRequest.findFirst({ where: { phone, otpCode: otp, used: false }, orderBy: { createdAt: 'desc' } })
    if (!found) return res.status(400).json({ error: 'Invalid OTP' })
    if (found.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'OTP expired' })
    // Issue a short-lived token to reuse reset-password endpoint
    const emailVal = found.userEmail || `${phone}@placeholder.local`
    const shortToken = jwt.sign({ sub: emailVal, type: 'password_reset' }, RESET_TOKEN_SECRET, { expiresIn: '10m', issuer: 'afrigest' })
    await prisma.passwordResetRequest.update({ where: { id: found.id }, data: { resetToken: shortToken } })
    return res.json({ ok: true, email: emailVal, token: shortToken })
  }
  return res.status(400).json({ error: 'Invalid payload' })
})

const resetSchema = z.object({ token: z.string().min(10), newPassword: z.string().min(8), confirmPassword: z.string().min(8) })
router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { token, newPassword, confirmPassword } = parsed.data
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' })
  // Password rules (basic MVP); enhance per requirements later
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[\W_]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password does not meet complexity requirements' })
  }
  const COMMON = new Set<string>([
    'password','123456','123456789','azerty','qwerty','admin','administrator','welcome','passw0rd','p@ssw0rd','abc123','iloveyou','111111','123123','000000'
  ])
  if (COMMON.has(newPassword.toLowerCase())) {
    return res.status(400).json({ error: 'Password is too common' })
  }
  try {
    const payload = jwt.verify(token, RESET_TOKEN_SECRET) as any
    const dbUrl = (req as any).tenantDbUrl || env.TENANT_DATABASE_URL
    const prisma = getTenantPrisma(dbUrl)
    const found = await prisma.passwordResetRequest.findFirst({ where: { resetToken: token, used: false } })
    if (!found) return res.status(400).json({ error: 'Invalid or used token' })
    if (found.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' })

    const email = String(payload.sub || found.userEmail || '').toLowerCase()
    if (!email) return res.status(400).json({ error: 'No email bound to reset request' })

    // Update user password
    const hash = await bcrypt.hash(newPassword, 10)
    const updatedUser = await prisma.user.update({ where: { email }, data: { passwordHash: hash } })
    if (!updatedUser) return res.status(404).json({ error: 'User not found' })

    await prisma.passwordResetRequest.update({ where: { id: found.id }, data: { used: true } })
    if (email) passwordRevokedAfter.set(email, Date.now())
    return res.json({ ok: true, email })
  } catch {
    return res.status(400).json({ error: 'Invalid token' })
  }
})

export default router


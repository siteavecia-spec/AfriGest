import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { passwordResetRequests, PasswordResetRequest } from '../stores/memory'
import { notifyNewLead } from '../services/notify'

const router = Router()

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'dev-reset-secret'
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173'

const forceSchema = z.object({
  email: z.string().email(),
  tenant_id: z.string().optional(),
  reason: z.string().min(5)
})

router.post('/force-password-reset', requireAuth, requireRole('super_admin'), async (req, res) => {
  const parsed = forceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })

  const { email, reason } = parsed.data
  const now = new Date()
  const id = `prr-force-${now.getTime()}`
  const token = jwt.sign({ sub: email, type: 'password_reset' }, RESET_TOKEN_SECRET, { expiresIn: '15m', issuer: 'afrigest' })
  const reqObj: PasswordResetRequest = {
    id,
    userEmail: email,
    resetMethod: 'email',
    resetToken: token,
    used: false,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    ip: (req.ip || '').toString(),
    userAgent: (req.headers['user-agent'] || '').toString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
  passwordResetRequests.push(reqObj)

  const resetLink = `${WEB_URL}/reset-password?token=${encodeURIComponent(token)}`
  try {
    await notifyNewLead({
      id,
      name: email,
      company: 'Force Password Reset',
      email,
      createdAt: now.toISOString(),
      message: `Un administrateur a initié une réinitialisation: ${reason}\n\nLien: ${resetLink}`
    } as any)
  } catch {}

  return res.json({ ok: true })
})

export default router

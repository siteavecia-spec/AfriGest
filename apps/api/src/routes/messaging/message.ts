import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requirePermission } from '../../middleware/authorization'
import { getTenantClientFromReq } from '../../db'
import { sendMessage } from '../../services/messaging/messageService'
import { getIO } from '../../ws'
import { auditReq } from '../../services/audit'

const router = Router({ mergeParams: true })

// Simple in-memory rate limit per user (MVP)
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 30
const rateMap = new Map<string, { windowStart: number; count: number }>()

// POST /api/tenants/:tenantId/messaging/message
router.post('/', requireAuth, requirePermission('messaging', 'create'), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const auth = (req as any).auth as { sub: string; role: 'super_admin' | 'pdg' | 'dg' | 'employee' }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  const { toUserId, content, related } = req.body || {}
  if (!toUserId || !content) return res.status(400).json({ error: 'Missing toUserId or content' })
  // Sanitation & limits
  const trimmed = String(content).trim()
  if (!trimmed) return res.status(400).json({ error: 'Empty content' })
  if (trimmed.length > 2000) return res.status(413).json({ error: 'Message too long (max 2000 chars)' })
  // Rate limit per sender
  const now = Date.now()
  const key = `${tenantId}:${auth.sub}`
  const cur = rateMap.get(key)
  if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { windowStart: now, count: 1 })
  } else {
    if (cur.count >= RATE_MAX) return res.status(429).json({ error: 'Rate limit exceeded, try again later' })
    cur.count += 1
  }
  try {
    // Permissions matrix (MVP): employee cannot initiate to PDG
    if (auth.role === 'employee') {
      try {
        const target = await (prisma as any).user.findUnique({ where: { id: toUserId }, select: { role: true } })
        if (target?.role === 'pdg') {
          try {
            await (prisma as any).messagingAuditLog.create({ data: { tenantId, userId: auth.sub, action: 'forbidden_attempt', entityType: 'message', entityId: null, details: { toUserId, reason: 'employee_to_pdg' }, createdAt: new Date() } })
          } catch {}
          return res.status(403).json({ error: 'Forbidden: employees cannot initiate to PDG' })
        }
      } catch {}
    }
    const { message } = await sendMessage(prisma as any, { tenantId, fromUserId: auth.sub, toUserId, content: trimmed, related })
    // Broadcast WS
    const io = getIO()
    if (io) {
      io.to(`user:${toUserId}`).emit('messaging:new', { conversationId: message.conversationId, message })
      io.to(`user:${auth.sub}`).emit('messaging:new', { conversationId: message.conversationId, message })
    }
    // Audit best-effort
    try { await auditReq(req, { action: 'messaging.message.send', resource: message.id, userId: auth.sub, meta: { toUserId } }) } catch {}
    return res.status(201).json({ ok: true, message })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to send message' })
  }
})

export default router

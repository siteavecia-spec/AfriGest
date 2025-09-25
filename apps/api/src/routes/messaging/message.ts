import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { getTenantClientFromReq } from '../../db'
import { sendMessage } from '../../services/messaging/messageService'
import { getIO } from '../../ws'

const router = Router({ mergeParams: true })

// POST /api/tenants/:tenantId/messaging/message
router.post('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const auth = (req as any).auth as { sub: string; role: 'super_admin' | 'pdg' | 'dg' | 'employee' }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  const { toUserId, content, related } = req.body || {}
  if (!toUserId || !content) return res.status(400).json({ error: 'Missing toUserId or content' })
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
    const { message } = await sendMessage(prisma as any, { tenantId, fromUserId: auth.sub, toUserId, content, related })
    // Broadcast WS
    const io = getIO()
    if (io) {
      io.to(`user:${toUserId}`).emit('messaging:new', { conversationId: message.conversationId, message })
      io.to(`user:${auth.sub}`).emit('messaging:new', { conversationId: message.conversationId, message })
    }
    return res.status(201).json({ ok: true, message })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to send message' })
  }
})

export default router

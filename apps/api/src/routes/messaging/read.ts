import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { getTenantClientFromReq } from '../../db'
import { getIO } from '../../ws'

const router = Router({ mergeParams: true })

// PUT /api/tenants/:tenantId/messaging/:messageId/read
router.put('/:messageId/read', requireAuth, async (req, res) => {
  const { tenantId, messageId } = req.params as { tenantId: string; messageId: string }
  const auth = (req as any).auth as { sub: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  try {
    const msg = await (prisma as any).message.update({ where: { id: messageId }, data: { read: true, readAt: new Date() } })
    // Broadcast read receipt
    const io = getIO()
    if (io) {
      io.to(`tenant:${tenantId}`).emit('messaging:read', { messageId: msg.id, readAt: msg.readAt })
    }
    // Audit best-effort
    try { await (prisma as any).messagingAuditLog.create({ data: { tenantId, userId: auth.sub, action: 'message.read', entityType: 'message', entityId: messageId, createdAt: new Date() } }) } catch {}
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to mark as read' })
  }
})

export default router

import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { computeAlerts } from '../services/alerts'
import { notifyEvent } from '../services/notify'

const router = Router()

// GET /alerts?days=30&sector=pharmacy|electronics|grocery|beauty|all
router.get('/', requireAuth, async (req, res) => {
  const schema = z.object({ days: z.string().optional(), sector: z.string().optional() })
  const parsed = schema.safeParse({ days: req.query.days, sector: req.query.sector })
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const daysNum = parsed.data.days ? Number(parsed.data.days) : undefined
  try {
    const data = await computeAlerts(req, { days: daysNum, sector: parsed.data.sector })
    return res.json(data)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to compute alerts' })
  }
})

export default router

// GET /alerts/digest?days=30&sector=all&to=email@example.com
router.get('/digest', requireAuth, async (req, res) => {
  const schema = z.object({ days: z.string().optional(), sector: z.string().optional(), to: z.string().email().optional() })
  const parsed = schema.safeParse({ days: req.query.days, sector: req.query.sector, to: req.query.to })
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const daysNum = parsed.data.days ? Number(parsed.data.days) : undefined
  try {
    const data = await computeAlerts(req, { days: daysNum, sector: parsed.data.sector })
    const total = (data.expired?.length || 0) + (data.expiringSoon?.length || 0) + (data.warrantyExpiring?.length || 0)
    const lines: string[] = []
    lines.push(`Alertes totales: ${total}`)
    lines.push(`Expirés: ${data.expired.length}`)
    data.expired.slice(0, 10).forEach(a => lines.push(` - [EXPIRÉ] ${a.sku} ${a.name} • ${a.date || ''}`))
    lines.push(`Bientôt expirés: ${data.expiringSoon.length}`)
    data.expiringSoon.slice(0, 10).forEach(a => lines.push(` - [BIENTÔT] ${a.sku} ${a.name} • ${a.date || ''}`))
    lines.push(`Garanties bientôt expirées: ${data.warrantyExpiring.length}`)
    data.warrantyExpiring.slice(0, 10).forEach(a => lines.push(` - [GARANTIE] ${a.sku} ${a.name} • ${a.date || ''}`))
    const text = lines.join('\n')
    try { await notifyEvent('[AfriGest] Digest d\'alertes', text, parsed.data.to) } catch {}
    return res.json({ ok: true, total, preview: lines.slice(0, 15) })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to compute digest' })
  }
})

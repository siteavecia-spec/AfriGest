import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

// Admin routes (stubs) for referrals program
// NOTE: To be wired in src/index.ts when backend DB is ready
const router = Router()

// Admin overview: KPIs, top ambassadors
router.get('/overview', requireAuth, requireRole('super_admin'), async (req, res) => {
  // TODO: implement with Prisma aggregations once DB is configured
  return res.json({
    totalReferralRequests: 0,
    approvedRequests: 0,
    pendingRewards: 0,
    paidRewards: 0,
    topAmbassadors: [] as Array<{ userId: string; fullName?: string; count: number }>
  })
})

// List referral requests with filters (status, period, pagination)
router.get('/requests', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { status = 'pending', limit = '20', offset = '0' } = req.query as Record<string, string>
  // TODO: query Prisma ReferralRequest with filters
  return res.json({ items: [], total: 0, limit: Number(limit), offset: Number(offset), status })
})

// Validate/approve a referral request
router.post('/rewards/validate/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params
  // TODO: set request approved and (later) create pending reward after onboarding link
  return res.json({ ok: true, id })
})

// Mark reward as paid
router.post('/rewards/pay/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params
  // TODO: update ReferralReward status to paid
  return res.json({ ok: true, id })
})

export default router

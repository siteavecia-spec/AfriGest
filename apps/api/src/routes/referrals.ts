import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { referralCodes, demoRequests } from '../stores/memory'

const router = Router()

function companyFromReq(req: any): string {
  const h = (req.headers['x-company'] || '').toString()
  return h || 'DEMO'
}

function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `AFG-${s}`
}

router.get('/code', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const company = companyFromReq(req)
  let entry = referralCodes.find(r => (r.owner === company) && r.isActive)
  if (!entry) {
    entry = { code: genCode(), owner: company, isActive: true }
    referralCodes.push(entry)
  }
  return res.json({ code: entry.code, company })
})

router.get('/leads', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const company = companyFromReq(req)
  const active = referralCodes.find(r => r.owner === company && r.isActive)
  if (!active) return res.json([])
  const code = active.code.toLowerCase()
  const rows = demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return res.json(rows)
})

router.post('/generate', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const company = companyFromReq(req)
  // deactivate old
  referralCodes.forEach(r => { if (r.owner === company) r.isActive = false })
  const entry = { code: genCode(), owner: company, isActive: true }
  referralCodes.push(entry)
  return res.status(201).json({ code: entry.code, company })
})

router.get('/stats', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const company = companyFromReq(req)
  const active = referralCodes.find(r => r.owner === company && r.isActive)
  if (!active) return res.json({ totalLeads: 0, leadsThisMonth: 0 })
  const code = active.code
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const monthStart = new Date(y, m, 1).getTime()
  const totalLeads = demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code.toLowerCase()).length
  const leadsThisMonth = demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code.toLowerCase() && new Date(d.createdAt).getTime() >= monthStart).length
  return res.json({ totalLeads, leadsThisMonth })
})

export default router

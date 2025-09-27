"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
// Admin routes (stubs) for referrals program
// NOTE: To be wired in src/index.ts when backend DB is ready
const router = (0, express_1.Router)();
// Admin overview: KPIs, top ambassadors
router.get('/overview', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), async (req, res) => {
    // TODO: implement with Prisma aggregations once DB is configured
    return res.json({
        totalReferralRequests: 0,
        approvedRequests: 0,
        pendingRewards: 0,
        paidRewards: 0,
        topAmbassadors: []
    });
});
// List referral requests with filters (status, period, pagination)
router.get('/requests', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), async (req, res) => {
    const { status = 'pending', limit = '20', offset = '0' } = req.query;
    // TODO: query Prisma ReferralRequest with filters
    return res.json({ items: [], total: 0, limit: Number(limit), offset: Number(offset), status });
});
// Validate/approve a referral request
router.post('/rewards/validate/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), async (req, res) => {
    const { id } = req.params;
    // TODO: set request approved and (later) create pending reward after onboarding link
    return res.json({ ok: true, id });
});
// Mark reward as paid
router.post('/rewards/pay/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), async (req, res) => {
    const { id } = req.params;
    // TODO: update ReferralReward status to paid
    return res.json({ ok: true, id });
});
exports.default = router;

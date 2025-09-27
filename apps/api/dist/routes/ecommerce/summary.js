"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const orderService_1 = require("../../services/ecommerce/orderService");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/summary
// Basic placeholders for KPIs until real analytics are implemented
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid } = await (0, orderService_1.getTodayOnlineKPIs)(tenantId, prisma);
    // MVP: conversionRate placeholder (to be replaced with real analytics)
    const conversionRate = 0;
    return res.json({ tenantId, today: { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid, conversionRate } });
});
exports.default = router;

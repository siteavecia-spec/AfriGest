"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentService_1 = require("../../services/ecommerce/paymentService");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// Stripe webhooks (optionnel en Phase 1). Attention: nécessite raw body middleware si vous validez la signature.
router.post('/stripe', async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handleStripeWebhook)(req, res, prisma, tenantId);
});
exports.default = router;

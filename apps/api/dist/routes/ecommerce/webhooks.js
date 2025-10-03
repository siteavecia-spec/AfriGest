"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const paymentService_1 = require("../../services/ecommerce/paymentService");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// Stripe webhooks (optionnel en Phase 1). Attention: nécessite raw body middleware si vous validez la signature.
router.post('/stripe', express_1.default.raw({ type: '*/*' }), async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handleStripeWebhook)(req, res, prisma, tenantId);
});
// PayPal webhooks
router.post('/paypal', express_1.default.json(), async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handlePayPalWebhook)(req, res, prisma, tenantId);
});
// MTN MoMo webhooks
router.post('/mtn', express_1.default.json(), async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handleMtnWebhook)(req, res, prisma, tenantId);
});
// Orange MoMo webhooks
router.post('/orange', express_1.default.json(), async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handleOrangeWebhook)(req, res, prisma, tenantId);
});
exports.default = router;

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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const svc = __importStar(require("../services/stock"));
const router = (0, express_1.Router)();
// GET /stock/summary?boutiqueId=...
router.get('/summary', auth_1.requireAuth, async (req, res) => {
    const boutiqueId = (req.query.boutiqueId || '').toString();
    if (!boutiqueId)
        return res.status(400).json({ error: 'Missing boutiqueId' });
    const out = await svc.getStockSummary(req, boutiqueId);
    res.json(out);
});
// POST /stock/entries
const entrySchema = zod_1.z.object({
    boutiqueId: zod_1.z.string().min(1),
    reference: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({ productId: zod_1.z.string().min(1), quantity: zod_1.z.number().int().positive(), unitCost: zod_1.z.number().nonnegative() })).min(1).max(100)
});
router.post('/entries', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { boutiqueId } = parsed.data;
    const bq = memory_1.boutiques.find(b => b.id === boutiqueId);
    if (!bq)
        return res.status(404).json({ error: 'Boutique not found' });
    const out = await svc.createStockEntry(req, parsed.data);
    return res.status(201).json(out);
});
// POST /stock/adjust
const adjustSchema = zod_1.z.object({
    boutiqueId: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1),
    delta: zod_1.z.number().int(),
    reason: zod_1.z.string().min(1)
});
router.post('/adjust', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { boutiqueId, productId, delta, reason } = parsed.data;
    const bq = memory_1.boutiques.find(b => b.id === boutiqueId);
    if (!bq)
        return res.status(404).json({ error: 'Boutique not found' });
    const prod = memory_1.products.find(p => p.id === productId);
    if (!prod)
        return res.status(404).json({ error: 'Product not found' });
    const out = await svc.adjustStock(req, { boutiqueId, productId, delta, reason });
    return res.status(201).json(out);
});
// GET /stock/audit?productId=...&limit=...
router.get('/audit', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const productId = (req.query.productId || '').toString();
    const rawLimit = Number((req.query.limit || 50).toString());
    const limit = Math.max(1, Math.min(200, Number.isFinite(rawLimit) ? rawLimit : 50));
    if (!productId)
        return res.status(400).json({ error: 'Missing productId' });
    const rows = await svc.getStockAudit(req, productId, limit);
    return res.json(rows);
});
exports.default = router;

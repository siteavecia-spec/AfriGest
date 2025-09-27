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
const auth_1 = require("../../middleware/auth");
const orderService_1 = require("../../services/ecommerce/orderService");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/orders
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const { items, total } = await (0, orderService_1.listOrders)(tenantId, Number(limit), Number(offset), prisma);
    return res.json({ items, total, limit: Number(limit), offset: Number(offset), tenantId });
});
// POST /api/tenants/:tenantId/ecommerce/orders (create order from storefront)
const createSchema = zod_1.z.object({
    customer: zod_1.z.object({ email: zod_1.z.string().email().optional(), phone: zod_1.z.string().optional(), firstName: zod_1.z.string().optional(), lastName: zod_1.z.string().optional() }).optional(),
    items: zod_1.z.array(zod_1.z.object({ sku: zod_1.z.string(), quantity: zod_1.z.number().int().positive(), price: zod_1.z.number().nonnegative(), currency: zod_1.z.string().default('GNF') })),
    shippingAddress: zod_1.z.object({ line1: zod_1.z.string(), city: zod_1.z.string(), country: zod_1.z.string().default('GN'), postalCode: zod_1.z.string().optional() }).optional(),
    payment: zod_1.z.object({ provider: zod_1.z.enum(['stripe', 'paypal', 'mtn_momo', 'orange_momo', 'cod']).default('cod') }).optional(),
    notes: zod_1.z.string().optional()
});
router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const provider = parsed.data.payment?.provider || 'cod';
    if (provider === 'cod') {
        const order = await (0, orderService_1.createOrder)({ tenantId, items: parsed.data.items, customerEmail: parsed.data.customer?.email, customerPhone: parsed.data.customer?.phone, currency: parsed.data.items[0]?.currency }, prisma);
        return res.status(201).json(order);
    }
    if (provider === 'stripe') {
        try {
            const { createStripePaymentIntent, isStripeEnabled } = await Promise.resolve().then(() => __importStar(require('../../services/ecommerce/paymentService')));
            if (!isStripeEnabled())
                return res.status(400).json({ error: 'Stripe not configured' });
            const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
            const currency = parsed.data.items[0]?.currency || 'GNF';
            // If Prisma is available, create a pending order to reconcile on webhook
            let orderId;
            if (prisma?.ecommerceOrder) {
                const created = await prisma.ecommerceOrder.create({
                    data: {
                        total,
                        currency,
                        status: 'received',
                        paymentStatus: 'pending',
                        customer: parsed.data.customer?.email ? { connectOrCreate: { where: { email: parsed.data.customer.email }, create: { email: parsed.data.customer.email, phone: parsed.data.customer.phone, firstName: parsed.data.customer.firstName, lastName: parsed.data.customer.lastName } } } : undefined,
                        items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
                    },
                    select: { id: true }
                });
                orderId = created.id;
            }
            const intent = await createStripePaymentIntent(Math.round(total), currency, { tenantId, ...(orderId ? { orderId } : {}) });
            return res.status(200).json({ payment: { provider: 'stripe', clientSecret: intent.clientSecret }, orderId });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Stripe error' });
        }
    }
    return res.status(400).json({ error: 'Unsupported payment provider' });
});
// PATCH /api/tenants/:tenantId/ecommerce/orders/:orderId (update status)
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(['received', 'prepared', 'shipped', 'delivered', 'returned']) });
router.patch('/:orderId', auth_1.requireAuth, async (req, res) => {
    const { orderId } = req.params;
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const updated = await (0, orderService_1.updateOrderStatus)(orderId, parsed.data.status, prisma);
    if (!updated)
        return res.status(404).json({ error: 'Order not found' });
    return res.json(updated);
});
exports.default = router;

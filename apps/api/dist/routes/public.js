"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const memory_1 = require("../stores/memory");
const notify_1 = require("../services/notify");
const router = (0, express_1.Router)();
const rlMap = new Map();
const WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ? Number(process.env.RATE_LIMIT_WINDOW_MS) : 60000;
const MAX_REQ = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 5;
function clientIp(req) {
    const xf = (req.headers['x-forwarded-for'] || '').toString();
    if (xf)
        return xf.split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || 'unknown';
}
function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rlMap.get(ip);
    if (!entry) {
        rlMap.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (now - entry.windowStart > WINDOW_MS) {
        rlMap.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= MAX_REQ)
        return false;
    entry.count += 1;
    rlMap.set(ip, entry);
    return true;
}
// Top clients (public): returns top 5 by score
router.get('/clients-top', (_req, res) => {
    const top = [...memory_1.publicClients].sort((a, b) => b.score - a.score).slice(0, 5);
    res.json(top);
});
// Demo request (public)
const demoSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    company: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
    referralCode: zod_1.z.string().optional(),
    honeypot: zod_1.z.string().optional()
});
router.post('/demo-requests', async (req, res) => {
    const ip = clientIp(req);
    if (!checkRateLimit(ip))
        return res.status(429).json({ error: 'Trop de requêtes, réessayez plus tard.' });
    const parsed = demoSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    // Honeypot check
    if ((parsed.data.honeypot || '').trim())
        return res.status(400).json({ error: 'Invalid payload' });
    // Validate referral code if provided
    if (parsed.data.referralCode) {
        const exists = memory_1.referralCodes.some(r => r.isActive && r.code.toLowerCase() === parsed.data.referralCode.toLowerCase());
        if (!exists)
            return res.status(400).json({ error: 'Invalid referral code' });
    }
    const id = `demo-${Date.now()}`;
    const row = { id, ...parsed.data, createdAt: new Date().toISOString() };
    memory_1.demoRequests.push(row);
    // Fire-and-forget notification (logs if SMTP not configured)
    try {
        const extraCc = [];
        if (parsed.data.referralCode) {
            const ref = memory_1.referralCodes.find(r => r.isActive && r.code.toLowerCase() === parsed.data.referralCode.toLowerCase());
            if (ref?.ownerEmail)
                extraCc.push(ref.ownerEmail);
        }
        await (0, notify_1.notifyNewLead)(row, extraCc);
    }
    catch { }
    res.status(201).json({ ok: true });
});
// Validate referral code (public)
router.get('/referrals/validate', (req, res) => {
    const code = (req.query.code || '').toString().trim();
    if (!code)
        return res.status(400).json({ ok: false, error: 'Missing code' });
    const found = memory_1.referralCodes.find(r => r.isActive && r.code.toLowerCase() === code.toLowerCase());
    if (!found)
        return res.json({ ok: false });
    return res.json({ ok: true, owner: found.owner || null });
});
exports.default = router;

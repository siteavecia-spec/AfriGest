"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const alerts_1 = require("../services/alerts");
const notify_1 = require("../services/notify");
const router = (0, express_1.Router)();
// GET /alerts?days=30&sector=pharmacy|electronics|grocery|beauty|all
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ days: zod_1.z.string().optional(), sector: zod_1.z.string().optional() });
    const parsed = schema.safeParse({ days: req.query.days, sector: req.query.sector });
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid query' });
    const daysNum = parsed.data.days ? Number(parsed.data.days) : undefined;
    try {
        const data = await (0, alerts_1.computeAlerts)(req, { days: daysNum, sector: parsed.data.sector });
        return res.json(data);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to compute alerts' });
    }
});
exports.default = router;
// GET /alerts/digest?days=30&sector=all&to=email@example.com
router.get('/digest', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ days: zod_1.z.string().optional(), sector: zod_1.z.string().optional(), to: zod_1.z.string().email().optional() });
    const parsed = schema.safeParse({ days: req.query.days, sector: req.query.sector, to: req.query.to });
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid query' });
    const daysNum = parsed.data.days ? Number(parsed.data.days) : undefined;
    try {
        const data = await (0, alerts_1.computeAlerts)(req, { days: daysNum, sector: parsed.data.sector });
        const total = (data.expired?.length || 0) + (data.expiringSoon?.length || 0) + (data.warrantyExpiring?.length || 0);
        const lines = [];
        lines.push(`Alertes totales: ${total}`);
        lines.push(`Expirés: ${data.expired.length}`);
        data.expired.slice(0, 10).forEach(a => lines.push(` - [EXPIRÉ] ${a.sku} ${a.name} • ${a.date || ''}`));
        lines.push(`Bientôt expirés: ${data.expiringSoon.length}`);
        data.expiringSoon.slice(0, 10).forEach(a => lines.push(` - [BIENTÔT] ${a.sku} ${a.name} • ${a.date || ''}`));
        lines.push(`Garanties bientôt expirées: ${data.warrantyExpiring.length}`);
        data.warrantyExpiring.slice(0, 10).forEach(a => lines.push(` - [GARANTIE] ${a.sku} ${a.name} • ${a.date || ''}`));
        const text = lines.join('\n');
        try {
            await (0, notify_1.notifyEvent)('[AfriGest] Digest d\'alertes', text, parsed.data.to);
        }
        catch { }
        return res.json({ ok: true, total, preview: lines.slice(0, 15) });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to compute digest' });
    }
});

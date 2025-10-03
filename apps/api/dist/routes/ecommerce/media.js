"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const sign_1 = require("../../services/cdn/sign");
const rateLimit_1 = require("../../middleware/rateLimit");
const router = (0, express_1.Router)({ mergeParams: true });
// Targeted rate limit for signing: stricter than global
router.use((0, rateLimit_1.rateLimit)({ windowMs: 60000, limit: 60 }));
const querySchema = zod_1.z.object({
    path: zod_1.z.string().min(1)
});
function isSafePath(p) {
    // Prevent path traversal and enforce no scheme/host
    if (p.includes('..'))
        return false;
    if (p.startsWith('http:') || p.startsWith('https:'))
        return false;
    return true;
}
// GET /api/tenants/:tenantId/ecommerce/media/signed-url?path=tenants/{tenantId}/media/...
router.get('/signed-url', async (req, res) => {
    try {
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid query' });
        const { tenantId } = req.params;
        const rawPath = String(parsed.data.path);
        if (!isSafePath(rawPath))
            return res.status(400).json({ error: 'Invalid path' });
        // Ensure path is under the tenant namespace
        const expectedPrefix = `tenants/${tenantId}/`;
        const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
        if (!normalized.startsWith(expectedPrefix)) {
            return res.status(403).json({ error: 'Path does not belong to tenant' });
        }
        if (!env_1.env.CLOUDFRONT_DOMAIN || !env_1.env.CLOUDFRONT_KEY_PAIR_ID || !env_1.env.CLOUDFRONT_PRIVATE_KEY) {
            try {
                console.warn(JSON.stringify({ level: 'warn', msg: 'Signing requested but CloudFront not configured', reqId: req.reqId || '', tenantId }));
            }
            catch { }
            return res.status(400).json({ error: 'CloudFront not configured' });
        }
        const url = (0, sign_1.signCloudFrontUrl)(`/${normalized}`, {
            domain: env_1.env.CLOUDFRONT_DOMAIN,
            keyPairId: env_1.env.CLOUDFRONT_KEY_PAIR_ID,
            privateKey: env_1.env.CLOUDFRONT_PRIVATE_KEY,
            ttlSeconds: env_1.env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS || 300
        });
        try {
            console.log(JSON.stringify({ level: 'info', msg: 'Signed media URL issued', reqId: req.reqId || '', tenantId, keyPrefix: normalized.slice(0, 48) }));
        }
        catch { }
        return res.json({ url, expiresIn: env_1.env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS || 300 });
    }
    catch (e) {
        try {
            console.error(JSON.stringify({ level: 'error', msg: 'Signing failed', reqId: req.reqId || '', err: e?.message || String(e) }));
        }
        catch { }
        return res.status(500).json({ error: e?.message || 'Failed to sign URL' });
    }
});
exports.default = router;

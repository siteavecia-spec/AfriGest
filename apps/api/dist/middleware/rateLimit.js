"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const buckets = new Map();
function rateLimit(options) {
    const windowMs = options?.windowMs ?? 60000; // 1 minute
    const limit = options?.limit ?? 120; // 120 req/min per route per IP
    return function (req, res, next) {
        try {
            const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
            const key = `${ip}:${req.method}:${req.path}`;
            const now = Date.now();
            const bucket = buckets.get(key);
            if (!bucket || now >= bucket.resetAt) {
                buckets.set(key, { count: 1, resetAt: now + windowMs });
                try {
                    res.setHeader('X-RateLimit-Limit', String(limit));
                    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - 1)));
                }
                catch { }
                return next();
            }
            bucket.count += 1;
            if (bucket.count > limit) {
                const ttl = Math.max(0, bucket.resetAt - now);
                res.setHeader('Retry-After', String(Math.ceil(ttl / 1000)));
                try {
                    res.setHeader('X-RateLimit-Limit', String(limit));
                    res.setHeader('X-RateLimit-Remaining', '0');
                }
                catch { }
                return res.status(429).json({ error: 'Rate limit exceeded. Please retry later.' });
            }
            try {
                res.setHeader('X-RateLimit-Limit', String(limit));
                res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
            }
            catch { }
            return next();
        }
        catch {
            return next();
        }
    };
}

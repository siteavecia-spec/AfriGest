"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = require("crypto");
function requestLogger(req, res, next) {
    const start = Date.now();
    const reqId = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    req.reqId = reqId;
    try {
        res.setHeader('X-Request-Id', reqId);
    }
    catch { }
    const tenant = req.tenantKey || '';
    const user = req.auth?.sub || '';
    const routeName = req.route?.path || req.path || '';
    // Request size (best-effort)
    const reqSize = Number(req.headers['content-length'] || 0);
    // Wrap res.write/end to compute response size
    let respSize = 0;
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    res.write = function (chunk, encoding, cb) {
        try {
            respSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk || ''));
        }
        catch { }
        return origWrite(chunk, encoding, cb);
    };
    res.end = function (chunk, encoding, cb) {
        try {
            if (chunk)
                respSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk || ''));
        }
        catch { }
        return origEnd(chunk, encoding, cb);
    };
    res.on('finish', () => {
        const ms = Date.now() - start;
        const payload = {
            ts: new Date().toISOString(),
            reqId,
            method: req.method,
            path: req.originalUrl,
            routeName,
            status: res.statusCode,
            ms,
            tenant,
            user,
            ip: req.ip,
            ua: req.headers['user-agent'] || '',
            reqSize,
            respSize,
        };
        try {
            // Structured, single-line JSON log (can be picked by any collector)
            console.log(JSON.stringify(payload));
        }
        catch {
            // fallback
            console.log(`[${payload.ts}] ${payload.method} ${payload.path} ${payload.status} ${payload.ms}ms tenant=${tenant} user=${user}`);
        }
    });
    next();
}

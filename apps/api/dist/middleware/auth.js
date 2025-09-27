"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const memory_1 = require("../stores/memory");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header)
        return res.status(401).json({ error: 'Missing Authorization header' });
    const token = header.replace('Bearer ', '');
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        // Optional invalidation: if client provides x-user-email, and we have a revocation timestamp for that email,
        // reject tokens issued before that timestamp (MVP until DB-backed users exist)
        const userEmailHeader = (req.headers['x-user-email'] || '').toString().trim();
        if (userEmailHeader) {
            const revokedAt = memory_1.passwordRevokedAfter.get(userEmailHeader);
            if (revokedAt && payload.iat && payload.iat * 1000 < revokedAt) {
                return res.status(401).json({ error: 'Session invalidated, please login again' });
            }
        }
        ;
        req.auth = payload;
        next();
    }
    catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

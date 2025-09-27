"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = getIO;
exports.getPresenceSnapshot = getPresenceSnapshot;
exports.initWS = initWS;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./config/env");
let ioRef = null;
function getIO() { return ioRef; }
const presenceStore = new Map(); // tenantId -> (userId -> presence)
function setPresence(tenantId, userId, info) {
    if (!tenantId || !userId)
        return;
    let t = presenceStore.get(tenantId);
    if (!t) {
        t = new Map();
        presenceStore.set(tenantId, t);
    }
    t.set(userId, info);
}
function getPresenceSnapshot(tenantId) {
    const m = presenceStore.get(tenantId);
    if (!m)
        return [];
    return Array.from(m.entries()).map(([userId, info]) => ({ userId, ...info }));
}
function initWS(server) {
    const io = new socket_io_1.Server(server, {
        path: '/api/tenants/messaging/socket',
        cors: { origin: true, credentials: true }
    });
    ioRef = io;
    // Try to attach Redis adapter if configured
    try {
        const url = (process.env.REDIS_URL || '').trim();
        if (url) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createAdapter } = require('@socket.io/redis-adapter');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createClient } = require('redis');
            const pubClient = createClient({ url });
            const subClient = pubClient.duplicate();
            pubClient.connect().catch(() => { });
            subClient.connect().catch(() => { });
            io.adapter(createAdapter(pubClient, subClient));
            // eslint-disable-next-line no-console
            console.log('[WS] Redis adapter enabled');
        }
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[WS] Redis adapter not enabled:', e?.message || e);
    }
    io.use((socket, next) => {
        try {
            // Expect Bearer token in auth or headers
            const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization'] || '').toString().replace('Bearer ', '');
            if (!token)
                return next(new Error('Unauthorized'));
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
            socket.auth = payload;
            // Tenant from query or header
            const tenantId = (socket.handshake.query.tenantId || socket.handshake.headers['x-tenant-id'] || '').toString();
            if (!tenantId)
                return next(new Error('Missing tenantId'));
            socket.tenantId = tenantId;
            return next();
        }
        catch {
            return next(new Error('Unauthorized'));
        }
    });
    io.on('connection', (socket) => {
        const auth = socket.auth;
        const tenantId = socket.tenantId;
        const userId = auth?.sub;
        // Join tenant and user rooms
        socket.join(`tenant:${tenantId}`);
        if (userId)
            socket.join(`user:${userId}`);
        // Presence (in-memory MVP). Phase next: Redis keys with TTL
        try {
            const lastSeen = new Date().toISOString();
            setPresence(tenantId, userId, { status: 'online', lastSeen });
            socket.to(`tenant:${tenantId}`).emit('presence:update', { userId, status: 'online', lastSeen });
        }
        catch { }
        // Handlers MVP
        socket.on('presence:ping', () => {
            try {
                const lastSeen = new Date().toISOString();
                setPresence(tenantId, userId, { status: 'online', lastSeen });
                socket.to(`tenant:${tenantId}`).emit('presence:update', { userId, status: 'online', lastSeen });
            }
            catch { }
        });
        socket.on('messaging:send', (payload) => {
            // Permissions matrix MVP (employee cannot initiate to PDG). Full validation will be done server-side when persisting message in S2.
            const role = auth?.role;
            const toUserId = payload?.toUserId;
            if (!toUserId || !payload?.content)
                return;
            const forbiddenToPDG = role === 'employee'; // MVP simple
            // Basic broadcast MVP: to recipient room and back to sender
            if (!forbiddenToPDG) {
                const message = {
                    id: `tmp-${Date.now()}`,
                    senderId: userId,
                    content: payload.content,
                    relatedEntityType: payload.related?.type,
                    relatedEntityId: payload.related?.id,
                    createdAt: new Date().toISOString()
                };
                io.to(`user:${toUserId}`).emit('messaging:new', { conversationId: null, message });
                socket.emit('messaging:new', { conversationId: null, message });
            }
            else {
                socket.emit('notify:new', { type: 'system', payload: { level: 'warning', message: 'Envoi non autorisé (règles employé → PDG)' } });
            }
        });
        socket.on('disconnect', () => {
            try {
                const lastSeen = new Date().toISOString();
                setPresence(tenantId, userId, { status: 'offline', lastSeen });
                socket.to(`tenant:${tenantId}`).emit('presence:update', { userId, status: 'offline', lastSeen });
            }
            catch { }
        });
    });
    // eslint-disable-next-line no-console
    console.log('[WS] Socket.io initialized on path /api/tenants/messaging/socket');
    return io;
}

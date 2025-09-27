"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateConversation = getOrCreateConversation;
exports.listConversations = listConversations;
async function getOrCreateConversation(prisma, tenantId, a, b) {
    const [userOneId, userTwoId] = [a, b].sort();
    const p = prisma;
    if (!p?.conversation) {
        // In-memory fallback (no DB): return a pseudo conversation
        return { id: `mem-conv-${tenantId}-${userOneId}-${userTwoId}`, tenantId, userOneId, userTwoId, updatedAt: new Date() };
    }
    const found = await p.conversation.findFirst({ where: { tenantId, userOneId, userTwoId } });
    if (found)
        return found;
    return p.conversation.create({ data: { tenantId, userOneId, userTwoId } });
}
async function listConversations(prisma, tenantId, userId) {
    const p = prisma;
    if (!p?.conversation || !p?.message) {
        // In-memory fallback: return empty list when DB models are unavailable
        return [];
    }
    const convos = await p.conversation.findMany({
        where: { tenantId, OR: [{ userOneId: userId }, { userTwoId: userId }] },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, userOneId: true, userTwoId: true, updatedAt: true }
    });
    const results = [];
    for (const c of convos) {
        const peerUserId = c.userOneId === userId ? c.userTwoId : c.userOneId;
        const last = await p.message.findFirst({ where: { conversationId: c.id }, orderBy: { createdAt: 'desc' }, select: { content: true, createdAt: true, senderId: true } });
        const unread = await p.message.count({ where: { conversationId: c.id, read: false, NOT: { senderId: userId } } });
        results.push({ id: c.id, peerUserId, lastMessage: last || undefined, unread, updatedAt: c.updatedAt });
    }
    return results;
}

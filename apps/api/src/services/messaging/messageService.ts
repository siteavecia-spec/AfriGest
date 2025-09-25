import type { PrismaClient } from '../../generated/tenant'

export async function sendMessage(prisma: PrismaClient, params: { tenantId: string; fromUserId: string; toUserId: string; content: string; related?: { type?: string; id?: string } }) {
  const { tenantId, fromUserId, toUserId, content } = params
  if (!content || !content.trim()) throw new Error('Empty content')
  // sort user ids to respect unique index
  const [userOneId, userTwoId] = [fromUserId, toUserId].sort()
  const convo = await prisma.conversation.upsert({
    where: { tenantId_userOneId_userTwoId: { tenantId, userOneId, userTwoId } },
    create: { tenantId, userOneId, userTwoId },
    update: { updatedAt: new Date() }
  })
  const msg = await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: fromUserId,
      content: content.trim(),
      relatedEntityType: params.related?.type,
      relatedEntityId: params.related?.id
    }
  })
  // update conversation activity
  await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
  // audit best-effort
  try { await prisma.messagingAuditLog.create({ data: { tenantId, userId: fromUserId, action: 'message.send', entityType: 'message', entityId: msg.id, details: { toUserId }, createdAt: new Date() } }) } catch {}
  return { conversation: convo, message: msg }
}

export async function listMessages(prisma: PrismaClient, conversationId: string, limit = 50, before?: Date) {
  return prisma.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

export async function markRead(prisma: PrismaClient, params: { messageId: string; readerUserId: string }) {
  const { messageId, readerUserId } = params
  const msg = await prisma.message.update({ where: { id: messageId }, data: { read: true, readAt: new Date() } })
  try { await prisma.messagingAuditLog.create({ data: { tenantId: undefined as any, userId: readerUserId, action: 'message.read', entityType: 'message', entityId: messageId, createdAt: new Date() } }) } catch {}
  return msg
}

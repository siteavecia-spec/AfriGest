import type { PrismaClient } from '../../generated/tenant'

export async function getOrCreateConversation(prisma: PrismaClient, tenantId: string, a: string, b: string) {
  const [userOneId, userTwoId] = [a, b].sort()
  const found = await prisma.conversation.findFirst({ where: { tenantId, userOneId, userTwoId } })
  if (found) return found
  return prisma.conversation.create({ data: { tenantId, userOneId, userTwoId } })
}

export async function listConversations(prisma: PrismaClient, tenantId: string, userId: string) {
  const convos = await prisma.conversation.findMany({
    where: { tenantId, OR: [{ userOneId: userId }, { userTwoId: userId }] },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, userOneId: true, userTwoId: true, updatedAt: true }
  })
  // For MVP, fetch last message and unread count per conversation
  const results: Array<{ id: string; peerUserId: string; lastMessage?: { content: string; createdAt: Date; senderId: string }; unread: number; updatedAt: Date }>
    = []
  for (const c of convos) {
    const peerUserId = c.userOneId === userId ? c.userTwoId : c.userOneId
    const last = await prisma.message.findFirst({ where: { conversationId: c.id }, orderBy: { createdAt: 'desc' }, select: { content: true, createdAt: true, senderId: true } })
    const unread = await prisma.message.count({ where: { conversationId: c.id, read: false, NOT: { senderId: userId } } })
    results.push({ id: c.id, peerUserId, lastMessage: last || undefined, unread, updatedAt: c.updatedAt })
  }
  return results
}

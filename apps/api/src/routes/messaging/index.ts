import { Router } from 'express'
import conversationsRouter from './conversations'
import conversationRouter from './conversation'
import messageRouter from './message'
import readRouter from './read'
import notificationsRouter from './notifications'
import presenceRouter from './presence'

const router = Router({ mergeParams: true })

// Conversations list
router.use('/:tenantId/messaging/conversations', conversationsRouter)
// Conversation messages with a specific peer
router.use('/:tenantId/messaging/conversation', conversationRouter)
// Send message
router.use('/:tenantId/messaging/message', messageRouter)
// Mark message as read
router.use('/:tenantId/messaging', readRouter)
// Notifications (in-app)
router.use('/:tenantId/notifications', notificationsRouter)
// Presence snapshot
router.use('/:tenantId/presence', presenceRouter)

export default router

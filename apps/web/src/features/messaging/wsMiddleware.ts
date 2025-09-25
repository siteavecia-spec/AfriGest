import type { Middleware, AnyAction } from '@reduxjs/toolkit'
import { connectMessagingWS, getMessagingSocket } from '../../ws/messagingClient'
import { getTenantId } from '../../api/client_clean'
import { addMessageToPeer, markMessageRead, presenceUpdate, setConnected } from './slice'

export const messagingConnectType = 'messaging/connect'

export const messagingMiddleware: Middleware = store => next => (action: AnyAction) => {
  const result = next(action)
  if (action.type === messagingConnectType) {
    try {
      const token = localStorage.getItem('afrigest_token') || ''
      const tenantId = getTenantId()
      if (!token || !tenantId) return result
      const sock = connectMessagingWS(tenantId, token)
      sock.on('connect', () => store.dispatch(setConnected(true)))
      sock.on('disconnect', () => store.dispatch(setConnected(false)))
      sock.on('presence:update', (p: any) => store.dispatch(presenceUpdate({ userId: p.userId, status: p.status, lastSeen: p.lastSeen })))
      sock.on('messaging:new', (payload: any) => {
        const m = payload?.message
        if (!m) return
        // Heuristic to identify peer: if current user id is stored somewhere; for MVP, derive peer at component level
        // Here we only push the message into a generic bucket; components may refine by userId param
        // No-op here; components will rely on local fetch for now
      })
      sock.on('messaging:read', (payload: any) => {
        const { messageId, readAt } = payload || {}
        if (messageId) store.dispatch(markMessageRead({ messageId, readAt }))
      })
    } catch {}
  }
  return result
}

export const messagingConnect = () => ({ type: messagingConnectType })

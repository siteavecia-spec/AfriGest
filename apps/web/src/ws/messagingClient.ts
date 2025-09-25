import { io, Socket } from 'socket.io-client'
import { API_URL } from '../api/client_clean'

let socketRef: Socket | null = null

export function connectMessagingWS(tenantId: string, token: string) {
  if (socketRef) return socketRef
  const socket = io(API_URL, {
    path: '/api/tenants/messaging/socket',
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    query: { tenantId }
  })
  socketRef = socket
  return socket
}

export function getMessagingSocket() {
  return socketRef
}

export function disconnectMessagingWS() {
  try { socketRef?.disconnect() } catch {}
  socketRef = null
}

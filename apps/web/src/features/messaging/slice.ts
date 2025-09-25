import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type MessageItem = { id: string; conversationId: string; senderId: string; content: string; createdAt: string; read?: boolean; readAt?: string }
export type ConversationItem = { id: string; peerUserId: string; lastMessage?: { content: string; createdAt: string; senderId: string }; unread: number; updatedAt: string }
export type PresenceInfo = { userId: string; status: 'online' | 'idle' | 'offline'; lastSeen: string }

interface MessagingState {
  conversations: ConversationItem[]
  messagesByPeer: Record<string, MessageItem[]>
  presence: Record<string, PresenceInfo>
  unreadTotal: number
  connected: boolean
}

const initialState: MessagingState = {
  conversations: [],
  messagesByPeer: {},
  presence: {},
  unreadTotal: 0,
  connected: false
}

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConnected(s, a: PayloadAction<boolean>) { s.connected = a.payload },
    setConversations(s, a: PayloadAction<ConversationItem[]>) {
      s.conversations = a.payload
      s.unreadTotal = a.payload.reduce((sum, c) => sum + (c.unread || 0), 0)
    },
    addMessageToPeer(s, a: PayloadAction<{ peerUserId: string; message: MessageItem }>) {
      const { peerUserId, message } = a.payload
      const arr = s.messagesByPeer[peerUserId] || []
      s.messagesByPeer[peerUserId] = [...arr, message]
      // update conversation preview
      const idx = s.conversations.findIndex(c => c.peerUserId === peerUserId)
      if (idx >= 0) {
        s.conversations[idx] = { ...s.conversations[idx], lastMessage: { content: message.content, createdAt: message.createdAt, senderId: message.senderId }, updatedAt: message.createdAt }
        // increment unread if message is not from current user (handled in component with current user id)
      }
    },
    markMessageRead(s, a: PayloadAction<{ messageId: string; readAt: string }>) {
      const { messageId, readAt } = a.payload
      for (const key of Object.keys(s.messagesByPeer)) {
        s.messagesByPeer[key] = s.messagesByPeer[key].map(m => m.id === messageId ? { ...m, read: true, readAt } : m)
      }
    },
    presenceUpdate(s, a: PayloadAction<PresenceInfo>) {
      s.presence[a.payload.userId] = a.payload
    }
  }
})

export const { setConnected, setConversations, addMessageToPeer, markMessageRead, presenceUpdate } = messagingSlice.actions
export default messagingSlice.reducer

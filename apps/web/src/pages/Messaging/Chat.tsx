import { useEffect, useRef, useState } from 'react'
import { Box, Card, CardContent, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { useNavigate, useParams } from 'react-router-dom'
import { msgGetConversation, msgMarkRead, msgSendMessage } from '../../api/messaging'
import { connectMessagingWS, getMessagingSocket } from '../../ws/messagingClient'
import { getTenantId } from '../../api/client_clean'

export default function Chat() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id: string; conversationId: string; senderId: string; content: string; createdAt: string; read?: boolean; readAt?: string }>>([])
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 30
  const [input, setInput] = useState('')
  const conversationIdRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!userId) { navigate('/messaging'); return }
    // Connect WS (MVP)
    try {
      const token = localStorage.getItem('afrigest_token') || ''
      const tenantId = getTenantId()
      if (token && tenantId) connectMessagingWS(tenantId, token)
    } catch {}
    // Load contextual draft if any
    try {
      const draft = localStorage.getItem('afritalk_draft')
      if (draft && draft.trim()) {
        setInput(draft)
        localStorage.removeItem('afritalk_draft')
      }

  async function loadMore() {
    if (!userId || items.length === 0) return
    setLoading(true)
    try {
      const oldest = items[0]
      const res = await msgGetConversation(userId, { limit: PAGE_SIZE, before: oldest.createdAt })
      const arr = (res.items || [])
      if (arr.length > 0) {
        // API returns desc; reverse to oldest-first and prepend
        setItems(prev => [...arr.slice().reverse(), ...prev])
      }
      setHasMore(arr.length >= PAGE_SIZE)
    } catch (e: any) {
      setError(e?.message || 'Chargement supplémentaire échoué')
    } finally {
      setLoading(false)
    }
  }
    } catch {}
  }, [userId])

  useEffect(() => {
    ;(async () => {
      if (!userId) return
      setLoading(true)
      setError(null)
      try {
        const res = await msgGetConversation(userId, { limit: PAGE_SIZE })
        conversationIdRef.current = res.conversationId
        const arr = (res.items || [])
        setItems(arr.slice().reverse()) // oldest first
        setHasMore(arr.length >= PAGE_SIZE)
        // Mark last message as read if needed
        const last = (res.items || [])[0]
        if (last && !last.read) {
          try { await msgMarkRead(last.id) } catch {}
        }
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement messages')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  // Live updates via WS
  useEffect(() => {
    const s = getMessagingSocket()
    if (!s) return
    const onNew = (payload: any) => {
      const m = payload?.message
      if (!m) return
      // show only if part of this peer chat
      if (userId && (m.senderId === userId || payload?.conversationId === conversationIdRef.current)) {
        setItems(prev => [...prev, { id: m.id, conversationId: m.conversationId, senderId: m.senderId, content: m.content, createdAt: m.createdAt, read: m.read, readAt: m.readAt }])
        // auto mark read if incoming from peer
        if (m.senderId === userId && !m.read) {
          try { msgMarkRead(m.id) } catch {}
        }
      }
    }
    const onRead = (payload: any) => {
      const { messageId, readAt } = payload || {}
      if (!messageId) return
      setItems(prev => prev.map(it => it.id === messageId ? { ...it, read: true, readAt } : it))
    }
    s.on('messaging:new', onNew)
    s.on('messaging:read', onRead)
    return () => {
      try { s.off('messaging:new', onNew); s.off('messaging:read', onRead) } catch {}
    }
  }, [userId])

  // Auto-scroll to bottom when items change
  useEffect(() => {
    try { endRef.current?.scrollIntoView({ behavior: 'smooth' }) } catch {}
  }, [items.length])

  async function send() {
    const content = input.trim()
    if (!content || !userId) return
    setInput('')
    try {
      await msgSendMessage(userId, content)
      // ensure we scroll to bottom after send
      setTimeout(() => { try { endRef.current?.scrollIntoView({ behavior: 'smooth' }) } catch {} }, 0)
    } catch (e: any) {
      setError(e?.message || 'Envoi échoué')
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Messagerie — Chat avec {userId}</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : (
            <>
              <Box sx={{ minHeight: 320, maxHeight: 480, overflowY: 'auto', border: '1px solid #eee', p: 2, mb: 2, bgcolor: '#fff' }}>
                {items.map((m) => {
                  const isPeer = userId && m.senderId === userId
                  return (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: isPeer ? 'flex-start' : 'flex-end', mb: 1 }}>
                    <Box sx={{ bgcolor: isPeer ? '#F1F5F9' : '#DCFCE7', borderRadius: 1, px: 1, py: 0.5, maxWidth: '80%' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(m.createdAt).toLocaleTimeString()} {m.read ? '✓✓' : '✓'} {m.read && m.readAt ? `(${new Date(m.readAt).toLocaleTimeString()})` : ''}
                      </Typography>
                    </Box>
                  </Box>)
                })}
                {items.length === 0 && <Typography color="text.secondary">Aucun message</Typography>}
                <div ref={endRef} />
              </Box>
              <Stack direction="row" spacing={1}>
                <TextField fullWidth size="small" placeholder="Votre message…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
                <IconButton color="primary" onClick={send}><SendIcon /></IconButton>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Conversation: {conversationIdRef.current || '—'}</Typography>
                <IconButton size="small" disabled={loading || !hasMore} onClick={loadMore} aria-label="load-more">
                  <Typography variant="caption">Charger plus</Typography>
                </IconButton>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

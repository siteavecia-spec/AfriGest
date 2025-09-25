import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, CircularProgress, IconButton, InputAdornment, List, ListItem, ListItemText, TextField, Typography, Badge } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChatIcon from '@mui/icons-material/Chat'
import { msgListConversations } from '../../api/messaging'
import { useNavigate } from 'react-router-dom'
import { connectMessagingWS } from '../../ws/messagingClient'
import { getUser } from '../../api/client_clean'
import { getTenantId } from '../../api/client_clean'

export default function Conversations() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id: string; peerUserId: string; lastMessage?: { content: string; createdAt: string; senderId: string }; unread: number; updatedAt: string }>>([])
  const [q, setQ] = useState('')
  const [peerDisplay, setPeerDisplay] = useState<Record<string, string>>({})

  useEffect(() => {
    // Connect WS (MVP): use localStorage token
    try {
      const token = localStorage.getItem('afrigest_token') || ''
      const tenantId = getTenantId()
      if (token && tenantId) connectMessagingWS(tenantId, token)
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await msgListConversations()
        setItems(res.items || [])
        // resolve peers display names lazily
        const peers = Array.from(new Set((res.items || []).map(c => c.peerUserId))).slice(0, 50)
        const map: Record<string, string> = {}
        await Promise.all(peers.map(async (id) => {
          try {
            const u = await getUser(id)
            map[id] = u.fullName || u.email || id
          } catch {
            map[id] = id
          }
        }))
        setPeerDisplay(map)
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement conversations')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(c => (c.peerUserId || '').toLowerCase().includes(qq) || (c.lastMessage?.content || '').toLowerCase().includes(qq))
  }, [items, q])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Messagerie — Conversations</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Card>
        <CardContent>
          <TextField
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher (utilisateur / message)"
            fullWidth
            size="small"
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            sx={{ mb: 2 }}
          />
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : (
            <List>
              {filtered.map(c => (
                <ListItem key={c.id} secondaryAction={<IconButton edge="end" aria-label="open" onClick={() => navigate(`/messaging/${encodeURIComponent(c.peerUserId)}`)}><ChatIcon /></IconButton>}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography component="span">{peerDisplay[c.peerUserId] || c.peerUserId}</Typography>
                        {c.unread > 0 && (
                          <Badge color="error" badgeContent={c.unread} sx={{ '& .MuiBadge-badge': { right: -8 } }}></Badge>
                        )}
                      </Box>
                    }
                    secondary={c.lastMessage ? `${new Date(c.lastMessage.createdAt).toLocaleString()} — ${c.lastMessage.content}` : '—'}
                  />
                </ListItem>
              ))}
              {filtered.length === 0 && (
                <ListItem><ListItemText primary={<Typography color="text.secondary">Aucune conversation</Typography>} /></ListItem>
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

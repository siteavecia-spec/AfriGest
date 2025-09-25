import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Select, TextField, Typography } from '@mui/material'
import { msgGetPresence } from '../../api/messaging'
import { getUser } from '../../api/client_clean'
import { useNavigate } from 'react-router-dom'

export default function PresencePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ userId: string; status: 'online'|'idle'|'offline'; lastSeen: string }>>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all'|'online'|'idle'|'offline'>('all')

  useEffect(() => {
    let timer: any
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await msgGetPresence()
        setItems(res.items || [])
        // resolve display names lazily (limit to 50 for MVP)
        const peers = Array.from(new Set((res.items || []).map(p => p.userId))).slice(0, 50)
        const map: Record<string, string> = {}
        await Promise.all(peers.map(async id => {
          try { const u = await getUser(id); map[id] = u.fullName || u.email || id } catch { map[id] = id }
        }))
        setNames(map)
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement présence')
      } finally {
        setLoading(false)
      }
    }
    load()
    timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [])

  const filtered = items.filter(p => {
    const qq = q.trim().toLowerCase()
    if (!qq) return true
    const label = names[p.userId] || p.userId
    return label.toLowerCase().includes(qq)
  }).filter(p => status === 'all' ? true : p.status === status)

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Présence (AfriTalk)</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Card>
        <CardContent>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Rechercher utilisateur" value={q} onChange={e => setQ(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Select fullWidth size="small" value={status} onChange={e => setStatus(e.target.value as any)}>
                <MenuItem value="all">Tous les statuts</MenuItem>
                <MenuItem value="online">En ligne</MenuItem>
                <MenuItem value="idle">Inactif</MenuItem>
                <MenuItem value="offline">Hors ligne</MenuItem>
              </Select>
            </Grid>
          </Grid>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 160px', gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">Utilisateur</Typography>
              <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
              <Typography variant="subtitle2" color="text.secondary">Vu à</Typography>
              <Typography variant="subtitle2" color="text.secondary">Action</Typography>
              {filtered.map(p => (
                <>
                  <Typography key={`${p.userId}-name`} variant="body2">{names[p.userId] || p.userId}</Typography>
                  <Typography key={`${p.userId}-status`} variant="body2">{p.status === 'online' ? '🟢 En ligne' : p.status === 'idle' ? '🟡 Inactif' : '⚪ Hors ligne'}</Typography>
                  <Typography key={`${p.userId}-last`} variant="body2">{new Date(p.lastSeen).toLocaleString()}</Typography>
                  <Box key={`${p.userId}-action`}>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/messaging/${encodeURIComponent(p.userId)}`)}>Démarrer un chat</Button>
                  </Box>
                </>
              ))}
              {filtered.length === 0 && <Typography color="text.secondary" sx={{ gridColumn: '1 / -1', mt: 1 }}>Aucun utilisateur</Typography>}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

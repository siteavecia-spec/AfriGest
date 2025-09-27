import { useEffect, useState } from 'react'
import { Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { createBoutique, listBoutiques } from '../api/client_clean'
import ErrorBanner from '../components/ErrorBanner'

export default function BoutiquesPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [rows, setRows] = useState<Array<{ id: string; name: string; code: string; address?: string; city?: string; country?: string }>>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const items = await listBoutiques()
      setRows(items)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement boutiques')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setMessage(null)
      if (!name || !code) throw new Error('Nom et code requis')
      await createBoutique({ name, code, address: address || undefined, city: city || undefined, country: country || undefined })
      setName(''); setCode(''); setAddress(''); setCity(''); setCountry('')
      await load()
      setMessage('Boutique créée')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur création boutique')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Boutiques</Typography>
      {message && <ErrorBanner message={message} onRetry={() => load()} />}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Créer une boutique</Typography>
        <Stack spacing={2} component="form" onSubmit={onCreate} sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} required sx={{ flex: 1 }} />
            <TextField label="Code" value={code} onChange={e => setCode(e.target.value)} required sx={{ minWidth: 180 }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Adresse" value={address} onChange={e => setAddress(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Ville" value={city} onChange={e => setCity(e.target.value)} sx={{ minWidth: 220 }} />
            <TextField label="Pays" value={country} onChange={e => setCountry(e.target.value)} sx={{ minWidth: 220 }} />
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" disabled={loading}>Créer</Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Liste des boutiques</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {rows.length === 0 ? (
            <Typography color="text.secondary">Aucune boutique.</Typography>
          ) : (
            rows.map(b => (
              <Box key={b.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Typography sx={{ minWidth: 160 }}>{b.code}</Typography>
                <Typography sx={{ flex: 1 }}>{b.name}</Typography>
                <Typography color="text.secondary">{[b.address, b.city, b.country].filter(Boolean).join(' • ')}</Typography>
              </Box>
            ))
          )}
        </Stack>
      </Paper>
    </Container>
  )
}

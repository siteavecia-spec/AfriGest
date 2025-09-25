import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { ecomListCustomers, ecomCreateCustomer } from '../../api/client_clean'

export default function EcommerceCustomers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id?: string; email?: string; phone?: string; firstName?: string; lastName?: string }>>([])
  const [query, setQuery] = useState('')

  // form state
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await ecomListCustomers()
      setItems(res.items || [])
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Clients</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Créer un client</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+224..." />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Nom" value={lastName} onChange={e => setLastName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={async () => {
                  setError(null); setMessage(null)
                  try {
                    const payload: any = {}
                    if (email.trim()) payload.email = email.trim()
                    if (phone.trim()) payload.phone = phone.trim()
                    if (firstName.trim()) payload.firstName = firstName.trim()
                    if (lastName.trim()) payload.lastName = lastName.trim()
                    const created = await ecomCreateCustomer(payload)
                    setMessage('Client créé')
                    setEmail(''); setPhone(''); setFirstName(''); setLastName('')
                    await load()
                    setTimeout(() => setMessage(null), 1500)
                  } catch (e: any) {
                    setError(e?.message || 'Impossible de créer le client')
                  }
                }}>Créer</Button>
                <Button variant="text" onClick={() => { setEmail(''); setPhone(''); setFirstName(''); setLastName(''); setError(null); setMessage(null) }}>Réinitialiser</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Grid item>
              <Typography variant="subtitle1">Liste des clients</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth size="small" label="Rechercher (email / téléphone / nom)" value={query} onChange={e => setQuery(e.target.value)} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 1, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.filter(c => {
                  const q = query.trim().toLowerCase()
                  if (!q) return true
                  const name = [c.firstName || '', c.lastName || ''].join(' ').toLowerCase()
                  return (
                    (c.email || '').toLowerCase().includes(q) ||
                    (c.phone || '').toLowerCase().includes(q) ||
                    name.includes(q)
                  )
                }).map((c, idx) => (
                  <TableRow key={c.id || idx}>
                    <TableCell>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>{c.id || '—'}</TableCell>
                  </TableRow>
                ))}
                {(!loading && items.filter(c => {
                  const q = query.trim().toLowerCase()
                  if (!q) return true
                  const name = [c.firstName || '', c.lastName || ''].join(' ').toLowerCase()
                  return (
                    (c.email || '').toLowerCase().includes(q) ||
                    (c.phone || '').toLowerCase().includes(q) ||
                    name.includes(q)
                  )
                }).length === 0) && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.secondary">Aucun client</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

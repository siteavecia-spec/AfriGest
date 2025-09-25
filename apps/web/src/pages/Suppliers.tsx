import { useEffect, useState } from 'react'
import { Box, Button, Container, Grid, IconButton, Paper, Stack, TextField, Typography } from '@mui/material'
import { listSuppliers } from '../api/client_clean'
import { createSupplier, deleteSupplier, updateSupplier } from '../api/suppliers'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ name?: string; contactName?: string; phone?: string; email?: string; address?: string }>({})

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const list = await listSuppliers()
      setSuppliers(list)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement fournisseurs')
    } finally {
      setLoading(false)
    }

  const startEdit = (s: any) => {
    setEditId(s.id)
    setEditValues({ name: s.name, contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', address: s.address || '' })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditValues({})
  }

  const saveEdit = async () => {
    if (!editId) return
    setLoading(true)
    setMessage(null)
    try {
      await updateSupplier(editId, editValues)
      setEditId(null)
      setEditValues({})
      await load()
      setMessage('Fournisseur mis à jour')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur mise à jour fournisseur')
    } finally {
      setLoading(false)
    }
  }

  const removeSupplier = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    setLoading(true)
    setMessage(null)
    try {
      await deleteSupplier(id)
      await load()
      setMessage('Fournisseur supprimé')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur suppression fournisseur')
    } finally {
      setLoading(false)
    }
  }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await createSupplier({ name, contactName, phone, email, address })
      setName(''); setContactName(''); setPhone(''); setEmail(''); setAddress('')
      await load()
      setMessage('Fournisseur créé')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur création fournisseur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Fournisseurs</Typography>
      {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Nouveau fournisseur</Typography>
            <Stack spacing={2} component="form" onSubmit={onCreate} sx={{ mt: 2 }}>
              <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} required />
              <TextField label="Contact" value={contactName} onChange={e => setContactName(e.target.value)} />
              <TextField label="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} />
              <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <TextField label="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
              <Button type="submit" variant="contained" disabled={loading}>Créer</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Liste des fournisseurs</Typography>
            <Stack spacing={1} sx={{ mt: 2, maxHeight: 420, overflow: 'auto' }}>
              {suppliers.length === 0 ? (
                <Typography color="text.secondary">Aucun fournisseur.</Typography>
              ) : (
                suppliers.map((s: any) => (
                  <Box key={s.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 1, p: 1, border: '1px solid #eee' }}>
                    {editId === s.id ? (
                      <Stack spacing={1}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <TextField size="small" label="Nom" value={editValues.name || ''} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} sx={{ flex: 1 }} />
                          <TextField size="small" label="Contact" value={editValues.contactName || ''} onChange={e => setEditValues(v => ({ ...v, contactName: e.target.value }))} />
                          <TextField size="small" label="Téléphone" value={editValues.phone || ''} onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))} />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <TextField size="small" label="Email" type="email" value={editValues.email || ''} onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))} sx={{ flex: 1 }} />
                          <TextField size="small" label="Adresse" value={editValues.address || ''} onChange={e => setEditValues(v => ({ ...v, address: e.target.value }))} sx={{ flex: 1 }} />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" onClick={saveEdit} disabled={loading}>Enregistrer</Button>
                          <Button size="small" variant="text" onClick={cancelEdit}>Annuler</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ flex: 1, fontWeight: 600 }}>{s.name}</Typography>
                        <Typography color="text.secondary">{s.contactName || '-'}</Typography>
                        <Typography color="text.secondary">{s.phone || '-'}</Typography>
                        <Typography color="text.secondary">{s.email || '-'}</Typography>
                        <Box>
                          <IconButton size="small" onClick={() => startEdit(s)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeSupplier(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}

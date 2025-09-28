import { useEffect, useState } from 'react'
import { Box, Button, Container, Grid, IconButton, Paper, Stack, TextField, Typography, Snackbar, Alert, CircularProgress } from '@mui/material'
import { listSuppliersPaged } from '../api/client_clean'
import { createSupplier, deleteSupplier, updateSupplier } from '../api/suppliers'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackSeverity, setSnackSeverity] = useState<'success'|'error'|'info'>('info')
  const [snackMsg, setSnackMsg] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ name?: string; contactName?: string; phone?: string; email?: string; address?: string }>({})

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [search, setSearch] = useState('')
  // Pagination
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | undefined>(undefined)

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { items, total } = await listSuppliersPaged(limit, page * limit)
      setSuppliers(items)
      setTotal(total)
      setHasMore(total != null ? ((page + 1) * limit) < total : (items || []).length === limit)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement fournisseurs')
    } finally {
      setLoading(false)
    }
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
    // simple validation
    const nameOk = (editValues.name || '').trim().length > 0
    const emailVal = (editValues.email || '').trim()
    const emailOk = emailVal === '' || /^\S+@\S+\.\S+$/.test(emailVal)
    if (!nameOk) {
      setSnackSeverity('error'); setSnackMsg('Le nom est requis'); setSnackOpen(true)
      return
    }
    if (!emailOk) {
      setSnackSeverity('error'); setSnackMsg('Email invalide'); setSnackOpen(true)
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await updateSupplier(editId, editValues)
      setEditId(null)
      setEditValues({})
      await load()
      setMessage('Fournisseur mis à jour')
      setSnackSeverity('success'); setSnackMsg('Fournisseur mis à jour'); setSnackOpen(true)
    } catch (e: any) {
      const msg = e?.message || 'Erreur mise à jour fournisseur'
      setMessage(msg)
      setSnackSeverity('error'); setSnackMsg(msg); setSnackOpen(true)
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


  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    // validations simples
    if (name.trim().length === 0) {
      setSnackSeverity('error'); setSnackMsg('Le nom est requis'); setSnackOpen(true)
      return
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setSnackSeverity('error'); setSnackMsg('Email invalide'); setSnackOpen(true)
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await createSupplier({ name, contactName, phone, email, address })
      setName(''); setContactName(''); setPhone(''); setEmail(''); setAddress('')
      await load()
      setMessage('Fournisseur créé')
      setSnackSeverity('success'); setSnackMsg('Fournisseur créé'); setSnackOpen(true)
    } catch (e: any) {
      const msg = e?.message || 'Erreur création fournisseur'
      setMessage(msg)
      setSnackSeverity('error'); setSnackMsg(msg); setSnackOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Fournisseurs</Typography>
      {message && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography color="text.secondary" sx={{ wordBreak: 'break-word' }}>{message}</Typography>
          {(() => {
            const m = String(message || '')
            const match = m.match(/ReqID:\s*([\w-]+)/i)
            const rid = match?.[1]
            return rid ? (
              <Button size="small" variant="outlined" onClick={() => { try { navigator.clipboard.writeText(rid) } catch {} }}>Copier ID</Button>
            ) : null
          })()}
        </Box>
      )}
      <Snackbar open={snackOpen} autoHideDuration={2000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} variant="filled" sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>

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
              <Button type="submit" variant="contained" disabled={loading || name.trim().length === 0}>Créer</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={600}>Liste des fournisseurs</Typography>
              <Button size="small" variant="outlined" onClick={() => {
                try {
                  const filtered = suppliers.filter((s: any) => {
                    const q = search.trim().toLowerCase()
                    if (!q) return true
                    return (
                      String(s.name || '').toLowerCase().includes(q) ||
                      String(s.contactName || '').toLowerCase().includes(q) ||
                      String(s.email || '').toLowerCase().includes(q) ||
                      String(s.phone || '').toLowerCase().includes(q)
                    )
                  })
                  const header = ['id','name','contactName','phone','email','address']
                  const rows = filtered.map((s:any) => [s.id, s.name, s.contactName || '', s.phone || '', s.email || '', s.address || ''])
                  const esc = (v:any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                  const csv = [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'suppliers.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {}
              }} disabled={loading}>Exporter CSV</Button>
            </Box>
            <TextField size="small" placeholder="Rechercher (nom, contact, email, téléphone)" value={search} onChange={e => setSearch(e.target.value)} sx={{ mt: 2 }} />
            <Stack spacing={1} sx={{ mt: 2, maxHeight: 420, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : suppliers.length === 0 ? (
                <Typography color="text.secondary">Aucun fournisseur.</Typography>
              ) : (
                suppliers
                  .filter((s: any) => {
                    const q = search.trim().toLowerCase()
                    if (!q) return true
                    return (
                      String(s.name || '').toLowerCase().includes(q) ||
                      String(s.contactName || '').toLowerCase().includes(q) ||
                      String(s.email || '').toLowerCase().includes(q) ||
                      String(s.phone || '').toLowerCase().includes(q)
                    )
                  })
                  .map((s: any) => (
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
                          <IconButton size="small" onClick={() => startEdit(s)} disabled={loading}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeSupplier(s.id)} disabled={loading}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Stack>
            {/* Pagination controls */}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
              <Button size="small" disabled={loading || page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
              <Button size="small" disabled={loading || !hasMore} onClick={() => setPage(p => p + 1)}>Suivant</Button>
              <TextField size="small" select label="Par page" value={limit} onChange={e => { setPage(0); setLimit(Number(e.target.value)) }} sx={{ width: 140 }}>
                {[20, 50, 100].map(n => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </TextField>
              <Typography variant="caption" color="text.secondary">Page {page + 1}{total != null ? ` / ${Math.max(1, Math.ceil(total / limit))}` : ''}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}

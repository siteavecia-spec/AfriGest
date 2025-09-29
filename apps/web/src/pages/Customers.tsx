import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Snackbar, Alert, Stack, TextField, Typography, MenuItem } from '@mui/material'
import Page from '../components/Page'
import { listCustomersBasic, createCustomerBasic, updateCustomerBasic, type CustomerItem } from '../api/client_clean'

export default function CustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<{ firstName?: string; lastName?: string; phone?: string; email?: string; note?: string }>({})
  const [editing, setEditing] = useState<CustomerItem | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error'|'info' } | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const res = await listCustomersBasic({ query, limit: 100, offset: 0 })
      setItems(res.items || [])
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message || 'Erreur chargement clients', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  return (
    <Page title="Clients" subtitle="Carnet clients et informations de contact">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Nouveau client</Button>
        <TextField size="small" placeholder="Rechercher (nom, téléphone, email)" value={query} onChange={e => setQuery(e.target.value)} sx={{ minWidth: 260 }} />
        <Button size="small" variant="outlined" onClick={reload}>Rechercher</Button>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement…</Typography>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">Aucun client.</Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map(c => (
            <Grid key={c.id} item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.id}</Typography>
                  {c.phone && <Typography variant="body2" color="text.secondary">{c.phone}</Typography>}
                  {c.email && <Typography variant="body2" color="text.secondary">{c.email}</Typography>}
                  {c.note && <Typography variant="body2" color="text.secondary">{c.note}</Typography>}
                  <Typography variant="caption" color="text.secondary">Créé le {new Date(c.createdAt).toLocaleString()}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => { setEditing(c); setDraft({ firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email, note: c.note }); setEditOpen(true) }}>Éditer</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau client</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Prénom" value={draft.firstName || ''} onChange={e => setDraft(p => ({ ...p, firstName: e.target.value }))} />
            <TextField label="Nom" value={draft.lastName || ''} onChange={e => setDraft(p => ({ ...p, lastName: e.target.value }))} />
            <TextField label="Téléphone" value={draft.phone || ''} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} />
            <TextField label="Email" value={draft.email || ''} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
            <TextField label="Note" value={draft.note || ''} onChange={e => setDraft(p => ({ ...p, note: e.target.value }))} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={async () => { try { await createCustomerBasic(draft); setOpen(false); setDraft({}); await reload(); setSnack({ open: true, msg: 'Client créé', severity: 'success' }) } catch (e:any) { setSnack({ open: true, msg: e?.message || 'Erreur création', severity: 'error' }) } }}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier client</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Prénom" value={draft.firstName || ''} onChange={e => setDraft(p => ({ ...p, firstName: e.target.value }))} />
            <TextField label="Nom" value={draft.lastName || ''} onChange={e => setDraft(p => ({ ...p, lastName: e.target.value }))} />
            <TextField label="Téléphone" value={draft.phone || ''} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} />
            <TextField label="Email" value={draft.email || ''} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
            <TextField label="Note" value={draft.note || ''} onChange={e => setDraft(p => ({ ...p, note: e.target.value }))} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={async () => { if (!editing) return; try { await updateCustomerBasic(editing.id, draft); setEditOpen(false); setEditing(null); setDraft({}); await reload(); setSnack({ open: true, msg: 'Client mis à jour', severity: 'success' }) } catch (e:any) { setSnack({ open: true, msg: e?.message || 'Erreur maj', severity: 'error' }) } }}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack?.open)} autoHideDuration={3000} onClose={() => setSnack(s => s ? { ...s, open: false } : null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(s => s ? { ...s, open: false } : null)}>{snack.msg}</Alert>}
      </Snackbar>
    </Page>
  )
}

import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography, MenuItem, Snackbar, Alert } from '@mui/material'
import { adminListCompanies, adminCreateCompany, adminArchiveCompany, adminImpersonate, adminUpdateCompany, adminProvisionCompany } from '../../api/client_clean'

// Super Admin: Companies (Master DB)

interface CompanyDraft { name: string; code: string; contactEmail?: string }

export default function CompaniesAdminPage() {
  const [items, setItems] = useState<Array<{ id: string; name: string; code: string; contactEmail?: string; createdAt: string; status?: string }>>([])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CompanyDraft>({ name: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'pending'|'archived'>('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<{ id: string; name: string; contactEmail?: string; status?: 'active'|'pending'|'archived' } | null>(null)
  const [limit, setLimit] = useState(12)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error'|'info' } | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await adminListCompanies({ limit, offset, status: statusFilter === 'all' ? undefined : statusFilter })
        setItems(res.items || [])
        setTotal(res.total || 0)
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement entreprises')
      } finally {
        setLoading(false)
      }
    })()
  }, [statusFilter, limit, offset])

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminListCompanies({ limit, offset, status: statusFilter === 'all' ? undefined : statusFilter })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement entreprises')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Entreprises (Super Admin)</Typography>
      {error && <Typography color="error" paragraph>{error}</Typography>}
      <Typography color="text.secondary" paragraph>Gérer les entreprises clientes (base maître).</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Créer une entreprise</Button>
        <TextField select size="small" label="Statut" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} sx={{ width: 200 }}>
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="active">Actifs</MenuItem>
          <MenuItem value="pending">En attente</MenuItem>
          <MenuItem value="archived">Archivés</MenuItem>
        </TextField>
        <TextField select size="small" label="Par page" value={limit} onChange={e => { setOffset(0); setLimit(Number(e.target.value)) }} sx={{ width: 140 }}>
          <MenuItem value={12}>12</MenuItem>
          <MenuItem value={24}>24</MenuItem>
          <MenuItem value={48}>48</MenuItem>
        </TextField>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Button size="small" disabled={offset === 0} onClick={() => setOffset(prev => Math.max(0, prev - limit))}>Précédent</Button>
        <Button size="small" disabled={offset + limit >= total} onClick={() => setOffset(prev => prev + limit)}>Suivant</Button>
        <Typography variant="caption" color="text.secondary">{Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} / {total}</Typography>
      </Stack>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {loading ? (
          <Grid item xs={12}><Typography color="text.secondary">Chargement…</Typography></Grid>
        ) : items.length === 0 ? (
          <Grid item xs={12}><Typography color="text.secondary">Aucune entreprise.</Typography></Grid>
        ) : items.map(c => (
          <Grid key={c.id} item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">{c.name}</Typography>
                <Typography variant="body2" color="text.secondary">Code: {c.code}</Typography>
                {c.contactEmail && <Typography variant="body2" color="text.secondary">Contact: {c.contactEmail}</Typography>}
                {c.status && <Typography variant="caption" color="text.secondary">Statut: {c.status}</Typography>}
                <Typography variant="caption" color="text.secondary">Créée le {new Date(c.createdAt).toLocaleString()}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={async () => {
                    try {
                      await adminImpersonate(c.code)
                      // MVP: set tenant context via company code and reload
                      localStorage.setItem('afrigest_company', c.code)
                      localStorage.setItem('afrigest_impersonate', '1')
                      localStorage.setItem('afrigest_impersonate_company', c.code)
                      window.location.href = '/dashboard'
                    } catch (e: any) {
                      setError(e?.message || 'Échec impersonation')
                      setSnack({ open: true, msg: e?.message || 'Échec impersonation', severity: 'error' })
                    }
                  }}>Impersonate</Button>
                  {((c.status as any) === 'pending') && (
                    <Button size="small" variant="outlined" color="success" onClick={async () => {
                      try {
                        await adminProvisionCompany(c.id)
                        setSnack({ open: true, msg: 'Provisionnement marqué comme actif', severity: 'success' })
                        await reload()
                      } catch (e: any) {
                        setSnack({ open: true, msg: e?.message || 'Échec provisionnement', severity: 'error' })
                      }
                    }}>Provisionner</Button>
                  )}
                  <Button size="small" variant="outlined" onClick={() => {
                    setEditDraft({ id: c.id, name: c.name, contactEmail: c.contactEmail, status: (c.status as any) || 'active' })
                    setEditOpen(true)
                  }}>Éditer</Button>
                  <Button size="small" color="warning" variant="outlined" onClick={async () => {
                    if (!confirm('Archiver cette entreprise ?')) return
                    try { await adminArchiveCompany(c.id); setSnack({ open: true, msg: 'Entreprise archivée', severity: 'success' }); await reload() } catch (e: any) { setError(e?.message || 'Échec archivage'); setSnack({ open: true, msg: e?.message || 'Échec archivage', severity: 'error' }) }
                  }}>Archiver</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une entreprise</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Nom" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <TextField label="Code (unique)" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
            <TextField label="Email de contact (optionnel)" value={draft.contactEmail || ''} onChange={e => setDraft({ ...draft, contactEmail: e.target.value })} />
          </Stack>
          <Typography variant="caption" color="text.secondary">Les informations pourront être modifiées ultérieurement.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={async () => {
            const payload = { name: draft.name.trim(), code: draft.code.trim(), contactEmail: draft.contactEmail?.trim() }
            if (!payload.name || !payload.code) return
            try {
              await adminCreateCompany(payload)
              setOpen(false)
              setDraft({ name: '', code: '' })
              setSnack({ open: true, msg: 'Entreprise créée', severity: 'success' })
              await reload()
            } catch (e: any) {
              setError(e?.message || 'Échec création')
              setSnack({ open: true, msg: e?.message || 'Échec création', severity: 'error' })
            }
          }}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier l'entreprise</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Nom" value={editDraft?.name || ''} onChange={e => setEditDraft(p => ({ ...(p as any), name: e.target.value }))} />
            <TextField label="Email de contact" value={editDraft?.contactEmail || ''} onChange={e => setEditDraft(p => ({ ...(p as any), contactEmail: e.target.value }))} />
            <TextField select label="Statut" value={editDraft?.status || 'active'} onChange={e => setEditDraft(p => ({ ...(p as any), status: e.target.value as any }))}>
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="pending">En attente</MenuItem>
              <MenuItem value="archived">Archivé</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={async () => {
            if (!editDraft) return
            try {
              await adminUpdateCompany(editDraft.id, { name: editDraft.name, contactEmail: editDraft.contactEmail, status: editDraft.status })
              setEditOpen(false)
              setSnack({ open: true, msg: 'Entreprise mise à jour', severity: 'success' })
              await reload()
            } catch (e: any) {
              setError(e?.message || 'Échec mise à jour')
              setSnack({ open: true, msg: e?.message || 'Échec mise à jour', severity: 'error' })
            }
          }}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={Boolean(snack?.open)} autoHideDuration={3000} onClose={() => setSnack(s => s ? { ...s, open: false } : null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(s => s ? { ...s, open: false } : null)}>{snack.msg}</Alert>}
      </Snackbar>
    </Box>
  )
}

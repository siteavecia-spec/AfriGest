import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/PersonAddAlt1'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/PersonOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import { createUser, deactivateUser, listUsers, updateUser, type UserItem } from '../api/client_clean'

export default function UsersPage() {
  const [items, setItems] = useState<UserItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | UserItem>(null)

  const filtered = useMemo(() => items, [items])

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await listUsers(query ? { query, limit: 50, offset: 0 } : { limit: 50, offset: 0 })
      setItems(res.items)
    } catch (e: any) {
      setError(e?.message || 'Échec du chargement des utilisateurs')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5" fontWeight={700}>Utilisateurs</Typography>
        <Button startIcon={<AddIcon/>} variant="contained" onClick={() => setOpenCreate(true)}>Créer</Button>
        <Button startIcon={<RefreshIcon/>} onClick={load} disabled={loading}>Rafraîchir</Button>
        <Box sx={{ flexGrow: 1 }} />
        <TextField size="small" placeholder="Rechercher" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load() }} />
      </Stack>

      {error && <Alert severity="error" variant="outlined">{error}</Alert>}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement…</Typography>
        </Box>
      )}

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label="Liste des utilisateurs">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Dernière connexion</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.fullName}</TableCell>
                <TableCell><Chip size="small" label={u.role} color={u.role === 'super_admin' ? 'primary' : u.role === 'pdg' ? 'secondary' : 'default'} /></TableCell>
                <TableCell>{u.status === 'active' ? <Chip size="small" color="success" label="Actif"/> : <Chip size="small" color="warning" label="Désactivé"/>}</TableCell>
                <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label="Modifier" onClick={() => setOpenEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" aria-label="Désactiver" onClick={async () => { if (!confirm('Désactiver cet utilisateur ?')) return; try { await deactivateUser(u.id); await load() } catch (e:any) { alert(e?.message || 'Échec de la désactivation') } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {openCreate && <CreateDialog onClose={() => setOpenCreate(false)} onCreated={async () => { setOpenCreate(false); await load() }} />}
      {openEdit && <EditDialog user={openEdit} onClose={() => setOpenEdit(null)} onSaved={async () => { setOpenEdit(null); await load() }} />}
    </Stack>
  )
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'super_admin'|'pdg'|'dg'|'employee'>('employee')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true); setError(null)
    try { await createUser({ email, fullName, role, password }); onCreated() } catch (e:any) { setError(e?.message || 'Échec de création') } finally { setSaving(false) }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Créer un utilisateur</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField label="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} required />
          <TextField select label="Rôle" value={role} onChange={e => setRole(e.target.value as any)}>
            <MenuItem value="employee">Employé</MenuItem>
            <MenuItem value="dg">DG</MenuItem>
            <MenuItem value="pdg">PDG</MenuItem>
            <MenuItem value="super_admin">Super Admin</MenuItem>
          </TextField>
          <TextField label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>Créer</Button>
      </DialogActions>
    </Dialog>
  )
}

function EditDialog({ user, onClose, onSaved }: { user: UserItem; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user.fullName)
  const [role, setRole] = useState<UserItem['role']>(user.role)
  const [status, setStatus] = useState<UserItem['status']>(user.status)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true); setError(null)
    try { await updateUser(user.id, { fullName, role, status, password: password || undefined }); onSaved() } catch (e:any) { setError(e?.message || 'Échec de sauvegarde') } finally { setSaving(false) }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Modifier l’utilisateur</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Email" value={user.email} InputProps={{ readOnly: true }} />
          <TextField label="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} />
          <TextField select label="Rôle" value={role} onChange={e => setRole(e.target.value as any)}>
            <MenuItem value="employee">Employé</MenuItem>
            <MenuItem value="dg">DG</MenuItem>
            <MenuItem value="pdg">PDG</MenuItem>
            <MenuItem value="super_admin">Super Admin</MenuItem>
          </TextField>
          <TextField select label="Statut" value={status} onChange={e => setStatus(e.target.value as any)}>
            <MenuItem value="active">Actif</MenuItem>
            <MenuItem value="disabled">Désactivé</MenuItem>
          </TextField>
          <TextField label="Nouveau mot de passe (optionnel)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  )
}

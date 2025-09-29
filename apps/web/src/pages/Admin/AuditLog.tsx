import { useEffect, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, MenuItem } from '@mui/material'
import Page from '../../components/Page'

// MVP local-only audit log store (in real app this would come from backend)
function getAudit() {
  try {
    const raw = localStorage.getItem('afrigest_audit_log')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function AuditLogPage() {
  const [items, setItems] = useState<Array<{ at: string; actor?: string; action: string; module?: string; entityId?: string; details?: string }>>([])
  const [q, setQ] = useState('')
  const [moduleKey, setModuleKey] = useState<'all'|'purchase_orders'|'receiving'|'returns'|'customers'|'pos'|'stock'|'suppliers'|'settings'|'audit'|'reports'>('all')

  useEffect(() => { setItems(getAudit()) }, [])

  const filtered = items.filter(it => {
    if (moduleKey !== 'all' && (it.module || '') !== moduleKey) return false
    if (!q) return true
    const s = `${it.at} ${it.actor||''} ${it.action} ${it.module||''} ${it.entityId||''} ${it.details||''}`.toLowerCase()
    return s.includes(q.trim().toLowerCase())
  })

  return (
    <Page title="Journal d'audit" subtitle="Actions clés enregistrées (local MVP)">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Rechercher" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: 1 }} />
        <TextField select size="small" label="Module" value={moduleKey} onChange={e => setModuleKey(e.target.value as any)} sx={{ minWidth: 220 }}>
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="purchase_orders">Bons de commande</MenuItem>
          <MenuItem value="receiving">Réceptions</MenuItem>
          <MenuItem value="returns">Retours</MenuItem>
          <MenuItem value="pos">POS</MenuItem>
          <MenuItem value="stock">Stock</MenuItem>
          <MenuItem value="suppliers">Fournisseurs</MenuItem>
          <MenuItem value="settings">Paramètres</MenuItem>
          <MenuItem value="reports">Rapports</MenuItem>
          <MenuItem value="audit">Audit</MenuItem>
        </TextField>
        <Button size="small" variant="outlined" onClick={() => setItems(getAudit())}>Rafraîchir</Button>
      </Stack>
      <Paper sx={{ p: 2 }}>
        {filtered.length === 0 ? (
          <Typography color="text.secondary">Aucune entrée.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Acteur</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Entité</TableCell>
                <TableCell>Détails</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(r.at).toLocaleString()}</TableCell>
                  <TableCell>{r.actor || ''}</TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell>{r.module || ''}</TableCell>
                  <TableCell>{r.entityId || ''}</TableCell>
                  <TableCell>{r.details || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Page>
  )
}

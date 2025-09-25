import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Checkbox, Chip, Container, Drawer, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { listLeads, updateLead } from '../api/client_clean'

export default function LeadsPage() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string; contacted?: boolean; notes?: string; contactedAt?: string; updatedAt?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState<'all' | '7' | '30'>('all')
  const [refFilter, setRefFilter] = useState<'all' | 'with' | 'without'>('all')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string; contacted?: boolean; notes?: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await listLeads()
        setRows(list)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let base = rows
    // period filter
    if (period !== 'all') {
      const days = period === '7' ? 7 : 30
      const since = Date.now() - days * 24 * 60 * 60 * 1000
      base = base.filter(r => new Date(r.createdAt).getTime() >= since)
    }
    // referral filter
    if (refFilter !== 'all') {
      base = base.filter(r => refFilter === 'with' ? !!r.referralCode : !r.referralCode)
    }
    if (!s) return base
    return base.filter(r => `${r.name} ${r.company} ${r.email} ${r.phone || ''} ${r.referralCode || ''}`.toLowerCase().includes(s))
  }, [rows, q, period, refFilter])

  const exportCsv = () => {
    const header = ['Date', 'Nom', 'Entreprise', 'Email', 'Téléphone', 'CodeParrain', 'Message']
    const lines = filtered.map(r => [new Date(r.createdAt).toLocaleString(), r.name, r.company, r.email, r.phone || '', r.referralCode || '', (r.message || '').replace(/\n/g, ' ')])
    const csv = [header.join(','), ...lines.map(l => l.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container sx={{ py: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Leads (Demandes de démo)</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
          <TextField label="Recherche" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: 1 }} placeholder="Nom, entreprise, email, code parrain…" />
          <TextField select label="Période" value={period} onChange={e => setPeriod(e.target.value as any)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="7">7 jours</MenuItem>
            <MenuItem value="30">30 jours</MenuItem>
          </TextField>
          <TextField select label="Parrainage" value={refFilter} onChange={e => setRefFilter(e.target.value as any)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="with">Avec code</MenuItem>
            <MenuItem value="without">Sans code</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={exportCsv}>Exporter CSV</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Entreprise</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Code parrain</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Contacté</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r, idx) => (
              <TableRow key={r.id} hover onClick={() => { setCurrent(r); setOpen(true) }}>
                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.company}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.phone || '-'}</TableCell>
                <TableCell>{r.referralCode || '-'}</TableCell>
                <TableCell>{r.message || '-'}</TableCell>
                <TableCell>
                  {r.contacted ? (
                    <Chip color="success" size="small" label={r.contactedAt ? `Contacté le ${new Date(r.contactedAt).toLocaleDateString()}` : 'Contacté'} />
                  ) : (
                    <Chip color="warning" size="small" label="À contacter" />
                  )}
                </TableCell>
                <TableCell>
                  <Checkbox checked={!!r.contacted} onChange={e => {
                    const v = e.target.checked
                    setRows(prev => prev.map((x, j) => j === rows.indexOf(r) ? { ...x, contacted: v } : x))
                  }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" value={r.notes || ''} onChange={e => {
                    const v = e.target.value
                    setRows(prev => prev.map((x, j) => j === rows.indexOf(r) ? { ...x, notes: v } : x))
                  }} />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={async (ev) => {
                    ev.stopPropagation()
                    try {
                      await updateLead(r.id, { contacted: r.contacted, notes: r.notes })
                    } catch {}
                  }}>Enregistrer</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!loading && filtered.length === 0) && (
              <TableRow><TableCell colSpan={10}><Box sx={{ py: 2 }}><Typography color="text.secondary">Aucun lead.</Typography></Box></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2 }} role="presentation">
          <Typography variant="h6" gutterBottom>Détail du lead</Typography>
          {current && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography>{new Date(current.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Nom</Typography>
                <Typography>{current.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Entreprise</Typography>
                <Typography>{current.company}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>{current.email}</Typography>
                  <IconButton size="small" onClick={async () => { try { await navigator.clipboard.writeText(current.email) } catch {} }}><ContentCopyIcon fontSize="small" /></IconButton>
                  <Button size="small" href={`mailto:${encodeURIComponent(current.email)}?subject=${encodeURIComponent('Suivi demande de démo AfriGest')}`}>Email</Button>
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Téléphone</Typography>
                <Typography>{current.phone || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Code parrain</Typography>
                <Typography>{current.referralCode || '-'}</Typography>
              </Box>
              <TextField label="Message" value={current.message || ''} multiline minRows={3} InputProps={{ readOnly: true }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Checkbox checked={!!current.contacted} onChange={e => setCurrent(prev => prev ? { ...prev, contacted: e.target.checked } : prev)} />
                <Typography>Contacté</Typography>
              </Stack>
              {current.contactedAt && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Contacté le</Typography>
                  <Typography>{new Date(current.contactedAt).toLocaleString()}</Typography>
                </Box>
              )}
              {current.updatedAt && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Dernière mise à jour</Typography>
                  <Typography>{new Date(current.updatedAt).toLocaleString()}</Typography>
                </Box>
              )}
              <TextField label="Notes" value={current.notes || ''} onChange={e => setCurrent(prev => prev ? { ...prev, notes: e.target.value } : prev)} multiline minRows={3} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => setOpen(false)}>Fermer</Button>
                <Button variant="contained" onClick={async () => {
                  if (!current) return
                  try {
                    await updateLead(current.id, { contacted: current.contacted, notes: current.notes })
                    setRows(prev => prev.map(x => x.id === current.id ? { ...x, contacted: current.contacted, notes: current.notes } : x))
                    setOpen(false)
                  } catch {}
                }}>Enregistrer</Button>
              </Box>
            </Stack>
          )}
        </Box>
      </Drawer>
    </Container>
  )
}

import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Snackbar, Alert, Stack, TextField, Typography, List, ListItem, ListItemText } from '@mui/material'
import jsPDF from 'jspdf'
import Page from '../components/Page'
import { createCustomerReturn, createSupplierReturn, listReturns, type ReturnItem } from '../api/client_clean'
import { appendAudit } from '../utils/audit'
import { listPendingReturns, removePendingReturn, retryPendingReturn, enqueueReturn } from '../offline/returnsQueue'
import { useBoutique } from '../context/BoutiqueContext'
import { listProducts } from '../api/client_clean'

export default function ReturnsPage() {
  const { selectedBoutiqueId: boutiqueId } = useBoutique()
  const [items, setItems] = useState<ReturnItem[]>([])
  const [typeFilter, setTypeFilter] = useState<'all'|'customer'|'supplier'>('all')
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error'|'info' } | null>(null)
  const [loading, setLoading] = useState(false)

  const [products, setProducts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [rtype, setRtype] = useState<'customer'|'supplier'>('customer')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; reason?: string }>>([])
  const [pendingOpen, setPendingOpen] = useState(false)
  const [pending, setPending] = useState<Array<any>>([])

  // Export Avoir/Retour PDF (component scope)
  const generateReturnPdf = (r: ReturnItem) => {
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const margin = 48
      let y = margin
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text(r.type === 'customer' ? 'Avoir (Retour client)' : 'Retour fournisseur', margin, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      y += 18
      pdf.text(`Référence: ${r.reference || r.id}`, margin, y)
      y += 14
      pdf.text(`Date: ${new Date(r.createdAt).toLocaleString()}`, margin, y)
      y += 24

      pdf.setDrawColor(200)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 16
      pdf.setFont('helvetica', 'bold')
      pdf.text('Produit', margin, y)
      pdf.text('Qté', pdf.internal.pageSize.getWidth() - margin - 160, y)
      pdf.text('PU', pdf.internal.pageSize.getWidth() - margin - 110, y)
      pdf.text('Total', pdf.internal.pageSize.getWidth() - margin - 50, y)
      y += 10
      pdf.setDrawColor(230)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 16
      pdf.setFont('helvetica', 'normal')

      let total = 0
      const lineH = 18
      r.items.forEach((it) => {
        const unit = (it as any).unitPrice || 0
        const lineTotal = (it.quantity || 0) * unit
        total += lineTotal
        const pageH = pdf.internal.pageSize.getHeight()
        if (y + lineH > pageH - margin - 120) { pdf.addPage(); y = margin }
        pdf.text(String((it as any).name || it.productId), margin, y)
        pdf.text(String(it.quantity || 0), pdf.internal.pageSize.getWidth() - margin - 160, y)
        pdf.text(String(unit), pdf.internal.pageSize.getWidth() - margin - 110, y)
        pdf.text(String(lineTotal), pdf.internal.pageSize.getWidth() - margin - 50, y)
        y += lineH
      })

      y += 10
      pdf.setDrawColor(200)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 22
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Total: ${total}`, pdf.internal.pageSize.getWidth() - margin - 200, y)

      const file = `${r.type === 'customer' ? 'Avoir' : 'Retour'}_${(r.reference || r.id).replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`
      pdf.save(file)
    } catch (e) {
      setSnack({ open: true, msg: 'Erreur génération PDF', severity: 'error' })
    }
  }

  useEffect(() => { (async () => { try { setProducts(await listProducts(500, 0)) } catch {} })() }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await listReturns({ type: typeFilter === 'all' ? undefined : typeFilter })
        setItems(res.items || [])
      } catch (e: any) {
        setSnack({ open: true, msg: e?.message || 'Erreur chargement retours', severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [typeFilter])

  const addLine = () => setLines(prev => [...prev, { productId: '', quantity: 1 }])
  const rmLine = (idx: number) => setLines(prev => prev.filter((_, j) => j !== idx))

  const submit = async () => {
    const payloadLines = lines.filter(l => l.productId && l.quantity > 0)
    if (payloadLines.length === 0 || !boutiqueId) { setSnack({ open: true, msg: 'Sélectionner boutique et lignes', severity: 'info' }); return }
    try {
      if (rtype === 'customer') {
        const ret = await createCustomerReturn({ boutiqueId, reference: reference.trim() || undefined, items: payloadLines })
        try { appendAudit({ action: 'return_create', module: 'returns', entityId: ret.id, details: `type: customer, lignes: ${payloadLines.length}` }) } catch {}
      } else {
        const ret = await createSupplierReturn({ boutiqueId, reference: reference.trim() || undefined, items: payloadLines })
        try { appendAudit({ action: 'return_create', module: 'returns', entityId: ret.id, details: `type: supplier, lignes: ${payloadLines.length}` }) } catch {}
      }
      setOpen(false); setReference(''); setLines([])
      const res = await listReturns({ type: typeFilter === 'all' ? undefined : typeFilter })
      setItems(res.items || [])
      setSnack({ open: true, msg: 'Retour enregistré', severity: 'success' })
    } catch (e: any) {
      // Offline fallback: enqueue return
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const offlineId = 'rt-' + Date.now()
          await enqueueReturn({ offlineId, type: rtype, boutiqueId, reference: reference.trim() || undefined, items: payloadLines })
          setOpen(false); setReference(''); setLines([])
          setSnack({ open: true, msg: `Retour enregistré hors-ligne (${offlineId}). Il sera synchronisé.`, severity: 'info' })
        } else {
          setSnack({ open: true, msg: e?.message || 'Erreur création retour', severity: 'error' })
        }
      } catch {
        setSnack({ open: true, msg: e?.message || 'Erreur création retour', severity: 'error' })
      }
    }
  }

  return (
    <Page title="Retours & Avoirs" subtitle="Retours clients et fournisseurs">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Nouveau retour</Button>
        <Button variant="outlined" onClick={async () => { setPendingOpen(true); try { setPending(await listPendingReturns()) } catch {} }}>En attente: {pending.length}</Button>
        <TextField select size="small" label="Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} sx={{ width: 220 }}>
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="customer">Clients</MenuItem>
          <MenuItem value="supplier">Fournisseurs</MenuItem>
        </TextField>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement…</Typography>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">Aucun retour.</Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map(r => (
            <Grid key={r.id} item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{r.type === 'customer' ? 'Retour client' : 'Retour fournisseur'} — {r.reference || r.id}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">{new Date(r.createdAt).toLocaleString()}</Typography>
                      <Button size="small" variant="outlined" onClick={() => generateReturnPdf(r)}>Avoir PDF</Button>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Lignes: {r.items.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau retour</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select label="Type retour" value={rtype} onChange={e => setRtype(e.target.value as any)} sx={{ width: 240 }}>
              <MenuItem value="customer">Client</MenuItem>
              <MenuItem value="supplier">Fournisseur</MenuItem>
            </TextField>
            <TextField label="Référence" value={reference} onChange={e => setReference(e.target.value)} />
            <Button size="small" variant="outlined" onClick={addLine}>Ajouter une ligne</Button>
            {lines.length === 0 && <Typography color="text.secondary">Aucune ligne.</Typography>}
            {lines.map((ln, idx) => (
              <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField select label="Produit" value={ln.productId} onChange={e => setLines(prev => prev.map((x,j)=> j===idx ? { ...x, productId: e.target.value } : x))} sx={{ minWidth: 260 }}>
                  {products.slice(0, 200).map((p:any)=> (
                    <MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Qté" type="number" value={ln.quantity} onChange={e=>setLines(prev => prev.map((x,j)=> j===idx ? { ...x, quantity: Number(e.target.value) } : x))} sx={{ width: 120 }} />
                <TextField label="Motif (optionnel)" value={ln.reason || ''} onChange={e=>setLines(prev => prev.map((x,j)=> j===idx ? { ...x, reason: e.target.value } : x))} sx={{ minWidth: 240 }} />
                <Button color="error" onClick={()=>rmLine(idx)}>Supprimer</Button>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={submit} disabled={!boutiqueId}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Pending returns viewer */}
      <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Retours en attente ({pending.length})</DialogTitle>
        <DialogContent dividers>
          {pending.length === 0 ? (
            <Typography color="text.secondary">Aucun retour en file.</Typography>
          ) : (
            <List dense>
              {pending.map((r: any) => (
                <ListItem key={r.offlineId} secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={async () => { try { await retryPendingReturn(r.offlineId) } catch {} finally { try { setPending(await listPendingReturns()) } catch {} } }}>Réessayer</Button>
                    <Button size="small" onClick={async () => { try { await removePendingReturn(r.offlineId) } finally { try { setPending(await listPendingReturns()) } catch {} } }}>Supprimer</Button>
                  </Stack>
                }>
                  <ListItemText primary={`OfflineID: ${r.offlineId}`} secondary={`Type: ${r.type} • Boutique: ${r.boutiqueId} • Lignes: ${(r.items || []).length}`} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPendingOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack?.open)} autoHideDuration={3000} onClose={() => setSnack(s => s ? { ...s, open: false } : null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(s => s ? { ...s, open: false } : null)}>{snack.msg}</Alert>}
      </Snackbar>
    </Page>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography, MenuItem, Snackbar, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import jsPDF from 'jspdf'
import Page from '../components/Page'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { can } from '../utils/acl'
import { listProducts } from '../api/client_clean'
import { listPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, type PurchaseOrderItem } from '../api/client_clean'
import { formatCurrency } from '../utils/currency'
import { useBoutique } from '../context/BoutiqueContext'
import { loadCompanySettings } from '../utils/settings'
import { appendAudit } from '../utils/audit'

export default function PurchaseOrdersPage() {
  const role = useSelector((s: RootState) => s.auth.role)
  const { selectedBoutiqueId: boutiqueId } = useBoutique()
  const [pos, setPOs] = useState<PurchaseOrderItem[]>([])
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all'|'draft'|'sent'|'partially_received'|'received'|'cancelled'>('all')
  const [loading, setLoading] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error'|'info' } | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const settings = loadCompanySettings(); const currency = settings.currency || 'XOF'

  // Draft PO form
  const [draftOpen, setDraftOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([])

  // Export PO as PDF
  const generatePoPdf = (po: PurchaseOrderItem) => {
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const margin = 48
      let y = margin
      // Header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('Bon de commande (PO)', margin, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      y += 18
      pdf.text(`Référence: ${po.reference || po.id}`, margin, y)
      y += 14
      pdf.text(`Date: ${new Date(po.createdAt).toLocaleString()}`, margin, y)
      y += 14
      pdf.text(`Devise: ${currency}`, margin, y)
      y += 24

      // Table header
      pdf.setDrawColor(200)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 16
      pdf.setFont('helvetica', 'bold')
      pdf.text('SKU', margin, y)
      pdf.text('Produit', margin + 120, y)
      pdf.text('Qté', pdf.internal.pageSize.getWidth() - margin - 180, y)
      pdf.text('PU (coût)', pdf.internal.pageSize.getWidth() - margin - 120, y)
      pdf.text('Total', pdf.internal.pageSize.getWidth() - margin - 50, y)
      y += 10
      pdf.setDrawColor(230)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 16
      pdf.setFont('helvetica', 'normal')

      let grandTotal = 0
      const lineH = 18
      po.lines.forEach((l) => {
        const lineTotal = (l.quantity || 0) * (l.unitCost || 0)
        grandTotal += lineTotal
        const pageH = pdf.internal.pageSize.getHeight()
        if (y + lineH > pageH - margin - 120) {
          pdf.addPage()
          y = margin
        }
        pdf.text(String(l.sku || l.productId), margin, y)
        pdf.text(String(l.name || '').substring(0, 42), margin + 120, y)
        pdf.text(String(l.quantity || 0), pdf.internal.pageSize.getWidth() - margin - 180, y)
        pdf.text(formatCurrency(l.unitCost || 0, currency), pdf.internal.pageSize.getWidth() - margin - 120, y, { align: 'left' })
        pdf.text(formatCurrency(lineTotal, currency), pdf.internal.pageSize.getWidth() - margin - 50, y, { align: 'left' })
        y += lineH
      })

      y += 10
      pdf.setDrawColor(200)
      pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y)
      y += 22
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Total: ${formatCurrency(grandTotal, currency)}`, pdf.internal.pageSize.getWidth() - margin - 200, y)
      y += 32
      pdf.setFont('helvetica', 'normal')
      pdf.text('Signature fournisseur: ____________________________', margin, y)
      y += 24
      pdf.text('Signature entreprise: ____________________________', margin, y)

      const file = `PO_${(po.reference || po.id).replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`
      pdf.save(file)
    } catch (e) {
      setSnack({ open: true, msg: 'Erreur génération PDF', severity: 'error' })
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await listPurchaseOrders({ status: statusFilter === 'all' ? undefined : statusFilter })
        setPOs(res.items || [])
      } catch (e: any) {
        setSnack({ open: true, msg: e?.message || 'Erreur chargement PO', severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [statusFilter])

  useEffect(() => {
    ;(async () => {
      try { setProducts(await listProducts(500, 0)) } catch {}
    })()
  }, [])

  const totalOf = (po: PurchaseOrderItem) => {
    try { return po.lines.reduce((s,l)=> s + l.quantity * l.unitCost, 0) } catch { return 0 }
  }

  const addDraftLine = () => setLines(prev => [...prev, { productId: '', quantity: 1, unitCost: 0 }])
  const removeDraftLine = (idx: number) => setLines(prev => prev.filter((_,j)=> j!==idx))

  const createDraft = async () => {
    const payload = { reference: reference.trim() || undefined, currency, lines: lines.filter(l => l.productId && l.quantity>0) }
    if ((payload.lines || []).length === 0) return
    setLoading(true)
    try {
      await createPurchaseOrder(payload)
      setDraftOpen(false)
      setReference('')
      setLines([])
      const res = await listPurchaseOrders({ status: statusFilter === 'all' ? undefined : statusFilter })
      setPOs(res.items || [])
      setSnack({ open: true, msg: 'Bon de commande créé', severity: 'success' })
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message || 'Erreur création PO', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="Approvisionnements" subtitle="Bons de commande fournisseurs">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setDraftOpen(true)}>Créer un bon de commande</Button>
        <TextField select size="small" label="Statut" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} sx={{ width: 240 }}>
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="draft">Brouillon</MenuItem>
          <MenuItem value="sent">Envoyé</MenuItem>
          <MenuItem value="partially_received">Reçu partiel</MenuItem>
          <MenuItem value="received">Reçu complet</MenuItem>
          <MenuItem value="cancelled">Annulé</MenuItem>
        </TextField>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement…</Typography>
      ) : pos.length === 0 ? (
        <Typography color="text.secondary">Aucun bon de commande.</Typography>
      ) : (
        <Grid container spacing={2}>
          {pos.map(po => (
            <Grid key={po.id} item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">PO {po.reference || po.id}</Typography>
                    <Typography variant="body2" color="text.secondary">{po.status}</Typography>
                  </Stack>
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>SKU</TableCell>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Qté</TableCell>
                        <TableCell align="right">PU (coût)</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {po.lines.map((l, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{l.sku || l.productId}</TableCell>
                          <TableCell>{l.name || ''}</TableCell>
                          <TableCell align="right">{l.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(l.unitCost, currency)}</TableCell>
                          <TableCell align="right">{formatCurrency(l.quantity * l.unitCost, currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">Total: {formatCurrency(totalOf(po), currency)}</Typography>
                    <Stack direction="row" spacing={1}>
                      {can(role as any, 'purchase_orders', 'export') && (
                        <Button size="small" variant="outlined" onClick={() => generatePoPdf(po)}>Exporter PDF</Button>
                      )}
                      {po.status === 'draft' && can(role as any, 'purchase_orders', 'status_change') && (
                        <Button size="small" variant="outlined" onClick={async ()=>{ try { await updatePurchaseOrder(po.id, { status: 'sent' }) ; try { appendAudit({ action: 'po_sent', module: 'purchase_orders', entityId: po.id }) } catch {} ; setSnack({ open: true, msg: 'PO envoyé', severity: 'success' }); const res = await listPurchaseOrders({ status: statusFilter==='all'?undefined:statusFilter }); setPOs(res.items||[]) } catch(e:any){ setSnack({ open: true, msg: e?.message || 'Erreur maj', severity: 'error' }) } }}>Marquer envoyé</Button>
                      )}
                      {po.status !== 'cancelled' && po.status !== 'received' && can(role as any, 'purchase_orders', 'delete') && (
                        <Button size="small" color="warning" variant="outlined" onClick={async ()=>{ try { await updatePurchaseOrder(po.id, { status: 'cancelled' }) ; try { appendAudit({ action: 'po_cancel', module: 'purchase_orders', entityId: po.id }) } catch {} ; setSnack({ open: true, msg: 'PO annulé', severity: 'success' }); const res = await listPurchaseOrders({ status: statusFilter==='all'?undefined:statusFilter }); setPOs(res.items||[]) } catch(e:any){ setSnack({ open: true, msg: e?.message || 'Erreur annulation', severity: 'error' }) } }}>Annuler</Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create PO dialog */}
      <Dialog open={draftOpen} onClose={()=>setDraftOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Créer un bon de commande</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Référence" value={reference} onChange={e=>setReference(e.target.value)} />
            <Button size="small" variant="outlined" onClick={addDraftLine}>Ajouter une ligne</Button>
            {lines.length === 0 && <Typography color="text.secondary">Aucune ligne.</Typography>}
            {lines.map((ln, idx) => (
              <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField select label="Produit" value={ln.productId} onChange={e=>setLines(prev => prev.map((x,j)=> j===idx ? { ...x, productId: e.target.value } : x))} sx={{ minWidth: 260 }}>
                  {products.slice(0, 200).map((p:any)=> (
                    <MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Qté" type="number" value={ln.quantity} onChange={e=>setLines(prev => prev.map((x,j)=> j===idx ? { ...x, quantity: Number(e.target.value) } : x))} sx={{ width: 120 }} />
                <TextField label="PU (coût)" type="number" value={ln.unitCost} onChange={e=>setLines(prev => prev.map((x,j)=> j===idx ? { ...x, unitCost: Number(e.target.value) } : x))} sx={{ width: 160 }} />
                <Button color="error" onClick={()=>removeDraftLine(idx)}>Supprimer</Button>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDraftOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={createDraft} disabled={loading || lines.length===0}>Créer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack?.open)} autoHideDuration={3000} onClose={() => setSnack(s => s ? { ...s, open: false } : null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(s => s ? { ...s, open: false } : null)}>{snack.msg}</Alert>}
      </Snackbar>
    </Page>
  )
}

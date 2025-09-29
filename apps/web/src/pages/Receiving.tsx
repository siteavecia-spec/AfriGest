import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, Snackbar, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import Page from '../components/Page'
import { listPurchaseOrders, receivePurchaseOrder, type PurchaseOrderItem } from '../api/client_clean'
import { appendAudit } from '../utils/audit'
import { enqueueReceiving, trySyncReceivings } from '../offline/poQueue'
import { formatCurrency } from '../utils/currency'
import { useBoutique } from '../context/BoutiqueContext'
import { loadCompanySettings } from '../utils/settings'

export default function ReceivingPage() {
  const { selectedBoutiqueId: boutiqueId } = useBoutique()
  const [pos, setPOs] = useState<PurchaseOrderItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selected, setSelected] = useState<PurchaseOrderItem | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error'|'info' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [recv, setRecv] = useState<Array<{ productId: string; received: number }>>([])
  const [note, setNote] = useState('')
  const settings = loadCompanySettings(); const currency = settings.currency || 'XOF'

  useEffect(() => {
    ;(async () => {
      try {
        const res = await listPurchaseOrders({ status: 'sent' })
        setPOs(res.items || [])
      } catch (e:any) {
        setSnack({ open: true, msg: e?.message || 'Erreur chargement POs', severity: 'error' })
      }
    })()
  }, [])

  useEffect(() => {
    const po = pos.find(p => p.id === selectedId) || null
    setSelected(po)
    if (po) {
      setRecv(po.lines.map(l => ({ productId: l.productId, received: 0 })))
    } else {
      setRecv([])
    }
  }, [selectedId, pos])

  const onReceive = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const payload = { items: recv.filter(r => r.received > 0), note: note.trim() || undefined, boutiqueId: boutiqueId || undefined }
      if ((payload.items || []).length === 0) { setSnack({ open: true, msg: 'Aucune quantité à réceptionner', severity: 'info' }); setLoading(false); return }
      const res = await receivePurchaseOrder(selected.id, payload)
      try { appendAudit({ action: 'po_receive', module: 'receiving', entityId: selected.id, details: `lignes: ${payload.items.length}` }) } catch {}
      setSnack({ open: true, msg: `Réception enregistrée — statut: ${res.status}`, severity: 'success' })
      // Refresh lists: move PO out if fully received
      const res2 = await listPurchaseOrders({ status: 'sent' })
      setPOs(res2.items || [])
      setSelectedId('')
      setNote('')
    } catch (e:any) {
      // Offline fallback: enqueue receiving
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const offlineId = 'rx-' + Date.now()
          await enqueueReceiving({ offlineId, poId: selected.id, boutiqueId: boutiqueId || undefined, note: note.trim() || undefined, items: payload.items })
          setSnack({ open: true, msg: `Réception enregistrée hors-ligne (${offlineId}). Elle sera synchronisée.`, severity: 'info' })
        } else {
          setSnack({ open: true, msg: e?.message || 'Erreur réception', severity: 'error' })
        }
      } catch {
        setSnack({ open: true, msg: e?.message || 'Erreur réception', severity: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="Réceptions" subtitle="Réceptionner les bons de commande envoyés">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField select label="Bon de commande" value={selectedId} onChange={e => setSelectedId(e.target.value)} sx={{ minWidth: 320 }}>
          <MenuItem value="" disabled>Sélectionner</MenuItem>
          {pos.map(po => (
            <MenuItem key={po.id} value={po.id}>PO {po.reference || po.id} — {po.lines.length} lignes</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <TextField label="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} sx={{ minWidth: 260 }} />
        <Button variant="contained" onClick={onReceive} disabled={loading || !selected}>Valider réception</Button>
      </Stack>

      {!selected ? (
        <Typography color="text.secondary">Choisissez un bon de commande à réceptionner.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Produit</TableCell>
              <TableCell align="right">Qté commandée</TableCell>
              <TableCell align="right">Qté à recevoir</TableCell>
              <TableCell align="right">Écart (après réception)</TableCell>
              <TableCell align="right">PU (coût)</TableCell>
              <TableCell align="right">Total ligne</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selected.lines.map((l, idx) => (
              <TableRow key={idx}>
                <TableCell>{l.sku || l.productId}</TableCell>
                <TableCell>{l.name || ''}</TableCell>
                <TableCell align="right">{l.quantity}</TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={recv[idx]?.received ?? 0} onChange={e => setRecv(prev => prev.map((x, j) => j === idx ? { ...x, received: Math.max(0, Number(e.target.value)) } : x))} sx={{ width: 120 }} />
                </TableCell>
                <TableCell align="right">{Math.max(0, (l.quantity || 0) - ((recv[idx]?.received ?? 0) || 0))}</TableCell>
                <TableCell align="right">{formatCurrency(l.unitCost, currency)}</TableCell>
                <TableCell align="right">{formatCurrency((recv[idx]?.received ?? 0) * l.unitCost, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selected && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Quantités à recevoir (total): {(recv || []).reduce((s, r) => s + (r.received || 0), 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Statut prévisionnel: {(() => {
              const allZero = (recv || []).every(r => (r.received || 0) === 0)
              if (allZero) return '—'
              const complete = selected.lines.every((l, idx) => ((recv[idx]?.received ?? 0) >= (l.quantity || 0)))
              return complete ? 'reçu complet' : 'reçu partiel'
            })()}
          </Typography>
        </Stack>
      )}

      <Snackbar open={Boolean(snack?.open)} autoHideDuration={3000} onClose={() => setSnack(s => s ? { ...s, open: false } : null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(s => s ? { ...s, open: false } : null)}>{snack.msg}</Alert>}
      </Snackbar>
    </Page>
  )
}

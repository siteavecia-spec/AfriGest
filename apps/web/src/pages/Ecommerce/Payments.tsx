import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography, Snackbar, Alert, Table, TableContainer, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { ecomListOrders, ecomPaymentsStripeIntent, ecomPaymentsPayPalOrder, ecomPaymentsMtnInit, ecomPaymentsOrangeInit } from '../../api/client_clean'
import { enableStripe, showMobileMoney, showPayPal, showPayments } from '../../config/featureFlags'

export default function EcommercePaymentsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Array<{ id: string; total: number; currency: string; paymentStatus?: string; status?: string; createdAt?: string }>>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ecomListOrders()
        const list = (res.items || []).map((o: any, idx: number) => ({
          id: o.id || `ord-${idx}`,
          total: Number(o.total || 0),
          currency: o.currency || 'GNF',
          paymentStatus: o.paymentStatus || 'pending',
          status: o.status || 'received',
          createdAt: o.createdAt
        }))
        setOrders(list)
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement des commandes (paiements)')
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Payments — Suivi & Tests (Phase 4)</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      {showPayments && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Tests sandbox (stubs)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {enableStripe && (
                <Button variant="outlined" onClick={async () => {
                  try {
                    const r = await ecomPaymentsStripeIntent({ items: [{ sku: 'demo', quantity: 1, price: 1000 }], customer: {} })
                    setMsg(`Stripe: ${r.status || 'ok'}${r.clientSecret ? ' • secret' : ''}`)
                  } catch (e: any) { setErr(e?.message || 'Stripe stub KO') }
                }}>Tester Stripe</Button>
              )}
              {showPayPal && (
                <Button variant="outlined" onClick={async () => {
                  try {
                    const r = await ecomPaymentsPayPalOrder({ items: [{ sku: 'demo', quantity: 1, price: 1000 }] })
                    setMsg(`PayPal: ${r.status || 'ok'}${r.approveUrl ? ' • approve URL' : ''}`)
                  } catch (e: any) { setErr(e?.message || 'PayPal stub KO') }
                }}>Tester PayPal</Button>
              )}
              {showMobileMoney && (
                <>
                  <Button variant="outlined" onClick={async () => { try { const r = await ecomPaymentsMtnInit({ amount: 1000 }); setMsg(`MTN: ${r.status || 'ok'}`) } catch (e: any) { setErr(e?.message || 'MTN stub KO') } }}>Tester MTN</Button>
                  <Button variant="outlined" onClick={async () => { try { const r = await ecomPaymentsOrangeInit({ amount: 1000 }); setMsg(`Orange: ${r.status || 'ok'}`) } catch (e: any) { setErr(e?.message || 'Orange stub KO') } }}>Tester Orange</Button>
                </>
              )}
              <Button variant="outlined" onClick={async () => {
                // refresh list
                try {
                  setLoading(true)
                  const res = await ecomListOrders()
                  const list = (res.items || []).map((o: any, idx: number) => ({
                    id: o.id || `ord-${idx}`,
                    total: Number(o.total || 0),
                    currency: o.currency || 'GNF',
                    paymentStatus: o.paymentStatus || 'pending',
                    status: o.status || 'received',
                    createdAt: o.createdAt
                  }))
                  setOrders(list)
                  setMsg('Liste mise à jour')
                } catch (e: any) { setErr(e?.message || 'Refresh KO') } finally { setLoading(false) }
              }}>Rafraîchir</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Dernières commandes — Statuts de paiement</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Commande</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Paiement</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Créée</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{o.id}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell>{o.paymentStatus}</TableCell>
                    <TableCell>{o.total.toLocaleString('fr-FR')} {o.currency}</TableCell>
                    <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">{loading ? 'Chargement…' : 'Aucune donnée.'}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar open={!!msg} autoHideDuration={1600} onClose={() => setMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setMsg(null)} severity="success" variant="filled">{msg}</Alert>
      </Snackbar>
      <Snackbar open={!!err} autoHideDuration={2000} onClose={() => setErr(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErr(null)} severity="error" variant="filled">{err}</Alert>
      </Snackbar>
    </Box>
  )
}

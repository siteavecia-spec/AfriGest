import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, ToggleButtonGroup, ToggleButton, Alert, TableContainer, Skeleton } from '@mui/material'
import { ecomListOrders, ecomCreateOrder, ecomUpdateOrderStatus, createSale, ecomPaymentsPayPalOrder, ecomPaymentsPayPalCapture } from '../../api/client_clean'
import { useBoutique } from '../../context/BoutiqueContext'
import { loadCompanySettings } from '../../utils/settings'
import { appendAudit } from '../../utils/audit'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { can } from '../../utils/acl'

export default function EcommerceOrders() {
  const { selectedBoutiqueId: boutiqueId } = useBoutique()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [orders, setOrders] = useState<Array<{ id: string; status: 'received'|'prepared'|'shipped'|'delivered'|'returned'; total: number; currency: string; paymentStatus?: 'paid'|'pending'|'failed'|'refunded' }>>([])
  const [filter, setFilter] = useState<'all'|'paid'|'pending'>('all')
  const [statusFilter, setStatusFilter] = useState<'all'|'received'|'prepared'|'shipped'|'delivered'|'returned'>('all')
  const [debouncedFilter, setDebouncedFilter] = useState<typeof filter>('all')
  const [debouncedStatus, setDebouncedStatus] = useState<typeof statusFilter>('all')
  const [stripeSecret, setStripeSecret] = useState<string | null>(null)
  const [paypalApproveUrl, setPaypalApproveUrl] = useState<string | null>(null)
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
  const [paypalLocalOrderId, setPaypalLocalOrderId] = useState<string | null>(null)
  // Permissions
  const role = useSelector((s: RootState) => s.auth.role) as any
  const canStatusChange = can(role, 'ecommerce.orders', 'status_change')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ecomListOrders()
        const list = (res.items || []).map((o: any, idx: number) => ({
          id: o.id || `ord-${idx}`,
          status: (o.status || 'received') as any,
          total: Number(o.total ?? 0),
          currency: o.currency || 'GNF',
          paymentStatus: (o.paymentStatus || 'pending') as any
        }))
        setOrders(list)
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement commandes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Debounce filters (250ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter), 250)
    return () => clearTimeout(t)
  }, [filter])
  useEffect(() => {
    const t = setTimeout(() => setDebouncedStatus(statusFilter), 250)
    return () => clearTimeout(t)
  }, [statusFilter])

  const color = (s: string) => s === 'received' ? 'default' : s === 'prepared' ? 'info' : s === 'shipped' ? 'warning' : s === 'delivered' ? 'success' : 'error'

  const filteredOrders = useMemo(() => (
    orders
      .filter(o => (debouncedFilter === 'all' ? true : (debouncedFilter === 'paid' ? o.paymentStatus === 'paid' : (o.paymentStatus ?? 'pending') === 'pending')))
      .filter(o => (debouncedStatus === 'all' ? true : o.status === debouncedStatus))
  ), [orders, debouncedFilter, debouncedStatus])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Commandes</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Button variant="contained" onClick={async () => {
              setError(null); setMessage(null)
              try {
                // Create a simple COD order for testing
                await ecomCreateOrder({ items: [{ sku: 'SKU-TSHIRT', quantity: 1, price: 75000, currency: 'GNF' }] })
                setMessage('Commande COD de test créée.')
                // Refresh list
                const res = await ecomListOrders()
                const list = (res.items || []).map((o: any, idx: number) => ({ id: o.id || `ord-${idx}`, status: (o.status || 'received') as any, total: Number(o.total ?? 0), currency: o.currency || 'GNF', paymentStatus: (o.paymentStatus || 'pending') as any }))
                setOrders(list)
                setTimeout(() => setMessage(null), 1500)
              } catch (e: any) {
                setError(e?.message || 'Impossible de créer la commande de test')
              }
            }}>Créer commande test (COD)</Button>
            <Button variant="outlined" onClick={async () => {
              setError(null); setMessage(null); setStripeSecret(null)
              try {
                const res = await ecomCreateOrder({
                  items: [{ sku: 'SKU-TSHIRT', quantity: 1, price: 75000, currency: 'GNF' }],
                  payment: { provider: 'stripe' }
                })
                const secret = res?.payment?.clientSecret
                if (secret) {
                  setStripeSecret(secret)
                  setMessage('PaymentIntent créé (Stripe).')
                } else {
                  setMessage('Stripe: PaymentIntent non retourné.')
                }
                // Refresh list to see pending
                const listRes = await ecomListOrders()
                const list = (listRes.items || []).map((o: any, idx: number) => ({ id: o.id || `ord-${idx}`, status: (o.status || 'received') as any, total: Number(o.total ?? 0), currency: o.currency || 'GNF', paymentStatus: (o.paymentStatus || 'pending') as any }))
                setOrders(list)
              } catch (e: any) {
                setError(e?.message || 'Impossible de créer la commande Stripe')
              }
            }}>Créer commande test (Stripe)</Button>
            <Button variant="outlined" onClick={async () => {
              setError(null); setMessage(null); setPaypalApproveUrl(null); setPaypalOrderId(null); setPaypalLocalOrderId(null)
              try {
                const res = await ecomPaymentsPayPalOrder({ items: [{ sku: 'SKU-TSHIRT', quantity: 1, price: 75000, currency: 'GNF' }] })
                if (res.approveUrl) {
                  setPaypalApproveUrl(res.approveUrl)
                  if (res.paypalOrderId) setPaypalOrderId(res.paypalOrderId)
                  if (res.orderId) setPaypalLocalOrderId(res.orderId)
                  setMessage('Ordre PayPal créé. Ouvrez le lien d’approbation puis capturez.')
                } else {
                  setMessage('PayPal: approveUrl non retournée.')
                }
                const listRes = await ecomListOrders()
                const list = (listRes.items || []).map((o: any, idx: number) => ({ id: o.id || `ord-${idx}`, status: (o.status || 'received') as any, total: Number(o.total ?? 0), currency: o.currency || 'GNF', paymentStatus: (o.paymentStatus || 'pending') as any }))
                setOrders(list)
              } catch (e: any) {
                setError(e?.message || 'Impossible de créer l’ordre PayPal')
              }
            }}>Créer commande test (PayPal)</Button>
          </Stack>
          {stripeSecret && (
            <Alert severity="info" sx={{ mb: 2 }}>
              clientSecret Stripe: <code style={{ userSelect: 'all' }}>{stripeSecret}</code>
            </Alert>
          )}
          {paypalApproveUrl && (
            <Alert severity="info" sx={{ mb: 2 }}>
              PayPal: <a href={paypalApproveUrl} target="_blank" rel="noreferrer">Ouvrir approveUrl</a>
              {paypalOrderId && (
                <Button size="small" sx={{ ml: 1 }} variant="outlined" onClick={async () => {
                  setError(null); setMessage(null)
                  try {
                    await ecomPaymentsPayPalCapture({ paypalOrderId, orderId: paypalLocalOrderId || undefined })
                    setMessage('Capture PayPal effectuée. La commande devrait passer en payé (si liée).')
                    const listRes = await ecomListOrders()
                    const list = (listRes.items || []).map((o: any, idx: number) => ({ id: o.id || `ord-${idx}`, status: (o.status || 'received') as any, total: Number(o.total ?? 0), currency: o.currency || 'GNF', paymentStatus: (o.paymentStatus || 'pending') as any }))
                    setOrders(list)
                  } catch (e: any) {
                    setError(e?.message || 'Échec capture PayPal')
                  }
                }}>Capturer maintenant</Button>
              )}
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Liste des commandes</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButtonGroup size="small" color="primary" value={filter} exclusive onChange={(_, v) => setFilter(v || 'all')}>
                <ToggleButton value="all">Toutes</ToggleButton>
                <ToggleButton value="paid">Payées</ToggleButton>
                <ToggleButton value="pending">En attente</ToggleButton>
              </ToggleButtonGroup>
              <Button size="small" variant="outlined" onClick={() => {
                const filtered = orders
                  .filter(o => filter === 'all' ? true : filter === 'paid' ? o.paymentStatus === 'paid' : (o.paymentStatus ?? 'pending') === 'pending')
                  .filter(o => statusFilter === 'all' ? true : o.status === statusFilter)
                const header = ['id','client','status','paymentStatus','total','currency']
                const lines = filtered.map(o => [
                  o.id,
                  String(((o as any).customer?.email || (o as any).customer?.firstName || (o as any).customerEmail || '')),
                  o.status,
                  o.paymentStatus || 'pending',
                  String(o.total),
                  o.currency
                ])
                const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'ecommerce_orders.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}>Exporter CSV</Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2">Filtrer par statut:</Typography>
            <ToggleButtonGroup size="small" color="secondary" value={statusFilter} exclusive onChange={(_, v) => setStatusFilter(v || 'all')}>
              <ToggleButton value="all">Tous</ToggleButton>
              <ToggleButton value="received">Reçue</ToggleButton>
              <ToggleButton value="prepared">Préparée</ToggleButton>
              <ToggleButton value="shipped">Expédiée</ToggleButton>
              <ToggleButton value="delivered">Livrée</ToggleButton>
              <ToggleButton value="returned">Retournée</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Commande</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Paiement</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={160} /></TableCell>
                  <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                  <TableCell><Skeleton variant="rectangular" width={90} height={24} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                </TableRow>
              ))}
              {!loading && filteredOrders.map(o => (
                <TableRow key={o.id} hover sx={{ borderBottom: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{(o as any).customer?.email || (o as any).customer?.firstName || (o as any).customerEmail || '—'}</TableCell>
                  <TableCell><Chip size="small" label={o.status} color={color(o.status) as any} /></TableCell>
                  <TableCell>
                    <Chip size="small" label={(o.paymentStatus || 'pending')} color={(o.paymentStatus === 'paid') ? 'success' as any : (o.paymentStatus === 'failed') ? 'error' as any : 'default' as any} />
                  </TableCell>
                  <TableCell>{o.total.toLocaleString('fr-FR')} {o.currency}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {canStatusChange && o.status !== 'prepared' && <Button size="small" onClick={async () => { try { await ecomUpdateOrderStatus(o.id, 'prepared'); const r = await ecomListOrders(); setOrders((r.items || []).map((x:any, idx:number) => ({ id: x.id || `ord-${idx}`, status: (x.status || 'received'), total: Number(x.total ?? 0), currency: x.currency || 'GNF', paymentStatus: (x.paymentStatus || 'pending') })))} catch (e:any) { setError(e?.message || 'MAJ statut échouée') } }}>Préparer</Button>}
                      {canStatusChange && o.status !== 'shipped' && <Button size="small" onClick={async () => { try { await ecomUpdateOrderStatus(o.id, 'shipped'); const r = await ecomListOrders(); setOrders((r.items || []).map((x:any, idx:number) => ({ id: x.id || `ord-${idx}`, status: (x.status || 'received'), total: Number(x.total ?? 0), currency: x.currency || 'GNF', paymentStatus: (x.paymentStatus || 'pending') })))} catch (e:any) { setError(e?.message || 'MAJ statut échouée') } }}>Expédier</Button>}
                      {canStatusChange && o.status !== 'delivered' && <Button size="small" onClick={async () => { try { await ecomUpdateOrderStatus(o.id, 'delivered'); const r = await ecomListOrders(); setOrders((r.items || []).map((x:any, idx:number) => ({ id: x.id || `ord-${idx}`, status: (x.status || 'received'), total: Number(x.total ?? 0), currency: x.currency || 'GNF', paymentStatus: (x.paymentStatus || 'pending') })))} catch (e:any) { setError(e?.message || 'MAJ statut échouée') } }}>Livrer</Button>}
                      {canStatusChange && o.status !== 'returned' && <Button size="small" color="warning" onClick={async () => { try { await ecomUpdateOrderStatus(o.id, 'returned'); const r = await ecomListOrders(); setOrders((r.items || []).map((x:any, idx:number) => ({ id: x.id || `ord-${idx}`, status: (x.status || 'received'), total: Number(x.total ?? 0), currency: x.currency || 'GNF', paymentStatus: (x.paymentStatus || 'pending') })))} catch (e:any) { setError(e?.message || 'MAJ statut échouée') } }}>Retour</Button>}
                      <Button size="small" variant="outlined" onClick={() => {
                        try {
                          const when = new Date().toLocaleString()
                          const msg = `À propos de la commande ${o.id} (${when}) — Total ${o.total.toLocaleString('fr-FR')} ${o.currency}`
                          localStorage.setItem('afritalk_draft', msg)
                        } catch {}
                        // open messaging; user choisira le destinataire (DG/PDG) dans cette v1
                        try { (window as any).location.href = '/messaging' } catch {}
                      }}>💬 Discuss</Button>
                      <Button size="small" color="success" onClick={async () => {
                        try {
                          setLoading(true)
                          const itemsSrc = (o as any).items || []
                          const items = (Array.isArray(itemsSrc) && itemsSrc.length > 0)
                            ? itemsSrc.map((it: any) => ({ productId: it.productId || it.sku || 'unknown', quantity: Number(it.quantity || 1), unitPrice: Number(it.price || o.total || 0) }))
                            : [{ productId: 'unknown', quantity: 1, unitPrice: Number(o.total || 0) }]
                          const currency = (o as any).currency || loadCompanySettings().currency || 'XOF'
                          const bq = boutiqueId && boutiqueId !== 'all' ? boutiqueId : 'bq-1'
                          await createSale({ boutiqueId: bq, items, paymentMethod: 'cash', currency })
                          try { appendAudit({ action: 'ecom_sale_create', module: 'pos', entityId: o.id, details: `total: ${o.total} ${o.currency}` }) } catch {}
                          setMessage('Vente locale générée (simulation).')
                        } catch (e: any) {
                          setError(e?.message || 'Échec génération de la vente locale')
                        } finally {
                          setLoading(false)
                        }
                      }}>Générer vente locale</Button>
                      <Button size="small" variant="outlined" onClick={() => {
                        try {
                          setOrders(prev => prev.map(x => x.id === o.id ? { ...x, paymentStatus: 'paid' as any } : x))
                          try { appendAudit({ action: 'ecom_payment_mark_paid', module: 'ecommerce.orders', entityId: o.id, details: 'test toggle' }) } catch {}
                          setMessage('Statut paiement: payé (test)')
                        } catch (e: any) {
                          setError(e?.message || 'Échec mise à jour paiement (test)')
                        }
                      }}>Marquer payé (test)</Button>
                      <Button size="small" variant="outlined" onClick={() => {
                        try {
                          setOrders(prev => prev.map(x => x.id === o.id ? { ...x, paymentStatus: 'pending' as any } : x))
                          try { appendAudit({ action: 'ecom_payment_mark_pending', module: 'ecommerce.orders', entityId: o.id, details: 'test toggle' }) } catch {}
                          setMessage('Statut paiement: en attente (test)')
                        } catch (e: any) {
                          setError(e?.message || 'Échec mise à jour paiement (test)')
                        }
                      }}>Marquer en attente (test)</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>Aucune commande.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

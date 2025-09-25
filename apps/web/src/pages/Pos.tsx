import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material'
import { createSale, listProducts } from '../api/client_clean'
import { enqueueSale, getPendingSales, removePendingSale, trySyncSales } from '../offline/salesQueue'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptModal, { type ReceiptData } from '../components/ReceiptModal'
import { loadCompanySettings, getNextReceiptNumber } from '../utils/settings'
import { formatGNF } from '../utils/currency'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

export default function PosPage() {
  const [boutiqueId, setBoutiqueId] = useState('bq-1')
  const [products, setProducts] = useState<Array<any>>([])
  const [query, setQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [cart, setCart] = useState<Array<{ productId: string; name: string; sku: string; quantity: number; unitPrice: number; discount?: number }>>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  // Offline pending state
  const [pending, setPending] = useState<Array<any>>([])
  const [pendingOpen, setPendingOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // Held carts
  const [heldName, setHeldName] = useState('')
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; name: string; createdAt: string; boutiqueId: string; items: Array<{ productId: string; name: string; sku: string; quantity: number; unitPrice: number; discount?: number }> }>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const list = await listProducts()
        setProducts(list)
      } catch (e) {
        // ignore; no products yet
      }
    })()
    // Load pending queue on mount
    ;(async () => {
      try { setPending(await getPendingSales()) } catch {}
    })()
    // Load held carts from localStorage
    try {
      const raw = localStorage.getItem('afrigest_held_carts')
      if (raw) setHeldCarts(JSON.parse(raw))
    } catch {}
    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Add currently selected product if any
        if (selectedProductId) {
          addToCart()
          e.preventDefault()
        }
      }
      if ((e.key === '+' || e.key === '=')) {
        if (cart.length > 0) {
          const last = cart[cart.length - 1]
          changeQty(cart.length - 1, last.quantity + 1)
          e.preventDefault()
        }
      }
      if (e.key === '-' || e.key === '_') {
        if (cart.length > 0) {
          const last = cart[cart.length - 1]
          changeQty(cart.length - 1, Math.max(1, last.quantity - 1))
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    )
  }, [products, query])

  const onSelectProduct = (id: string) => {
    const p = products.find((x: any) => x.id === id)
    setSelectedProductId(id)
    setUnitPrice(p ? Number(p.price ?? 0) : 0)
    setQuantity(1)
  }

  const addToCart = () => {
    const p = products.find((x: any) => x.id === selectedProductId)
    if (!p) return
    if (quantity <= 0 || unitPrice < 0) return
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity, unitPrice }
        return copy
      }
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, quantity, unitPrice }]
    })
    setSelectedProductId('')
    setQuantity(1)
    setUnitPrice(0)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const changeQty = (idx: number, nextQty: number) => {
    setCart(prev => prev.map((x, j) => j === idx ? { ...x, quantity: Math.max(1, nextQty) } : x))
  }

  const total = useMemo(() => cart.reduce((sum, i) => sum + (i.quantity * i.unitPrice - (i.discount || 0)), 0), [cart])
  const totalAfterDiscount = useMemo(() => Math.max(0, total - (globalDiscount || 0)), [total, globalDiscount])

  function genOfflineId() {
    return 'offline-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)
  }

  const submitSale = async () => {
    setMessage(null)
    setLoading(true)
    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount }))
    // Apply global discount to the first item for backend compatibility
    if (items.length > 0 && (globalDiscount || 0) > 0) {
      const d = Math.min(globalDiscount, items[0].quantity * items[0].unitPrice)
      ;(items as any)[0].discount = d
    }
    const payload = { boutiqueId, items, paymentMethod, currency: 'GNF' as const }
    try {
      const sale = await createSale(payload)
      setMessage(`Vente créée: ${sale.id} | Total: ${totalAfterDiscount}`)
      // Build receipt
      const receiptItems = cart.map((i, idx) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice - (i.discount || 0) - (idx === 0 ? Math.min(globalDiscount || 0, i.quantity * i.unitPrice) : 0)
      }))
      const brand = loadCompanySettings()
      const receiptNumber = getNextReceiptNumber(boutiqueId, brand.receiptPrefix)
      setReceiptData({ id: sale.id, boutiqueId, createdAt: new Date().toISOString(), currency: 'GNF', paymentMethod, paymentRef: paymentRef || undefined, items: receiptItems, total: totalAfterDiscount, offlineId: undefined, brand: { name: brand.name, slogan: brand.slogan, address: brand.address, phone: brand.phone, logoDataUrl: brand.logoDataUrl }, receiptNumber })
      setReceiptOpen(true)
      setCart([])
      setGlobalDiscount(0)
      setPaymentRef('')
    } catch (err: any) {
      // Offline fallback: enqueue
      const offlineId = genOfflineId()
      await enqueueSale({ ...payload, offlineId })
      setMessage(`Vente enregistrée hors-ligne (${offlineId}). Elle sera synchronisée dès connexion.`)
      try { setPending(await getPendingSales()) } catch {}
      const receiptItems = cart.map((i, idx) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice - (idx === 0 ? Math.min(globalDiscount || 0, i.quantity * i.unitPrice) : 0)
      }))
      const brand = loadCompanySettings()
      const receiptNumber = getNextReceiptNumber(boutiqueId, brand.receiptPrefix)
      setReceiptData({ id: undefined, boutiqueId, createdAt: new Date().toISOString(), currency: 'GNF', paymentMethod, paymentRef: paymentRef || undefined, items: receiptItems, total: totalAfterDiscount, offlineId, brand: { name: brand.name, slogan: brand.slogan, address: brand.address, phone: brand.phone, logoDataUrl: brand.logoDataUrl }, receiptNumber })
      setReceiptOpen(true)
      setCart([])
      setGlobalDiscount(0)
      setPaymentRef('')
    } finally {
      setLoading(false)
    }
  }

  // Quick add by barcode or SKU: when Enter pressed on barcode field
  const onBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const code = barcode.trim().toLowerCase()
    if (!code) return
    const p = products.find((x: any) => x.barcode?.toLowerCase() === code || x.sku?.toLowerCase() === code)
    if (p) {
      setSelectedProductId(p.id)
      setUnitPrice(Number(p.price ?? 0))
      setQuantity(1)
      // Auto add one unit
      setCart(prev => {
        const idx = prev.findIndex(i => i.productId === p.id)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 }
          return copy
        }
        return [...prev, { productId: p.id, name: p.name, sku: p.sku, quantity: 1, unitPrice: Number(p.price ?? 0) }]
      })
      setBarcode('')
    } else {
      setMessage(`Code inconnu: ${barcode}`)
      setBarcode('')
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      {/* Banner for pending offline sales */}
      {pending.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={async () => { setPendingOpen(true); try { setPending(await getPendingSales()) } catch {} }}>Voir</Button>
              <Button size="small" variant="contained" onClick={async () => { setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); try { setPending(await getPendingSales()) } catch {} } }} disabled={syncing}>Sync</Button>
            </Stack>
          }
        >Des ventes en attente seront synchronisées dès que possible: {pending.length}</Alert>
      )}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Point de Vente (MVP)</Typography>
        <Stack spacing={2}>
          <TextField label="Boutique" value={boutiqueId} onChange={e => setBoutiqueId(e.target.value)} />
          <TextField label="Scan code-barres / SKU" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={onBarcodeKeyDown} placeholder="Scannez ici puis Entrée" />
          <TextField label="Recherche produit (Nom ou SKU)" value={query} onChange={e => setQuery(e.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Produit ID" value={selectedProductId} onChange={e => onSelectProduct(e.target.value)} placeholder="Sélectionner via la liste filtrée ci-dessous" />
            <TextField label="Quantité" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} inputProps={{ min: 1 }} />
            <TextField label="Prix Unitaire" type="number" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} inputProps={{ min: 0 }} />
            <Button variant="outlined" onClick={addToCart} disabled={!selectedProductId}>Ajouter au panier</Button>
          </Stack>

          {/* Liste filtrée des produits */}
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <Typography color="text.secondary">Aucun produit</Typography>
            ) : (
              <Stack spacing={1}>
                {filtered.slice(0, 20).map((p: any) => (
                  <Box key={p.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Typography sx={{ minWidth: 120 }}>{p.sku}</Typography>
                    <Typography sx={{ flex: 1 }}>{p.name}</Typography>
                    <Typography color="text.secondary">{p.id}</Typography>
                    <Button size="small" onClick={() => onSelectProduct(p.id)}>Sélectionner</Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Panier */}
          <Typography variant="subtitle1" fontWeight={600}>Panier</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Qté</TableCell>
                <TableCell align="right">PU</TableCell>
                <TableCell align="right">Remise</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.map((i, idx) => (
                <TableRow key={i.productId}>
                  <TableCell>{i.sku}</TableCell>
                  <TableCell>{i.name}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                      <IconButton size="small" onClick={() => changeQty(idx, i.quantity - 1)}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField size="small" type="number" value={i.quantity} onChange={e => changeQty(idx, Number(e.target.value))} inputProps={{ min: 1 }} sx={{ width: 80 }} />
                      <IconButton size="small" onClick={() => changeQty(idx, i.quantity + 1)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatGNF(i.unitPrice)}</TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={i.discount || 0} onChange={e => {
                      const v = Number(e.target.value)
                      setCart(prev => prev.map((x, j) => j === idx ? { ...x, discount: v } : x))
                    }} inputProps={{ min: 0 }} sx={{ width: 100 }} />
                  </TableCell>
                  <TableCell align="right">{formatGNF(i.quantity * i.unitPrice - (i.discount || 0))}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => removeFromCart(i.productId)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Cart summary */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Stack spacing={0.5} sx={{ minWidth: 280 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Sous‑total</Typography>
                <Typography color="text.secondary">{formatGNF(total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Remise globale</Typography>
                <Typography color="text.secondary">{formatGNF(Math.min(globalDiscount || 0, total))}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>Total</Typography>
                <Typography fontWeight={700}>{formatGNF(totalAfterDiscount)}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Paiement & remise globale */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Paiement" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} sx={{ minWidth: 180 }}>
              <MenuItem value="cash">Espèces</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
              <MenuItem value="card">Carte</MenuItem>
            </TextField>
            <TextField label="Référence paiement (optionnel)" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
            <TextField label="Remise globale" type="number" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} inputProps={{ min: 0 }} />
            <Box sx={{ flex: 1 }} />
            <Typography variant="h6">Total: {formatGNF(totalAfterDiscount)}</Typography>
            <Button variant="contained" onClick={submitSale} disabled={loading || cart.length === 0}>
              {loading ? 'En cours…' : 'Valider la vente'}
            </Button>
          </Stack>

          {message && <Box><Typography color="text.secondary">{message}</Typography></Box>}

          {/* Held carts */}
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Paniers en attente</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <TextField label="Nom du panier" value={heldName} onChange={e => setHeldName(e.target.value)} />
              <Button variant="outlined" disabled={cart.length === 0 || !heldName} onClick={() => {
                const id = 'held-' + Date.now()
                const payload = { id, name: heldName, createdAt: new Date().toISOString(), boutiqueId, items: cart }
                const raw = localStorage.getItem('afrigest_held_carts')
                const list = raw ? JSON.parse(raw) : []
                list.push(payload)
                localStorage.setItem('afrigest_held_carts', JSON.stringify(list))
                setHeldCarts(list)
                setHeldName('')
                setCart([])
                setMessage('Panier mis en attente')
              }}>Mettre en attente</Button>
            </Stack>
            <Stack spacing={1}>
              {(heldCarts || []).length === 0 ? (
                <Typography color="text.secondary">Aucun panier en attente.</Typography>
              ) : (
                heldCarts.map(h => (
                  <Box key={h.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ flex: 1 }}>{h.name} • {new Date(h.createdAt).toLocaleString()} • {h.items.length} article(s)</Typography>
                    <Button size="small" onClick={() => {
                      setCart(h.items)
                      const rest = heldCarts.filter(x => x.id !== h.id)
                      setHeldCarts(rest)
                      localStorage.setItem('afrigest_held_carts', JSON.stringify(rest))
                    }}>Charger</Button>
                    <Button size="small" color="error" onClick={() => {
                      const rest = heldCarts.filter(x => x.id !== h.id)
                      setHeldCarts(rest)
                      localStorage.setItem('afrigest_held_carts', JSON.stringify(rest))
                    }}>Supprimer</Button>
                  </Box>
                ))
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <ReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} data={receiptData} />
      {/* Pending Queue Viewer */}
      <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ventes en attente ({pending.length})</DialogTitle>
        <DialogContent dividers>
          {pending.length === 0 ? (
            <Typography color="text.secondary">Aucune vente en file.</Typography>
          ) : (
            <List dense>
              {pending.map((p: any) => (
                <ListItem key={p.offlineId} secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={async () => { try { await removePendingSale(p.offlineId) } finally { try { setPending(await getPendingSales()) } catch {} } }}>Supprimer</Button>
                  </Stack>
                }>
                  <ListItemText
                    primary={`OfflineID: ${p.offlineId}`}
                    secondary={`Articles: ${(p.items || []).length} • Boutique: ${p.boutiqueId || ''} • Montant estimé: ${(p.items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={async () => { setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); try { setPending(await getPendingSales()) } catch {} } }} disabled={syncing}>Synchroniser</Button>
          <Button variant="contained" onClick={() => setPendingOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

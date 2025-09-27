import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography, IconButton, Snackbar, Alert } from '@mui/material'
import { ecomGetSignedMediaUrl } from '../../api/client_clean'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import StorefrontHeader from '../../components/Storefront/Header'
import { setMetaDescription } from '../../utils/seo'

type CartItem = { sku: string; title: string; price: number; currency: string; qty: number; imagePath?: string | null }

function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('shop_cart') || '[]') } catch { return [] }
}
function saveCart(items: CartItem[]) {
  try { localStorage.setItem('shop_cart', JSON.stringify(items)); try { window.dispatchEvent(new Event('shop_cart_changed')) } catch {} } catch {}
}

export default function StorefrontCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [imgMap, setImgMap] = useState<Record<string, string>>({})

  const recalc = (list: CartItem[]) => {
    setTotal(list.reduce((s, it) => s + it.price * it.qty, 0))
  }

  useEffect(() => {
    const list = loadCart()
    setItems(list)
    recalc(list)
    try { document.title = 'Boutique — Panier' } catch {}
    setMetaDescription('Votre panier AfriGest: ajustez les quantités et finalisez votre commande en quelques clics.')
    // Resolve thumbnails (best-effort)
    ;(async () => {
      const entries = await Promise.all(list.map(async (it) => {
        const key = it.imagePath
        if (!key) return null
        if (key.startsWith('http://') || key.startsWith('https://')) return [it.sku, key] as const
        try {
          const { url } = await ecomGetSignedMediaUrl(key.startsWith('/') ? key.slice(1) : key)
          return [it.sku, url] as const
        } catch {
          return [it.sku, ''] as const
        }
      }))
      const map: Record<string, string> = {}
      for (const e of entries) if (e && e[1]) map[e[0]] = e[1]
      setImgMap(map)
    })()
  }, [])

  const updateQty = (sku: string, delta: number) => {
    const next = items.map(it => it.sku === sku ? { ...it, qty: Math.max(0, it.qty + delta) } : it).filter(it => it.qty > 0)
    setItems(next)
    saveCart(next)
    recalc(next)
    setToast('Panier mis à jour')
  }

  const remove = (sku: string) => {
    const next = items.filter(it => it.sku !== sku)
    setItems(next)
    saveCart(next)
    recalc(next)
    setToast('Article retiré')
  }

  return (
    <Box>
      <StorefrontHeader />
      <Typography variant="h5" gutterBottom>Panier</Typography>
      <Card>
        <CardContent>
          {items.length === 0 ? (
            <Typography color="text.secondary">Votre panier est vide.</Typography>
          ) : (
            <Stack spacing={2}>
              {items.map(it => (
                <Stack key={it.sku} direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    { (imgMap[it.sku] || it.imagePath) && (
                      <img
                        src={imgMap[it.sku] || it.imagePath || undefined}
                        alt={it.title}
                        width={56}
                        height={56}
                        style={{ objectFit: 'cover', borderRadius: 4, background: '#f3f4f6' }}
                      />
                    )}
                    <Typography noWrap title={it.title}>{it.title} — {it.price.toLocaleString('fr-FR')} {it.currency}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton size="small" onClick={() => updateQty(it.sku, -1)}><RemoveIcon fontSize="small" /></IconButton>
                    <Typography>{it.qty}</Typography>
                    <IconButton size="small" onClick={() => updateQty(it.sku, 1)}><AddIcon fontSize="small" /></IconButton>
                    <Button size="small" color="warning" onClick={() => remove(it.sku)}>Retirer</Button>
                  </Stack>
                </Stack>
              ))}
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                <Typography variant="h6">Total: {total.toLocaleString('fr-FR')} {items[0]?.currency || 'GNF'}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" href="/shop">Continuer vos achats</Button>
                  <Button variant="contained" href="/shop/checkout">Passer à la caisse</Button>
                </Stack>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
      <Snackbar open={!!toast} autoHideDuration={1200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled">{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

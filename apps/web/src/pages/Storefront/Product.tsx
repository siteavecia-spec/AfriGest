import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, Card, CardContent, CardMedia, Stack, Typography, Snackbar, Alert } from '@mui/material'
import { ecomListProducts, ecomGetSignedMediaUrl } from '../../api/client_clean'
import StorefrontHeader from '../../components/Storefront/Header'
import { setMetaDescription } from '../../utils/seo'

function addToCart(sku: string, title: string, price: number, currency: string, imagePath?: string | null) {
  try {
    const raw = localStorage.getItem('shop_cart')
    const cart: Array<{ sku: string; title: string; price: number; currency: string; qty: number; imagePath?: string | null }> = raw ? JSON.parse(raw) : []
    const idx = cart.findIndex(i => i.sku === sku)
    if (idx >= 0) {
      cart[idx].qty += 1
      if (!cart[idx].imagePath && imagePath) cart[idx].imagePath = imagePath
    } else {
      cart.push({ sku, title, price, currency, qty: 1, imagePath: imagePath || undefined })
    }
    localStorage.setItem('shop_cart', JSON.stringify(cart))
    try { window.dispatchEvent(new Event('shop_cart_changed')) } catch {}
  } catch {}
}

export default function StorefrontProduct() {
  const { sku = '' } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [product, setProduct] = useState<{ sku: string; title: string; price: number; currency: string; images?: string[] } | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ecomListProducts({ q: sku })
        const item = (res.items || []).find(p => p.sku === sku) || null
        setProduct(item ? { sku: item.sku, title: (item as any).title || item.sku, price: Number(item.price || 0), currency: (item as any).currency || 'GNF', images: (item as any).images || [] } : null)
        if (item && Array.isArray((item as any).images) && (item as any).images[0]) {
          const key = (item as any).images[0]
          if (key.startsWith('http://') || key.startsWith('https://')) setImageUrl(key)
          else {
            try {
              const { url } = await ecomGetSignedMediaUrl(key.startsWith('/') ? key.slice(1) : key)
              setImageUrl(url)
            } catch { setImageUrl(null) }
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Produit introuvable')
      } finally { setLoading(false) }
    })()
    try { document.title = `Boutique — ${sku}` } catch {}
    setMetaDescription('Fiche produit AfriGest en ligne: détails et achat rapide.')
  }, [sku])

  const canBuy = useMemo(() => !!product, [product])

  return (
    <Box>
      <StorefrontHeader />
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      {!product ? (
        <Typography color="text.secondary">Produit introuvable.</Typography>
      ) : (
        <Card>
          {imageUrl && (
            <CardMedia component="img" image={imageUrl} alt={product.title} sx={{ maxHeight: 360, objectFit: 'cover' }} />
          )}
          <CardContent>
            <Typography variant="h5" gutterBottom>{product.title}</Typography>
            <Typography variant="h6">{product.price.toLocaleString('fr-FR')} {product.currency}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="outlined" href="/shop">Retour</Button>
              <Button variant="contained" disabled={!canBuy || loading} onClick={() => {
                addToCart(product.sku, product.title, product.price, product.currency, imageUrl || (product.images && product.images[0]) || undefined)
                setToast('Ajouté au panier')
              }}>Ajouter au panier</Button>
              <Button variant="text" href="/shop/cart">Voir le panier</Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      <Snackbar open={!!toast} autoHideDuration={1500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled">{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

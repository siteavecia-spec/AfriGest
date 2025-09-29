import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, CardActions, Button, Grid, Typography, Stack, TextField, Select, MenuItem, Snackbar, Alert, CardMedia, Skeleton } from '@mui/material'
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
      // Preserve existing imagePath; set if missing and provided
      if (!cart[idx].imagePath && imagePath) cart[idx].imagePath = imagePath
    } else {
      cart.push({ sku, title, price, currency, qty: 1, imagePath: imagePath || undefined })
    }
    localStorage.setItem('shop_cart', JSON.stringify(cart))
    try { window.dispatchEvent(new Event('shop_cart_changed')) } catch {}
  } catch {}
}

export default function StorefrontCatalog() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ sku: string; title: string; price: number; currency: string; isOnlineAvailable: boolean; images?: string[] }>>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'relevance'|'price_asc'|'price_desc'>('relevance')
  const [toast, setToast] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(12)
  const [page, setPage] = useState(0)
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [imgMap, setImgMap] = useState<Record<string, string>>({})
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ecomListProducts()
        const list = (res.items || []).filter(p => p.isOnlineAvailable !== false)
        setItems(list)
        // Warm-up: fetch signed URLs for first image if it's a private key
        ;(async () => {
          const entries = await Promise.all(list.slice(0, 24).map(async (p) => {
            const key = p.images && p.images[0]
            if (!key) return null
            if (key.startsWith('http://') || key.startsWith('https://')) return [p.sku, key] as const
            try {
              const { url } = await ecomGetSignedMediaUrl(key.startsWith('/') ? key.slice(1) : key)
              return [p.sku, url] as const
            } catch {
              return [p.sku, 'https://via.placeholder.com/400x160?text=Produit'] as const
            }
          }))
          const map: Record<string, string> = {}
          for (const e of entries) if (e) map[e[0]] = e[1]
          setImgMap(map)
        })()
      } catch (e: any) {
        setError(e?.message || 'Catalogue indisponible')
      } finally { setLoading(false) }
    })()
    try { document.title = 'Boutique — Catalogue' } catch {}
    setMetaDescription('Découvrez notre catalogue en ligne AfriGest: produits disponibles, prix et disponibilité en temps réel.')
  }, [])

  // Debounce search input (250ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    let arr = q ? items.filter(p => (p.title || p.sku || '').toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : items.slice()
    // Price filters
    arr = arr.filter(p => {
      const okMin = (minPrice === '' ? true : p.price >= Number(minPrice))
      const okMax = (maxPrice === '' ? true : p.price <= Number(maxPrice))
      return okMin && okMax
    })
    if (sort === 'price_asc') arr.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') arr.sort((a, b) => b.price - a.price)
    return arr
  }, [items, debouncedQuery, sort, minPrice, maxPrice])

  return (
    <Box>
      <StorefrontHeader />
      <Typography variant="h5" gutterBottom>Boutique — Catalogue</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <TextField placeholder="Rechercher un produit…" value={query} onChange={e => setQuery(e.target.value)} size="small" fullWidth />
        <Select size="small" value={sort} onChange={e => setSort(e.target.value as any)} sx={{ width: 200 }}>
          <MenuItem value="relevance">Pertinence</MenuItem>
          <MenuItem value="price_asc">Prix ↑</MenuItem>
          <MenuItem value="price_desc">Prix ↓</MenuItem>
        </Select>
        <TextField size="small" type="number" label="Min" value={minPrice} onChange={e => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))} sx={{ width: 120 }} inputProps={{ min: 0 }} />
        <TextField size="small" type="number" label="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))} sx={{ width: 120 }} inputProps={{ min: 0 }} />
        <Select size="small" value={pageSize} onChange={e => { setPage(0); setPageSize(Number(e.target.value)) }} sx={{ width: 140 }}>
          <MenuItem value={12}>12</MenuItem>
          <MenuItem value={24}>24</MenuItem>
          <MenuItem value={48}>48</MenuItem>
        </Select>
      </Stack>
      <Grid container spacing={2}>
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <Grid item xs={12} md={4} key={`sk-${i}`}>
            <Card>
              <Skeleton variant="rectangular" height={160} />
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
              </CardContent>
              <CardActions>
                <Skeleton variant="rectangular" width={140} height={32} />
              </CardActions>
            </Card>
          </Grid>
        ))}
        {(!loading ? filtered.slice(page * pageSize, (page + 1) * pageSize) : []).map(p => (
          <Grid item xs={12} md={4} key={p.sku}>
            <Card>
              <CardMedia
                component="img"
                height="160"
                image={imgMap[p.sku] || (p.images && p.images[0]) || 'https://via.placeholder.com/400x160?text=Produit'}
                alt={p.title || p.sku}
                sx={{ objectFit: 'cover' }}
                loading="lazy"
              />
              <CardContent>
                <Typography variant="subtitle1">{p.title || p.sku}</Typography>
                <Typography color="text.secondary">{p.price.toLocaleString('fr-FR')} {p.currency || 'GNF'}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" disabled={loading} onClick={() => { addToCart(p.sku, p.title || p.sku, p.price, p.currency || 'GNF', (p.images && p.images[0]) || undefined); setToast('Ajouté au panier'); }}>Ajouter au panier</Button>
                <Button size="small" href="/shop/cart">Voir le panier</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {!loading && filtered.length === 0 && (
          <Grid item xs={12}><Typography color="text.secondary">Aucun produit en ligne.</Typography></Grid>
        )}
      </Grid>
      {!loading && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">Page {page + 1} / {Math.max(1, Math.ceil(filtered.length / pageSize))} • {filtered.length} produits</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
            <Button variant="outlined" size="small" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          </Stack>
        </Stack>
      )}
      <Snackbar open={!!toast} autoHideDuration={1500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled">{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

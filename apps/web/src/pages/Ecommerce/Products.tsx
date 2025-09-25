import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { ecomListProducts, ecomSyncInventory } from '../../api/client_clean'

export default function EcommerceProducts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Array<{ sku: string; title: string; price: number; isOnlineAvailable: boolean }>>([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await ecomListProducts()
      const list = (res.items || []).map((p: any) => ({
        sku: p.sku,
        title: p.title,
        price: Number(p.price ?? 0),
        isOnlineAvailable: Boolean(p.isOnlineAvailable)
      }))
      setItems(list)
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement produits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Produits</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Recherche" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1 }} placeholder="SKU, nom…" />
            <Button variant="contained">Nouveau produit</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
            <TextField size="small" label="SKU" placeholder="SKU-TSHIRT" id="sync-sku" />
            <TextField size="small" type="number" label="Delta" placeholder="+5 ou -2" id="sync-delta" sx={{ width: 160 }} />
            <Button variant="outlined" onClick={async () => {
              setError(null)
              try {
                const skuEl = document.getElementById('sync-sku') as HTMLInputElement | null
                const deltaEl = document.getElementById('sync-delta') as HTMLInputElement | null
                const sku = (skuEl?.value || '').trim()
                const delta = Number(deltaEl?.value || '0')
                if (!sku || !Number.isFinite(delta) || delta === 0) throw new Error('Veuillez fournir un SKU et un delta non nul')
                await ecomSyncInventory([{ sku, delta, reason: 'manual_adjust' }])
                await load()
              } catch (e: any) {
                setError(e?.message || 'Échec de la synchronisation de stock')
              }
            }}>Appliquer delta stock</Button>
          </Stack>
          <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell>En ligne</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items
                  .filter(p => {
                    const s = query.trim().toLowerCase()
                    if (!s) return true
                    return `${p.sku} ${p.title}`.toLowerCase().includes(s)
                  })
                  .map(p => (
                    <TableRow key={p.sku}>
                      <TableCell>{p.sku}</TableCell>
                      <TableCell>{p.title}</TableCell>
                      <TableCell>{p.price.toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{p.isOnlineAvailable ? 'Oui' : 'Non'}</TableCell>
                    </TableRow>
                  ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.secondary">Aucun produit.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

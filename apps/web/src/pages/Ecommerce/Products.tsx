import { useEffect, useRef, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert, Link, Switch, FormControlLabel, Select, MenuItem, IconButton, Chip, TableContainer } from '@mui/material'
import { ecomListProducts, ecomSyncInventory, ecomPresignUpload, ecomUpsertProduct, ecomAddProductImage, ecomRemoveProductImage, ecomSetProductCover, ecomApproveProduct } from '../../api/client_clean'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { can } from '../../utils/acl'

export default function EcommerceProducts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Array<{ sku: string; title: string; price: number; isOnlineAvailable: boolean; imageUrl?: string; images?: string[]; currency?: string; onlineStockMode?: 'shared'|'dedicated'; onlineStockQty?: number; approved?: boolean }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  // Upsert form state
  const [fSku, setFSku] = useState('')
  const [fTitle, setFTitle] = useState('')
  const [fPrice, setFPrice] = useState<number | ''>('')
  const [fCurrency, setFCurrency] = useState('GNF')
  const [fDesc, setFDesc] = useState('')
  const [fOnline, setFOnline] = useState(true)
  const [fMode, setFMode] = useState<'shared' | 'dedicated'>('shared')
  const [fQty, setFQty] = useState<number | ''>('')
  // Permissions
  const role = useSelector((s: RootState) => s.auth.role) as any
  const canCreate = can(role, 'ecommerce.products', 'create')
  const canUpdate = can(role, 'ecommerce.products', 'update')
  const canApprove = can(role, 'ecommerce.products', 'approve')
  const canModify = canCreate || canUpdate

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await ecomListProducts({ q: query || undefined })
      const list = (res.items || []).map((p: any) => ({
        sku: p.sku,
        title: p.title,
        price: Number(p.price ?? 0),
        isOnlineAvailable: Boolean(p.isOnlineAvailable),
        imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined,
        images: (Array.isArray(p.images) ? p.images : []) as string[],
        currency: p.currency || 'GNF',
        onlineStockMode: (p.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared') as 'dedicated' | 'shared',
        onlineStockQty: typeof p.onlineStockQty === 'number' ? p.onlineStockQty : undefined,
        approved: typeof p.approved === 'boolean' ? p.approved : (typeof p.isApproved === 'boolean' ? p.isApproved : undefined)
      }))
      setItems(list)
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement produits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [query])

  async function onPickFile() {
    try { fileRef.current?.click() } catch {}
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const presign = await ecomPresignUpload(file.name, file.type || 'application/octet-stream')
      const put = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Échec de l\'upload S3')
      setUploadedUrls(urls => [...urls, presign.url])
      setToast('Image envoyée sur S3')
      // TODO: plus tard, attacher presign.url à un produit via API POST /ecommerce/products
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'upload')
    } finally {
      setUploading(false)
      try { if (fileRef.current) fileRef.current.value = '' } catch {}
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Produits</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Recherche" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1 }} placeholder="SKU, nom…" />
            {canCreate && (
              <Button variant="contained" onClick={() => {
                setFSku(''); setFTitle(''); setFPrice(''); setFCurrency('GNF'); setFDesc(''); setFOnline(true); setFMode('shared'); setFQty(''); setUploadedUrls([])
              }}>Nouveau produit</Button>
            )}
          </Stack>
          {/* Upsert form */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={3}><TextField label="SKU" value={fSku} onChange={e => setFSku(e.target.value)} fullWidth disabled={!canModify} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="Nom" value={fTitle} onChange={e => setFTitle(e.target.value)} fullWidth disabled={!canModify} /></Grid>
            <Grid item xs={6} sm={2}><TextField label="Prix" type="number" value={fPrice} onChange={e => setFPrice(e.target.value === '' ? '' : Number(e.target.value))} fullWidth disabled={!canModify} /></Grid>
            <Grid item xs={6} sm={2}>
              <Select size="small" fullWidth value={fCurrency} onChange={e => setFCurrency(e.target.value as string)} disabled={!canModify}>
                <MenuItem value="GNF">GNF</MenuItem>
                <MenuItem value="XOF">XOF</MenuItem>
                <MenuItem value="XAF">XAF</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={4}><TextField label="Description" value={fDesc} onChange={e => setFDesc(e.target.value)} fullWidth multiline minRows={2} disabled={!canModify} /></Grid>
            <Grid item xs={6} sm={2}><FormControlLabel control={<Switch checked={fOnline} onChange={(_, c) => setFOnline(c)} disabled={!canModify} />} label="En ligne" /></Grid>
            <Grid item xs={6} sm={2}>
              <Select size="small" fullWidth value={fMode} onChange={e => setFMode((e.target.value as 'shared'|'dedicated') || 'shared')} disabled={!canModify}>
                <MenuItem value="shared">Stock partagé</MenuItem>
                <MenuItem value="dedicated">Stock dédié</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={6} sm={2}><TextField label="Stock en ligne" type="number" value={fQty} onChange={e => setFQty(e.target.value === '' ? '' : Number(e.target.value))} fullWidth disabled={!canModify} /></Grid>
            <Grid item xs={12} sm={3}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Button variant="outlined" disabled={uploading || !canModify} onClick={onPickFile}>{uploading ? 'Upload…' : 'Ajouter image (S3)'}</Button>
                {uploadedUrls.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {uploadedUrls.map((u, idx) => (
                      <Stack key={u} direction="row" spacing={1} alignItems="center">
                        <Chip label={`img${idx+1}`} onClick={() => window.open(u, '_blank')} onDelete={() => setUploadedUrls(urls => urls.filter(x => x !== u))} />
                        <Button size="small" variant="outlined" disabled={!fSku || !canModify} onClick={async () => {
                          if (!fSku) { setError('Renseignez un SKU pour attacher une image'); return }
                          try { await ecomAddProductImage(fSku, u); setToast('Image attachée au produit'); await load() } catch (e:any) { setError(e?.message || 'Échec attacher image') }
                        }}>Attacher</Button>
                        <Button size="small" variant="text" disabled={!fSku || !canModify} onClick={async () => {
                          if (!fSku) { setError('Renseignez un SKU pour détacher une image'); return }
                          try { await ecomRemoveProductImage(fSku, u); setToast('Image supprimée du produit'); await load() } catch (e:any) { setError(e?.message || 'Échec suppression image') }
                        }}>Supprimer du produit</Button>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" disabled={!canModify} onClick={async () => {
                setError(null)
                try {
                  if (!fSku || !fTitle || fPrice === '' || !Number.isFinite(Number(fPrice))) throw new Error('Veuillez renseigner SKU, Nom et Prix')
                  const payload: any = {
                    sku: fSku.trim(), title: fTitle.trim(), price: Number(fPrice), currency: fCurrency || 'GNF',
                    description: fDesc || undefined, isOnlineAvailable: !!fOnline, onlineStockMode: fMode,
                    ...(fQty !== '' ? { onlineStockQty: Number(fQty) } : {}), images: uploadedUrls
                  }
                  await ecomUpsertProduct(payload)
                  setToast('Produit enregistré')
                  await load()
                } catch (e: any) {
                  setError(e?.message || 'Échec de l\'enregistrement')
                }
              }}>Enregistrer</Button>
              {canApprove && (
                <Button variant="outlined" color="success" disabled={!fSku} onClick={async () => {
                  setError(null)
                  try {
                    if (!fSku) throw new Error('Sélectionnez ou saisissez un SKU')
                    await ecomApproveProduct(fSku)
                    setToast('Produit approuvé')
                    await load()
                  } catch (e: any) {
                    setError(e?.message || 'Échec de l\'approbation')
                  }
                }}>Approuver</Button>
              )}
              </Stack>
            </Grid>
          </Grid>
          {/* Images actuelles du produit sélectionné (si présent dans la liste) */}
          {fSku && (() => {
            const prod = items.find(it => it.sku === fSku)
            const imgs = prod?.images || []
            return imgs.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ mr: 1 }}>Images du produit:</Typography>
                {imgs.map((u, idx) => (
                  <Stack key={u} direction="row" spacing={1} alignItems="center">
                    <Chip label={(idx === 0 ? '★ ' : '') + (u.split('/').pop() || 'image')} onClick={() => window.open(u, '_blank')} onDelete={async () => { if (!canModify) return; try { await ecomRemoveProductImage(fSku, u); setToast('Image supprimée'); await load() } catch (e:any) { setError(e?.message || 'Échec suppression image') } }} />
                    {idx !== 0 && canModify && (
                      <Button size="small" variant="text" onClick={async () => { try { await ecomSetProductCover(fSku, u); setToast('Cover définie'); await load() } catch (e:any) { setError(e?.message || 'Échec définir cover') } }}>Définir comme cover</Button>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : null
          })()}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
            <TextField size="small" label="SKU" placeholder="SKU-TSHIRT" id="sync-sku" />
            <TextField size="small" type="number" label="Delta" placeholder="+5 ou -2" id="sync-delta" sx={{ width: 160 }} />
            <Button variant="outlined" disabled={!canUpdate} onClick={async () => {
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
          <Box sx={{ mt: 2 }}>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Image</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Approbation</TableCell>
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
                      <TableRow key={p.sku} hover sx={{ cursor: 'pointer', borderBottom: (theme) => `1px solid ${theme.palette.grey[200]}` }} onClick={() => {
                        setFSku(p.sku); setFTitle(p.title); setFPrice(p.price); setFCurrency(p.currency || 'GNF'); setFDesc(''); setFOnline(!!p.isOnlineAvailable); setFMode(p.onlineStockMode || 'shared'); setFQty(typeof p.onlineStockQty === 'number' ? p.onlineStockQty : ''); setUploadedUrls([])
                      }}>
                        <TableCell>{p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ maxHeight: 40 }} /> : '-'}</TableCell>
                        <TableCell>{p.sku}</TableCell>
                        <TableCell>{p.title}</TableCell>
                        <TableCell>
                          {p.approved === true ? (
                            <Chip size="small" color="success" label="Approuvé" />
                          ) : p.approved === false ? (
                            <Chip size="small" color="default" label="En attente" />
                          ) : (
                            <Chip size="small" color="default" label="—" />
                          )}
                        </TableCell>
                        <TableCell>{p.price.toLocaleString('fr-FR')}</TableCell>
                        <TableCell>{p.isOnlineAvailable ? 'Oui' : 'Non'}</TableCell>
                      </TableRow>
                    ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>Aucun produit.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>
      <Snackbar open={!!toast} autoHideDuration={1600} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled">{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

import { useState } from 'react'
import { Box, Card, CardContent, FormControlLabel, Grid, Switch, TextField, Typography, MenuItem, Stack, Button, Snackbar, Alert } from '@mui/material'
import { showPayments, showMobileMoney, enableStripe, showPayPal } from '../../config/featureFlags'
import { ecomPaymentsStripeIntent, ecomPaymentsPayPalOrder, ecomPaymentsMtnInit, ecomPaymentsOrangeInit } from '../../api/client_clean'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { can } from '../../utils/acl'

export default function EcommerceSettings() {
  const [stockMode, setStockMode] = useState<'shared'|'dedicated'>('shared')
  const [codEnabled, setCodEnabled] = useState(true)
  const [cardEnabled, setCardEnabled] = useState(true)
  const [mtnEnabled, setMtnEnabled] = useState(false)
  const [orangeEnabled, setOrangeEnabled] = useState(false)
  const [subdomain, setSubdomain] = useState('boutique')
  const [sectorFilter, setSectorFilter] = useState<'all'|'generic'|'electronics'|'fashion'>('all')
  const [mappingText, setMappingText] = useState<string>(() => {
    try { return localStorage.getItem('afrigest_ecom_mapping') || '{\n  "attrs.brand": "ecom.brand",\n  "attrs.model": "ecom.model"\n}' } catch { return '' }
  })
  const [savedInfo, setSavedInfo] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  // Permissions
  const role = useSelector((s: RootState) => s.auth.role) as any
  const canUpdate = can(role, 'ecommerce.settings', 'update')

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Paramètres</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Stock</Typography>
              <TextField select size="small" label="Mode stock en ligne" value={stockMode} onChange={e => setStockMode(e.target.value as any)} sx={{ mt: 2, minWidth: 240 }} disabled={!canUpdate}>
                <MenuItem value="shared">Partagé avec stock physique</MenuItem>
                <MenuItem value="dedicated">Dédié e‑commerce</MenuItem>
              </TextField>
              <TextField select size="small" label="Filtre secteur (sync)" value={sectorFilter} onChange={e => setSectorFilter(e.target.value as any)} sx={{ mt: 2, minWidth: 240 }} disabled={!canUpdate}>
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="generic">Générique</MenuItem>
                <MenuItem value="electronics">Électronique</MenuItem>
                <MenuItem value="fashion">Mode</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Paiements</Typography>
              <Stack sx={{ mt: 2 }}>
                <FormControlLabel control={<Switch checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)} disabled={!canUpdate} />} label="Paiement à la livraison (COD)" />
                <FormControlLabel control={<Switch checked={cardEnabled} onChange={e => setCardEnabled(e.target.checked)} disabled={!canUpdate} />} label="Carte (Stripe/PayPal)" />
                <FormControlLabel control={<Switch checked={mtnEnabled} onChange={e => setMtnEnabled(e.target.checked)} disabled={!canUpdate} />} label="MTN Mobile Money" />
                <FormControlLabel control={<Switch checked={orangeEnabled} onChange={e => setOrangeEnabled(e.target.checked)} disabled={!canUpdate} />} label="Orange Money" />
              </Stack>
              {showPayments && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Phase 4 — Clés et secrets gérés côté serveur</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                    <TextField size="small" label="Stripe (server)" value="Géré côté serveur" disabled sx={{ minWidth: 220 }} />
                    <TextField size="small" label="PayPal (server)" value="Géré côté serveur" disabled sx={{ minWidth: 220 }} />
                    <TextField size="small" label="MTN (server)" value="Géré côté serveur" disabled sx={{ minWidth: 220 }} />
                    <TextField size="small" label="Orange (server)" value="Géré côté serveur" disabled sx={{ minWidth: 220 }} />
                  </Stack>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>Tests sandbox (stubs)</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                    {enableStripe && canUpdate && (
                      <Button variant="outlined" onClick={async () => {
                        try {
                          const res = await ecomPaymentsStripeIntent({ items: [{ sku: 'demo', quantity: 1, price: 1000 }], customer: {} })
                          setMsg(`Stripe Intent: ${res.status || 'ok'}${res.clientSecret ? ' • secret reçu' : ''}`)
                        } catch (e: any) { setErr(e?.message || 'Échec Stripe stub') }
                      }}>Tester Stripe</Button>
                    )}
                    {showPayPal && canUpdate && (
                      <Button variant="outlined" onClick={async () => {
                        try {
                          const res = await ecomPaymentsPayPalOrder({ items: [{ sku: 'demo', quantity: 1, price: 1000 }] })
                          setMsg(`PayPal: ${res.status || 'ok'}${res.approveUrl ? ' • URL approbation dispo' : ''}`)
                        } catch (e: any) { setErr(e?.message || 'Échec PayPal stub') }
                      }}>Tester PayPal</Button>
                    )}
                    {showMobileMoney && canUpdate && (
                      <>
                        <Button variant="outlined" onClick={async () => { try { const r = await ecomPaymentsMtnInit({ amount: 1000 }); setMsg(`MTN: ${r.status || 'ok'}`) } catch (e: any) { setErr(e?.message || 'Échec MTN stub') } }}>Tester MTN</Button>
                        <Button variant="outlined" onClick={async () => { try { const r = await ecomPaymentsOrangeInit({ amount: 1000 }); setMsg(`Orange: ${r.status || 'ok'}`) } catch (e: any) { setErr(e?.message || 'Échec Orange stub') } }}>Tester Orange</Button>
                      </>
                    )}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Sous-domaine</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <TextField size="small" label="Sous-domaine" value={subdomain} onChange={e => setSubdomain(e.target.value)} sx={{ maxWidth: 240 }} disabled={!canUpdate} />
                <Button variant="outlined" disabled={!canUpdate}>Tester</Button>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Ex: boutique.votresociete.afrigest.com</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Mapping attributs (produit → e‑commerce)</Typography>
              <Typography variant="body2" color="text.secondary">Format JSON simple: clés source (produit) → clés destination (e‑commerce). Ex: {`{"attrs.brand":"ecom.brand"}`}.</Typography>
              <TextField multiline minRows={6} value={mappingText} onChange={e => setMappingText(e.target.value)} sx={{ mt: 2 }} fullWidth disabled={!canUpdate} />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="outlined" disabled={!canUpdate} onClick={() => setMappingText(`{
  "attrs.brand": "ecom.brand",
  "attrs.model": "ecom.model"
}`)}>Exemple</Button>
                <Button variant="contained" disabled={!canUpdate} onClick={() => {
                  try {
                    const parsed = JSON.parse(mappingText)
                    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON objet requis')
                    localStorage.setItem('afrigest_ecom_mapping', JSON.stringify(parsed))
                    setSavedInfo('Mapping enregistré.')
                    setTimeout(() => setSavedInfo(null), 1500)
                  } catch (e: any) {
                    setSavedInfo(e?.message || 'JSON invalide')
                  }
                }}>Enregistrer</Button>
                {savedInfo && <Typography color="text.secondary">{savedInfo}</Typography>}
              </Stack>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Aperçu mapping</Typography>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{mappingText}</pre>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar open={!!msg} autoHideDuration={1800} onClose={() => setMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setMsg(null)} severity="success" variant="filled">{msg}</Alert>
      </Snackbar>
      <Snackbar open={!!err} autoHideDuration={2200} onClose={() => setErr(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErr(null)} severity="error" variant="filled">{err}</Alert>
      </Snackbar>
    </Box>
  )
}

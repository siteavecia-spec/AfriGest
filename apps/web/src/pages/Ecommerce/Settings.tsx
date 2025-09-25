import { useState } from 'react'
import { Box, Card, CardContent, FormControlLabel, Grid, Switch, TextField, Typography, MenuItem, Stack, Button } from '@mui/material'

export default function EcommerceSettings() {
  const [stockMode, setStockMode] = useState<'shared'|'dedicated'>('shared')
  const [codEnabled, setCodEnabled] = useState(true)
  const [cardEnabled, setCardEnabled] = useState(true)
  const [mtnEnabled, setMtnEnabled] = useState(false)
  const [orangeEnabled, setOrangeEnabled] = useState(false)
  const [subdomain, setSubdomain] = useState('boutique')

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Paramètres</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Stock</Typography>
              <TextField select size="small" label="Mode stock en ligne" value={stockMode} onChange={e => setStockMode(e.target.value as any)} sx={{ mt: 2, minWidth: 240 }}>
                <MenuItem value="shared">Partagé avec stock physique</MenuItem>
                <MenuItem value="dedicated">Dédié e‑commerce</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Paiements</Typography>
              <Stack sx={{ mt: 2 }}>
                <FormControlLabel control={<Switch checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)} />} label="Paiement à la livraison (COD)" />
                <FormControlLabel control={<Switch checked={cardEnabled} onChange={e => setCardEnabled(e.target.checked)} />} label="Carte (Stripe/PayPal)" />
                <FormControlLabel control={<Switch checked={mtnEnabled} onChange={e => setMtnEnabled(e.target.checked)} />} label="MTN Mobile Money" />
                <FormControlLabel control={<Switch checked={orangeEnabled} onChange={e => setOrangeEnabled(e.target.checked)} />} label="Orange Money" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Sous-domaine</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <TextField size="small" label="Sous-domaine" value={subdomain} onChange={e => setSubdomain(e.target.value)} sx={{ maxWidth: 240 }} />
                <Button variant="outlined">Tester</Button>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Ex: boutique.votresociete.afrigest.com</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

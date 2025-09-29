import { useState } from 'react'
import { Box, Button, Container, Paper, Snackbar, Alert, Stack, Typography } from '@mui/material'
import Page from '../../components/Page'
import { ecomSyncPullProducts, ecomSyncPushProducts } from '../../api/client_clean'

export default function EcommerceSyncPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastPull, setLastPull] = useState<{ pulled: number; updated: number; created: number } | null>(null)
  const [lastPush, setLastPush] = useState<{ pushed: number } | null>(null)

  return (
    <Page title="E‑commerce — Synchronisation" subtitle="Synchroniser le catalogue avec la boutique en ligne">
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">Utilisez ces actions pour pousser/rapatrier le catalogue. En environnement de test, ces opérations sont des stubs.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined" disabled={loading} onClick={async () => {
              try {
                setLoading(true)
                const res = await ecomSyncPullProducts()
                setLastPull(res)
                setMessage(`Pull OK — pulled: ${res.pulled}, updated: ${res.updated}, created: ${res.created}`)
              } catch (e: any) {
                setMessage(e?.message || 'Erreur pull produits')
              } finally { setLoading(false) }
            }}>Pull Produits</Button>
            <Button variant="contained" disabled={loading} onClick={async () => {
              try {
                setLoading(true)
                const res = await ecomSyncPushProducts()
                setLastPush(res)
                setMessage(`Push OK — pushed: ${res.pushed}`)
              } catch (e: any) {
                setMessage(e?.message || 'Erreur push produits')
              } finally { setLoading(false) }
            }}>Push Produits</Button>
          </Stack>
          {lastPull && (
            <Box>
              <Typography variant="subtitle2">Dernier Pull</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(lastPull, null, 2)}</pre>
            </Box>
          )}
          {lastPush && (
            <Box>
              <Typography variant="subtitle2">Dernier Push</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(lastPush, null, 2)}</pre>
            </Box>
          )}
        </Stack>
      </Paper>
      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {message && <Alert severity="info" onClose={() => setMessage(null)}>{message}</Alert>}
      </Snackbar>
    </Page>
  )
}

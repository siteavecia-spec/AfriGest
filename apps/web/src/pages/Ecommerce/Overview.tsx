import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Grid, Typography } from '@mui/material'

export default function EcommerceOverview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<{ onlineSalesToday: number; onlineRevenueToday: number; conversionRate?: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // TODO: wire to API once endpoints are ready
        setKpis({ onlineSalesToday: 0, onlineRevenueToday: 0, conversionRate: 0 })
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Vue d’ensemble</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Ventes en ligne (jour)</Typography>
            <Typography variant="h4">{loading ? '…' : (kpis?.onlineSalesToday ?? 0)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">CA en ligne (jour)</Typography>
            <Typography variant="h4">{loading ? '…' : (kpis?.onlineRevenueToday ?? 0).toLocaleString('fr-FR')}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Taux de conversion</Typography>
            <Typography variant="h4">{loading ? '…' : `${(kpis?.conversionRate ?? 0).toFixed(2)}%`}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  )
}

import { Box, Card, CardActionArea, CardContent, Container, Grid, Stack, Typography } from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import SecurityIcon from '@mui/icons-material/Security'
import AssessmentIcon from '@mui/icons-material/Assessment'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useNavigate } from 'react-router-dom'

export default function SuperAdminConsole() {
  const navigate = useNavigate()
  const cards: Array<{ title: string; subtitle: string; icon: React.ReactNode; to: string }>= [
    { title: 'Entreprises', subtitle: 'Créer, gérer, provisionner et impersonner', icon: <BusinessIcon color="primary" />, to: '/admin/companies' },
    { title: 'Leads', subtitle: 'Suivi des prospects et demandes', icon: <GroupAddIcon color="primary" />, to: '/leads' },
    { title: 'Reset MDP (Admin)', subtitle: 'Réinitialiser les mots de passe administrateur', icon: <SecurityIcon color="primary" />, to: '/admin/password-reset' },
    { title: 'Rapports globaux', subtitle: 'Vue d’ensemble cross‑tenants (à venir)', icon: <AssessmentIcon color="primary" />, to: '/admin/companies' },
    { title: 'E‑commerce Global', subtitle: 'Paramétrage marketplaces et passerelles (à venir)', icon: <StorefrontIcon color="primary" />, to: '/admin/companies' }
  ]

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h4" fontWeight={800}>Console Super Admin</Typography>
          <Typography variant="body1" color="text.secondary">Gestion centrale des entreprises, sécurité, et supervision. Sélectionnez une section.</Typography>
        </Stack>
        <Grid container spacing={2}>
          {cards.map((c, idx) => (
            <Grid key={idx} item xs={12} sm={6} md={4}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardActionArea onClick={() => navigate(c.to)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ p: 1.2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight={700}>{c.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{c.subtitle}</Typography>
                      </Box>
                      <ArrowForwardIcon color="action" />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Impersonation</Typography>
          <Typography variant="body2" color="text.secondary">
            Pour intervenir dans une entreprise, ouvrez « Entreprises », cliquez sur « Impersonate » sur la ligne cible. Un bandeau « Mode support actif » apparaîtra en haut pour revenir à la console.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

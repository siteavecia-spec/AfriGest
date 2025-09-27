import { Box, Container, Paper, Stack, Typography } from '@mui/material'

export default function SecurityPage() {
  return (
    <Box sx={{ bgcolor: '#F9FAFB', py: { xs: 4, md: 6 } }}>
      <Container>
        <Typography variant="h4" fontWeight={800} gutterBottom>Sécurité & Confiance</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Nous mettons la sécurité et la confidentialité des données au cœur d'AfriGest. Cette page résume nos principes et
          bonnes pratiques. Contactez‑nous pour obtenir notre fiche détaillée sécurité.
        </Typography>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Chiffrement</Typography>
            <Typography color="text.secondary">
              Chiffrement en transit (HTTPS/TLS) et au repos côté fournisseur cloud. Les mots de passe sont hachés.
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Authentification & Accès</Typography>
            <Typography color="text.secondary">
              Sessions sécurisées avec JWT. Rôles et permissions par profil (Super Admin, PDG, DG, etc.). Journalisation d'accès clés.
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Paiements & Conformité</Typography>
            <Typography color="text.secondary">
              Intégrations tierces (Mobile Money, Stripe/PayPal) conformes PCI DSS. Tokenisation des moyens de paiement, aucun stockage des
              numéros de carte sur AfriGest.
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Disponibilité & Résilience</Typography>
            <Typography color="text.secondary">
              SLA cible 99.9% avec monitoring, sauvegardes régulières et procédures de reprise.
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Confidentialité</Typography>
            <Typography color="text.secondary">
              Conformité RGPD adaptée au contexte local. Les données restent la propriété du client.
            </Typography>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}

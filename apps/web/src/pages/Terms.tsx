import { Container, Typography } from '@mui/material'

export default function TermsPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Conditions d'Utilisation</Typography>
      <Typography color="text.secondary">Conditions d'utilisation du service AfriGest (MVP). À compléter/valider juridiquement avant mise en production.</Typography>
    </Container>
  )
}

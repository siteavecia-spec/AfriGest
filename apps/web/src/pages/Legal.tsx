import { Container, Typography } from '@mui/material'

export default function LegalPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Mentions Légales</Typography>
      <Typography color="text.secondary">Informations légales de la société éditrice d'AfriGest. Contenu à compléter (raison sociale, adresse, contacts, hébergeur).</Typography>
    </Container>
  )
}

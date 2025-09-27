import { Container, Typography } from '@mui/material'

export default function PrivacyPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Politique de Confidentialité</Typography>
      <Typography color="text.secondary">Cette page décrit la manière dont AfriGest collecte, utilise et protège vos données. Version initiale (MVP) — à compléter avec le service juridique.</Typography>
    </Container>
  )
}

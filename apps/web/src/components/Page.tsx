import { Box, Container, Stack, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface PageProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  children: ReactNode
}

export default function Page({ title, subtitle, actions, maxWidth = 'lg', children }: PageProps) {
  return (
    <Box sx={{ py: 1 }}>
      <Container maxWidth={maxWidth}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          {actions && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
          )}
        </Stack>
        <Box>
          {children}
        </Box>
      </Container>
    </Box>
  )
}

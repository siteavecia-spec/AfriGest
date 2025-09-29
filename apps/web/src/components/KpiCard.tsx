import { Card, CardContent, Stack, Typography, Box, Skeleton } from '@mui/material'
import { ReactNode } from 'react'

interface KpiCardProps {
  title: string
  value?: string | number
  loading?: boolean
  suffix?: string
  footer?: ReactNode
  icon?: ReactNode
}

export default function KpiCard({ title, value, loading, suffix, footer, icon }: KpiCardProps) {
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
            {loading ? (
              <Box sx={{ mt: 0.5 }}>
                <Skeleton variant="text" width={140} height={40} />
              </Box>
            ) : (
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                <Typography variant="h4" sx={{ lineHeight: 1 }}>{value}</Typography>
                {suffix && (
                  <Typography variant="subtitle2" color="text.secondary">{suffix}</Typography>
                )}
              </Stack>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.9, '& svg': { fontSize: 28 } }}>
              {icon}
            </Box>
          )}
        </Stack>
        {footer && (
          <Box sx={{ mt: 1.25 }}>{footer}</Box>
        )}
      </CardContent>
    </Card>
  )
}


import { Card, CardContent, Stack, Typography, Box, Skeleton } from '@mui/material'
import { ReactNode } from 'react'

interface KpiCardProps {
  title: string
  value?: string | number
  loading?: boolean
  suffix?: string
  footer?: ReactNode
}

export default function KpiCard({ title, value, loading, suffix, footer }: KpiCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        {loading ? (
          <Skeleton variant="text" width={80} height={36} sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="h4">{value}{suffix ? ` ${suffix}` : ''}</Typography>
        )}
        {footer && (
          <Box sx={{ mt: 1 }}>{footer}</Box>
        )}
      </CardContent>
    </Card>
  )
}

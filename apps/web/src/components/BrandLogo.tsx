import { useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'

export default function BrandLogo({ height = 32, variant = 'auto', alt = 'AfriGest' }: { height?: number; variant?: 'auto' | 'light' | 'dark'; alt?: string }) {
  const theme = useTheme() as any
  const mode: 'light' | 'dark' = useMemo(() => {
    if (variant === 'auto') return (theme?.palette?.mode || 'light') as 'light' | 'dark'
    return variant
  }, [variant, theme])

  const [src, setSrc] = useState(() => `/logo-${mode}.svg`)
  const onError = () => {
    if (src !== '/logo.svg') setSrc('/logo.svg')
  }

  return (
    <img src={src} onError={onError} alt={alt} height={height} style={{ display: 'block' }} />
  )
}

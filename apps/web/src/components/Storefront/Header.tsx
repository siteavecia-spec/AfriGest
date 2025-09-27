import { AppBar, Badge, Box, IconButton, Toolbar, Typography, Button } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { useEffect, useState } from 'react'

function getCartCount(): number {
  try {
    const raw = localStorage.getItem('shop_cart')
    const cart: Array<{ qty: number }> = raw ? JSON.parse(raw) : []
    return cart.reduce((s, it) => s + (Number(it.qty) || 0), 0)
  } catch {
    return 0
  }
}

export default function StorefrontHeader() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => setCount(getCartCount())
    update()
    const onStorage = (e: StorageEvent) => { if (e.key === 'shop_cart') update() }
    const onCustom = () => update()
    window.addEventListener('storage', onStorage)
    window.addEventListener('shop_cart_changed', onCustom as any)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('shop_cart_changed', onCustom as any)
    }
  }, [])

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ mb: 2 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <img src="/logo.svg" alt="AfriGest" height={28} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>AfriGest</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button href="/shop" color="inherit">Catalogue</Button>
          <IconButton href="/shop/cart" color="inherit" size="large" aria-label="cart">
            <Badge badgeContent={count} color="primary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

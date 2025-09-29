import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // HMR websocket can fail under proxies/HTTPS. Allow overriding via env without hardcoding here.
    hmr: {
      host: process.env.VITE_HMR_HOST || undefined,
      protocol: (process.env.VITE_HMR_PROTOCOL as 'ws'|'wss'|undefined) || undefined,
      clientPort: process.env.VITE_HMR_CLIENT_PORT ? Number(process.env.VITE_HMR_CLIENT_PORT) : undefined,
      port: process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : undefined
    }
  }
})

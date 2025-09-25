import { createServer } from 'http'
import app from './app'
import { env } from './config/env'
import { initWS } from './ws'

const server = createServer(app)
const port = env.PORT

// Initialize WebSocket server (AfriTalk Phase 4.2 S1)
initWS(server)

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

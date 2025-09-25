import { createServer } from 'http'
import app from './app'
import { env } from './config/env'

const server = createServer(app)
const port = env.PORT

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

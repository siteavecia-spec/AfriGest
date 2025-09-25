import { PrismaClient } from '../generated/tenant'

const clients = new Map<string, PrismaClient>()

export function getTenantPrisma(databaseUrl: string) {
  let client = clients.get(databaseUrl)
  if (!client) {
    client = new PrismaClient({
      datasources: {
        db: { url: databaseUrl }
      }
    })
    clients.set(databaseUrl, client)
  }
  return client
}

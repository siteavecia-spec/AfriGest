import { PrismaClient } from '../generated/master'

let client: PrismaClient | null = null

export function getMasterPrisma() {
  if (!client) {
    client = new PrismaClient()
  }
  return client
}

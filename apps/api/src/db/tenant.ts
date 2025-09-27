const clients = new Map<string, any>()

export function getTenantPrisma(databaseUrl: string) {
  // Dynamic load to keep memory mode working without generated Prisma client
  let PrismaClientCtor: any = null
  try {
    // use eval to avoid static analysis
    // eslint-disable-next-line no-eval
    const req = eval('require') as NodeRequire
    PrismaClientCtor = req('../generated/tenant').PrismaClient
  } catch {
    PrismaClientCtor = null
  }
  if (!PrismaClientCtor) return null
  let client = clients.get(databaseUrl)
  if (!client) {
    client = new PrismaClientCtor({
      datasources: {
        db: { url: databaseUrl }
      }
    })
    clients.set(databaseUrl, client)
  }
  return client
}

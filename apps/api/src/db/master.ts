let client: any = null

export function getMasterPrisma() {
  let MasterCtor: any = null
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require') as NodeRequire
    MasterCtor = req('../generated/master').PrismaClient
  } catch {
    MasterCtor = null
  }
  if (!MasterCtor) return null
  if (!client) {
    client = new MasterCtor()
  }
  return client
}

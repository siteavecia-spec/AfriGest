import dotenv from 'dotenv'
dotenv.config()

function required(name: string, def?: string) {
  const val = process.env[name] ?? def
  if (val === undefined) throw new Error(`Missing env ${name}`)
  return val
}

export const env = {
  PORT: Number(required('PORT', '4000')),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev_access'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev_refresh'),
  MASTER_DATABASE_URL: required('MASTER_DATABASE_URL', 'postgresql://user:pass@localhost:5432/afrigest_master'),
  TENANT_DATABASE_URL: required('TENANT_DATABASE_URL', 'postgresql://user:pass@localhost:5432/afrigest_tenant_demo')
}
